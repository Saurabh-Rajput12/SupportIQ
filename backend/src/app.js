const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const replyRoutes = require('./routes/replyRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const analyticsController = require('./controllers/analyticsController');
const { authMiddleware } = require('./middleware/auth');

const app = express();

// Security and headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows CDN scripts like Chart.js & Bootstrap in dev
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow local origins and requests without origin (like curl, same-origin, mobile)
    callback(null, true);
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// General health route
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'supportiq-backend',
    timestamp: new Date().toISOString(),
  });
});

// Model status route
app.get('/api/v1/models/status', authMiddleware, analyticsController.getModelStatus);

// API Routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/replies', replyRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Serve static frontend assets
const frontendDir = path.join(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// Fallback to index.html for browser navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found.`,
      }
    });
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;

