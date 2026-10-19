const mongoose = require('mongoose');

const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }
  await mongoose.connect(process.env.MONGODB_URI);
};

module.exports = connectDatabase;
