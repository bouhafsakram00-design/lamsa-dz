'use strict';
const customer = require('../services/customer.service');

function dashboard(req, res) {
  res.render('pages/account', {
    pageTitle: 'My account — LamsaDZ',
    bodyClass: 'page-account',
    wishlist: customer.wishlist.list(req.user.id),
    recent: customer.recentlyViewed.list(req.user.id, 8),
    compare: customer.comparison.list(req.user.id),
  });
}

function wishlistPage(req, res) {
  res.render('pages/wishlist', {
    pageTitle: 'My wishlist — LamsaDZ',
    bodyClass: 'page-wishlist',
    wishlist: customer.wishlist.list(req.user.id),
    wishlistIds: customer.wishlist.ids(req.user.id),
  });
}

function comparePage(req, res) {
  res.render('pages/compare', {
    pageTitle: 'Compare products — LamsaDZ',
    bodyClass: 'page-compare',
    compare: customer.comparison.list(req.user.id),
  });
}

module.exports = { dashboard, wishlistPage, comparePage };
