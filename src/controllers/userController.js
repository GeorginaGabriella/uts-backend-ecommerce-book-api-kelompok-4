const User = require('../models/User');

// GET PROFILE
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    req.body,
    { new: true }
  ).select('-password');

  res.json(user);
};

// GANTI PASSWORD
exports.changePassword = async (req, res) => {
  const bcrypt = require('bcryptjs');

  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Password lama salah' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: 'Password berhasil diubah' });
};

// TAMBAH WISHLIST
exports.addWishlist = async (req, res) => {
  const { productId } = req.body;

  const user = await User.findById(req.user.id);

  if (!user.wishlist.includes(productId)) {
    user.wishlist.push(productId);
    await user.save();
  }

  res.json({ message: 'Berhasil ditambahkan ke wishlist' });
};

// LIHAT WISHLIST
exports.getWishlist = async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist');
  res.json(user.wishlist);
};

// HAPUS WISHLIST
exports.deleteWishlist = async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.user.id);

  user.wishlist = user.wishlist.filter(
    (id) => id.toString() !== productId
  );

  await user.save();

  res.json({ message: 'Berhasil dihapus dari wishlist' });
};