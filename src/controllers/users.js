const User = require('../models/User');
const { AppError } = require('../middleware/errors');

const me = async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'notes',
    select: 'title content owner isArchived createdAt updatedAt',
  });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: { user } });
};

const myNotes = async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'notes',
    select: 'title content owner isArchived createdAt updatedAt',
  });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: { notes: user.notes } });
};

module.exports = { me, myNotes };
