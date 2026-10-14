const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const notify = require('../utils/notify');

// GET /api/admin/stats
exports.stats = async (req, res, next) => {
  try {
    const [[u]] = await pool.execute('SELECT COUNT(*) AS c FROM users');
    const [[t]] = await pool.execute(
      `SELECT COALESCE(SUM(type='LOST'),0) AS lost, COALESCE(SUM(type='FOUND'),0) AS found,
              COALESCE(SUM(status='RETURNED' OR (status='CLOSED' AND EXISTS (SELECT 1 FROM claims c WHERE c.item_id = items.id AND c.status='APPROVED'))),0) AS returned FROM items`);
    const [[c]] = await pool.execute("SELECT COUNT(*) AS c FROM claims WHERE status = 'PENDING'");
    const [recent] = await pool.execute(
      `SELECT i.id, i.title, i.type, i.status, i.created_at, u.name AS reporter_name
       FROM items i JOIN users u ON u.id = i.user_id ORDER BY i.created_at DESC, i.id DESC LIMIT 5`);
    res.json({ totalUsers: u.c, lostReports: Number(t.lost), foundReports: Number(t.found),
               pendingClaims: c.c, returnedItems: Number(t.returned), recent });
  } catch (err) { next(err); }
};

// GET /api/admin/users
exports.users = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              (SELECT COUNT(*) FROM items i WHERE i.user_id = u.id) AS item_count
       FROM users u ORDER BY u.created_at DESC`);
    res.json({ users: rows });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id  { role?, is_active? }
exports.updateUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ message: 'You cannot change your own role or active status.' });
    const [rows] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    const { role, is_active } = req.body;
    if (role !== undefined) await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    if (is_active !== undefined) await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    res.json({ message: 'User updated.' });
  } catch (err) { next(err); }
};

// GET /api/admin/items
exports.items = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.id, i.title, i.type, i.category, i.location, i.status, i.created_at, u.name AS reporter_name,
              (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id) AS claim_count
       FROM items i JOIN users u ON u.id = i.user_id ORDER BY i.created_at DESC, i.id DESC LIMIT 500`);
    res.json({ items: rows });
  } catch (err) { next(err); }
};

// GET /api/admin/claims
exports.claims = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.status, c.message, c.created_at, i.id AS item_id, i.title, cu.name AS claimant_name, ru.name AS reporter_name
       FROM claims c JOIN items i ON i.id = c.item_id
       JOIN users cu ON cu.id = c.claimant_id JOIN users ru ON ru.id = i.user_id
       ORDER BY c.created_at DESC LIMIT 500`);
    res.json({ claims: rows });
  } catch (err) { next(err); }
};

// PUT /api/admin/items/:id/status  - admin may set any status (override)
exports.setItemStatus = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Item not found.' });
    await pool.execute('UPDATE items SET status = ? WHERE id = ?', [req.body.status, rows[0].id]);
    await notify(rows[0].user_id, `An administrator changed the status of "${rows[0].title}" to ${req.body.status}.`, rows[0].id);
    res.json({ message: `Status set to ${req.body.status}.` });
  } catch (err) { next(err); }
};

// DELETE /api/admin/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Item not found.' });
    await notify(rows[0].user_id, `Your report "${rows[0].title}" was removed by an administrator.`);
    await pool.execute('DELETE FROM items WHERE id = ?', [rows[0].id]);
    if (rows[0].image_path) fs.unlink(path.join(__dirname, '..', rows[0].image_path), () => {});
    res.json({ message: 'Item removed.' });
  } catch (err) { next(err); }
};
