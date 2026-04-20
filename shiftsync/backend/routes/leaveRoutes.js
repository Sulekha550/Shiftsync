const express = require('express');
const router = express.Router();
const {
  applyLeave, getLeaves, getMyLeaves, reviewLeave, cancelLeave, getStats,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, leaveSchema, leaveReviewSchema } = require('../validators');

router.use(protect);

router.get('/my', getMyLeaves);
router.get('/stats', authorize('admin', 'manager'), getStats);
router.post('/', validate(leaveSchema), applyLeave);
router.get('/', authorize('admin', 'manager'), getLeaves);
router.patch('/:id/review', authorize('admin', 'manager'), validate(leaveReviewSchema), reviewLeave);
router.patch('/:id/cancel', cancelLeave);

module.exports = router;
