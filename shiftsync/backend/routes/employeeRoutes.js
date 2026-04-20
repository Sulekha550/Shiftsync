const express = require('express');
const router = express.Router();
const {
  getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, getStats,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, employeeSchema } = require('../validators');

router.use(protect);

router.get('/stats', authorize('admin', 'manager'), getStats);
router.get('/', authorize('admin', 'manager'), getEmployees);
router.post('/', authorize('admin', 'manager'), validate(employeeSchema), createEmployee);
router.get('/:id', authorize('admin', 'manager'), getEmployee);
router.put('/:id', authorize('admin', 'manager'), updateEmployee);
router.delete('/:id', authorize('admin'), deleteEmployee);

module.exports = router;
