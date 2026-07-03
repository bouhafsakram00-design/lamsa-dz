'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

function byEmail(email) {
  return db.get('SELECT * FROM users WHERE email=?', [String(email).toLowerCase().trim()]);
}
function byId(id) {
  return db.get('SELECT id,name,email,role,phone,is_active,created_at FROM users WHERE id=?', [id]);
}

function register({ name, email, password, phone }) {
  const hash = bcrypt.hashSync(password, 12);
  const r = db.run(
    'INSERT INTO users (name,email,password_hash,role,phone) VALUES (?,?,?,?,?)',
    [name, String(email).toLowerCase().trim(), hash, 'customer', phone || null]
  );
  return r.lastInsertRowid;
}

function verify(email, password) {
  const u = byEmail(email);
  if (!u || !u.is_active) return null;
  if (!bcrypt.compareSync(password, u.password_hash)) return null;
  db.run("UPDATE users SET last_login_at=datetime('now') WHERE id=?", [u.id]);
  return u;
}

function createResetToken(email) {
  const u = byEmail(email);
  if (!u) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 1000 * 60 * 30; // 30 min
  db.run('UPDATE users SET reset_token=?, reset_expires=? WHERE id=?', [token, expires, u.id]);
  return token;
}

function resetPassword(token, newPassword) {
  const u = db.get('SELECT * FROM users WHERE reset_token=?', [token]);
  if (!u || !u.reset_expires || u.reset_expires < Date.now()) return false;
  const hash = bcrypt.hashSync(newPassword, 12);
  db.run('UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?', [hash, u.id]);
  return true;
}

module.exports = { byEmail, byId, register, verify, createResetToken, resetPassword };
