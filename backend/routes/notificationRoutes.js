const router = require('express').Router();
const { param } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const n = require('../controllers/notificationController');

router.use(auth);
router.get('/', n.list);
router.put('/read-all', n.markAllRead); // defined before /:id/read so "read-all" is not treated as an id
router.put('/:id/read', param('id').isInt({ min: 1 }).withMessage('Invalid ID.'), validate, n.markRead);

module.exports = router;
