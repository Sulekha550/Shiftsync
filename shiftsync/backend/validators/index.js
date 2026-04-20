const Joi = require('joi');
const { errorResponse } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message.replace(/"/g, ''));
    return errorResponse(res, errors[0], 400, errors);
  }
  next();
};

// Auth Schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'manager', 'employee').default('employee'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Employee Schemas
const employeeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional().allow(''),
  department: Joi.string().required(),
  branch: Joi.string().required(),
  designation: Joi.string().required(),
  joiningDate: Joi.date().required(),
  status: Joi.string().valid('active', 'inactive', 'on_leave').default('active'),
  manager: Joi.string().optional().allow(null, ''),
  salary: Joi.number().min(0).optional(),
  role: Joi.string().valid('manager', 'employee').default('employee'),
  password: Joi.string().min(6).optional(),
});

// Shift Schemas
const shiftSchema = Joi.object({
  employee: Joi.string().required(),
  shiftDate: Joi.date().required(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
    .messages({ 'string.pattern.base': 'Start time must be in HH:MM format' }),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
    .messages({ 'string.pattern.base': 'End time must be in HH:MM format' }),
  branch: Joi.string().required(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show').default('scheduled'),
  notes: Joi.string().max(500).optional().allow(''),
});

// Attendance Schemas
const checkInSchema = Joi.object({
  shift: Joi.string().optional().allow(null, ''),
  notes: Joi.string().max(500).optional().allow(''),
});

const checkOutSchema = Joi.object({
  notes: Joi.string().max(500).optional().allow(''),
});

// Leave Schemas
const leaveSchema = Joi.object({
  leaveType: Joi.string().valid('sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other').required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  reason: Joi.string().min(10).max(1000).required(),
});

const leaveReviewSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  reviewNote: Joi.string().max(500).optional().allow(''),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  employeeSchema,
  shiftSchema,
  checkInSchema,
  checkOutSchema,
  leaveSchema,
  leaveReviewSchema,
};
