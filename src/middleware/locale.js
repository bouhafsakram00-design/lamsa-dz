'use strict';
const i18n = require('../utils/i18n');

/**
 * Resolves the active locale from (in order): ?lang query, cookie, Accept-Language.
 * Exposes res.locals.locale, .dir, .t(), .field() for views.
 */
module.exports = function locale(req, res, next) {
  let loc = req.query.lang || req.cookies.lang;
  if (!i18n.isValid(loc)) {
    const header = (req.headers['accept-language'] || '').toLowerCase();
    if (header.startsWith('ar')) loc = 'ar';
    else if (header.startsWith('fr')) loc = 'fr';
    else loc = 'en';
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
