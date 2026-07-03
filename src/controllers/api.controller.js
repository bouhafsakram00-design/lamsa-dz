'use strict';
const productsSvc = require('../services/products.service');
const content = require('../services/content.service');
const customer = require('../services/customer.service');
const analytics = require('../services/analytics.service');

// ---- Analytics beacon ----
function track(req, res) {
  const allowed = ['pageview', 'product_click', 'whatsapp_click', 'search', 'add_wishlist'];
  const { type, product_id, query, path } = req.body || {};
  if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid event type' });
  analytics.track({
    type,
    product_id: product_id ? Number(product_id) : null,
    query: query ? String(query).slice(0, 100) : null,
    path: path ? String(path).slice(0, 255) : req.get('referer'),
    referrer: req.get('referer'),
    visitor_id: req.visitorId,
    user_agent: req.get('user-agent'),
  });
  res.json({ ok: true });
}

// ---- Search suggestions ----
function suggest(req, res) {
  const q = (req.query.q || '').toString().trim();
  if (q) analytics.track({ type: 'search', query: q, visitor_id: req.visitorId });
  res.json({ suggestions: productsSvc.suggest(q, 6) });
}

// ---- Wishlist (auth) ----
function wishlistToggle(req, res) {
  const pid = Number(req.body.product_id);
  if (!pid) return res.status(400).json({ error: 'product_id required' });
  const ids = customer.wishlist.ids(req.user.id);
  let inWishlist;
  if (ids.includes(pid)) {
    customer.wishlist.remove(req.user.id, pid);
    inWishlist = false;
  } else {
    customer.wishlist.add(req.user.id, pid);
    inWishlist = true;
    analytics.track({ type: 'add_wishlist', product_id: pid, visitor_id: req.visitorId });
  }
  res.json({ ok: true, inWishlist, count: customer.wishlist.ids(req.user.id).length });
}

// ---- Comparison (auth) ----
function compareToggle(req, res) {
  const pid = Number(req.body.product_id);
  if (!pid) return res.status(400).json({ error: 'product_id required' });
  const ids = customer.comparison.list(req.user.id).map((p) => p.id);
  if (ids.includes(pid)) {
    customer.comparison.remove(req.user.id, pid);
    return res.json({ ok: true, inCompare: false, count: ids.length - 1 });
  }
  const added = customer.comparison.add(req.user.id, pid);
  if (!added) return res.status(400).json({ error: 'You can compare up to 4 products.' });
  res.json({ ok: true, inCompare: true, count: ids.length + 1 });
}

// ---- Reviews (public submit; needs approval) ----
function addReview(req, res) {
  if (req.validationErrors) return res.status(422).json({ error: 'Validation failed', errors: req.validationErrors });
  const product = productsSvc.byId(Number(req.body.product_id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  content.reviews.add({
    product_id: product.id,
    user_id: req.user ? req.user.id : null,
    author_name: req.body.author_name,
    rating: Number(req.body.rating),
    body: req.body.body,
  });
  res.json({ ok: true, message: 'Thank you! Your review will appear after approval.' });
}

// ---- Contact (public, secured) ----
function contact(req, res) {
  if (req.validationErrors) {
    if (req.accepts('html') && !req.xhr) {
      return res.status(422).render('pages/error', { code: 422, message: 'Please fill the form correctly.' });
    }
    return res.status(422).json({ error: 'Validation failed', errors: req.validationErrors });
  }
  content.messages.add({
    name: req.body.name, phone: req.body.phone, email: req.body.email,
    body: req.body.body, ip: req.ip,
  });
  res.json({ ok: true, message: 'Message sent! We will reply on WhatsApp shortly.' });
}

// ---- Newsletter ----
function subscribe(req, res) {
  if (req.validationErrors) return res.status(422).json({ error: 'Valid email required' });
  content.subscribers.add(req.body.email);
  res.json({ ok: true, message: 'Subscribed! Watch for deals & new arrivals.' });
}

// ---- Public products JSON (for SPA-like enhancements) ----
function listProducts(req, res) {
  const result = productsSvc.list({
    q: req.query.q, sort: req.query.sort, category: req.query.category,
    minPrice: req.query.min, maxPrice: req.query.max,
    inStock: req.query.in_stock === '1',
    page: req.query.page || 1, perPage: req.query.per_page || 12,
  });
  res.json(result);
}

module.exports = {
  track, suggest, wishlistToggle, compareToggle,
  addReview, contact, subscribe, listProducts,
};
