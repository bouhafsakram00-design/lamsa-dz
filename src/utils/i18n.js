'use strict';
/**
 * Lightweight i18n. Supported locales: en, fr, ar (RTL).
 * t(locale, key) returns the string, falling back to en, then the key.
 */
const STRINGS = require('./strings');

const LOCALES = ['en', 'fr', 'ar'];
const RTL = ['ar'];

function isValid(locale) {
  return LOCALES.includes(locale);
}

function dir(locale) {
  return RTL.includes(locale) ? 'rtl' : 'ltr';
}

function t(locale, key) {
  const loc = isValid(locale) ? locale : 'en';
  return (STRINGS[loc] && STRINGS[loc][key]) || STRINGS.en[key] || key;
}

/** Pick a localized field from a row, e.g. field(p,'name','fr') -> p.name_fr. */
function field(row, base, locale) {
  if (!row) return '';
  const loc = isValid(locale) ? locale : 'en';
  return row[`${base}_${loc}`] || row[`${base}_en`] || '';
}

module.exports = { LOCALES, RTL, isValid, dir, t, field };
