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
  const filter = { userId };

  if (mongoose.Types.ObjectId.isValid(id)) {
    filter.$or = [{ _id: id }, { orderNumber: id }];
    return filter;
  }

  filter.orderNumber = id;
  return filter;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const getPrimaryShippingAddress = async (userId, session) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }

  const User = require('../models/User');
  const userQuery = User.findById(userId).select('addresses');

  if (typeof userQuery.session === 'function') {
    userQuery.session(session);
  }

  const user = await userQuery;

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  if (!Array.isArray(user.addresses) || user.addresses.length === 0) {
    throw createHttpError(
      400,
      'Primary shipping address is required before checkout.'
    );
  }

  const primaryAddress =
    user.addresses.find(address => address.isPrimary) || user.addresses[0];

  return {
    street: primaryAddress.street,
    city: primaryAddress.city,
    zipCode: primaryAddress.zipCode,
  };
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

      const shippingAddress = await getPrimaryShippingAddress(userId, session);
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
            shippingAddress,
            status: 'PENDING_PAYMENT',
          },
        ],
        { session }
      );

      createdOrder = order;
      cart.items = [];
      await cart.save({ session });
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Order created successfully',
      orderId: createdOrder.orderNumber,
      status: createdOrder.status,
      data: createdOrder,
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

const getAllOrders = async (req, res) => {
  try {
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

    const orders = await Order.find(filter)
      .populate('items.productId', 'title author price stock isActive image')
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      message: 'Orders retrieved successfully',
      data: orders,
    });
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to retrieve orders.',
    });
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findOne(
      buildOrderFilter(req.params.id, req.user.userId)
    ).populate('items.productId', 'title author price stock isActive image');

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
        .populate('items.productId', 'title author price stock isActive image')
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

const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let cancelledOrder;
    const userId = req.user.userId;

    await session.withTransaction(async () => {
      const order = await Order.findOne(
        buildOrderFilter(req.params.id, userId)
      ).session(session);

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
  getAllOrders,
  getOrderDetail,
  getOrderHistory,
  cancelOrder,
};
