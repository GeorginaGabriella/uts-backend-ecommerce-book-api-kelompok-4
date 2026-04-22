const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createOrder,
  getOrderDetail,
  getOrderHistory,
  getAllOrders,
  cancelOrder,
} = require('../controllers/orderController');

const router = express.Router();

router.use(authMiddleware);

router.get('/history', getOrderHistory);
router.get('/', getAllOrders);
router.post('/', createOrder);
router.get('/:id', getOrderDetail);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
