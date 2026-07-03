'use strict';
const express = require('express');
const router = express.Router();
const shop = require('../controllers/shop.controller');
const auth = require('../controllers/auth.controller');
const account = require('../controllers/account.controller');
const { requireAuth } = require('../middleware/auth');
const v = require('../validators');
const { authLimiter } = require('../middleware/rateLimiters');

// ---- Public pages ----
router.get('/', shop.home);
router.get('/shop', v.searchRules, v.handleValidation, shop.shop);
router.get('/product/:slug', shop.product);
router.get('/faq', shop.faqPage);
router.get('/policies', shop.policyPage);

// ---- Auth ----
router.get('/login', auth.showLogin);
router.post('/login', authLimiter, v.authRules.login, v.handleValidation, auth.login);
router.get('/register', auth.showRegister);
router.post('/register', authLimiter, v.authRules.register, v.handleValidation, auth.register);
router.post('/logout', auth.logout);
router.get('/forgot', auth.showForgot);
router.post('/forgot', authLimiter, v.authRules.forgot, v.handleValidation, auth.forgot);
router.get('/reset', auth.showReset);
router.post('/reset', authLimiter, v.authRules.reset, v.handleValidation, auth.reset);

// ---- Account (auth required) ----
router.get('/account', requireAuth, account.dashboard);
router.get('/wishlist', requireAuth, account.wishlistPage);
router.get('/compare', requireAuth, account.comparePage);

module.exports = router;
