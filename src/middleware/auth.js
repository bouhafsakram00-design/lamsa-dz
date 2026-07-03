'use strict';
const users = require('../services/users.service');

/** Loads the current user (if logged in) into req.user / res.locals.user. */
function loadUser(req, res, next) {
  if (req.session && req.session.userId) {
    const u = users.byId(req.session.userId);
    if (u && u.is_active) {
      req.user = u;
      res.locals.user = u;
    } else {
      req.session.userId = null;
    }
  }
  res.locals.user = res.locals.user || null;
  next();
}

/** Requires any authenticated user. */
function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.accepts('html')) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/** Requires an admin (or manager) role. */
function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    if (req.accepts('html')) return res.status(403).render('pages/error', { code: 403, message: 'Access denied' });
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/** Role gate factory: requireRole('admin'). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { loadUser, requireAuth, requireAdmin, requireRole };
