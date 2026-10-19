const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errors');

const protect = async (req, res, next) => {
  const header = req.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('+password');
    if (!user) return next(new AppError('Authentication required', 401));
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401));
    }
    return next(new AppError('Invalid authentication token', 401));
  }
};

module.exports = protect;
