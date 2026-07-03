'use strict';
const users = require('../services/users.service');
const logger = require('../utils/logger');

function showLogin(req, res) {
  res.render('pages/login', { pageTitle: 'Log in — LamsaDZ', next: req.query.next || '/account', bodyClass: 'page-auth', errors: [] });
}
function showRegister(req, res) {
  res.render('pages/register', { pageTitle: 'Create account — LamsaDZ', bodyClass: 'page-auth', errors: [] });
}

function login(req, res) {
  if (req.validationErrors) {
    return res.status(422).render('pages/login', { pageTitle: 'Log in — LamsaDZ', next: req.body.next || '/account', errors: req.validationErrors, bodyClass: 'page-auth' });
  }
  const user = users.verify(req.body.email, req.body.password);
  if (!user) {
    return res.status(401).render('pages/login', {
      pageTitle: 'Log in — LamsaDZ', next: req.body.next || '/account',
      errors: [{ msg: 'Invalid email or password.' }], bodyClass: 'page-auth',
    });
  }
  req.session.regenerate((err) => {
    if (err) { logger.error('session regen', err); }
    req.session.userId = user.id;
    const dest = (req.body.next && req.body.next.startsWith('/')) ? req.body.next : (['admin', 'manager'].includes(user.role) ? '/admin' : '/account');
    res.redirect(dest);
  });
}

function register(req, res) {
  if (req.validationErrors) {
    return res.status(422).render('pages/register', { pageTitle: 'Create account — LamsaDZ', errors: req.validationErrors, bodyClass: 'page-auth' });
  }
  if (users.byEmail(req.body.email)) {
    return res.status(409).render('pages/register', {
      pageTitle: 'Create account — LamsaDZ',
      errors: [{ msg: 'An account with this email already exists.' }], bodyClass: 'page-auth',
    });
  }
  const id = users.register(req.body);
  req.session.regenerate(() => {
    req.session.userId = id;
    res.redirect('/account');
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

function showForgot(req, res) {
  res.render('pages/forgot', { pageTitle: 'Reset password — LamsaDZ', bodyClass: 'page-auth', sent: false, token: null, errors: [] });
}

function forgot(req, res) {
  const token = users.createResetToken(req.body.email);
  // In production this token would be emailed. For this build we surface it
  // on a confirmation screen so the flow is testable without an SMTP server.
  res.render('pages/forgot', {
    pageTitle: 'Reset password — LamsaDZ', bodyClass: 'page-auth',
    sent: true, token, errors: [],
  });
}

function showReset(req, res) {
  res.render('pages/reset', { pageTitle: 'Set new password — LamsaDZ', bodyClass: 'page-auth', token: req.query.token || '', errors: [] });
}

function reset(req, res) {
  if (req.validationErrors) {
    return res.status(422).render('pages/reset', { pageTitle: 'Set new password — LamsaDZ', token: req.body.token, errors: req.validationErrors, bodyClass: 'page-auth' });
  }
  const ok = users.resetPassword(req.body.token, req.body.password);
  if (!ok) {
    return res.status(400).render('pages/reset', {
      pageTitle: 'Set new password — LamsaDZ', token: '',
      errors: [{ msg: 'This reset link is invalid or has expired.' }], bodyClass: 'page-auth',
    });
  }
  res.redirect('/login');
}

module.exports = { showLogin, showRegister, login, register, logout, showForgot, forgot, showReset, reset };
