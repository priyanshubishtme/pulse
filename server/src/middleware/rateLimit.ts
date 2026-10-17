import rateLimit from 'express-rate-limit';

export const createLinkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many links created, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
