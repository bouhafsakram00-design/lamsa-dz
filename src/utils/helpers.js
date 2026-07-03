'use strict';

/** Format an integer DA price with thousands separators. */
function formatDA(amount) {
  if (amount == null) return '';
  return new Intl.NumberFormat('fr-DZ').format(amount) + ' DA';
}

/** Build a wa.me URL with an encoded message. */
function waUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Slugify any string. */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Escape HTML to prevent XSS when injecting user content into templates manually. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Truncate text. */
function truncate(str, n = 140) {
  str = String(str || '');
  return str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str;
}

module.exports = { formatDA, waUrl, slugify, escapeHtml, truncate };
