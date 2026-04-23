const express = require('express');
const router = express.Router();

const multer = require('multer');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const upload = multer({
  dest: 'uploads/payments/'
});

router.post('/', authMiddleware, upload.single('proof'), paymentController.initializePayment);

router.put('/confirm', authMiddleware, adminMiddleware, paymentController.confirmPayment);
router.get('/admin/orders', authMiddleware, adminMiddleware, paymentController.getAdminOrders);

module.exports = router;