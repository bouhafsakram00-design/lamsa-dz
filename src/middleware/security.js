'use strict';
const helmet = require('helmet');
const config = require('../config');

/**
 * Helmet with a Content-Security-Policy tuned for this app.
 * Inline scripts/styles are permitted because the templates use a few inline
 * snippets and the gold theme relies on inline style attrs. External:
 *  - Google Fonts (styles + fonts)
 *  - Google Analytics (when GA_MEASUREMENT_ID is set)
 *  - Google Maps links (navigation only, no embed by default)
 */
const gaHosts = config.analytics.gaId
  ? ['https://www.googletagmanager.com', 'https://www.google-analytics.com']
  : [];

module.exports = function security() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', ...gaHosts],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...gaHosts],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
};
