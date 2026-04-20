require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      Employee.deleteMany(),
      Shift.deleteMany(),
      Attendance.deleteMany(),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@shiftsync.com',
      password: 'admin123',
      role: 'admin',
    });

    // Create Managers
    const manager1User = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah@shiftsync.com',
      password: 'manager123',
      role: 'manager',
    });

    const manager2User = await User.create({
      name: 'Mike Chen',
      email: 'mike@shiftsync.com',
      password: 'manager123',
      role: 'manager',
    });

    // Create Employee Users
    const empUsers = await User.insertMany([
      { name: 'Alice Williams', email: 'alice@shiftsync.com', password: 'emp123', role: 'employee' },
      { name: 'Bob Martinez', email: 'bob@shiftsync.com', password: 'emp123', role: 'employee' },
      { name: 'Carol Davis', email: 'carol@shiftsync.com', password: 'emp123', role: 'employee' },
      { name: 'David Lee', email: 'david@shiftsync.com', password: 'emp123', role: 'employee' },
      { name: 'Emma Wilson', email: 'emma@shiftsync.com', password: 'emp123', role: 'employee' },
    ]);

    // Create Manager Employee Profiles
    const manager1Emp = await Employee.create({
      user: manager1User._id,
      name: 'Sarah Johnson',
      email: 'sarah@shiftsync.com',
      department: 'Engineering',
      branch: 'New York',
      designation: 'Engineering Manager',
      joiningDate: new Date('2020-03-15'),
      status: 'active',
      salary: 95000,
    });

    const manager2Emp = await Employee.create({
      user: manager2User._id,
      name: 'Mike Chen',
      email: 'mike@shiftsync.com',
      department: 'Operations',
      branch: 'Los Angeles',
      designation: 'Operations Manager',
      joiningDate: new Date('2019-07-01'),
      status: 'active',
      salary: 90000,
    });

    // Create Employee Profiles
    const employees = await Employee.insertMany([
      {
        user: empUsers[0]._id, name: 'Alice Williams', email: 'alice@shiftsync.com',
        department: 'Engineering', branch: 'New York', designation: 'Senior Developer',
        joiningDate: new Date('2021-01-10'), status: 'active',
        manager: manager1Emp._id, salary: 75000,
      },
      {
        user: empUsers[1]._id, name: 'Bob Martinez', email: 'bob@shiftsync.com',
        department: 'Engineering', branch: 'New York', designation: 'Developer',
        joiningDate: new Date('2022-04-01'), status: 'active',
        manager: manager1Emp._id, salary: 60000,
      },
      {
        user: empUsers[2]._id, name: 'Carol Davis', email: 'carol@shiftsync.com',
        department: 'Operations', branch: 'Los Angeles', designation: 'Operations Analyst',
        joiningDate: new Date('2021-08-15'), status: 'active',
        manager: manager2Emp._id, salary: 55000,
      },
      {
        user: empUsers[3]._id, name: 'David Lee', email: 'david@shiftsync.com',
        department: 'Operations', branch: 'Los Angeles', designation: 'Support Specialist',
        joiningDate: new Date('2023-02-20'), status: 'active',
        manager: manager2Emp._id, salary: 48000,
      },
      {
        user: empUsers[4]._id, name: 'Emma Wilson', email: 'emma@shiftsync.com',
        department: 'Engineering', branch: 'New York', designation: 'QA Engineer',
        joiningDate: new Date('2022-11-01'), status: 'active',
        manager: manager1Emp._id, salary: 65000,
      },
    ]);

    // Create Shifts for this week
    const today = new Date();
    const allEmployees = [manager1Emp, manager2Emp, ...employees];
    const shifts = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - 3 + i);
      date.setHours(0, 0, 0, 0);

      for (let j = 0; j < Math.min(allEmployees.length, 5); j++) {
        shifts.push({
          employee: allEmployees[j]._id,
          shiftDate: date,
          startTime: j % 2 === 0 ? '09:00' : '13:00',
          endTime: j % 2 === 0 ? '17:00' : '21:00',
          branch: allEmployees[j].branch,
          status: i < 3 ? 'completed' : 'scheduled',
          createdBy: adminUser._id,
        });
      }
    }

    await Shift.insertMany(shifts);

    // Create Attendance for past 3 days
    const attendanceRecords = [];
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);

      for (const emp of employees) {
        const checkIn = new Date(date);
        checkIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        const checkOut = new Date(date);
        checkOut.setHours(17, Math.floor(Math.random() * 30), 0, 0);
        const totalHours = (checkOut - checkIn) / (1000 * 60 * 60);

        attendanceRecords.push({
          employee: emp._id,
          date,
          checkIn,
          checkOut,
          totalHours: parseFloat(totalHours.toFixed(2)),
          status: 'present',
        });
      }
    }

    await Attendance.insertMany(attendanceRecords);

    console.log('\n✅ Seed data created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Admin:    admin@shiftsync.com   / admin123');
    console.log('   Manager:  sarah@shiftsync.com   / manager123');
    console.log('   Manager:  mike@shiftsync.com    / manager123');
    console.log('   Employee: alice@shiftsync.com   / emp123');
    console.log('   Employee: bob@shiftsync.com     / emp123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
