const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.get('/recommendations', productController.getRecommendations);
router.get('/latest', productController.getLatest);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);

router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

router.post('/:id/reviews', productController.addReview);

module.exports = router;