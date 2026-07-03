'use strict';
/**
 * Basic smoke tests (node --test). Run: npm test
 * These check the service layer + helpers without needing the HTTP server.
 */
const { test } = require('node:test');
const assert = require('node:assert');

const helpers = require('../src/utils/helpers');
const i18n = require('../src/utils/i18n');
const products = require('../src/services/products.service');
const content = require('../src/services/content.service');

test('formatDA formats prices', () => {
  assert.match(helpers.formatDA(12000), /12.?000 DA/);
});

test('slugify produces clean slugs', () => {
  assert.strictEqual(helpers.slugify('Anker PowerPort III 30W'), 'anker-powerport-iii-30w');
});

test('escapeHtml prevents XSS', () => {
  assert.strictEqual(helpers.escapeHtml('<script>'), '&lt;script&gt;');
});

test('i18n falls back to English', () => {
  assert.strictEqual(i18n.t('xx', 'nav_shop'), i18n.t('en', 'nav_shop'));
});

test('i18n Arabic is RTL', () => {
  assert.strictEqual(i18n.dir('ar'), 'rtl');
});

test('product list returns items', () => {
  const res = products.list({ perPage: 5 });
  assert.ok(res.items.length > 0);
  assert.ok(res.total >= res.items.length);
});

test('product list filters by category', () => {
  const res = products.list({ category: 'phones', perPage: 50 });
  assert.ok(res.items.every((p) => p.category_slug === 'phones'));
});

test('search suggestions work', () => {
  const s = products.suggest('charger', 5);
  assert.ok(Array.isArray(s));
});

test('settings load', () => {
  const s = content.settings.all();
  assert.ok(s.whatsapp_number);
});

test('faqs load', () => {
  assert.ok(content.faqs.active().length > 0);
});
