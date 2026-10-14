const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const notify = require('../utils/notify');
const { STATUSES, canUserTransition } = require('../utils/statusRules');

const removeImage = (imagePath) => {
  if (imagePath) fs.unlink(path.join(__dirname, '..', imagePath), () => {});
};

// Claims shown for an item. Contact details are only included for APPROVED claims.
async function claimsForOwner(itemId, reporter) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.message, c.status, c.created_at, u.id AS claimant_id, u.name AS claimant_name,
            u.email AS claimant_email, u.phone AS claimant_phone
     FROM claims c JOIN users u ON u.id = c.claimant_id WHERE c.item_id = ? ORDER BY c.created_at DESC`, [itemId]);
  return rows.map(r => {
    const out = { id: r.id, message: r.message, status: r.status, created_at: r.created_at,
                  claimant_id: r.claimant_id, claimant_name: r.claimant_name };
    if (r.status === 'APPROVED') out.contact = { name: r.claimant_name, email: r.claimant_email, phone: r.claimant_phone };
    return out;
  });
}

// GET /api/items?type=&category=&status=&location=&q=&mine=true&page=&limit=
exports.listItems = async (req, res, next) => {
  try {
    const { type, category, status, location, q, mine } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
    const where = [];
    const params = [];

    if (mine === 'true') { where.push('i.user_id = ?'); params.push(req.user.id); }
    if (type && ['LOST', 'FOUND'].includes(type)) { where.push('i.type = ?'); params.push(type); }
    if (category) { where.push('i.category = ?'); params.push(category); }
    if (status && STATUSES.includes(status)) { where.push('i.status = ?'); params.push(status); }
    else if (mine !== 'true') where.push("i.status <> 'CLOSED'"); // hide closed items from public browsing
    if (location) { where.push('i.location LIKE ?'); params.push(`%${location}%`); }
    if (q) {
      where.push('(i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM items i ${clause}`, params);
    // LIMIT/OFFSET are integers we computed ourselves, so inlining them is safe
    const [items] = await pool.execute(
      `SELECT i.id, i.title, i.description, i.category, i.type, i.location, i.item_date, i.image_path,
              i.status, i.created_at, i.user_id, u.name AS reporter_name
       FROM items i JOIN users u ON u.id = i.user_id ${clause}
       ORDER BY i.created_at DESC, i.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
    res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/items/:id
exports.getItem = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.*, u.name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone
       FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Item not found.' });
    const row = rows[0];
    const isOwner = row.user_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const item = { id: row.id, user_id: row.user_id, title: row.title, description: row.description,
      category: row.category, type: row.type, location: row.location, item_date: row.item_date,
      image_path: row.image_path, status: row.status, created_at: row.created_at,
      updated_at: row.updated_at, reporter_name: row.reporter_name };

    const [mine] = await pool.execute(
      'SELECT id, message, status, created_at FROM claims WHERE item_id = ? AND claimant_id = ?', [row.id, req.user.id]);
    item.myClaim = mine[0] || null;
    // Reporter's contact is revealed only to the claimant whose claim was APPROVED (or to admin)
    if (item.myClaim && item.myClaim.status === 'APPROVED') {
      item.myClaim.contact = { name: row.reporter_name, email: row.reporter_email, phone: row.reporter_phone };
    }
    if (isOwner || isAdmin) item.claims = await claimsForOwner(row.id);
    item.canManage = isOwner || isAdmin;
    res.json({ item });
  } catch (err) { next(err); }
};

// POST /api/items  (multipart/form-data, optional image)
exports.createItem = async (req, res, next) => {
  try {
    const { title, description, category, type, location, item_date } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const [result] = await pool.execute(
      `INSERT INTO items (user_id, title, description, category, type, location, item_date, image_path, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, category, type, location, item_date, imagePath, type]); // initial status = type
    res.status(201).json({ message: `${type === 'LOST' ? 'Lost' : 'Found'} item reported.`, id: result.insertId });
  } catch (err) { next(err); }
};

// PUT /api/items/:id  - owner (while LOST/FOUND) or admin
exports.updateItem = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!rows.length) { if (req.file) removeImage('/uploads/' + req.file.filename); return res.status(404).json({ message: 'Item not found.' }); }
    const item = rows[0];
    const isAdmin = req.user.role === 'ADMIN';
    if (item.user_id !== req.user.id && !isAdmin) {
      if (req.file) removeImage('/uploads/' + req.file.filename);
      return res.status(403).json({ message: 'You can only edit your own reports.' });
    }
    if (!isAdmin && !['LOST', 'FOUND'].includes(item.status)) {
      if (req.file) removeImage('/uploads/' + req.file.filename);
      return res.status(400).json({ message: 'Items can only be edited while they are still open.' });
    }
    const { title, description, category, location, item_date } = req.body;
    let imagePath = item.image_path;
    if (req.file) { removeImage(item.image_path); imagePath = `/uploads/${req.file.filename}`; }
    await pool.execute(
      'UPDATE items SET title=?, description=?, category=?, location=?, item_date=?, image_path=? WHERE id=?',
      [title, description, category, location, item_date, imagePath, item.id]);
    res.json({ message: 'Item updated.' });
  } catch (err) { next(err); }
};

// DELETE /api/items/:id  - owner (not while CLAIMED) or admin
exports.deleteItem = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Item not found.' });
    const item = rows[0];
    const isAdmin = req.user.role === 'ADMIN';
    if (item.user_id !== req.user.id && !isAdmin) return res.status(403).json({ message: 'You can only delete your own reports.' });
    if (!isAdmin && item.status === 'CLAIMED') return res.status(400).json({ message: 'A claimed item cannot be deleted. Mark it returned or revert it first.' });
    await pool.execute('DELETE FROM items WHERE id = ?', [item.id]); // claims cascade
    removeImage(item.image_path);
    res.json({ message: 'Item deleted.' });
  } catch (err) { next(err); }
};

// PATCH /api/items/:id/status  - owner follows the allowed transitions; admin may use any status
exports.updateStatus = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM items WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ message: 'Item not found.' }); }
    const item = rows[0];
    if (item.user_id !== req.user.id) { await conn.rollback(); return res.status(403).json({ message: 'Only the reporter can change this item\'s status.' }); }
    if (!canUserTransition(item.status, status, item.type)) {
      await conn.rollback();
      return res.status(400).json({ message: `Invalid status change: ${item.status} → ${status}.` });
    }
    await conn.execute('UPDATE items SET status = ? WHERE id = ?', [status, item.id]);
    // Handover failed: the approved claim no longer stands
    if (item.status === 'CLAIMED' && (status === 'LOST' || status === 'FOUND')) {
      const [appr] = await conn.execute("SELECT id, claimant_id FROM claims WHERE item_id = ? AND status = 'APPROVED'", [item.id]);
      await conn.execute("UPDATE claims SET status = 'REJECTED' WHERE item_id = ? AND status = 'APPROVED'", [item.id]);
      for (const c of appr) await notify(c.claimant_id, `The handover for "${item.title}" did not happen; the item is open again.`, item.id, conn);
    }
    if (status === 'RETURNED') {
      const [appr] = await conn.execute("SELECT claimant_id FROM claims WHERE item_id = ? AND status = 'APPROVED'", [item.id]);
      for (const c of appr) await notify(c.claimant_id, `"${item.title}" has been marked as returned.`, item.id, conn);
    }
    await conn.commit();
    res.json({ message: `Status updated to ${status}.`, status });
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
};
