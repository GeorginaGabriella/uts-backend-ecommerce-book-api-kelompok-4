const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/change-password', authMiddleware, userController.changePassword);

router.post('/wishlist', authMiddleware, userController.addWishlist);
router.get('/wishlist', authMiddleware, userController.getWishlist);
router.delete('/wishlist/:productId', authMiddleware, userController.deleteWishlist);

module.exports = router;