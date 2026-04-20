const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const Employee = require('../models/Employee');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * Parse "HH:MM" to total minutes for comparison
 */
const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Check for overlapping shifts (handles overnight shifts too)
 */
const hasOverlap = (existingShifts, newStart, newEnd) => {
  const newStartMin = timeToMinutes(newStart);
  const newEndMin = timeToMinutes(newEnd);

  for (const shift of existingShifts) {
    const existStart = timeToMinutes(shift.startTime);
    const existEnd = timeToMinutes(shift.endTime);

    const newOvernight = newEndMin <= newStartMin;
    const existOvernight = existEnd <= existStart;

    if (!newOvernight && !existOvernight) {
      if (newStartMin < existEnd && newEndMin > existStart) return true;
    } else if (newOvernight && !existOvernight) {
      if (newStartMin < existEnd || newEndMin > existStart) return true;
    } else if (!newOvernight && existOvernight) {
      if (existStart < newEndMin || existEnd > newStartMin) return true;
    } else {
      return true; // Both overnight - always overlap
    }
  }
  return false;
};

/**
 * @desc    Get all shifts (paginated)
 * @route   GET /api/shifts
 * @access  Admin, Manager
 */
exports.getShifts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employee, branch, status, startDate, endDate, sort = '-shiftDate' } = req.query;

    const filter = {};
    if (employee) filter.employee = employee;
    if (branch) filter.branch = branch;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.shiftDate = {};
      if (startDate) filter.shiftDate.$gte = new Date(startDate);
      if (endDate) filter.shiftDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [shifts, total] = await Promise.all([
      Shift.find(filter)
        .populate('employee', 'name email department designation')
        .populate('createdBy', 'name role')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Shift.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: shifts, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create shift with overlap prevention (concurrency-safe)
 * @route   POST /api/shifts
 * @access  Admin, Manager
 */
exports.createShift = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const { employee: employeeId, shiftDate, startTime, endTime, branch, notes } = req.body;

      // Validate employee exists and is active
      const employee = await Employee.findById(employeeId).session(session);
      if (!employee) {
        throw Object.assign(new Error('Employee not found.'), { statusCode: 404 });
      }
      if (employee.status !== 'active') {
        throw Object.assign(new Error('Cannot assign shift to inactive employee.'), { statusCode: 400 });
      }

      // Normalize date to start of day
      const normalizedDate = new Date(shiftDate);
      normalizedDate.setHours(0, 0, 0, 0);
      const dayEnd = new Date(normalizedDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Check existing shifts for that employee on that day (locked for update)
      const existingShifts = await Shift.find({
        employee: employeeId,
        shiftDate: { $gte: normalizedDate, $lte: dayEnd },
        status: { $ne: 'cancelled' },
      }).session(session).lean();

      if (hasOverlap(existingShifts, startTime, endTime)) {
        throw Object.assign(
          new Error('Shift overlaps with an existing shift for this employee on this day.'),
          { statusCode: 409 }
        );
      }

      const [shift] = await Shift.create(
        [{ employee: employeeId, shiftDate: normalizedDate, startTime, endTime, branch, notes, createdBy: req.user._id }],
        { session }
      );

      result = await Shift.findById(shift._id)
        .populate('employee', 'name email department designation')
        .session(session);
    });

    return successResponse(res, { data: result }, 'Shift created successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Update shift
 * @route   PUT /api/shifts/:id
 * @access  Admin, Manager
 */
exports.updateShift = async (req, res, next) => {
  try {
    const { startTime, endTime, branch, status, notes } = req.body;

    const shift = await Shift.findById(req.params.id);
    if (!shift) return errorResponse(res, 'Shift not found.', 404);

    if (shift.status === 'completed') {
      return errorResponse(res, 'Cannot modify a completed shift.', 400);
    }

    // If times are being updated, check for overlap
    if (startTime || endTime) {
      const newStart = startTime || shift.startTime;
      const newEnd = endTime || shift.endTime;

      const dayStart = new Date(shift.shiftDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const conflicting = await Shift.find({
        employee: shift.employee,
        shiftDate: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: 'cancelled' },
        _id: { $ne: shift._id },
      }).lean();

      if (hasOverlap(conflicting, newStart, newEnd)) {
        return errorResponse(res, 'Updated shift times overlap with an existing shift.', 409);
      }
    }

    const updated = await Shift.findByIdAndUpdate(
      req.params.id,
      { startTime, endTime, branch, status, notes },
      { new: true, runValidators: true }
    ).populate('employee', 'name email department designation');

    return successResponse(res, { data: updated }, 'Shift updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete shift
 * @route   DELETE /api/shifts/:id
 * @access  Admin, Manager
 */
exports.deleteShift = async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return errorResponse(res, 'Shift not found.', 404);

    if (shift.status === 'completed') {
      return errorResponse(res, 'Cannot delete a completed shift.', 400);
    }

    await Shift.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    return successResponse(res, {}, 'Shift cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get employee's own shifts
 * @route   GET /api/shifts/my
 * @access  Employee
 */
exports.getMyShifts = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return errorResponse(res, 'Employee profile not found.', 404);

    const { startDate, endDate } = req.query;
    const filter = { employee: employee._id };

    if (startDate || endDate) {
      filter.shiftDate = {};
      if (startDate) filter.shiftDate.$gte = new Date(startDate);
      if (endDate) filter.shiftDate.$lte = new Date(endDate);
    }

    const shifts = await Shift.find(filter).sort('-shiftDate').lean();
    return successResponse(res, { data: shifts }, 'My shifts fetched');
  } catch (error) {
    next(error);
  }
};
