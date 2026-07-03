'use strict';
const db = require('../db');

function track({ type, path, product_id, query, referrer, visitor_id, user_agent, meta }) {
  db.run(
    `INSERT INTO analytics_events (type,path,product_id,query,referrer,visitor_id,user_agent,meta)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      type, path || null, product_id || null, query || null,
      referrer || null, visitor_id || null,
      (user_agent || '').slice(0, 255),
      meta ? JSON.stringify(meta) : null,
    ]
  );
}

/** Counts by event type within the last N days. */
function summary(days = 30) {
  const since = `-${days} days`;
  const totals = db.all(
    `SELECT type, COUNT(*) AS c FROM analytics_events
     WHERE created_at >= datetime('now', ?) GROUP BY type`,
    [since]
  );
  const map = { pageview: 0, product_click: 0, whatsapp_click: 0, search: 0, add_wishlist: 0 };
  totals.forEach((t) => (map[t.type] = t.c));

  const uniqueVisitors = db.get(
    `SELECT COUNT(DISTINCT visitor_id) AS c FROM analytics_events
     WHERE created_at >= datetime('now', ?) AND visitor_id IS NOT NULL`,
    [since]
  ).c;

  return { ...map, uniqueVisitors, days };
}

/** Daily pageview series for charts. */
function dailySeries(days = 14) {
  const rows = db.all(
    `SELECT date(created_at) AS day,
            SUM(CASE WHEN type='pageview' THEN 1 ELSE 0 END) AS views,
            SUM(CASE WHEN type='whatsapp_click' THEN 1 ELSE 0 END) AS wa,
            SUM(CASE WHEN type='product_click' THEN 1 ELSE 0 END) AS clicks
     FROM analytics_events
     WHERE created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day ASC`,
    [`-${days} days`]
  );
  return rows;
}

function topProducts(limit = 8, days = 30) {
  return db.all(
    `SELECT p.id, p.name_en, p.slug, COUNT(*) AS clicks
     FROM analytics_events a JOIN products p ON p.id=a.product_id
     WHERE a.type IN ('product_click','whatsapp_click')
       AND a.created_at >= datetime('now', ?)
     GROUP BY p.id ORDER BY clicks DESC LIMIT ?`,
    [`-${days} days`, limit]
  );
}

function topSearches(limit = 10, days = 30) {
  return db.all(
    `SELECT query, COUNT(*) AS c FROM analytics_events
     WHERE type='search' AND query IS NOT NULL AND query <> ''
       AND created_at >= datetime('now', ?)
     GROUP BY lower(query) ORDER BY c DESC LIMIT ?`,
    [`-${days} days`, limit]
  );
}

function topPages(limit = 10, days = 30) {
  return db.all(
    `SELECT path, COUNT(*) AS c FROM analytics_events
     WHERE type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY path ORDER BY c DESC LIMIT ?`,
    [`-${days} days`, limit]
  );
}

module.exports = { track, summary, dailySeries, topProducts, topSearches, topPages };
