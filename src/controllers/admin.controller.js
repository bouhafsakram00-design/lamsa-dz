'use strict';
const db = require('../db');
const productsSvc = require('../services/products.service');
const content = require('../services/content.service');
const analytics = require('../services/analytics.service');
const ordersSvc = require('../services/orders.service');
const customersSvc = require('../services/customers.service');
const couponsSvc = require('../services/coupons.service');
const { processImages } = require('../middleware/upload');
const { slugify } = require('../utils/helpers');

function adminCommon() {
  return {
    unreadMessages: content.messages.unreadCount(),
    pendingOrders: ordersSvc.metrics().pending,
    pendingReviews: content.reviews.pending().length,
    lowStockCount: productsSvc.lowStock(100).length,
  };
}

// ---- Dashboard ----
function dashboard(req, res) {
  const summary = analytics.summary(30);
  const traffic = analytics.dailySeries(14);
  const om = ordersSvc.metrics();
  const sales = ordersSvc.salesSeries(14);
  const bestSellers = ordersSvc.bestSellers(5);
  const recentOrders = ordersSvc.recentOrders(6);
  const recentCustomers = customersSvc.recent(5);
  const statusCounts = ordersSvc.statusCounts();

  // Conversion rate = orders / unique visitors (last 30d)
  const conversion = summary.uniqueVisitors > 0
    ? Math.round((om.ordersMonth / summary.uniqueVisitors) * 1000) / 10
    : 0;

  const stats = {
    products: db.get('SELECT COUNT(*) c FROM products').c,
    activeProducts: db.get('SELECT COUNT(*) c FROM products WHERE is_active=1').c,
    categories: db.get('SELECT COUNT(*) c FROM categories').c,
    customers: customersSvc.count(),
    reviews: db.get('SELECT COUNT(*) c FROM reviews WHERE is_approved=1').c,
    subscribers: content.subscribers.count(),
  };
  const lowStock = productsSvc.lowStock(8);

  res.render('admin/dashboard', {
    layout: false,
    pageTitle: 'Dashboard — LamsaDZ Admin',
    summary, traffic, sales, om, bestSellers, recentOrders, recentCustomers,
    statusCounts, conversion, stats, lowStock,
    helpers: require('../utils/helpers'),
    ...adminCommon(),
    active: 'dashboard',
  });
}

// ================= ORDERS =================
function orders(req, res) {
  const result = ordersSvc.list({ status: req.query.status, q: req.query.q, page: req.query.page || 1 });
  res.render('admin/orders', {
    layout: false, pageTitle: 'Orders — Admin', result,
    statuses: ordersSvc.STATUSES, statusCounts: ordersSvc.statusCounts(),
    filters: { status: req.query.status || '', q: req.query.q || '' },
    helpers: require('../utils/helpers'), ...adminCommon(), active: 'orders',
  });
}
function orderView(req, res, next) {
  const order = ordersSvc.byId(Number(req.params.id));
  if (!order) return next();
  res.render('admin/order-view', {
    layout: false, pageTitle: `Order ${order.reference} — Admin`,
    order, statuses: ordersSvc.STATUSES, settings: content.settings.all(),
    helpers: require('../utils/helpers'), ...adminCommon(), active: 'orders',
  });
}
function orderUpdateStatus(req, res) {
  ordersSvc.updateStatus(Number(req.params.id), req.body.status, req.body.note, req.user.id);
  res.redirect('/admin/orders/' + req.params.id);
}
function orderAddNote(req, res) {
  if (req.body.note) ordersSvc.addNote(Number(req.params.id), req.body.note);
  res.redirect('/admin/orders/' + req.params.id);
}
function orderInvoice(req, res, next) {
  const order = ordersSvc.byId(Number(req.params.id));
  if (!order) return next();
  res.render('admin/invoice', {
    layout: false, order, settings: content.settings.all(),
    helpers: require('../utils/helpers'),
  });
}

