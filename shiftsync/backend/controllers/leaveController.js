const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * @desc    Apply for leave
 * @route   POST /api/leaves
 * @access  Employee
 */
exports.applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < new Date().setHours(0, 0, 0, 0)) {
      return errorResponse(res, 'Leave start date cannot be in the past.', 400);
    }

    // Check for overlapping leave requests
    const overlapping = await Leave.findOne({
      employee: employee._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return errorResponse(res, 'You already have a leave request overlapping these dates.', 409);
    }

    const leave = await Leave.create({
      employee: employee._id,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
    });

    return successResponse(res, { data: leave }, 'Leave application submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all leaves (paginated)
 * @route   GET /api/leaves
 * @access  Admin, Manager
 */
exports.getLeaves = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, leaveType, employee, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    if (employee) filter.employee = employee;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Managers see only their subordinates' leaves
    if (req.user.role === 'manager') {
      const managerEmp = await Employee.findOne({ user: req.user._id });
      if (managerEmp) {
        const subordinates = await Employee.find({ manager: managerEmp._id }).select('_id');
        filter.employee = { $in: subordinates.map(e => e._id) };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate('employee', 'name email department designation')
        .populate('reviewedBy', 'name role')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Leave.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: leaves, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my leaves
 * @route   GET /api/leaves/my
 * @access  Employee
 */
exports.getMyLeaves = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const { page = 1, limit = 10, status } = req.query;
    const filter = { employee: employee._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate('reviewedBy', 'name role')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Leave.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: leaves, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Review leave (approve/reject)
 * @route   PATCH /api/leaves/:id/review
 * @access  Admin, Manager
 */
exports.reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return errorResponse(res, 'Leave request not found.', 404);

    if (leave.status !== 'pending') {
      return errorResponse(res, `Leave is already ${leave.status}.`, 400);
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = reviewNote || '';
    await leave.save();

    // If approved, mark attendance as on_leave for those dates
    if (status === 'approved') {
      const attendanceDocs = [];
      const current = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      while (current <= end) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);

        attendanceDocs.push({
          updateOne: {
            filter: { employee: leave.employee._id, date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 86400000) } },
            update: { $set: { status: 'on_leave', employee: leave.employee._id, date: dayStart } },
            upsert: true,
          },
        });

        current.setDate(current.getDate() + 1);
      }

      if (attendanceDocs.length > 0) {
        await Attendance.bulkWrite(attendanceDocs, { ordered: false });
      }
    }

    const updated = await Leave.findById(leave._id)
      .populate('employee', 'name email')
      .populate('reviewedBy', 'name role');

    return successResponse(res, { data: updated }, `Leave ${status} successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel leave
 * @route   PATCH /api/leaves/:id/cancel
 * @access  Employee (own leave only)
 */
exports.cancelLeave = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const leave = await Leave.findOne({ _id: req.params.id, employee: employee._id });
    if (!leave) return errorResponse(res, 'Leave request not found.', 404);

    if (leave.status !== 'pending') {
      return errorResponse(res, 'Only pending leave requests can be cancelled.', 400);
    }

    leave.status = 'cancelled';
    await leave.save();

    return successResponse(res, { data: leave }, 'Leave cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave stats
 * @route   GET /api/leaves/stats
 * @access  Admin, Manager
 */
exports.getStats = async (req, res, next) => {
  try {
    const [pending, approved, rejected, byType] = await Promise.all([
      Leave.countDocuments({ status: 'pending' }),
      Leave.countDocuments({ status: 'approved' }),
      Leave.countDocuments({ status: 'rejected' }),
      Leave.aggregate([
        { $group: { _id: '$leaveType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return successResponse(res, { data: { pending, approved, rejected, byType } }, 'Stats fetched');
  } catch (error) {
    next(error);
  }
};
