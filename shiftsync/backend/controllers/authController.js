const User = require('../models/User');
const Employee = require('../models/Employee');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already registered.', 409);
    }

    const user = await User.create({ name, email, password, role });

    // Create employee profile for non-admin users
    if (role !== 'admin') {
      await Employee.create({
        user: user._id,
        name,
        email,
        department: 'General',
        branch: 'Main',
        designation: role === 'manager' ? 'Manager' : 'Employee',
        joiningDate: new Date(),
        status: 'active',
      });
    }

    const { accessToken, refreshToken } = generateTokenPair({ id: user._id, role: user.role });

    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

    return successResponse(res, { data: { user, accessToken } }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Please contact admin.', 403);
    }

    const { accessToken, refreshToken } = generateTokenPair({ id: user._id, role: user.role });

    // Keep only last 5 refresh tokens (limit concurrent sessions)
    const updatedTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    user.refreshTokens = updatedTokens;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

    const userObj = user.toJSON();

    // Fetch employee profile if exists
    const employee = await Employee.findOne({ user: user._id }).populate('manager', 'name email');

    return successResponse(res, { data: { user: userObj, employee, accessToken } }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (requires refresh token cookie)
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return errorResponse(res, 'Refresh token not provided.', 401);
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(token)) {
      return errorResponse(res, 'Invalid refresh token.', 401);
    }

    // Rotate refresh token
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
      id: user._id,
      role: user.role,
    });

    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

    return successResponse(res, { accessToken }, 'Token refreshed');
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid or expired refresh token.', 401);
    }
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: token } });
    }

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    return successResponse(res, {}, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const employee = await Employee.findOne({ user: req.user._id }).populate('manager', 'name email designation');

    return successResponse(res, { data: { user, employee } }, 'Profile fetched');
  } catch (error) {
    next(error);
  }
};
