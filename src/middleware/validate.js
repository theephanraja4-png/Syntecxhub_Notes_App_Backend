const mongoose = require('mongoose');
const { AppError } = require('./errors');

const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter(
    (field) => typeof req.body[field] !== 'string' || !req.body[field].trim()
  );
  if (missing.length) {
    return next(new AppError(`Missing required field(s): ${missing.join(', ')}`, 400));
  }
  next();
};

const validateId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError('Invalid resource ID', 400));
  }
  next();
};

module.exports = { requireFields, validateId };
