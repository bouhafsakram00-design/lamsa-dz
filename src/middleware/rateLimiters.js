'use strict';
const rateLimit = require('express-rate-limit');

const message = (msg) => ({ error: msg || 'Too many requests, please slow down.' });

/** Generic API limiter. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests. Please wait a moment.'),
});

/** Strict limiter for auth endpoints (brute-force protection). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many attempts. Please try again in a few minutes.'),
});

/** Limiter for public form submissions (contact, reviews, newsletter). */
const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('You have sent too many submissions. Please try again later.'),
});

/** Lightweight limiter for analytics beacons (high volume tolerated). */
const beaconLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: false,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, formLimiter, beaconLimiter };
