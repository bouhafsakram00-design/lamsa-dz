'use strict';
const db = require('../db');

const categories = {
  all() {
    return db.all('SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order ASC, name_en ASC');
  },
  bySlug(slug) {
    return db.get('SELECT * FROM categories WHERE slug=?', [slug]);
  },
  withCounts() {
    return db.all(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id AND p.is_active=1) AS product_count
      FROM categories c WHERE c.is_active=1 ORDER BY c.sort_order ASC`);
  },
};

const services = {
  all() {
    return db.all('SELECT * FROM services WHERE is_active=1 ORDER BY sort_order ASC');
  },
};

const testimonials = {
  active() {
    return db.all('SELECT * FROM testimonials WHERE is_active=1 ORDER BY sort_order ASC, id ASC');
  },
};

const faqs = {
  active() {
    return db.all('SELECT * FROM faqs WHERE is_active=1 ORDER BY sort_order ASC, id ASC');
  },
};

const reviews = {
  forProduct(productId, approvedOnly = true) {
    return db.all(
      `SELECT * FROM reviews WHERE product_id=? ${approvedOnly ? 'AND is_approved=1' : ''} ORDER BY created_at DESC`,
      [productId]
    );
  },
  stats(productId) {
    const r = db.get(
      'SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews WHERE product_id=? AND is_approved=1',
      [productId]
    );
    return { count: r.count || 0, avg: r.avg ? Math.round(r.avg * 10) / 10 : 0 };
  },
  add({ product_id, user_id, author_name, rating, body }) {
    const r = db.run(
      'INSERT INTO reviews (product_id,user_id,author_name,rating,body,is_approved) VALUES (?,?,?,?,?,0)',
      [product_id, user_id || null, author_name, rating, body || '']
    );
    return r.lastInsertRowid;
  },
  pending() {
    return db.all(
      `SELECT r.*, p.name_en AS product_name FROM reviews r
       JOIN products p ON p.id=r.product_id WHERE r.is_approved=0 ORDER BY r.created_at DESC`
    );
  },
  approve(id) { db.run('UPDATE reviews SET is_approved=1 WHERE id=?', [id]); },
  remove(id) { db.run('DELETE FROM reviews WHERE id=?', [id]); },
};

const settings = {
  all() {
    const rows = db.all('SELECT key, value FROM settings');
    const out = {};
    rows.forEach((r) => (out[r.key] = r.value));
    return out;
  },
  get(key, fallback = '') {
    const r = db.get('SELECT value FROM settings WHERE key=?', [key]);
    return r ? r.value : fallback;
  },
  set(key, value) {
    db.run(
      `INSERT INTO settings (key,value) VALUES (?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`,
      [key, value]
    );
  },
};

const messages = {
  add({ name, phone, email, body, ip }) {
    const r = db.run(
      'INSERT INTO messages (name,phone,email,body,ip) VALUES (?,?,?,?,?)',
      [name, phone || '', email || '', body, ip || '']
    );
    return r.lastInsertRowid;
  },
  all() { return db.all('SELECT * FROM messages ORDER BY created_at DESC'); },
  unreadCount() { return db.get('SELECT COUNT(*) c FROM messages WHERE is_read=0').c; },
  markRead(id) { db.run('UPDATE messages SET is_read=1 WHERE id=?', [id]); },
};

const subscribers = {
  add(email) {
    try {
      db.run('INSERT INTO subscribers (email) VALUES (?)', [email]);
      return true;
    } catch {
      return false; // duplicate
    }
  },
  count() { return db.get('SELECT COUNT(*) c FROM subscribers').c; },
};

module.exports = { categories, services, testimonials, faqs, reviews, settings, messages, subscribers };
