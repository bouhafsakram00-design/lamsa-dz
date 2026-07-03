'use strict';
const productsSvc = require('../services/products.service');
const content = require('../services/content.service');
const customer = require('../services/customer.service');
const analytics = require('../services/analytics.service');
const helpers = require('../utils/helpers');
const config = require('../config');

function trackPageview(req) {
  analytics.track({
    type: 'pageview', path: req.path, referrer: req.get('referer'),
    visitor_id: req.visitorId, user_agent: req.get('user-agent'),
  });
}

function home(req, res) {
  trackPageview(req);
  const categories = content.categories.withCounts();
  const featured = productsSvc.featured(8);
  const testimonials = content.testimonials.active();
  const faqs = content.faqs.active();
  const services = content.services.all();
  const settings = content.settings.all();

  const productCount = require('../db').get('SELECT COUNT(*) c FROM products WHERE is_active=1').c;
  const wishlistIds = req.user ? customer.wishlist.ids(req.user.id) : [];

  res.render('pages/home', {
    pageTitle: `${settings.store_name} — Phones, Tech Accessories & Cyber Services in Algeria`,
    metaDescription: 'Buy genuine phones, accessories, cables, chargers and PC gear at honest prices in DA. Fast delivery across all 58 wilayas of Algeria. Order easily on WhatsApp.',
    canonical: config.siteUrl + '/',
    categories, featured, testimonials, faqs, services, settings,
    productCount, wishlistIds,
    bodyClass: 'page-home',
  });
}

function shop(req, res) {
  trackPageview(req);
  const { q, sort, category } = req.query;
  if (q) {
    analytics.track({ type: 'search', query: q, visitor_id: req.visitorId, path: req.path });
  }
  const result = productsSvc.list({
    q, sort, category,
    minPrice: req.query.min, maxPrice: req.query.max,
    inStock: req.query.in_stock === '1',
    page: req.query.page || 1, perPage: 12,
  });
  const categories = content.categories.withCounts();
  const settings = content.settings.all();
  const wishlistIds = req.user ? customer.wishlist.ids(req.user.id) : [];

  res.render('pages/shop', {
    pageTitle: q
      ? `Search: ${q} — ${settings.store_name}`
      : `Shop ${category ? category.replace(/-/g, ' ') : 'all products'} — ${settings.store_name}`,
    metaDescription: 'Browse phones, accessories, chargers and PC gear. Filter by category and price, sorted to help you find the best deal in Algeria.',
    canonical: config.siteUrl + '/shop',
    result, categories, settings, wishlistIds,
    filters: { q: q || '', sort: sort || 'newest', category: category || '', min: req.query.min || '', max: req.query.max || '', in_stock: req.query.in_stock || '' },
    bodyClass: 'page-shop',
  });
}

function product(req, res, next) {
  const p = productsSvc.bySlug(req.params.slug);
  if (!p) return next();

  trackPageview(req);
  productsSvc.incrementViews(p.id);
  analytics.track({ type: 'product_click', product_id: p.id, path: req.path, visitor_id: req.visitorId });

  if (req.user) customer.recentlyViewed.record(req.user.id, p.id);

  const images = productsSvc.allImages(p.id);
  const related = productsSvc.related(p, 4);
  const reviews = content.reviews.forProduct(p.id);
  const reviewStats = content.reviews.stats(p.id);
  const settings = content.settings.all();
  const wishlistIds = req.user ? customer.wishlist.ids(req.user.id) : [];

  const name = res.locals.field(p, 'name');
  const desc = res.locals.field(p, 'desc');

  res.render('pages/product', {
    pageTitle: p.meta_title || `${name} — ${helpers.formatDA(p.price)} | ${settings.store_name}`,
    metaDescription: p.meta_desc || helpers.truncate(`${name}: ${desc}`, 155),
    canonical: `${config.siteUrl}/product/${p.slug}`,
    product: p, images, related, reviews, reviewStats, settings, wishlistIds,
    name, desc,
    bodyClass: 'page-product',
  });
}

function faqPage(req, res) {
  trackPageview(req);
  const faqs = content.faqs.active();
  const settings = content.settings.all();
  res.render('pages/faq', {
    pageTitle: `FAQ — ${settings.store_name}`,
    metaDescription: 'Answers to common questions about ordering, delivery across Algeria, payment, warranty and returns at LamsaDZ.',
    canonical: config.siteUrl + '/faq',
    faqs, settings, bodyClass: 'page-faq',
  });
}

function policyPage(req, res) {
  trackPageview(req);
  const settings = content.settings.all();
  res.render('pages/policies', {
    pageTitle: `Delivery, Warranty & Returns — ${settings.store_name}`,
    metaDescription: 'Delivery to all 58 wilayas, warranty terms and our 7-day return policy. Shop with confidence at LamsaDZ.',
    canonical: config.siteUrl + '/policies',
    settings, bodyClass: 'page-policies',
  });
}

module.exports = { home, shop, product, faqPage, policyPage };
