'use strict';
const db = require('../db');

/** List registered customers with aggregated order stats. */
function list(opts = {}) {
  const { q, page = 1, perPage = 20 } = opts;
  const where = ["u.role='customer'"];
  const params = [];
  if (q) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    const like = `%${q}%`; params.push(like, like, like);
  }
  const whereSql = 'WHERE ' + where.join(' AND ');
  const lim = Math.min(100, Number(perPage));
  const off = (Math.max(1, Number(page)) - 1) * lim;
  const total = db.get(`SELECT COUNT(*) c FROM users u ${whereSql}`, params).c;
  const items = db.all(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at, u.last_login_at,
       (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) order_count,
       (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id AND o.status IN ('confirmed','processing','shipped','delivered')) spent
     FROM users u ${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, lim, off]
  );
  return { items, total, page: Number(page), perPage: lim, pages: Math.max(1, Math.ceil(total / lim)) };
}

function profile(id) {
  const user = db.get('SELECT id,name,email,phone,created_at,last_login_at FROM users WHERE id=? AND role=?', [id, 'customer']);
  if (!user) return null;
  user.orders = db.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [id]);
  user.spent = db.get(
    "SELECT COALESCE(SUM(total),0) v FROM orders WHERE user_id=? AND status IN ('confirmed','processing','shipped','delivered')", [id]
  ).v;
  user.wishlist = db.all(
    `SELECT p.name_en, p.price FROM wishlists w JOIN products p ON p.id=w.product_id WHERE w.user_id=?`, [id]
  );
  return user;
}

function recent(limit = 6) {
  return db.all("SELECT id,name,email,created_at FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT ?", [limit]);
}

function count() {
  return db.get("SELECT COUNT(*) c FROM users WHERE role='customer'").c;
}

module.exports = { list, profile, recent, count };
