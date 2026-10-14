const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { register, login } = require('../controllers/authController');

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter.')
    .matches(/\d/).withMessage('Password must contain a number.'),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9+\-\s]{7,15}$/).withMessage('Enter a valid phone number.')
], validate, register);

router.post('/login', [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
], validate, login);

module.exports = router;
