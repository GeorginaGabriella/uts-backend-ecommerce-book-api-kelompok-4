const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// CART & ORDER
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return sendError(res, {
        statusCode: 404,
        message: 'Buku tidak ditemukan'
      });
    }

    if (product.stock < quantity) {
      return sendError(res, {
        statusCode: 400,
        message: 'Stok tidak mencukupi'
      });
    }

    let order = await Order.findOne({
      user: req.user.userId,
      status: 'PENDING'
    });

    if (!order) {
      order = new Order({
        user: req.user.userId,
        items: [
          {
            product: productId,
            quantity,
            price: product.price
          }
        ],
        totalAmount: product.price * quantity
      });
    } else {
      const itemIndex = order.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        order.items[itemIndex].quantity += quantity;
      } else {
        order.items.push({
          product: productId,
          quantity,
          price: product.price
        });
      }

      order.totalAmount = order.items.reduce(
        (acc, item) => acc + item.quantity * item.price,
        0
      );
    }

    await order.save();

    return sendSuccess(res, {
      message: 'Berhasil masuk keranjang',
      data: order
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal menambah ke keranjang'
    });
  }
};

exports.getCart = async (req, res) => {
  try {
    const cart = await Order.findOne({
      user: req.user.userId,
      status: 'PENDING'
    }).populate('items.product');

    if (!cart) {
      return sendSuccess(res, {
        message: 'Keranjang kosong',
        data: { items: [] }
      });
    }

    return sendSuccess(res, {
      data: cart
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal mengambil keranjang'
    });
  }
};

exports.checkout = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    const order = await Order.findOne({
      user: req.user.userId,
      status: 'PENDING'
    });

    if (!order || order.items.length === 0) {
      return sendError(res, {
        statusCode: 400,
        message: 'Keranjang kosong'
      });
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product);

      if (product.stock < item.quantity) {
        return sendError(res, {
          message: `Stok buku ${product.title} tidak cukup`
        });
      }

      product.stock -= item.quantity;
      await product.save();
    }

    order.status = 'PAID';
    order.shippingAddress = shippingAddress;

    await order.save();

    return sendSuccess(res, {
      message: 'Checkout berhasil, pesanan diproses',
      data: order
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal checkout: ' + err.message
    });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.userId,
      status: { $ne: 'PENDING' }
    }).sort({ createdAt: -1 });

    return sendSuccess(res, {
      data: orders
    });
  } catch (err) {
    return sendError(res, {
      message: 'Gagal mengambil riwayat pesanan'
    });
  }
};