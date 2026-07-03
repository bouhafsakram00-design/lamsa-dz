-- ============================================================
--  LamsaDZ — Enterprise admin additions
-- ============================================================

-- Extra order columns (safe: only added if the table lacks them via app-level guard)
-- SQLite can't "ADD COLUMN IF NOT EXISTS", so we wrap in a pragma check in code.
-- Here we just ensure the new tables exist.

-- ---------- Coupons / promotions ----------
CREATE TABLE IF NOT EXISTS coupons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL DEFAULT 'percent',   -- 'percent' | 'fixed' | 'free_shipping'
  value         INTEGER NOT NULL DEFAULT 0,         -- percent (0-100) or fixed DA
  min_subtotal  INTEGER NOT NULL DEFAULT 0,         -- minimum order to qualify
  starts_at     TEXT,
  expires_at    TEXT,
  usage_limit   INTEGER,                            -- total allowed uses (NULL = unlimited)
  used_count    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ---------- Suppliers ----------
CREATE TABLE IF NOT EXISTS suppliers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Activity log (admin actions audit trail) ----------
CREATE TABLE IF NOT EXISTS activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  detail     TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

-- ---------- Order status history ----------
CREATE TABLE IF NOT EXISTS order_status_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- CMS pages (About, Contact, policies, etc.) ----------
CREATE TABLE IF NOT EXISTS cms_pages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  title_en TEXT, title_fr TEXT, title_ar TEXT,
  body_en  TEXT, body_fr  TEXT, body_ar  TEXT,
  meta_title TEXT, meta_desc TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
