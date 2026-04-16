const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Transaction rate limit exceeded. Please slow down.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Transaction rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

module.exports = { apiLimiter, transactionLimiter };
