const express = require('express');
const multer = require('multer');

const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  return cb(new Error('File harus berupa gambar'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

const cloudinaryController = require('../controllers/cloudinary');

router.put(
  '/profile-picture',
  upload.single('image'),
  cloudinaryController.uploadProfilePicture
);

router.use(authMiddleware);

// PROFILE
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// WISHLIST
router.post('/wishlist', userController.addWishlist);
router.get('/wishlist', userController.getWishlist);
router.delete('/wishlist/:bookId', userController.deleteWishlist);

// ADDRESS
router.post('/address', userController.addAddress);
router.get('/address', userController.getAddresses);
router.put('/address/:index', userController.updateAddress);
router.delete('/address/:index', userController.deleteAddress);
router.put('/address/:index/primary', userController.setPrimaryAddress);

module.exports = router;