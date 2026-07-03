'use strict';
const db = require('../db');
const products = require('./products.service');

function listProductsByJoin(table, userId, limit = 50, orderCol = 'created_at') {
  const rows = db.all(
    `SELECT p.* FROM ${table} t JOIN products p ON p.id=t.product_id
     WHERE t.user_id=? AND p.is_active=1 ORDER BY t.${orderCol} DESC LIMIT ?`,
    [userId, limit]
  );
  return rows.map(products.decorate);
}

const wishlist = {
  add(userId, productId) {
    db.run('INSERT OR IGNORE INTO wishlists (user_id,product_id) VALUES (?,?)', [userId, productId]);
  },
  remove(userId, productId) {
    db.run('DELETE FROM wishlists WHERE user_id=? AND product_id=?', [userId, productId]);
  },
  list(userId) { return listProductsByJoin('wishlists', userId); },
  ids(userId) {
    return db.all('SELECT product_id FROM wishlists WHERE user_id=?', [userId]).map((r) => r.product_id);
  },
};

const recentlyViewed = {
  record(userId, productId) {
    db.run(
      `INSERT INTO recently_viewed (user_id,product_id,viewed_at) VALUES (?,?,datetime('now'))
       ON CONFLICT(user_id,product_id) DO UPDATE SET viewed_at=datetime('now')`,
      [userId, productId]
    );
  },
  list(userId, limit = 8) { return listProductsByJoin('recently_viewed', userId, limit, 'viewed_at'); },
};

const comparison = {
  add(userId, productId) {
    const count = db.get('SELECT COUNT(*) c FROM comparisons WHERE user_id=?', [userId]).c;
    if (count >= 4) return false; // max 4 to compare
    db.run('INSERT OR IGNORE INTO comparisons (user_id,product_id) VALUES (?,?)', [userId, productId]);
    return true;
  },
  remove(userId, productId) {
    db.run('DELETE FROM comparisons WHERE user_id=? AND product_id=?', [userId, productId]);
  },
  clear(userId) { db.run('DELETE FROM comparisons WHERE user_id=?', [userId]); },
  list(userId) { return listProductsByJoin('comparisons', userId, 4); },
};

module.exports = { wishlist, recentlyViewed, comparison };
