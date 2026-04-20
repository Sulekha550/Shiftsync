const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    shiftDate: {
      type: Date,
      required: [true, 'Shift date is required'],
    },
    startTime: {
      type: String, // "HH:MM" format (24-hour)
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM (24-hour)'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM (24-hour)'],
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance and conflict detection
shiftSchema.index({ employee: 1, shiftDate: 1 });
shiftSchema.index({ shiftDate: 1, branch: 1 });
shiftSchema.index({ status: 1 });

// Virtual for shift duration in hours
shiftSchema.virtual('durationHours').get(function () {
  const [startH, startM] = this.startTime.split(':').map(Number);
  const [endH, endM] = this.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60; // overnight shift
  return ((endMinutes - startMinutes) / 60).toFixed(2);
});

shiftSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Shift', shiftSchema);
