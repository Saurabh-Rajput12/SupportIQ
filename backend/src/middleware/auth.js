const crypto = require('crypto');
const { getDb } = require('../db/connection');
const config = require('../config');

// In-memory or signed token map for simple stateful local agent sessions
const activeSessions = new Map();

function createSession(user) {
  const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
  activeSessions.set(token, {
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    createdAt: Date.now(),
  });
  return token;
}

function destroySession(token) {
  if (token) {
    activeSessions.delete(token);
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  }

  // Development bypass helper if configured and header supplied
  if (!token && config.nodeEnv === 'development' && req.headers['x-dev-agent']) {
    const db = getDb();
    const devUser = db.prepare('SELECT id, email, display_name, role FROM users WHERE is_active = 1 LIMIT 1').get();
    if (devUser) {
      req.user = {
        id: devUser.id,
        email: devUser.email,
        displayName: devUser.display_name,
        role: devUser.role,
      };
      return next();
    }
  }

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in as an authorized agent.',
      }
    });
  }

  const session = activeSessions.get(token);
  req.user = {
    id: session.userId,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
  };
  req.token = token;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires ${role} role.`,
        }
      });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  createSession,
  destroySession,
};

