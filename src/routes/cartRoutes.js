const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', cartController.addToCart);
router.get('/', cartController.getCart);
router.put('/:id', cartController.updateCart);
router.delete('/:id', cartController.deleteItem);
router.delete('/', cartController.clearCart);

module.exports = router;