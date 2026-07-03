'use strict';
require('dotenv').config();

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const config = {
  root: ROOT,
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: parseInt(process.env.PORT, 10) || 3000,
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),

  db: {
    driver: process.env.DB_DRIVER || 'sqlite',
    sqlitePath: path.resolve(ROOT, process.env.SQLITE_PATH || './db/lamsadz.sqlite'),
    databaseUrl: process.env.DATABASE_URL || '',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
    secure: String(process.env.SECURE_COOKIES).toLowerCase() === 'true',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@lamsadz.dz',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe!2026',
    name: process.env.ADMIN_NAME || 'Admin',
  },

  store: {
    name: process.env.STORE_NAME || 'LamsaDZ',
    whatsapp: process.env.WHATSAPP_NUMBER || '213796472662',
    address: process.env.STORE_ADDRESS || 'Hai 119 Logements, Tissemsilt, Algeria',
    email: process.env.STORE_EMAIL || 'contact@lamsadz.dz',
    phone: process.env.STORE_PHONE || '+213 796 472 662',
  },

  analytics: {
    gaId: process.env.GA_MEASUREMENT_ID || '',
  },

  uploads: {
    // On hosts with a persistent disk (e.g. Render), set UPLOADS_DIR to a path
    // on that disk (e.g. /var/data/uploads) so images survive restarts.
    dir: process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.resolve(ROOT, 'public', 'uploads'),
    maxBytes: (parseInt(process.env.MAX_UPLOAD_MB, 10) || 5) * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
};

module.exports = config;
