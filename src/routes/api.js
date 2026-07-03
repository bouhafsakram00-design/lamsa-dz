'use strict';
const express = require('express');
const router = express.Router();
const api = require('../controllers/api.controller');
const { requireAuth } = require('../middleware/auth');
const v = require('../validators');
const { apiLimiter, formLimiter, beaconLimiter } = require('../middleware/rateLimiters');

router.use(express.json({ limit: '32kb' }));

// Analytics beacon (high volume, light limiter, CSRF-exempt via header token on client)
router.post('/track', beaconLimiter, api.track);

// Search suggestions
router.get('/suggest', apiLimiter, api.suggest);

// Public product JSON
router.get('/products', apiLimiter, api.listProducts);

// Customer actions (auth)
router.post('/wishlist', apiLimiter, requireAuth, api.wishlistToggle);
router.post('/compare', apiLimiter, requireAuth, api.compareToggle);

// Reviews (public submit, anti-spam)
router.post('/reviews', formLimiter, v.honeypot, v.reviewRules, v.handleValidation, api.addReview);

// Contact + newsletter (public, anti-spam)
router.post('/contact', formLimiter, v.honeypot, v.contactRules, v.handleValidation, api.contact);
router.post('/subscribe', formLimiter, v.honeypot, v.newsletterRules, v.handleValidation, api.subscribe);

module.exports = router;
