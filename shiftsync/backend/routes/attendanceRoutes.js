const express = require('express');
const router = express.Router();
const {
  checkIn, checkOut, getAttendance, getMyAttendance, getTodayStatus, getStats,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, checkInSchema, checkOutSchema } = require('../validators');

router.use(protect);

router.post('/checkin', validate(checkInSchema), checkIn);
router.post('/checkout', validate(checkOutSchema), checkOut);
router.get('/my', getMyAttendance);
router.get('/today', getTodayStatus);
router.get('/stats', authorize('admin', 'manager'), getStats);
router.get('/', authorize('admin', 'manager'), getAttendance);

module.exports = router;
