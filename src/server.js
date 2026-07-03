'use strict';
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`LamsaDZ running in ${config.env} mode`);
  logger.info(`→ Storefront: ${config.siteUrl}`);
  logger.info(`→ Admin:      ${config.siteUrl}/admin`);
});

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = server;
