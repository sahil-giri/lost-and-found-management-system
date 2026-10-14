const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const generateToken = require('../utils/generateToken');

// POST /api/auth/register  - always creates a USER (nobody can self-register as ADMIN)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 10); // 10 salt rounds
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hash, phone || null]
    );
    const user = { id: result.insertId, name, email, phone: phone || null, role: 'USER' };
    res.status(201).json({ message: 'Registration successful.', token: generateToken(user), user });
  } catch (err) { next(err); }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const row = rows[0];
    // Same message for "no such email" and "wrong password" so attackers can't discover which emails exist
    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (!row.is_active) return res.status(403).json({ message: 'Your account has been deactivated.' });
    const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
    res.json({ message: 'Login successful.', token: generateToken(user), user });
  } catch (err) { next(err); }
};
