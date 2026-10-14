const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// GET /api/users/me
exports.getMe = (req, res) => {
  const { id, name, email, phone, role } = req.user;
  res.json({ user: { id, name, email, phone, role } });
};

// PUT /api/users/me  - update name/phone, optionally change password
exports.updateMe = async (req, res, next) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;
    if (newPassword) {
      const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
      if (!currentPassword || !(await bcrypt.compare(currentPassword, rows[0].password))) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), req.user.id]);
    }
    await pool.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, req.user.id]);
    res.json({ message: 'Profile updated.', user: { id: req.user.id, name, email: req.user.email, phone: phone || null, role: req.user.role } });
  } catch (err) { next(err); }
};

// GET /api/users/me/stats  - numbers for the user dashboard
exports.getStats = async (req, res, next) => {
  try {
    const id = req.user.id;
    const [[items]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(type='LOST'),0) AS lost,
              COALESCE(SUM(type='FOUND'),0) AS found,
              COALESCE(SUM(status='RETURNED' OR (status='CLOSED' AND EXISTS (SELECT 1 FROM claims c WHERE c.item_id = items.id AND c.status='APPROVED'))),0) AS returned
       FROM items WHERE user_id = ?`, [id]);
    const [[made]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM claims WHERE claimant_id = ? AND status = 'PENDING'`, [id]);
    const [[received]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM claims c JOIN items i ON i.id = c.item_id
       WHERE i.user_id = ? AND c.status = 'PENDING'`, [id]);
    const [[unread]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = FALSE', [id]);
    const [recent] = await pool.execute(
      `SELECT id, title, type, status, location, item_date, created_at
       FROM items WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5`, [id]);
    res.json({
      totalItems: Number(items.total), lostItems: Number(items.lost), foundItems: Number(items.found),
      returnedItems: Number(items.returned),
      pendingClaimsMade: made.c, pendingClaimsReceived: received.c, unreadNotifications: unread.c,
      recent
    });
  } catch (err) { next(err); }
};
