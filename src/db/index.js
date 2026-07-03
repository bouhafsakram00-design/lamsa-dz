'use strict';
/**
 * Database access layer.
 *
 * Uses better-sqlite3 (synchronous, fast, zero-config) by default.
 * The query helpers below expose a small, promise-friendly surface so the
 * rest of the app does not depend on the concrete driver. To migrate to
 * Postgres later, implement the same `db.get/all/run/transaction` surface
 * with `pg` and switch on config.db.driver.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');
const logger = require('../utils/logger');

// Ensure the db directory exists
fs.mkdirSync(path.dirname(config.db.sqlitePath), { recursive: true });

const sqlite = new Database(config.db.sqlitePath);

// Pragmas for performance + integrity
sqlite.pragma('journal_mode = WAL');     // better concurrency
sqlite.pragma('foreign_keys = ON');      // enforce FK constraints
sqlite.pragma('synchronous = NORMAL');   // good durability/perf balance
sqlite.pragma('busy_timeout = 5000');

logger.info(`SQLite connected: ${config.db.sqlitePath}`);

/** Run a query returning a single row (or undefined). */
function get(sql, params = []) {
  return sqlite.prepare(sql).get(...arr(params));
}

/** Run a query returning all rows. */
function all(sql, params = []) {
  return sqlite.prepare(sql).all(...arr(params));
}

/** Run an INSERT/UPDATE/DELETE. Returns { changes, lastInsertRowid }. */
function run(sql, params = []) {
  return sqlite.prepare(sql).run(...arr(params));
}

/** Execute a raw multi-statement SQL string (migrations). */
function exec(sql) {
  return sqlite.exec(sql);
}

/** Wrap a function in a transaction. */
function transaction(fn) {
  return sqlite.transaction(fn);
}

function arr(params) {
  if (Array.isArray(params)) return params;
  if (params === undefined || params === null) return [];
  return [params];
}

module.exports = { sqlite, get, all, run, exec, transaction };
