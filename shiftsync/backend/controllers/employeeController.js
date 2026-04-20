const Employee = require('../models/Employee');
const User = require('../models/User');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * @desc    Get all employees (paginated + filtered)
 * @route   GET /api/employees
 * @access  Admin, Manager
 */
exports.getEmployees = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      branch,
      status,
      sort = '-createdAt',
    } = req.query;

    const filter = {};

    if (search) {
      filter.$text = { $search: search };
    }
    if (department) filter.department = department;
    if (branch) filter.branch = branch;
    if (status) filter.status = status;

    // Managers can only see their own employees
    if (req.user.role === 'manager') {
      const managerEmployee = await Employee.findOne({ user: req.user._id });
      if (managerEmployee) filter.manager = managerEmployee._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('manager', 'name email designation')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Employee.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: employees, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single employee
 * @route   GET /api/employees/:id
 * @access  Admin, Manager, Self
 */
exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('manager', 'name email designation')
      .populate('user', 'role lastLogin isActive');

    if (!employee) {
      return errorResponse(res, 'Employee not found.', 404);
    }

    return successResponse(res, { data: employee }, 'Employee fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create employee
 * @route   POST /api/employees
 * @access  Admin, Manager
 */
exports.createEmployee = async (req, res, next) => {
  try {
    const {
      name, email, phone, department, branch, designation,
      joiningDate, status, manager, salary, role = 'employee', password
    } = req.body;

    // Check if user with email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already in use.', 409);
    }

    // Create user account
    const userPassword = password || `${name.split(' ')[0].toLowerCase()}@123`;
    const user = await User.create({ name, email, password: userPassword, role });

    // Create employee profile
    const employee = await Employee.create({
      user: user._id,
      name, email, phone, department, branch, designation,
      joiningDate, status: status || 'active',
      manager: manager || null,
      salary: salary || 0,
    });

    const populated = await employee.populate('manager', 'name email');

    return successResponse(res, { data: populated }, 'Employee created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update employee
 * @route   PUT /api/employees/:id
 * @access  Admin, Manager
 */
exports.updateEmployee = async (req, res, next) => {
  try {
    const { name, email, phone, department, branch, designation,
      joiningDate, status, manager, salary } = req.body;

    const employee = await Employee.findById(req.params.id);
    if (!employee) return errorResponse(res, 'Employee not found.', 404);

    // Update user record too if name/email changed
    if (name || email) {
      await User.findByIdAndUpdate(employee.user, {
        ...(name && { name }),
        ...(email && { email }),
      });
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, department, branch, designation, joiningDate, status, manager, salary },
      { new: true, runValidators: true }
    ).populate('manager', 'name email designation');

    return successResponse(res, { data: updated }, 'Employee updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete employee (soft delete - set inactive)
 * @route   DELETE /api/employees/:id
 * @access  Admin only
 */
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return errorResponse(res, 'Employee not found.', 404);

    await Employee.findByIdAndUpdate(req.params.id, { status: 'inactive' });
    await User.findByIdAndUpdate(employee.user, { isActive: false });

    return successResponse(res, {}, 'Employee deactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get employee stats
 * @route   GET /api/employees/stats
 * @access  Admin, Manager
 */
exports.getStats = async (req, res, next) => {
  try {
    const [total, active, inactive, byDepartment, byBranch] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Employee.countDocuments({ status: 'inactive' }),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Employee.aggregate([
        { $group: { _id: '$branch', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return successResponse(res, {
      data: { total, active, inactive, byDepartment, byBranch }
    }, 'Stats fetched');
  } catch (error) {
    next(error);
  }
};
