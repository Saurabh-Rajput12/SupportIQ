const crypto = require('crypto');

function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || `req-${crypto.randomBytes(4).toString('hex')}`;
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');

  // Log error with requestId on server side without leaking sensitive data
  console.error(`[API Error ${requestId}] ${req.method} ${req.path} -> ${statusCode} ${errorCode}: ${err.message}`);

  const clientMessage = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected internal error occurred.'
    : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: clientMessage,
      requestId,
      ...(err.details ? { details: err.details } : {})
    }
  });
}

module.exports = errorHandler;