// ================= CUSTOMERS =================
function customers(req, res) {
  const result = customersSvc.list({ q: req.query.q, page: req.query.page || 1 });
  res.render('admin/customers', {
    layout: false, pageTitle: 'Customers — Admin', result,
    filters: { q: req.query.q || '' },
    helpers: require('../utils/helpers'), ...adminCommon(), active: 'customers',
  });
}
function customerView(req, res, next) {
  const customer = customersSvc.profile(Number(req.params.id));
  if (!customer) return next();
  res.render('admin/customer-view', {
    layout: false, pageTitle: `${customer.name} — Admin`, customer,
    helpers: require('../utils/helpers'), ...adminCommon(), active: 'customers',
  });
}

// ================= COUPONS =================
function coupons(req, res) {
  res.render('admin/coupons', {
    layout: false, pageTitle: 'Coupons — Admin', coupons: couponsSvc.all(),
    editing: req.query.edit ? couponsSvc.byId(Number(req.query.edit)) : null,
    saved: req.query.saved === '1',
    helpers: require('../utils/helpers'), ...adminCommon(), active: 'coupons',
  });
}
function saveCoupon(req, res) {
  const d = { ...req.body, is_active: req.body.is_active ? 1 : 0 };
  if (req.params.id) couponsSvc.update(Number(req.params.id), d);
  else couponsSvc.create(d);
  res.redirect('/admin/coupons?saved=1');
}
function deleteCoupon(req, res) {
  couponsSvc.remove(Number(req.params.id));
  res.redirect('/admin/coupons');
}

// ---- Products list ----
function products(req, res) {
  const result = productsSvc.list({
    q: req.query.q, sort: req.query.sort || 'newest', category: req.query.category,
    includeInactive: true, page: req.query.page || 1, perPage: 20,
  });
  res.render('admin/products', {
    layout: false, pageTitle: 'Products — LamsaDZ Admin',
    result, categories: content.categories.all(),
    filters: { q: req.query.q || '', sort: req.query.sort || 'newest', category: req.query.category || '' },
    ...adminCommon(), active: 'products',
  });
}

// ---- Product form (new/edit) ----
function newProduct(req, res) {
  res.render('admin/product-form', {
    layout: false, pageTitle: 'New product — Admin',
    product: null, images: [], categories: content.categories.all(),
    errors: [], ...adminCommon(), active: 'products',
  });
}
function editProduct(req, res, next) {
  const p = productsSvc.byId(Number(req.params.id));
  if (!p) return next();
  res.render('admin/product-form', {
    layout: false, pageTitle: `Edit ${p.name_en} — Admin`,
    product: p, images: productsSvc.allImages(p.id), categories: content.categories.all(),
    errors: [], ...adminCommon(), active: 'products',
  });
}

async function saveProduct(req, res) {
  const data = req.body;
  if (!data.slug) data.slug = slugify(data.name_en);
  if (req.validationErrors) {
    const id = req.params.id ? Number(req.params.id) : null;
    return res.status(422).render('admin/product-form', {
      layout: false, pageTitle: 'Product — Admin',
      product: id ? { ...productsSvc.byId(id), ...data, id } : data,
      images: id ? productsSvc.allImages(id) : [],
      categories: content.categories.all(),
      errors: req.validationErrors, ...adminCommon(), active: 'products',
    });
  }

  data.is_featured = data.is_featured === 'on' || data.is_featured === '1';
  data.is_active = data.is_active === 'on' || data.is_active === '1';

  let productId;
  if (req.params.id) {
    productId = Number(req.params.id);
    productsSvc.update(productId, data);
  } else {
    productId = productsSvc.create(data);
  }

  if (req.files && req.files.length) {
    const urls = await processImages(req.files);
    urls.forEach((url, i) => {
      const hasPrimary = productsSvc.allImages(productId).some((im) => im.is_primary);
      productsSvc.addImage(productId, url, data.name_en, !hasPrimary && i === 0);
    });
  }
  res.redirect('/admin/products?saved=1');
}

function deleteProduct(req, res) {
  productsSvc.remove(Number(req.params.id));
  res.redirect('/admin/products?deleted=1');
}

function deleteProductImage(req, res) {
  productsSvc.removeImage(Number(req.params.imageId));
  res.redirect('/admin/products/' + req.params.id + '/edit');
}

