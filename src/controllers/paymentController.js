const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const order = await Order.findById(orderId);

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

    const order = await Order.findById(orderId);

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
      const product = await Product.findById(item.product);

      if (product) {
        if (product.stock < item.quantity) {
          return sendError(res, {
            message: `Stok buku ${product.title} sudah habis!`
          });
        }

        product.stock -= item.quantity;
        await product.save();
      }
    }

    order.status = 'PAID';
    await order.save();

    return sendSuccess(res, {
      message: 'Pembayaran dikonfirmasi & stok berhasil dipotong',
      data: order
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal konfirmasi pembayaran: ' + err.message
    });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      data: orders
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal mengambil data pesanan admin'
    });
  }
};