const jwt = require('jsonwebtoken');

// The token carries only the user id and role. Everything else is re-read from the DB.
module.exports = function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
};
