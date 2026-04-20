const express = require('express');
const router = express.Router();
const {
  getShifts, createShift, updateShift, deleteShift, getMyShifts,
} = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, shiftSchema } = require('../validators');

router.use(protect);

router.get('/my', getMyShifts);
router.get('/', authorize('admin', 'manager'), getShifts);
router.post('/', authorize('admin', 'manager'), validate(shiftSchema), createShift);
router.put('/:id', authorize('admin', 'manager'), updateShift);
router.delete('/:id', authorize('admin', 'manager'), deleteShift);

module.exports = router;
