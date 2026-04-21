const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// CART & ORDER ROUTES
router.use(authMiddleware);

router.get('/cart', orderController.getCart);
router.post('/cart', orderController.addToCart);
router.post('/checkout', orderController.checkout);
router.get('/my-orders', orderController.getMyOrders);

module.exports = router;