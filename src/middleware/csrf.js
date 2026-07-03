'use strict';
const crypto = require('crypto');
const config = require('../config');

/**
 * Stateless CSRF protection using the synchronizer-token pattern stored in
 * the session. Token is exposed via res.locals.csrfToken for forms and must
 * be sent back as a hidden field (_csrf) or X-CSRF-Token header on unsafe
 * methods. Constant-time comparison guards against timing attacks.
 */
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function ensureToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function csrf(req, res, next) {
  const token = ensureToken(req);
  res.locals.csrfToken = token;

  if (SAFE.has(req.method)) return next();

  const sent =
    (req.body && req.body._csrf) ||
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'];

  const valid =
    typeof sent === 'string' &&
    sent.length === token.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(token));

  if (!valid) {
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return res.status(403).render('pages/error', { code: 403, message: 'Invalid or expired form token. Please go back and try again.' });
  }
  next();
}

/**
 * Token-issuing only (no verification). Use on routes where the body is parsed
 * later (e.g. multipart/multer); pair with verifyToken AFTER the parser.
 */
function issueToken(req, res, next) {
  res.locals.csrfToken = ensureToken(req);
  next();
}

/** Verification-only middleware; run AFTER body/multipart parsing. */
function verifyToken(req, res, next) {
  const token = ensureToken(req);
  if (SAFE.has(req.method)) return next();
  const sent = (req.body && req.body._csrf) || req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const valid =
    typeof sent === 'string' &&
    sent.length === token.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(token));
  if (!valid) {
    return res.status(403).render('pages/error', { code: 403, message: 'Invalid or expired form token. Please go back and try again.' });
  }
  next();
}

module.exports = csrf;
module.exports.issueToken = issueToken;
module.exports.verifyToken = verifyToken;
