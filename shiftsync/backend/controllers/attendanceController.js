const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getTodayRange = () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * @desc    Check in (idempotent)
 * @route   POST /api/attendance/checkin
 * @access  Employee
 */
exports.checkIn = async (req, res, next) => {
  try {
    const { shift, notes } = req.body;

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const { start, end } = getTodayRange();

    // Idempotent: if already checked in today, return existing record
    const existing = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: start, $lte: end },
    });

    if (existing) {
      if (existing.checkIn) {
        return errorResponse(res, 'Already checked in for today.', 409);
      }
    }

    // Use findOneAndUpdate with upsert for idempotency
    const attendance = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: { $gte: start, $lte: end } },
      {
        $setOnInsert: { employee: employee._id, date: new Date() },
        $set: { checkIn: new Date(), shift: shift || null, notes },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return successResponse(res, { data: attendance }, 'Checked in successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Already checked in for today.', 409);
    }
    next(error);
  }
};

/**
 * @desc    Check out
 * @route   POST /api/attendance/checkout
 * @access  Employee
 */
exports.checkOut = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const { start, end } = getTodayRange();

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: start, $lte: end },
    });

    if (!attendance || !attendance.checkIn) {
      return errorResponse(res, 'No check-in found for today. Please check in first.', 400);
    }

    if (attendance.checkOut) {
      return errorResponse(res, 'Already checked out for today.', 409);
    }

    const checkOutTime = new Date();
    if (checkOutTime <= attendance.checkIn) {
      return errorResponse(res, 'Check-out time must be after check-in time.', 400);
    }

    attendance.checkOut = checkOutTime;
    if (notes) attendance.notes = notes;
    await attendance.save();

    return successResponse(res, { data: attendance }, 'Checked out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance records (paginated)
 * @route   GET /api/attendance
 * @access  Admin, Manager
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employee, status, startDate, endDate } = req.query;

    const filter = {};
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('employee', 'name email department branch designation')
        .sort('-date')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: records, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my attendance
 * @route   GET /api/attendance/my
 * @access  Employee
 */
exports.getMyAttendance = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const filter = { employee: employee._id };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(filter).sort('-date').skip(skip).limit(parseInt(limit)).lean(),
      Attendance.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: records, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's attendance status
 * @route   GET /api/attendance/today
 * @access  Employee
 */
exports.getTodayStatus = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const { start, end } = getTodayRange();

    const record = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: start, $lte: end },
    });

    return successResponse(res, { data: record || null }, 'Today status fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance stats
 * @route   GET /api/attendance/stats
 * @access  Admin, Manager
 */
exports.getStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const filter = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const [total, present, absent, late] = await Promise.all([
      Attendance.countDocuments(filter),
      Attendance.countDocuments({ ...filter, status: 'present' }),
      Attendance.countDocuments({ ...filter, status: 'absent' }),
      Attendance.countDocuments({ ...filter, isLate: true }),
    ]);

    return successResponse(res, { data: { total, present, absent, late } }, 'Stats fetched');
  } catch (error) {
    next(error);
  }
};
