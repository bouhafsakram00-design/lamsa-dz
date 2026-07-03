'use strict';
const { body, query, validationResult } = require('express-validator');

/** Collects validation errors and returns 422 (JSON) or re-renders with flash. */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const list = errors.array().map((e) => ({ field: e.path, msg: e.msg }));
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(422).json({ error: 'Validation failed', errors: list });
  }
  req.validationErrors = list;
  return next(); // let route handler decide how to re-render
}

/** Anti-spam honeypot: a hidden "website" field that bots fill in. */
function honeypot(req, res, next) {
  if (req.body && req.body.website) {
    // Silently accept to not tip off bots, but do nothing.
    return res.status(200).json({ ok: true });
  }
  next();
}

const authRules = {
  register: [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 1 }).withMessage('Password required'),
  ],
  forgot: [body('email').isEmail().normalizeEmail()],
  reset: [
    body('token').isLength({ min: 10 }),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
};

const productRules = [
  body('sku').trim().isLength({ min: 1, max: 40 }),
  body('slug').trim().isLength({ min: 1, max: 120 }),
  body('name_en').trim().isLength({ min: 1, max: 160 }),
  body('price').isInt({ min: 0 }).withMessage('Price must be a positive number'),
  body('old_price').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('stock').optional({ values: 'falsy' }).isInt({ min: 0 }),
];

const reviewRules = [
  body('author_name').trim().isLength({ min: 2, max: 60 }).withMessage('Name required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating 1–5 required'),
  body('body').trim().isLength({ min: 3, max: 800 }).withMessage('Review text required'),
];

const contactRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name required'),
  body('body').trim().isLength({ min: 5, max: 1000 }).withMessage('Message required'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
];

const newsletterRules = [body('email').isEmail().normalizeEmail().withMessage('Valid email required')];

const searchRules = [query('q').optional().trim().isLength({ max: 100 })];

module.exports = {
  handleValidation, honeypot,
  authRules, productRules, reviewRules, contactRules, newsletterRules, searchRules,
};
