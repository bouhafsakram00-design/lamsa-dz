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

  logger.info(`Migrations complete. ${count} new migration(s) applied.`);
}

try {
  run();
  process.exit(0);
} catch (err) {
  logger.error('Migration failed:', err);
  process.exit(1);
}
