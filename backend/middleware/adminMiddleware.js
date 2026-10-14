// Must run AFTER authMiddleware. Role comes from the database row, not from client input.
module.exports = function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};
