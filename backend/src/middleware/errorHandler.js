// backend/src/middleware/errorHandler.js

const { env } = require('../config/env');
const { sendError } = require('../utils/response');

// Async wrapper — eliminates try/catch in every controller
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // PostgreSQL errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this information already exists';
  }
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist';
  }
  if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid data format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  console.error(`[${new Date().toISOString()}] ${statusCode} - ${message}`, {
    url: req.originalUrl,
    method: req.method,
    ...(env.isDev && { stack: err.stack }),
  });

  return sendError(
    res,
    message,
    statusCode,
    env.isDev ? { stack: err.stack } : null
  );
};

module.exports = { asyncHandler, notFound, errorHandler };