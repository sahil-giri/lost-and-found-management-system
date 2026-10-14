const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
    cb(null, crypto.randomBytes(16).toString('hex') + ext); // random name, never the user's filename
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPG, PNG or WEBP images are allowed.');
    err.status = 400;
    cb(err);
  }
});

module.exports = upload.single('image');
