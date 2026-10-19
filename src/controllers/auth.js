const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../middleware/errors');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const issueToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const register = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('Request body must be a JSON object', 400);
  }
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError('Name, email, and password are required', 400);
  }
  const user = await User.create({ name, email, password });
  res.status(201).json({ success: true, data: { user: publicUser(user), token: issueToken(user) } });
};

const login = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('Request body must be a JSON object', 400);
  }
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError('Email and password are required', 400);
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  res.json({ success: true, data: { user: publicUser(user), token: issueToken(user) } });
};

const me = async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
};

module.exports = { register, login, me };
