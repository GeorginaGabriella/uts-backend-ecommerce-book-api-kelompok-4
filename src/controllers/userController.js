const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// PROFILE
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');

  if (!user) {
    return sendError(res, {
      statusCode: 404,
      message: 'User tidak ditemukan'
    });
  }

  return sendSuccess(res, { data: user });
};

exports.updateProfile = async (req, res) => {
  const { username, phone } = req.body;

  if (!username) {
    return sendError(res, {
      statusCode: 400,
      message: 'Username wajib diisi'
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { username, phone },
    { new: true, runValidators: true }
  ).select('-password');

  return sendSuccess(res, {
    message: 'Profile berhasil diperbarui',
    data: user
  });
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return sendError(res, {
      statusCode: 400,
      message: 'Semua field wajib diisi'
    });
  }

  if (newPassword.length < 6) {
    return sendError(res, {
      statusCode: 400,
      message: 'Password minimal 6 karakter'
    });
  }

  const user = await User.findById(req.user.userId);
  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    return sendError(res, {
      statusCode: 400,
      message: 'Password lama salah'
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return sendSuccess(res, { message: 'Password berhasil diubah' });
};

// PROFILE PICTURE
exports.uploadProfilePicture = async (req, res) => {
  if (!req.file) {
    return sendError(res, {
      statusCode: 400,
      message: 'File foto tidak ditemukan'
    });
  }

  const user = await User.findById(req.user.userId);
  user.profilePicture = req.file.path;
  await user.save();

  return sendSuccess(res, {
    message: 'Foto profil berhasil diunggah',
    data: user.profilePicture
  });
};

// WISHLIST
exports.addWishlist = async (req, res) => {
  const { bookId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return sendError(res, {
      statusCode: 400,
      message: 'bookId tidak valid'
    });
  }

  const user = await User.findById(req.user.userId);

  if (user.wishlist.includes(bookId)) {
    return sendError(res, {
      statusCode: 400,
      message: 'Buku sudah ada di wishlist'
    });
  }

  user.wishlist.push(bookId);
  await user.save();

  return sendSuccess(res, {
    message: 'Buku berhasil ditambahkan ke wishlist'
  });
};

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'wishlist',
        select: 'title author price image category'
      });

    return sendSuccess(res, {
      data: user.wishlist
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal mengambil data wishlist'
    });
  }
};

exports.deleteWishlist = async (req, res) => {
  const { bookId } = req.params;
  const user = await User.findById(req.user.userId);

  user.wishlist = user.wishlist.filter(
    id => id.toString() !== bookId
  );

  await user.save();

  return sendSuccess(res, {
    message: 'Buku berhasil dihapus dari wishlist'
  });
};

// ADDRESS
exports.addAddress = async (req, res) => {
  const { street, city, zipCode, isPrimary } = req.body;
  const user = await User.findById(req.user.userId);

  if (isPrimary) {
    user.addresses.forEach(addr => (addr.isPrimary = false));
  }

  user.addresses.push({
    street,
    city,
    zipCode,
    isPrimary: isPrimary || false
  });

  await user.save();

  return sendSuccess(res, {
    message: 'Alamat berhasil ditambahkan',
    data: user.addresses
  });
};

exports.getAddresses = async (req, res) => {
  const user = await User.findById(req.user.userId);

  return sendSuccess(res, {
    data: user.addresses
  });
};

exports.updateAddress = async (req, res) => {
  const { index } = req.params;
  const { street, city, zipCode, isPrimary } = req.body;

  const user = await User.findById(req.user.userId);

  if (!user.addresses[index]) {
    return sendError(res, {
      statusCode: 404,
      message: 'Alamat tidak ditemukan'
    });
  }

  if (isPrimary) {
    user.addresses.forEach(addr => (addr.isPrimary = false));
  }

  const address = user.addresses[index];

  address.street = street || address.street;
  address.city = city || address.city;
  address.zipCode = zipCode || address.zipCode;
  address.isPrimary =
    isPrimary !== undefined ? isPrimary : address.isPrimary;

  await user.save();

  return sendSuccess(res, {
    message: 'Alamat berhasil diperbarui',
    data: user.addresses
  });
};

exports.deleteAddress = async (req, res) => {
  const { index } = req.params;

  const user = await User.findById(req.user.userId);

  if (!user.addresses[index]) {
    return sendError(res, {
      statusCode: 404,
      message: 'Alamat tidak ditemukan'
    });
  }

  user.addresses.splice(index, 1);

  await user.save();

  return sendSuccess(res, {
    message: 'Alamat berhasil dihapus',
    data: user.addresses
  });
};

exports.setPrimaryAddress = async (req, res) => {
  const { index } = req.params;

  const user = await User.findById(req.user.userId);

  if (!user.addresses[index]) {
    return sendError(res, {
      statusCode: 404,
      message: 'Alamat tidak ditemukan'
    });
  }

  user.addresses.forEach((addr, i) => {
    addr.isPrimary = i === parseInt(index);
  });

  await user.save();

  return sendSuccess(res, {
    message: 'Alamat utama berhasil diatur',
    data: user.addresses
  });
};