// ---- Inventory ----
function inventory(req, res) {
  const all = productsSvc.list({ includeInactive: true, perPage: 60, sort: 'name' }).items;
  res.render('admin/inventory', {
    layout: false, pageTitle: 'Inventory — Admin',
    products: all, lowStock: productsSvc.lowStock(50),
    ...adminCommon(), active: 'inventory',
  });
}
function adjustInventory(req, res) {
  const id = Number(req.params.id);
  const change = parseInt(req.body.change, 10) || 0;
  if (change !== 0) productsSvc.adjustStock(id, change, req.body.reason || 'adjustment', req.user.id);
  res.redirect('/admin/inventory');
}

// ---- Reviews moderation ----
function reviews(req, res) {
  res.render('admin/reviews', {
    layout: false, pageTitle: 'Reviews — Admin',
    pending: content.reviews.pending(),
    ...adminCommon(), active: 'reviews',
  });
}
function approveReview(req, res) { content.reviews.approve(Number(req.params.id)); res.redirect('/admin/reviews'); }
function deleteReview(req, res) { content.reviews.remove(Number(req.params.id)); res.redirect('/admin/reviews'); }

// ---- Messages ----
function messages(req, res) {
  res.render('admin/messages', {
    layout: false, pageTitle: 'Messages — Admin',
    messages: content.messages.all(),
    ...adminCommon(), active: 'messages',
  });
}
function readMessage(req, res) { content.messages.markRead(Number(req.params.id)); res.redirect('/admin/messages'); }

// ---- Settings ----
function settings(req, res) {
  res.render('admin/settings', {
    layout: false, pageTitle: 'Settings — Admin',
    settings: content.settings.all(),
    saved: req.query.saved === '1',
    ...adminCommon(), active: 'settings',
  });
}
function saveSettings(req, res) {
  const keys = [
    'store_name', 'whatsapp_number', 'store_address', 'store_email', 'store_phone',
    'store_hours', 'delivery_info', 'warranty_info', 'return_policy', 'ga_id',
    'flash_enabled', 'flash_title', 'flash_subtitle', 'flash_end',
  ];
  keys.forEach((k) => {
    if (k === 'flash_enabled') return; // handled explicitly below (checkbox)
    if (req.body[k] != null) content.settings.set(k, String(req.body[k]).trim());
  });
  // Checkbox: present in body only when ticked
  content.settings.set('flash_enabled', req.body.flash_enabled ? '1' : '0');
  res.redirect('/admin/settings?saved=1');
}

// ---- Analytics page ----
function analyticsPage(req, res) {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
  res.render('admin/analytics', {
    layout: false, pageTitle: 'Analytics — Admin',
    summary: analytics.summary(days),
    series: analytics.dailySeries(days),
    topProducts: analytics.topProducts(10, days),
    topSearches: analytics.topSearches(15, days),
    topPages: analytics.topPages(10, days),
    days, ...adminCommon(), active: 'analytics',
  });
}

// ---- Change password ----
const users = require('../services/users.service');

function accountPage(req, res) {
  res.render('admin/account', {
    layout: false, pageTitle: 'My Account — Admin',
    error: null, success: req.query.saved === '1',
    ...adminCommon(), active: 'account',
  });
}

function changePassword(req, res) {
  const { current_password, new_password, confirm_password } = req.body;
  const render = (error) =>
    res.status(error ? 400 : 200).render('admin/account', {
      layout: false, pageTitle: 'My Account — Admin',
      error, success: false, ...adminCommon(), active: 'account',
    });

  if (new_password !== confirm_password) {
    return render('The new password and confirmation do not match.');
  }
  const result = users.changePassword(req.user.id, current_password, new_password);
  if (!result.ok) return render(result.error);
  return res.redirect('/admin/account?saved=1');
}

module.exports = {
  dashboard, products, newProduct, editProduct, saveProduct, deleteProduct, deleteProductImage,
  inventory, adjustInventory, reviews, approveReview, deleteReview,
  messages, readMessage, settings, saveSettings, analyticsPage,
  accountPage, changePassword,
  orders, orderView, orderUpdateStatus, orderAddNote, orderInvoice,
  customers, customerView,
  coupons, saveCoupon, deleteCoupon,
};
