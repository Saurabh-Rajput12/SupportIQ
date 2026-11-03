require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.join(__dirname, '../db/supportiq.db'),
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-prod-12345678',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000').split(','),
};

