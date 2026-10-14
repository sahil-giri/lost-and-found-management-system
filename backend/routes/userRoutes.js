const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const u = require('../controllers/userController');

router.use(auth);
router.get('/me', u.getMe);
router.get('/me/stats', u.getStats);
router.put('/me', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9+\-\s]{7,15}$/).withMessage('Enter a valid phone number.'),
  body('newPassword').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('New password must contain a letter.').matches(/\d/).withMessage('New password must contain a number.')
], validate, u.updateMe);

module.exports = router;
