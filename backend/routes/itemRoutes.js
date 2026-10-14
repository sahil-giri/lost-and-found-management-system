const router = require('express').Router();
const { body, param } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const items = require('../controllers/itemController');
const { createClaim } = require('../controllers/claimController');
const { STATUSES } = require('../utils/statusRules');

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid item ID.');
const notFuture = (v) => {
  if (new Date(v) > new Date()) throw new Error('Date cannot be in the future.');
  return true;
};
const itemFields = [
  body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 characters.'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be at least 10 characters.'),
  body('category').trim().notEmpty().withMessage('Category is required.').isLength({ max: 50 }),
  body('location').trim().notEmpty().withMessage('Location is required.').isLength({ max: 150 }),
  body('item_date').isISO8601().withMessage('Enter a valid date.').custom(notFuture)
];

router.use(auth); // every item route requires login

router.get('/', items.listItems);
router.get('/:id', idParam, validate, items.getItem);
router.post('/', upload, [
  body('type').isIn(['LOST', 'FOUND']).withMessage('Type must be LOST or FOUND.'), ...itemFields
], validate, items.createItem);
router.put('/:id', upload, [idParam, ...itemFields], validate, items.updateItem);
router.delete('/:id', idParam, validate, items.deleteItem);
router.patch('/:id/status', [idParam, body('status').isIn(STATUSES).withMessage('Invalid status.')], validate, items.updateStatus);

router.post('/:id/claims', [
  idParam,
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Explain your claim in at least 10 characters.')
], validate, createClaim);

module.exports = router;
