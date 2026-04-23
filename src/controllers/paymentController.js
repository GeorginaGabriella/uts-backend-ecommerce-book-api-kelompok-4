const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const mongoose = require('mongoose');

const buildOrderLookup = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return {
      $or: [{ _id: id }, { orderNumber: id }],
    };
  }

  return { orderNumber: id };
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

    const order = await Order.findOne(buildOrderLookup(orderId));

    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Pesanan tidak ditemukan'
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

    const order = await Order.findOne(buildOrderLookup(orderId));

    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Pesanan tidak ditemukan'
      });
    }

    if (order.status === 'PAID') {
      return sendError(res, {
        message: 'Pesanan sudah dibayar sebelumnya'
      });
    }

    for (const item of order.items) {
      const product = await Product.findById(item.productId);;

      if (product) {
        if (product.stock < item.quantity) {
          return sendError(res, {
            message: `Stok buku ${product.title} sudah habis!`
          });
        }
      }
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
    const order = await Order.findOne(buildOrderLookup(req.params.orderId));

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

    const order = await Order.findOne(buildOrderLookup(orderId));

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
