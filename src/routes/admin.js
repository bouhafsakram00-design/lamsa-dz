'use strict';
const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { verifyToken } = require('../middleware/csrf');
const v = require('../validators');

// All admin routes require an authenticated admin/manager
router.use(requireAdmin);

// ---- GET pages ----
router.get('/', admin.dashboard);
router.get('/analytics', admin.analyticsPage);
router.get('/products', admin.products);
router.get('/products/new', admin.newProduct);
router.get('/products/:id/edit', admin.editProduct);
router.get('/inventory', admin.inventory);
router.get('/reviews', admin.reviews);
router.get('/messages', admin.messages);
router.get('/settings', admin.settings);

// ---- Product create/update (multipart): multer FIRST, then CSRF verify, then validate ----
router.post('/products', upload.array('images', 6), verifyToken, v.productRules, v.handleValidation, admin.saveProduct);
router.post('/products/:id', upload.array('images', 6), verifyToken, v.productRules, v.handleValidation, admin.saveProduct);

// ---- Other admin POSTs (urlencoded already parsed globally): CSRF verify ----
router.post('/products/:id/delete', verifyToken, admin.deleteProduct);
router.post('/products/:id/images/:imageId/delete', verifyToken, admin.deleteProductImage);
router.post('/inventory/:id/adjust', verifyToken, admin.adjustInventory);
router.post('/reviews/:id/approve', verifyToken, admin.approveReview);
router.post('/reviews/:id/delete', verifyToken, admin.deleteReview);
router.post('/messages/:id/read', verifyToken, admin.readMessage);
router.post('/settings', verifyToken, admin.saveSettings);

module.exports = router;
