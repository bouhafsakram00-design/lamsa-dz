'use strict';
const logger = require('../utils/logger');

function notFound(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('pages/error', { code: 404, message: 'Page not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  logger.error(`${req.method} ${req.originalUrl} -> ${status}`, { stack: err.stack, message: err.message });

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : err.message,
    });
  }
  res.status(status).render('pages/error', {
    code: status,
    message: status === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
