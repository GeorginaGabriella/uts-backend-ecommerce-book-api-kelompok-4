const Order = require('../models/Order');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const mongoose = require('mongoose');

const buildOrderLookup = (id, userId) => {
  const ownerFilter = userId ? { userId } : {};

  if (mongoose.Types.ObjectId.isValid(id)) {
    return {
      ...ownerFilter,
      $or: [{ _id: id }, { orderNumber: id }],
    };
  }

  return { ...ownerFilter, orderNumber: id };
};

const serializePaymentStatus = (order) => ({
  orderId: order._id,
  orderNumber: order.orderNumber,
  paymentStatus: order.status,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentProof: order.paymentProof,
});

exports.initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return sendError(res, {
        statusCode: 400,
        message: 'orderId dan paymentMethod wajib diisi'
      });
    }

    const order = await Order.findOne(buildOrderLookup(orderId, req.user.userId));

    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Pesanan tidak ditemukan'
      });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return sendError(res, {
        statusCode: 409,
        message: 'Pembayaran hanya bisa diinisialisasi untuk pesanan pending'
      });
    }

    order.paymentMethod = paymentMethod;

    if (req.file) {
      order.paymentProof = req.file.path;
    }

    await order.save();

    return sendSuccess(res, {
      message: 'Pembayaran diinisialisasi, menunggu konfirmasi admin',
      data: order
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal memproses pembayaran'
    });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return sendError(res, {
        statusCode: 400,
        message: 'orderId wajib diisi'
      });
    }

    const order = await Order.findOne(buildOrderLookup(orderId));

    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Pesanan tidak ditemukan'
      });
    }

    if (order.status === 'PAID') {
      return sendError(res, {
        statusCode: 409,
        message: 'Pesanan sudah dibayar sebelumnya'
      });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return sendError(res, {
        statusCode: 409,
        message: 'Pesanan tidak bisa dikonfirmasi karena status bukan pending'
      });
    }

    order.status = 'PAID';
    await order.save();

    return sendSuccess(res, {
      message: 'Pembayaran berhasil dikonfirmasi',
      data: order
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal konfirmasi pembayaran: ' + err.message
    });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const ownerId = req.user.role === 'ADMIN' ? null : req.user.userId;
    const order = await Order.findOne(buildOrderLookup(req.params.orderId, ownerId));

    if (!order) {
      return sendError(res, { message: 'Order tidak ditemukan' });
    }

    return sendSuccess(res, {
      data: serializePaymentStatus(order)
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

exports.reverifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return sendError(res, {
        statusCode: 400,
        message: 'orderId wajib diisi'
      });
    }

    const ownerId = req.user.role === 'ADMIN' ? null : req.user.userId;
    const order = await Order.findOne(buildOrderLookup(orderId, ownerId));

    if (!order) {
      return sendError(res, { message: 'Order tidak ditemukan' });
    }

    return sendSuccess(res, {
      message: 'Status pembayaran dicek ulang',
      data: serializePaymentStatus(order)
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      data: orders.map((order) => {
        const payload =
          typeof order.toObject === 'function' ? order.toObject() : { ...order };

        return {
          ...payload,
          paymentStatus: payload.status,
        };
      })
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal mengambil data pesanan admin'
    });
  }
};
