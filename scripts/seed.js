'use strict';
/**
 * Seeds the database with categories, products, services, testimonials, FAQs,
 * default settings and the initial admin user. Idempotent: uses UPSERT-style
 * logic keyed on natural unique columns (slug/sku/email/key).
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const config = require('../src/config');
const logger = require('../src/utils/logger');

const SEED_DIR = path.resolve(__dirname, '..', 'db', 'seeds');
const load = (f) => JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf8'));

function seedCategories() {
  const cats = load('categories.json');
  const map = {};
  for (const c of cats) {
    db.run(
      `INSERT INTO categories (slug,name_en,name_fr,name_ar,desc_en,desc_fr,desc_ar,icon,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET
         name_en=excluded.name_en, name_fr=excluded.name_fr, name_ar=excluded.name_ar,
         desc_en=excluded.desc_en, desc_fr=excluded.desc_fr, desc_ar=excluded.desc_ar,
         icon=excluded.icon, sort_order=excluded.sort_order`,
      [c.slug, c.name_en, c.name_fr, c.name_ar, c.desc_en, c.desc_fr, c.desc_ar, c.icon, c.sort_order]
    );
    map[c.slug] = db.get('SELECT id FROM categories WHERE slug=?', [c.slug]).id;
  }
  logger.info(`Seeded ${cats.length} categories`);
  return map;
}

function seedProducts(catMap) {
  const products = load('products.json');
  for (const p of products) {
    const categoryId = catMap[p.category] || null;
    db.run(
      `INSERT INTO products
        (sku,slug,category_id,name_en,name_fr,name_ar,desc_en,desc_fr,desc_ar,
         price,old_price,tag,icon,stock,is_featured,meta_title,meta_desc)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(sku) DO UPDATE SET
         category_id=excluded.category_id,
         name_en=excluded.name_en, name_fr=excluded.name_fr, name_ar=excluded.name_ar,
         desc_en=excluded.desc_en, desc_fr=excluded.desc_fr, desc_ar=excluded.desc_ar,
         price=excluded.price, old_price=excluded.old_price, tag=excluded.tag,
         icon=excluded.icon, stock=excluded.stock, is_featured=excluded.is_featured,
         updated_at=datetime('now')`,
      [
        p.sku, p.slug, categoryId, p.name_en, p.name_fr, p.name_ar,
        p.desc_en, p.desc_fr, p.desc_ar, p.price, p.old_price || null,
        p.tag || '', p.icon || null, p.stock || 0, p.featured || 0,
        `${p.name_en} — Buy in Algeria | LamsaDZ`,
        `${p.name_en}: ${p.desc_en} Best price in DA. Order on WhatsApp with fast delivery across Algeria.`,
      ]
    );
    const prodId = db.get('SELECT id FROM products WHERE sku=?', [p.sku]).id;
    if (p.image) {
      const exists = db.get('SELECT id FROM product_images WHERE product_id=? AND url=?', [prodId, p.image]);
      if (!exists) {
        db.run(
          'INSERT INTO product_images (product_id,url,alt,is_primary,sort_order) VALUES (?,?,?,1,0)',
          [prodId, p.image, p.name_en]
        );
      }
    }
  }
  logger.info(`Seeded ${products.length} products`);
}

function seedServices() {
  const services = load('services.json');
  services.forEach((s, i) => {
    db.run(
      `INSERT INTO services (slug,name_en,name_fr,name_ar,desc_en,desc_fr,desc_ar,icon,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET
         name_en=excluded.name_en, name_fr=excluded.name_fr, name_ar=excluded.name_ar,
         desc_en=excluded.desc_en, desc_fr=excluded.desc_fr, desc_ar=excluded.desc_ar,
         icon=excluded.icon`,
      [s.slug, s.name_en, s.name_fr, s.name_ar, s.desc_en, s.desc_fr, s.desc_ar, s.icon, i]
    );
  });
  logger.info(`Seeded ${services.length} services`);
}

function seedTestimonials() {
  // First-run only: don't wipe admin-edited testimonials on later boots.
  if (db.get('SELECT COUNT(*) c FROM testimonials').c > 0) {
    logger.info('Testimonials already present — skipping (preserving your edits)');
    return;
  }
  const items = load('testimonials.json');
  items.forEach((t, i) => {
    db.run(
      `INSERT INTO testimonials (author_name,location,rating,body_en,body_fr,body_ar,sort_order)
       VALUES (?,?,?,?,?,?,?)`,
      [t.author_name, t.location, t.rating, t.body_en, t.body_fr, t.body_ar, i]
    );
  });
  logger.info(`Seeded ${items.length} testimonials`);
}

function seedFaqs() {
  // First-run only: preserve admin-edited FAQs on later boots.
  if (db.get('SELECT COUNT(*) c FROM faqs').c > 0) {
    logger.info('FAQs already present — skipping (preserving your edits)');
    return;
  }
  const items = load('faqs.json');
  items.forEach((f, i) => {
    db.run(
      `INSERT INTO faqs (q_en,q_fr,q_ar,a_en,a_fr,a_ar,sort_order) VALUES (?,?,?,?,?,?,?)`,
      [f.q_en, f.q_fr, f.q_ar, f.a_en, f.a_fr, f.a_ar, i]
    );
  });
  logger.info(`Seeded ${items.length} FAQs`);
}

function seedSettings() {
  const defaults = {
    store_name: config.store.name,
    whatsapp_number: config.store.whatsapp,
    store_address: config.store.address,
    store_email: config.store.email,
    store_phone: config.store.phone,
    store_hours: 'Every day: 9:00 AM – 10:00 PM',
    delivery_info: 'Home delivery to all 58 wilayas (2–5 days) via Yalidine / ZR Express. Free pickup in Tissemsilt.',
    warranty_info: '12-month warranty on phones and devices. 3-month warranty on accessories where applicable.',
    return_policy: '7-day returns/exchanges on unused items in original packaging. Defective items covered by warranty.',
    ga_id: config.analytics.gaId,
    // Flash sale (off by default; enable + set an end time from the admin panel)
    flash_enabled: '0',
    flash_title: '⚡ Flash Sale — Limited Time Offers',
    flash_subtitle: 'Grab the best tech deals before the timer runs out!',
    flash_end: '', // ISO datetime, e.g. 2026-07-10T20:00
  };
  for (const [key, value] of Object.entries(defaults)) {
    db.run(
      `INSERT INTO settings (key,value) VALUES (?,?)
       ON CONFLICT(key) DO UPDATE SET value=COALESCE(NULLIF(settings.value,''), excluded.value), updated_at=datetime('now')`,
      [key, value]
    );
  }
  logger.info('Seeded default settings');
}

function seedAdmin() {
  const existing = db.get('SELECT id FROM users WHERE email=?', [config.admin.email]);
  if (existing) {
    logger.info(`Admin already exists: ${config.admin.email}`);
    return;
  }
  const hash = bcrypt.hashSync(config.admin.password, 12);
  db.run(
    `INSERT INTO users (name,email,password_hash,role,is_active) VALUES (?,?,?,'admin',1)`,
    [config.admin.name, config.admin.email, hash]
  );
  logger.info(`Created admin user: ${config.admin.email}`);
}

function seedSampleReviews() {
  // attach a couple of approved reviews to first few products for social proof
  const prods = db.all('SELECT id FROM products ORDER BY id LIMIT 4');
  const samples = [
    ['Bilal', 5, 'المنتوج كيما فالتصويرة بالضبط، يخدم نيشان. الله يبارك 👌'],
    ['Imene', 5, 'ليفريزون دغيا والسوم معقول بزاف. نصح بيهم ✅'],
    ['Reda', 4, 'الجودة مليحة بالنسبة للسوم، راني راضي 🙏'],
  ];
  for (const p of prods) {
    const has = db.get('SELECT COUNT(*) c FROM reviews WHERE product_id=?', [p.id]).c;
    if (has > 0) continue;
    samples.forEach(([name, rating, body]) => {
      db.run(
        'INSERT INTO reviews (product_id,author_name,rating,body,is_approved) VALUES (?,?,?,?,1)',
        [p.id, name, rating, body]
      );
    });
  }
  logger.info('Seeded sample approved reviews');
}

function main() {
  const tx = db.transaction(() => {
    const catMap = seedCategories();
    seedProducts(catMap);
    seedServices();
    seedTestimonials();
    seedFaqs();
    seedSettings();
    seedAdmin();
    seedSampleReviews();
  });
  tx();
  logger.info('✓ Seeding complete.');
}

try {
  main();
  process.exit(0);
} catch (err) {
  logger.error('Seeding failed:', err);
  process.exit(1);
}
