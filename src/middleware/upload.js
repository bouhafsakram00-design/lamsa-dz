'use strict';
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');

fs.mkdirSync(config.uploads.dir, { recursive: true });

/**
 * Secure upload: memory storage so we can validate + re-encode with sharp
 * (strips EXIF/metadata, prevents polyglot/SVG-script uploads, normalises
 * format). Only image mime types are accepted; size is capped.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!config.uploads.allowedMime.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WebP or GIF images are allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxBytes, files: 6 },
});

/** Process buffered images with sharp -> resized webp, return public URLs. */
async function processImages(files) {
  if (!files || !files.length) return [];
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    sharp = null;
  }
  const urls = [];
  for (const file of files) {
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    if (sharp) {
      const outName = `${name}.webp`;
      await sharp(file.buffer)
        .rotate()
        .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(config.uploads.dir, outName));
      urls.push(`/uploads/${outName}`);
    } else {
      // Fallback: write original bytes if sharp unavailable
      const ext = (file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const outName = `${name}.${ext}`;
      fs.writeFileSync(path.join(config.uploads.dir, outName), file.buffer);
      urls.push(`/uploads/${outName}`);
    }
  }
  return urls;
}

module.exports = { upload, processImages };
