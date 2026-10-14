const pool = require('../config/db');

// GET /api/notifications
exports.list = async (req, res, next) => {
  try {
    const [notifications] = await pool.execute(
      'SELECT id, message, is_read, related_item_id, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100',
      [req.user.id]);
    const unread = notifications.filter(n => !n.is_read).length;
    res.json({ notifications, unread });
  } catch (err) { next(err); }
};

// PUT /api/notifications/:id/read  - scoped by user_id so you can't touch someone else's notification
exports.markRead = async (req, res, next) => {
  try {
    const [r] = await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ message: 'Marked as read.' });
  } catch (err) { next(err); }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
};
