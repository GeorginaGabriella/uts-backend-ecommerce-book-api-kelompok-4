const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const {
  sendSuccess,
  sendError,
  createHttpError,
} = require('../utils/responseHandler');

const { ORDER_STATUSES } = Order;

const generateOrderNumber = async (session) => {
  let orderNumber;
  let isUnique = false;

  while (!isUnique) {
    orderNumber = `ORD${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const existingOrder = await Order.exists({ orderNumber }).session(session);
    isUnique = !existingOrder;
  }

  return orderNumber;
};

const buildOrderFilter = (id, userId) => {
  const filter = {
    userId,
  };

  if (mongoose.Types.ObjectId.isValid(id)) {
    filter.$or = [{ _id: id }, { orderNumber: id }];
  } else {
    filter.orderNumber = id;
  }

  return filter;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let createdOrder;
    const userId = req.user.userId;

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ userId })
        .populate('items.productId')
        .session(session);

      if (!cart || cart.items.length === 0) {
        throw createHttpError(400, 'Cart is empty.');
      }

      const orderItems = [];
      let totalPrice = 0;

      for (const cartItem of cart.items) {
        const product = cartItem.productId;

        if (!product || !product.isActive) {
          throw createHttpError(
            409,
            'One or more products are no longer available.'
          );
        }

        if (product.stock < cartItem.quantity) {
          throw createHttpError(
            409,
            `Insufficient stock for product "${product.title}".`
          );
        }

        product.stock -= cartItem.quantity;
        await product.save({ session });

        orderItems.push({
          productId: product._id,
          title: product.title,
          price: product.price,
          quantity: cartItem.quantity,
        });

        totalPrice += product.price * cartItem.quantity;
      }

      const orderNumber = await generateOrderNumber(session);
      const [order] = await Order.create(
        [
          {
            orderNumber,
            userId,
            items: orderItems,
            totalPrice,
            status: 'PENDING_PAYMENT',
          },
        ],
        { session }
      );

      createdOrder = order;

      cart.items = [];
      await cart.save({ session });

      console.log(
        `[ORDER_CREATED] user=${userId} order=${order.orderNumber} total=${totalPrice}`
      );
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Order created successfully',
      orderId: createdOrder.orderNumber,
      status: createdOrder.status,
    });
  } catch (error) {
    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create order.',
      errors: error.errors,
    });
  } finally {
    await session.endSession();
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findOne(buildOrderFilter(req.params.id, req.user.userId))
      .populate('userId', 'name email role')
      .populate('items.productId', 'title author price stock isActive');

    if (!order) {
      return sendError(res, {
        statusCode: 404,
        message: 'Order not found.',
      });
    }

    return sendSuccess(res, {
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to retrieve order detail.',
    });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);
    const filter = {
      userId: req.user.userId,
    };

    if (req.query.status) {
      const normalizedStatus = String(req.query.status).toUpperCase();

      if (!ORDER_STATUSES.includes(normalizedStatus)) {
        return sendError(res, {
          statusCode: 400,
          message: `Invalid status. Allowed values: ${ORDER_STATUSES.join(', ')}`,
        });
      }

      filter.status = normalizedStatus;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.productId', 'title author price stock isActive')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: 'Order history retrieved successfully',
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to retrieve order history.',
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.userId,
      status: { $ne: 'CANCELLED' },
    })
      .populate('items.productId', 'title author price stock isActive')
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      message: 'Active orders retrieved successfully',
      data: orders,
    });
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to retrieve orders.',
    });
  }
};

const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let cancelledOrder;
    const userId = req.user.userId;

    await session.withTransaction(async () => {
      const order = await Order.findOne(buildOrderFilter(req.params.id, userId)).session(
        session
      );

      if (!order) {
        throw createHttpError(404, 'Order not found.');
      }

      if (order.status !== 'PENDING_PAYMENT') {
        throw createHttpError(
          409,
          'Only orders with PENDING_PAYMENT status can be cancelled.'
        );
      }

      for (const item of order.items) {
        const updatedProduct = await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } },
          { new: true, session }
        );

        if (!updatedProduct) {
          throw createHttpError(
            409,
            `Product reference ${item.productId} is no longer available.`
          );
        }
      }

      order.status = 'CANCELLED';
      cancelledOrder = await order.save({ session });

      console.log(
        `[ORDER_CANCELLED] user=${userId} order=${order.orderNumber} total=${order.totalPrice}`
      );
    });

    return sendSuccess(res, {
      message: 'Order cancelled successfully',
      data: cancelledOrder,
    });
  } catch (error) {
    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to cancel order.',
      errors: error.errors,
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createOrder,
  getOrderDetail,
  getOrderHistory,
  getAllOrders,
  cancelOrder,
};
