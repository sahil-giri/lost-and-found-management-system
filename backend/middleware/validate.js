const fs = require('fs');
const { validationResult } = require('express-validator');

// Turns express-validator results into a 400 response. Also removes an uploaded file if validation failed.
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  if (req.file) fs.unlink(req.file.path, () => {});
  const list = errors.array().map(e => ({ field: e.path, message: e.msg }));
  return res.status(400).json({ message: list[0].message, errors: list });
};
