const app = require('./app');
const config = require('./config');
const { getDb } = require('./db/connection');

// Ensure database connection is initialized
try {
  getDb();
  console.log('[Server] SQLite database initialized successfully at:', config.dbPath);
} catch (err) {
  console.error('[Server Error] Failed to initialize SQLite database:', err);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` SupportIQ Backend API Gateway running on port ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Health check: http://localhost:${config.port}/api/v1/health`);
  console.log(` Frontend Dashboard: http://localhost:${config.port}/`);
  console.log(` Connected to ML Service at: ${config.mlServiceUrl}`);
  console.log(`=======================================================`);
});

module.exports = server;
