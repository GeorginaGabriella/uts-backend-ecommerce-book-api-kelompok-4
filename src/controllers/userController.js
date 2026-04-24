const User = require('../models/User');
const Product = require('../models/Product');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    sendError(res, {
      statusCode: 404,
      message: 'User tidak ditemukan',
    });
    return null;
  }

  return user;
};

const parseAddressIndex = (value) => {
  const index = Number.parseInt(value, 10);

  if (Number.isNaN(index) || index < 0) {
    return null;
  }

  return index;
};

// PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: 'User tidak ditemukan'
      });
    }

    return sendSuccess(res, { data: user });
  } catch (err) {
    return sendError(res, { message: 'Gagal mengambil profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
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

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: 'User tidak ditemukan'
      });
    }

    return sendSuccess(res, {
      message: 'Profile berhasil diperbarui',
      data: user
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 400,
      message: err.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
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

    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

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
  } catch (err) {
    return sendError(res, { message: 'Gagal mengubah password' });
  }
};

// WISHLIST
exports.addWishlist = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return sendError(res, {
        statusCode: 400,
        message: 'bookId tidak valid'
      });
    }

    const [user, product] = await Promise.all([
      User.findById(req.user.userId),
      Product.findById(bookId),
    ]);

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: 'User tidak ditemukan'
      });
    }

    if (!product) {
      return sendError(res, {
        statusCode: 404,
        message: 'Buku tidak ditemukan'
      });
    }

    if (user.wishlist.some(id => id.toString() === bookId)) {
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
  } catch (err) {
    return sendError(res, { message: 'Gagal menambahkan wishlist' });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'wishlist',
        select: 'title author price image category'
      });

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: 'User tidak ditemukan'
      });
    }

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
  try {
    const { bookId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return sendError(res, {
        statusCode: 400,
        message: 'bookId tidak valid'
      });
    }

    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

    const previousLength = user.wishlist.length;
    user.wishlist = user.wishlist.filter(
      id => id.toString() !== bookId
    );

    if (user.wishlist.length === previousLength) {
      return sendError(res, {
        statusCode: 404,
        message: 'Buku tidak ada di wishlist'
      });
    }

    await user.save();

    return sendSuccess(res, {
      message: 'Buku berhasil dihapus dari wishlist'
    });
  } catch (err) {
    return sendError(res, { message: 'Gagal menghapus wishlist' });
  }
};

// ADDRESS
exports.addAddress = async (req, res) => {
  try {
    const { street, city, zipCode, isPrimary } = req.body;

    if (!street || !city || !zipCode) {
      return sendError(res, {
        statusCode: 400,
        message: 'Street, city, dan zipCode wajib diisi'
      });
    }

    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

    const shouldBePrimary = Boolean(isPrimary) || user.addresses.length === 0;

    if (shouldBePrimary) {
      user.addresses.forEach(addr => (addr.isPrimary = false));
    }

    user.addresses.push({
      street,
      city,
      zipCode,
      isPrimary: shouldBePrimary
    });

    await user.save();

    return sendSuccess(res, {
      message: 'Alamat berhasil ditambahkan',
      data: user.addresses
    });
  } catch (err) {
    return sendError(res, { message: 'Gagal menambahkan alamat' });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

    return sendSuccess(res, {
      data: user.addresses
    });
  } catch (err) {
    return sendError(res, { message: 'Gagal mengambil alamat' });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const index = parseAddressIndex(req.params.index);
    const { street, city, zipCode, isPrimary } = req.body;

    if (index === null) {
      return sendError(res, {
        statusCode: 400,
        message: 'Index alamat tidak valid'
      });
    }

    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

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
  } catch (err) {
    return sendError(res, { message: 'Gagal memperbarui alamat' });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const index = parseAddressIndex(req.params.index);

    if (index === null) {
      return sendError(res, {
        statusCode: 400,
        message: 'Index alamat tidak valid'
      });
    }

    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

    if (!user.addresses[index]) {
      return sendError(res, {
        statusCode: 404,
        message: 'Alamat tidak ditemukan'
      });
    }

    const wasPrimary = user.addresses[index].isPrimary;
    user.addresses.splice(index, 1);

    if (wasPrimary && user.addresses.length > 0) {
      user.addresses[0].isPrimary = true;
    }

    await user.save();

    return sendSuccess(res, {
      message: 'Alamat berhasil dihapus',
      data: user.addresses
    });
  } catch (err) {
    return sendError(res, { message: 'Gagal menghapus alamat' });
  }
};

exports.setPrimaryAddress = async (req, res) => {
  try {
    const index = parseAddressIndex(req.params.index);

    if (index === null) {
      return sendError(res, {
        statusCode: 400,
        message: 'Index alamat tidak valid'
      });
    }

    const user = await getCurrentUser(req, res);

    if (!user) {
      return undefined;
    }

    if (!user.addresses[index]) {
      return sendError(res, {
        statusCode: 404,
        message: 'Alamat tidak ditemukan'
      });
    }

    user.addresses.forEach((addr, i) => {
      addr.isPrimary = i === index;
    });

    await user.save();

    return sendSuccess(res, {
      message: 'Alamat utama berhasil diatur',
      data: user.addresses
    });
  } catch (err) {
    return sendError(res, { message: 'Gagal mengatur alamat utama' });
  }
};
