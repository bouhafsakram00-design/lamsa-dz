-- ============================================================
--  LamsaDZ — Initial database schema
--  Driver: SQLite (portable; Postgres-compatible structure)
-- ============================================================

-- ---------- Users (admins + customers) ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer', -- 'customer' | 'admin' | 'manager'
  phone         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  reset_token       TEXT,
  reset_expires     INTEGER,
  last_login_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ---------- Categories (supports subcategories via parent_id) ----------
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  slug       TEXT    NOT NULL UNIQUE,
  name_en    TEXT    NOT NULL,
  name_fr    TEXT    NOT NULL,
  name_ar    TEXT    NOT NULL,
  desc_en    TEXT,
  desc_fr    TEXT,
  desc_ar    TEXT,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ---------- Products ----------
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT    NOT NULL UNIQUE,
  slug          TEXT    NOT NULL UNIQUE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name_en       TEXT    NOT NULL,
  name_fr       TEXT    NOT NULL,
  name_ar       TEXT    NOT NULL,
  desc_en       TEXT,
  desc_fr       TEXT,
  desc_ar       TEXT,
  price         INTEGER NOT NULL DEFAULT 0,        -- price in DA (integer dinars)
  old_price     INTEGER,                           -- original price for discounts
  tag           TEXT,                              -- 'Hot' | 'New' | promo label
  icon          TEXT,                              -- fallback SVG icon name when no image
  stock         INTEGER NOT NULL DEFAULT 0,
  low_stock_at  INTEGER NOT NULL DEFAULT 3,        -- threshold for stock alerts
  is_featured   INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  views         INTEGER NOT NULL DEFAULT 0,
  meta_title    TEXT,
  meta_desc     TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products(price);

-- ---------- Product images (multiple per product) ----------
CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  alt        TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ---------- Inventory movements (audit trail of stock changes) ----------
CREATE TABLE IF NOT EXISTS inventory_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change     INTEGER NOT NULL,        -- +received / -sold / adjustments
  reason     TEXT,                    -- 'restock' | 'sale' | 'adjustment' | 'return'
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);

-- ---------- Orders (WhatsApp leads captured as orders) ----------
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT    NOT NULL UNIQUE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name   TEXT,
  customer_phone  TEXT,
  wilaya          TEXT,
  address         TEXT,
  status          TEXT    NOT NULL DEFAULT 'new', -- new|contacted|confirmed|delivered|cancelled
  channel         TEXT    NOT NULL DEFAULT 'whatsapp',
  subtotal        INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT    NOT NULL,
  unit_price  INTEGER NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------- Reviews / ratings (per product) ----------
CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT    NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);

-- ---------- Testimonials (site-wide, not tied to a product) ----------
CREATE TABLE IF NOT EXISTS testimonials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name TEXT    NOT NULL,
  location    TEXT,
  rating      INTEGER NOT NULL DEFAULT 5   CHECK (rating BETWEEN 1 AND 5),
  body_en     TEXT,
  body_fr     TEXT,
  body_ar     TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- FAQ ----------
CREATE TABLE IF NOT EXISTS faqs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  q_en TEXT NOT NULL, q_fr TEXT NOT NULL, q_ar TEXT NOT NULL,
  a_en TEXT NOT NULL, a_fr TEXT NOT NULL, a_ar TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

-- ---------- Cyber services (printing, flashing, etc.) ----------
CREATE TABLE IF NOT EXISTS services (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL, name_fr TEXT NOT NULL, name_ar TEXT NOT NULL,
  desc_en TEXT, desc_fr TEXT, desc_ar TEXT,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

-- ---------- Site settings (key/value, editable in admin) ----------
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Wishlists (per user) ----------
CREATE TABLE IF NOT EXISTS wishlists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);

-- ---------- Recently viewed (per user; also cached client-side) ----------
CREATE TABLE IF NOT EXISTS recently_viewed (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);

-- ---------- Product comparison (per user) ----------
CREATE TABLE IF NOT EXISTS comparisons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);

-- ---------- Analytics events (page views, clicks, searches, WA inquiries) ----------
CREATE TABLE IF NOT EXISTS analytics_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,   -- 'pageview' | 'product_click' | 'whatsapp_click' | 'search' | 'add_wishlist'
  path       TEXT,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  query      TEXT,            -- search term
  referrer   TEXT,
  visitor_id TEXT,            -- anonymous cookie id
  user_agent TEXT,
  meta       TEXT,            -- JSON blob for extra data
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_product ON analytics_events(product_id);

-- ---------- Contact / inquiry messages (secured form submissions) ----------
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  body       TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Newsletter subscribers ----------
CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
