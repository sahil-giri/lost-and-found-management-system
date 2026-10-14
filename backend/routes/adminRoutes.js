const router = require('express').Router();
const { body, param } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const validate = require('../middleware/validate');
const a = require('../controllers/adminController');
const { STATUSES } = require('../utils/statusRules');

router.use(auth, admin); // 1) must be logged in  2) must be ADMIN (checked on the server)

router.get('/stats', a.stats);
router.get('/users', a.users);
router.get('/items', a.items);
router.get('/claims', a.claims);
router.put('/users/:id', [
  param('id').isInt({ min: 1 }),
  body('role').optional().isIn(['USER', 'ADMIN']).withMessage('Role must be USER or ADMIN.'),
  body('is_active').optional().isBoolean().withMessage('is_active must be true or false.')
], validate, a.updateUser);
router.put('/items/:id/status', [
  param('id').isInt({ min: 1 }),
  body('status').isIn(STATUSES).withMessage('Invalid status.')
], validate, a.setItemStatus);
router.delete('/items/:id', param('id').isInt({ min: 1 }), validate, a.deleteItem);

module.exports = router;
