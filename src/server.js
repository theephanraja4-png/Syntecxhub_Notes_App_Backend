require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');

const port = process.env.PORT || 5000;

const start = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET must be configured with at least 16 characters');
  }
  await connectDatabase();
  app.listen(port, () => console.log(`Notes API listening on port ${port}`));
};

start().catch((error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exit(1);
});
