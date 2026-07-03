'use strict';
const db = require('../db');

function all() {
  return db.all('SELECT * FROM coupons ORDER BY created_at DESC');
}
function byId(id) { return db.get('SELECT * FROM coupons WHERE id=?', [id]); }

function create(d) {
  db.run(
    `INSERT INTO coupons (code,type,value,min_subtotal,starts_at,expires_at,usage_limit,is_active)
     VALUES (?,?,?,?,?,?,?,?)`,
    [String(d.code).toUpperCase().trim(), d.type, d.value || 0, d.min_subtotal || 0,
     d.starts_at || null, d.expires_at || null, d.usage_limit || null, d.is_active ? 1 : 0]
  );
}
function update(id, d) {
  db.run(
    `UPDATE coupons SET code=?,type=?,value=?,min_subtotal=?,starts_at=?,expires_at=?,usage_limit=?,is_active=? WHERE id=?`,
    [String(d.code).toUpperCase().trim(), d.type, d.value || 0, d.min_subtotal || 0,
     d.starts_at || null, d.expires_at || null, d.usage_limit || null, d.is_active ? 1 : 0, id]
  );
}
function remove(id) { db.run('DELETE FROM coupons WHERE id=?', [id]); }

/** Validate & compute a coupon for a given subtotal. Returns {ok, discount, freeShipping, message}. */
function apply(code, subtotal) {
  const c = db.get('SELECT * FROM coupons WHERE code=? AND is_active=1', [String(code).toUpperCase().trim()]);
  if (!c) return { ok: false, message: 'Invalid coupon code.' };
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { ok: false, message: 'Coupon not active yet.' };
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { ok: false, message: 'Coupon has expired.' };
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return { ok: false, message: 'Coupon usage limit reached.' };
  if (subtotal < c.min_subtotal) return { ok: false, message: `Minimum order ${c.min_subtotal} DA required.` };

  let discount = 0, freeShipping = false;
  if (c.type === 'percent') discount = Math.round(subtotal * c.value / 100);
  else if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
  else if (c.type === 'free_shipping') freeShipping = true;
  return { ok: true, discount, freeShipping, code: c.code, message: 'Coupon applied!' };
}

function redeem(code) {
  db.run('UPDATE coupons SET used_count = used_count + 1 WHERE code=?', [String(code).toUpperCase().trim()]);
}

module.exports = { all, byId, create, update, remove, apply, redeem };
