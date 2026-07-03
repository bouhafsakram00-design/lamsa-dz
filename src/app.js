'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const compression = require('compression');

const config = require('./config');
const logger = require('./utils/logger');
const helpers = require('./utils/helpers');
const content = require('./services/content.service');

const security = require('./middleware/security');
const locale = require('./middleware/locale');
const visitor = require('./middleware/visitor');
const csrf = require('./middleware/csrf');
const { issueToken } = csrf;
const { loadUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandlers');

const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const seo = require('./controllers/seo.controller');

const app = express();

// Behind a reverse proxy (Nginx) in production -> trust X-Forwarded-* for secure cookies + rate limit IPs
app.set('trust proxy', 1);

// ---- View engine ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ---- Core middleware ----
app.use(security());
app.use(compression());
app.use(cookieParser());

// Body parsers (urlencoded for forms; JSON parser is mounted inside /api router)
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

// ---- Static assets with long cache for immutable files ----
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.isProd ? '7d' : 0,
    etag: true,
    setHeaders(res, filePath) {
      if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|woff2?)$/.test(filePath)) {
        res.setHeader('Cache-Control', `public, max-age=${config.isProd ? 604800 : 0}`);
      }
    },
  })
);

// ---- Serve uploaded product images from the configured uploads dir ----
// (May live outside /public on hosts with a persistent disk, e.g. /var/data/uploads)
app.use(
  '/uploads',
  express.static(config.uploads.dir, {
    maxAge: config.isProd ? '7d' : 0,
    fallthrough: true,
  })
);

// ---- Sessions (stored in SQLite so they survive restarts) ----
app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.sqlite',
      // Keep sessions next to the main DB (persistent disk in production)
      dir: path.dirname(config.db.sqlitePath),
    }),
    name: 'lamsadz.sid',
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.session.secure,
      maxAge: config.session.maxAge,
    },
  })
);

// ---- Request context ----
app.use(visitor);
app.use(locale);
app.use(loadUser);

// ---- Shared view locals available to every template (must be before routes) ----
app.use((req, res, next) => {
  res.locals.helpers = helpers;
  res.locals.settings = res.locals.settings || content.settings.all();
  res.locals.navCategories = content.categories.all();
  res.locals.config = { siteUrl: config.siteUrl, gaId: content.settings.get('ga_id', config.analytics.gaId) };
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  next();
});

// ---- SEO files (no CSRF needed, GET only) ----
app.get('/robots.txt', seo.robots);
app.get('/sitemap.xml', seo.sitemap);

// ---- API (JSON). CSRF enforced via header token (X-CSRF-Token). ----
// We still run csrf here; the client sends the token in a header for unsafe methods.
app.use('/api', csrf, apiRoutes);

// ---- Admin ----
// We only ISSUE the token here; each admin POST verifies it itself (after
// multer has parsed any multipart body). This keeps file uploads CSRF-safe.
app.use('/admin', issueToken, adminRoutes);

// ---- Public site + auth (standard form CSRF) ----
app.use('/', csrf, webRoutes);

// ---- 404 + error handling ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
