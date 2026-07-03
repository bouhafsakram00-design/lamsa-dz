'use strict';
const db = require('../db');

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

function genReference() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LZ-${stamp}-${rand}`;
}

/**
 * Create an order from a cart-like payload.
 * items: [{ product_id, name, unit_price, qty }]
 */
function create(data) {
  const reference = genReference();
  const items = data.items || [];
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const discount = data.discount || 0;
  const shipping = data.shipping || 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const tx = db.transaction(() => {
    const r = db.run(
      `INSERT INTO orders
        (reference,user_id,customer_name,customer_phone,email,wilaya,address,status,channel,
         subtotal,coupon_code,discount,shipping,total,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        reference, data.user_id || null, data.customer_name, data.customer_phone,
        data.email || '', data.wilaya || '', data.address || '', 'pending',
        data.channel || 'website', subtotal, data.coupon_code || '',
        discount, shipping, total, data.notes || '',
      ]
    );
    const orderId = r.lastInsertRowid;
    for (const it of items) {
      db.run(
        'INSERT INTO order_items (order_id,product_id,name,unit_price,qty) VALUES (?,?,?,?,?)',
        [orderId, it.product_id || null, it.name, it.unit_price, it.qty]
      );
      // decrement stock + increment sold_count
      if (it.product_id) {
        db.run('UPDATE products SET stock = MAX(0, stock - ?), sold_count = sold_count + ? WHERE id=?',
          [it.qty, it.qty, it.product_id]);
        db.run('INSERT INTO inventory_movements (product_id,change,reason) VALUES (?,?,?)',
          [it.product_id, -it.qty, 'sale']);
      }
    }
    db.run('INSERT INTO order_status_history (order_id,status,note) VALUES (?,?,?)',
      [orderId, 'pending', 'Order placed']);
    return orderId;
  });
  const id = tx();
  return { id, reference, total };
}

function byId(id) {
  const order = db.get('SELECT * FROM orders WHERE id=?', [id]);
  if (!order) return null;
  order.items = db.all('SELECT * FROM order_items WHERE order_id=?', [id]);
  order.history = db.all('SELECT * FROM order_status_history WHERE order_id=? ORDER BY created_at DESC', [id]);
  return order;
}

function list(opts = {}) {
  const { status, q, page = 1, perPage = 20 } = opts;
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) { where.push('status=?'); params.push(status); }
  if (q) {
    where.push('(reference LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
    const like = `%${q}%`; params.push(like, like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const lim = Math.min(100, Number(perPage));
  const off = (Math.max(1, Number(page)) - 1) * lim;
  const total = db.get(`SELECT COUNT(*) c FROM orders ${whereSql}`, params).c;
  const items = db.all(
    `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, lim, off]
  );
  return { items, total, page: Number(page), perPage: lim, pages: Math.max(1, Math.ceil(total / lim)) };
}

function updateStatus(id, status, note, userId) {
  if (!STATUSES.includes(status)) return false;
  db.run("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?", [status, id]);
  db.run('INSERT INTO order_status_history (order_id,status,note,user_id) VALUES (?,?,?,?)',
    [id, status, note || '', userId || null]);
  return true;
}

function addNote(id, note) {
  const o = db.get('SELECT notes FROM orders WHERE id=?', [id]);
  const existing = o && o.notes ? o.notes + '\n' : '';
  db.run("UPDATE orders SET notes=?, updated_at=datetime('now') WHERE id=?", [existing + note, id]);
}

// ---- Dashboard metrics ----
function metrics() {
  const paidStatuses = "('confirmed','processing','shipped','delivered')";
  const revenue = db.get(`SELECT COALESCE(SUM(total),0) v FROM orders WHERE status IN ${paidStatuses}`).v;
  const revenueMonth = db.get(
    `SELECT COALESCE(SUM(total),0) v FROM orders WHERE status IN ${paidStatuses} AND created_at >= datetime('now','start of month')`
  ).v;
  return {
    revenue,
    revenueMonth,
    ordersToday: db.get("SELECT COUNT(*) c FROM orders WHERE date(created_at)=date('now')").c,
    ordersMonth: db.get("SELECT COUNT(*) c FROM orders WHERE created_at >= datetime('now','start of month')").c,
    pending: db.get("SELECT COUNT(*) c FROM orders WHERE status='pending'").c,
    completed: db.get("SELECT COUNT(*) c FROM orders WHERE status='delivered'").c,
    totalOrders: db.get('SELECT COUNT(*) c FROM orders').c,
    productsSold: db.get('SELECT COALESCE(SUM(qty),0) v FROM order_items').v,
  };
}

function salesSeries(days = 14) {
  return db.all(
    `SELECT date(created_at) day, COUNT(*) orders, COALESCE(SUM(total),0) revenue
     FROM orders WHERE created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day ASC`,
    [`-${days} days`]
  );
}

function bestSellers(limit = 5) {
  return db.all(
    `SELECT p.id, p.name_en, p.sold_count,
       (SELECT url FROM product_images pi WHERE pi.product_id=p.id ORDER BY is_primary DESC LIMIT 1) image
     FROM products p WHERE p.sold_count > 0 ORDER BY p.sold_count DESC LIMIT ?`,
    [limit]
  );
}

function recentOrders(limit = 6) {
  return db.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [limit]);
}

function statusCounts() {
  const rows = db.all('SELECT status, COUNT(*) c FROM orders GROUP BY status');
  const map = {};
  STATUSES.forEach((s) => (map[s] = 0));
  rows.forEach((r) => (map[r.status] = r.c));
  return map;
}

module.exports = {
  STATUSES, create, byId, list, updateStatus, addNote,
  metrics, salesSeries, bestSellers, recentOrders, statusCounts,
};
