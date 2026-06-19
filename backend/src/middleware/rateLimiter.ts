import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: `You have exceeded the ${config.rateLimit.maxRequests} requests in ${config.rateLimit.windowMs / 1000} seconds limit.`,
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  handler: (req, res, _next, options) => {
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      },
      'Rate limit exceeded'
    );
    res.status(429).json(options.message);
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Stricter rate limiter for search endpoints to prevent abuse
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many search requests',
    message: 'Please slow down your search requests.',
  },
});
