const pool = require('../config/db');
const notify = require('../utils/notify');

// POST /api/items/:id/claims
exports.createClaim = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Item not found.' });
    const item = rows[0];
    if (item.user_id === req.user.id) return res.status(400).json({ message: 'You cannot claim your own report.' });
    if (!['LOST', 'FOUND'].includes(item.status)) return res.status(400).json({ message: 'This item is no longer open for claims.' });

    const [dup] = await pool.execute('SELECT id FROM claims WHERE item_id = ? AND claimant_id = ?', [item.id, req.user.id]);
    if (dup.length) return res.status(409).json({ message: 'You have already submitted a claim for this item.' });

    const [result] = await pool.execute(
      'INSERT INTO claims (item_id, claimant_id, message) VALUES (?, ?, ?)', [item.id, req.user.id, req.body.message]);
    await notify(item.user_id, `${req.user.name} submitted a claim on your report "${item.title}".`, item.id);
    res.status(201).json({ message: 'Claim submitted. The reporter has been notified.', id: result.insertId });
  } catch (err) { next(err); }
};

// GET /api/claims  -> { made: claims I submitted, received: claims on my items }
exports.listClaims = async (req, res, next) => {
  try {
    const [made] = await pool.execute(
      `SELECT c.id, c.message, c.status, c.created_at, i.id AS item_id, i.title, i.type, i.status AS item_status,
              u.name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone
       FROM claims c JOIN items i ON i.id = c.item_id JOIN users u ON u.id = i.user_id
       WHERE c.claimant_id = ? ORDER BY c.created_at DESC`, [req.user.id]);
    const [received] = await pool.execute(
      `SELECT c.id, c.message, c.status, c.created_at, i.id AS item_id, i.title, i.type, i.status AS item_status,
              u.name AS claimant_name, u.email AS claimant_email, u.phone AS claimant_phone
       FROM claims c JOIN items i ON i.id = c.item_id JOIN users u ON u.id = c.claimant_id
       WHERE i.user_id = ? ORDER BY c.created_at DESC`, [req.user.id]);

    // Reveal contact details only when the claim is APPROVED
    const madeOut = made.map(r => {
      const o = { id: r.id, message: r.message, status: r.status, created_at: r.created_at, item_id: r.item_id,
                  title: r.title, type: r.type, item_status: r.item_status, reporter_name: r.reporter_name };
      if (r.status === 'APPROVED') o.contact = { name: r.reporter_name, email: r.reporter_email, phone: r.reporter_phone };
      return o;
    });
    const recvOut = received.map(r => {
      const o = { id: r.id, message: r.message, status: r.status, created_at: r.created_at, item_id: r.item_id,
                  title: r.title, type: r.type, item_status: r.item_status, claimant_name: r.claimant_name };
      if (r.status === 'APPROVED') o.contact = { name: r.claimant_name, email: r.claimant_email, phone: r.claimant_phone };
      return o;
    });
    res.json({ made: madeOut, received: recvOut });
  } catch (err) { next(err); }
};

// PUT /api/claims/:id  { status: 'APPROVED' | 'REJECTED' }  - item reporter or admin
exports.decideClaim = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT c.*, i.user_id AS owner_id, i.title, i.status AS item_status
       FROM claims c JOIN items i ON i.id = c.item_id WHERE c.id = ? FOR UPDATE`, [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ message: 'Claim not found.' }); }
    const claim = rows[0];
    if (claim.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      await conn.rollback();
      return res.status(403).json({ message: 'Only the item reporter can decide on this claim.' });
    }
    if (claim.status !== 'PENDING') { await conn.rollback(); return res.status(400).json({ message: `This claim is already ${claim.status}.` }); }

    if (status === 'APPROVED') {
      if (!['LOST', 'FOUND'].includes(claim.item_status)) {
        await conn.rollback();
        return res.status(400).json({ message: 'This item already has an approved claim or is closed.' });
      }
      await conn.execute("UPDATE claims SET status = 'APPROVED' WHERE id = ?", [claim.id]);
      await conn.execute("UPDATE items SET status = 'CLAIMED' WHERE id = ?", [claim.item_id]);
      // Only one claim can win: reject all other pending claims on this item
      const [others] = await conn.execute("SELECT id, claimant_id FROM claims WHERE item_id = ? AND status = 'PENDING' AND id <> ?", [claim.item_id, claim.id]);
      await conn.execute("UPDATE claims SET status = 'REJECTED' WHERE item_id = ? AND status = 'PENDING' AND id <> ?", [claim.item_id, claim.id]);
      for (const o of others) await notify(o.claimant_id, `Your claim on "${claim.title}" was rejected because another claim was approved.`, claim.item_id, conn);
      await notify(claim.claimant_id, `Your claim on "${claim.title}" has been approved. You can now see the reporter's contact details.`, claim.item_id, conn);
    } else {
      await conn.execute("UPDATE claims SET status = 'REJECTED' WHERE id = ?", [claim.id]);
      await notify(claim.claimant_id, `Your claim on "${claim.title}" has been rejected.`, claim.item_id, conn);
    }
    await conn.commit();
    res.json({ message: `Claim ${status.toLowerCase()}.`, status });
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
};
