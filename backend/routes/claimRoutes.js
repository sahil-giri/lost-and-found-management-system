const router = require('express').Router();
const { body, param } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { listClaims, decideClaim } = require('../controllers/claimController');

router.use(auth);
router.get('/', listClaims);
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid claim ID.'),
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Status must be APPROVED or REJECTED.')
], validate, decideClaim);

module.exports = router;
