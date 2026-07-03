'use strict';
const crypto = require('crypto');

/** Assigns an anonymous visitor id cookie used for analytics de-duplication. */
module.exports = function visitor(req, res, next) {
  let vid = req.cookies.vid;
  if (!vid) {
    vid = crypto.randomBytes(16).toString('hex');
    res.cookie('vid', vid, {
      maxAge: 1000 * 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  req.visitorId = vid;
  next();
};
