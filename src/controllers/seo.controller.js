'use strict';
const db = require('../db');
const config = require('../config');

function robots(req, res) {
  res.type('text/plain').send(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /api/

Sitemap: ${config.siteUrl}/sitemap.xml
`
  );
}

function sitemap(req, res) {
  const base = config.siteUrl;
  const staticUrls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/shop', priority: '0.9', changefreq: 'daily' },
    { loc: '/faq', priority: '0.6', changefreq: 'monthly' },
    { loc: '/policies', priority: '0.6', changefreq: 'monthly' },
  ];

  const categories = db.all('SELECT slug FROM categories WHERE is_active=1');
  const products = db.all('SELECT slug, updated_at FROM products WHERE is_active=1');

  const urls = [
    ...staticUrls.map((u) => ({ loc: base + u.loc, priority: u.priority, changefreq: u.changefreq })),
    ...categories.map((c) => ({ loc: `${base}/shop?category=${c.slug}`, priority: '0.7', changefreq: 'weekly' })),
    ...products.map((p) => ({
      loc: `${base}/product/${p.slug}`,
      lastmod: (p.updated_at || '').slice(0, 10),
      priority: '0.8', changefreq: 'weekly',
    })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>` +
          (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
          `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  res.type('application/xml').send(xml);
}

module.exports = { robots, sitemap };
