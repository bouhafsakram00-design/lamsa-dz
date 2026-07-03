'use strict';
const i18n = require('../utils/i18n');

/**
 * Resolves the active locale from (in order): ?lang query, cookie, Accept-Language.
 * Exposes res.locals.locale, .dir, .t(), .field() for views.
 */
module.exports = function locale(req, res, next) {
  // 1) Respect an explicit choice (?lang=...) or a saved cookie from a prior visit.
  let loc = req.query.lang || req.cookies.lang;
  // 2) Otherwise, honour the visitor's browser language if it is French or English.
  // 3) Otherwise, default to Arabic (primary language for our Algerian customers).
  if (!i18n.isValid(loc)) {
    const header = (req.headers['accept-language'] || '').toLowerCase();
    if (header.startsWith('fr')) loc = 'fr';
    else if (header.startsWith('en')) loc = 'en';
    else loc = 'ar';
  }
  if (req.query.lang && i18n.isValid(req.query.lang)) {
    res.cookie('lang', req.query.lang, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: false, sameSite: 'lax' });
  }
  res.locals.locale = loc;
  res.locals.dir = i18n.dir(loc);
  res.locals.t = (key) => i18n.t(loc, key);
  res.locals.field = (row, base) => i18n.field(row, base, loc);
  res.locals.locales = i18n.LOCALES;
  next();
};
