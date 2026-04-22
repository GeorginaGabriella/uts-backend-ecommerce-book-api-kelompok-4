const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const buildCartFilter = (userId) => ({
  $or: [{ user: userId }, { userId }],
});

const getCartProduct = (item) => item.product || item.productId;

// CREATE ORDER (CHECKOUT)
exports.createOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne(buildCartFilter(req.user.userId)).populate(
      'items.product items.productId'
    );

    if (!cart || cart.items.length === 0) {
      return sendError(res, { statusCode: 400, message: 'Keranjang kosong' });
    }

    const user = await User.findById(req.user.userId);
    const primaryAddress =
      user?.addresses?.find((addr) => addr.isPrimary) || user?.addresses?.[0];

    if (!primaryAddress) {
      return sendError(res, {
        statusCode: 400,
        message: 'Harap tambahkan alamat pengiriman terlebih dahulu',
      });
    }

    const orderItems = cart.items.map((item) => {
      const product = getCartProduct(item);

      return {
        product: product?._id || product,
        title: product?.title || item.title || '',
        quantity: item.quantity,
        price: item.price ?? product?.price ?? 0,
      };
    });

    const totalAmount =
      typeof cart.totalPrice === 'number'
        ? cart.totalPrice
        : orderItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

    const order = await Order.create({
      user: req.user.userId,
      items: orderItems,
      shippingAddress: {
        street: primaryAddress.street,
        city: primaryAddress.city,
        zipCode: primaryAddress.zipCode,
      },
      totalAmount,
    });

    // Kosongkan keranjang setelah checkout berhasil
    await Cart.findOneAndDelete(buildCartFilter(req.user.userId));

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Pesanan berhasil dibuat, silakan lakukan pembayaran',
      data: order,
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// GET ALL ORDERS (FOR USER)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId }).sort({
      createdAt: -1,
    });
    return sendSuccess(res, { data: orders });
  } catch (err) {
    return sendError(res, { message: 'Gagal mengambil riwayat pesanan' });
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Pesanan tidak ditemukan',
      });
    }

    // Pastikan user hanya bisa lihat pesanannya sendiri
    if (order.user.toString() !== req.user.userId && req.user.role !== 'ADMIN') {
      return sendError(res, { statusCode: 403, message: 'Akses ditolak' });
    }

    return sendSuccess(res, { data: order });
  } catch (err) {
    return sendError(res, { message: 'ID Pesanan tidak valid' });
  }
};

// CANCEL ORDER
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Pesanan tidak ditemukan',
      });
    }

    if (order.user.toString() !== req.user.userId && req.user.role !== 'ADMIN') {
      return sendError(res, { statusCode: 403, message: 'Akses ditolak' });
    }

    if (order.status !== 'PENDING') {
      return sendError(res, {
        statusCode: 400,
        message: 'Pesanan yang sudah dibayar/diproses tidak bisa dibatalkan',
      });
    }

    order.status = 'CANCELLED';
    await order.save();

    return sendSuccess(res, { message: 'Pesanan berhasil dibatalkan' });
  } catch (err) {
    return sendError(res, { message: 'Gagal membatalkan pesanan' });
  }
};
