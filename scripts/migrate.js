'use strict';
/**
 * Runs all .sql files in db/migrations in alphabetical order.
 * Tracks applied migrations in a `_migrations` table so it is idempotent.
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const logger = require('../src/utils/logger');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'db', 'migrations');

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Add a column only if it doesn't already exist (SQLite-safe). */
function ensureColumn(table, column, definition) {
  const cols = db.all(`PRAGMA table_info(${table})`).map((c) => c.name);
  if (!cols.includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    logger.info(`  + column ${table}.${column}`);
  }
}

/** Idempotent column additions for enterprise features. */
function ensureColumns() {
  // Products: brand, bestseller, discount handled by old_price already, specs, video
  ensureColumn('products', 'brand', 'TEXT');
  ensureColumn('products', 'is_bestseller', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('products', 'specs', 'TEXT');            // JSON string of key/value specs
  ensureColumn('products', 'video_url', 'TEXT');
  ensureColumn('products', 'supplier_id', 'INTEGER');
  ensureColumn('products', 'cost_price', 'INTEGER');    // for profit calc
  ensureColumn('products', 'sold_count', 'INTEGER NOT NULL DEFAULT 0');
  // Orders: richer workflow
  ensureColumn('orders', 'email', 'TEXT');
  ensureColumn('orders', 'coupon_code', 'TEXT');
  ensureColumn('orders', 'discount', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('orders', 'shipping', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('orders', 'total', 'INTEGER NOT NULL DEFAULT 0');
}

function run() {
  ensureMigrationsTable();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(db.all('SELECT name FROM _migrations').map((r) => r.name));
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`↷ skip (already applied): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const tx = db.transaction(() => {
      db.exec(sql);
      db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    });
    tx();
    count += 1;
    logger.info(`✓ applied: ${file}`);
  }

  // Always run idempotent column checks after file migrations
  ensureColumns();

  logger.info(`Migrations complete. ${count} new migration(s) applied.`);
}

try {
  run();
  process.exit(0);
} catch (err) {
  logger.error('Migration failed:', err);
  process.exit(1);
}
