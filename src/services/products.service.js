'use strict';
const db = require('../db');

/** Compose a product row with its primary image + computed fields. */
function decorate(p) {
  if (!p) return p;
  const img = db.get(
    'SELECT url, alt FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order ASC LIMIT 1',
    [p.id]
  );
  p.image = img ? img.url : null;
  p.discount_pct =
    p.old_price && p.old_price > p.price
      ? Math.round(((p.old_price - p.price) / p.old_price) * 100)
      : 0;
  p.in_stock = p.stock > 0;
  p.low_stock = p.stock > 0 && p.stock <= (p.low_stock_at || 3);
  return p;
}

const SORTS = {
  newest: 'p.created_at DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name: 'p.name_en ASC',
  popular: 'p.views DESC',
};

/**
 * List products with filtering / search / sorting / pagination.
 * opts: { category, q, sort, minPrice, maxPrice, inStock, featured, page, perPage, includeInactive }
 */
function list(opts = {}) {
  const {
    category, q, sort = 'newest', minPrice, maxPrice,
    inStock, featured, page = 1, perPage = 12, includeInactive = false,
  } = opts;

  const where = [];
  const params = [];

  if (!includeInactive) where.push('p.is_active = 1');
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (featured) where.push('p.is_featured = 1');
  if (inStock) where.push('p.stock > 0');
  if (minPrice != null && minPrice !== '') { where.push('p.price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice != null && maxPrice !== '') { where.push('p.price <= ?'); params.push(Number(maxPrice)); }
  if (q) {
    where.push('(p.name_en LIKE ? OR p.name_fr LIKE ? OR p.name_ar LIKE ? OR p.desc_en LIKE ? OR p.sku LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const orderSql = SORTS[sort] || SORTS.newest;
  const lim = Math.max(1, Math.min(60, Number(perPage)));
  const off = (Math.max(1, Number(page)) - 1) * lim;

  const total = db.get(
    `SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id=p.category_id ${whereSql}`,
    params
  ).c;

  const rows = db.all(
    `SELECT p.*, c.slug AS category_slug, c.name_en AS category_name_en
     FROM products p LEFT JOIN categories c ON c.id=p.category_id
     ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, lim, off]
  );

  return {
    items: rows.map(decorate),
    total,
    page: Number(page),
    perPage: lim,
    pages: Math.max(1, Math.ceil(total / lim)),
  };
}

function bySlug(slug) {
  return decorate(
    db.get(
      `SELECT p.*, c.slug AS category_slug FROM products p
       LEFT JOIN categories c ON c.id=p.category_id WHERE p.slug=? AND p.is_active=1`,
      [slug]
    )
  );
}

function byId(id) {
  return decorate(db.get('SELECT * FROM products WHERE id=?', [id]));
}

function allImages(productId) {
  return db.all('SELECT * FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order ASC', [productId]);
}

function featured(limit = 6) {
  return list({ featured: true, perPage: limit, sort: 'newest' }).items;
}

/** Related products: same category, excluding the current product. */
function related(product, limit = 4) {
  if (!product) return [];
  const rows = db.all(
    `SELECT p.*, c.slug AS category_slug FROM products p
     LEFT JOIN categories c ON c.id=p.category_id
     WHERE p.is_active=1 AND p.id<>? AND p.category_id=?
     ORDER BY p.views DESC, p.created_at DESC LIMIT ?`,
    [product.id, product.category_id, limit]
  );
  return rows.map(decorate);
}

function incrementViews(id) {
  db.run('UPDATE products SET views = views + 1 WHERE id=?', [id]);
}

/** Search suggestions (lightweight, name-only). */
function suggest(q, limit = 6) {
  if (!q || q.length < 2) return [];
  const like = `%${q}%`;
  return db.all(
    `SELECT p.slug, p.name_en, p.price,
      (SELECT url FROM product_images pi WHERE pi.product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
     FROM products p
     WHERE p.is_active=1 AND (p.name_en LIKE ? OR p.name_fr LIKE ? OR p.name_ar LIKE ?)
     ORDER BY p.views DESC LIMIT ?`,
    [like, like, like, limit]
  );
}

// ---- Admin CRUD ----
function create(data) {
  const r = db.run(
    `INSERT INTO products
      (sku,slug,category_id,name_en,name_fr,name_ar,desc_en,desc_fr,desc_ar,
       price,old_price,tag,stock,low_stock_at,is_featured,is_active,meta_title,meta_desc)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.sku, data.slug, data.category_id || null,
      data.name_en, data.name_fr || data.name_en, data.name_ar || data.name_en,
      data.desc_en || '', data.desc_fr || '', data.desc_ar || '',
      data.price || 0, data.old_price || null, data.tag || '',
      data.stock || 0, data.low_stock_at || 3,
      data.is_featured ? 1 : 0, data.is_active != null ? (data.is_active ? 1 : 0) : 1,
      data.meta_title || '', data.meta_desc || '',
    ]
  );
  return r.lastInsertRowid;
}

function update(id, data) {
  db.run(
    `UPDATE products SET
      sku=?, slug=?, category_id=?, name_en=?, name_fr=?, name_ar=?,
      desc_en=?, desc_fr=?, desc_ar=?, price=?, old_price=?, tag=?,
      stock=?, low_stock_at=?, is_featured=?, is_active=?, meta_title=?, meta_desc=?,
      updated_at=datetime('now')
     WHERE id=?`,
    [
      data.sku, data.slug, data.category_id || null,
      data.name_en, data.name_fr, data.name_ar,
      data.desc_en || '', data.desc_fr || '', data.desc_ar || '',
      data.price || 0, data.old_price || null, data.tag || '',
      data.stock || 0, data.low_stock_at || 3,
      data.is_featured ? 1 : 0, data.is_active ? 1 : 0,
      data.meta_title || '', data.meta_desc || '', id,
    ]
  );
}

function remove(id) {
  db.run('DELETE FROM products WHERE id=?', [id]);
}

function addImage(productId, url, alt, isPrimary = false) {
  if (isPrimary) db.run('UPDATE product_images SET is_primary=0 WHERE product_id=?', [productId]);
  db.run('INSERT INTO product_images (product_id,url,alt,is_primary) VALUES (?,?,?,?)', [
    productId, url, alt || '', isPrimary ? 1 : 0,
  ]);
}

function removeImage(imageId) {
  db.run('DELETE FROM product_images WHERE id=?', [imageId]);
}

function adjustStock(productId, change, reason, userId) {
  const tx = db.transaction(() => {
    db.run('UPDATE products SET stock = MAX(0, stock + ?) WHERE id=?', [change, productId]);
    db.run(
      'INSERT INTO inventory_movements (product_id,change,reason,user_id) VALUES (?,?,?,?)',
      [productId, change, reason || 'adjustment', userId || null]
    );
  });
  tx();
}

function lowStock(limit = 20) {
  return db.all(
    'SELECT * FROM products WHERE is_active=1 AND stock <= low_stock_at ORDER BY stock ASC LIMIT ?',
    [limit]
  ).map(decorate);
}

module.exports = {
  decorate, list, bySlug, byId, allImages, featured, related,
  incrementViews, suggest, create, update, remove,
  addImage, removeImage, adjustStock, lowStock, SORTS,
};
