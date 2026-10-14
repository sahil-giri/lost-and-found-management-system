const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Verifies the JWT and loads the current user from the database.
// Reading the DB (instead of trusting the token alone) means a deactivated user or a
// changed role takes effect immediately.
module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?',
      [payload.id]
    );
    if (!rows.length) return res.status(401).json({ message: 'User no longer exists.' });
    if (!rows[0].is_active) return res.status(403).json({ message: 'Your account has been deactivated.' });
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};
