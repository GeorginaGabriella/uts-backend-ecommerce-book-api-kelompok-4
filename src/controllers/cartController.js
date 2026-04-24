const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const mongoose = require('mongoose');

const isPositiveInteger = (value) => {
  return Number.isInteger(value) && value > 0;
};

const parseQuantity = (value) => {
  const quantity = Number(value);

  return isPositiveInteger(quantity) ? quantity : null;
};

const validateProductId = (res, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    sendError(res, {
      statusCode: 400,
      message: 'productId tidak valid',
    });
    return false;
  }

  return true;
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;
    const parsedQuantity = parseQuantity(quantity);

    if (!validateProductId(res, productId)) {
      return undefined;
    }

    if (!parsedQuantity) {
      return sendError(res, {
        statusCode: 400,
        message: 'Quantity harus berupa angka bulat lebih dari 0',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, { statusCode: 404, message: 'Product not found' });
    }

    if (!product.isActive) {
      return sendError(res, {
        statusCode: 409,
        message: 'Product is not available',
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    const item = cart.items.find(
      i => i.productId.toString() === productId
    );
    const nextQuantity = item
      ? item.quantity + parsedQuantity
      : parsedQuantity;

    if (product.stock < nextQuantity) {
      return sendError(res, {
        statusCode: 409,
        message: 'Stock not enough',
      });
    }

    if (item) {
      item.quantity = nextQuantity;
    } else {
      cart.items.push({ productId, quantity: parsedQuantity });
    }

    await cart.save();

    return sendSuccess(res, {
      message: 'Added to cart',
      data: cart
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// Get cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId })
      .populate('items.productId');

    return sendSuccess(res, { data: cart || { items: [] } });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// Update quantity
exports.updateCart = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;
    const parsedQuantity = parseQuantity(quantity);

    if (!validateProductId(res, productId)) {
      return undefined;
    }

    if (!parsedQuantity) {
      return sendError(res, {
        statusCode: 400,
        message: 'Quantity harus berupa angka bulat lebih dari 0',
      });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });

    if (!cart) {
      return sendError(res, { statusCode: 404, message: 'Cart not found' });
    }

    const item = cart.items.find(
      i => i.productId.toString() === productId
    );

    if (!item) {
      return sendError(res, { statusCode: 404, message: 'Item not found' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return sendError(res, { statusCode: 404, message: 'Product not found' });
    }

    if (!product.isActive) {
      return sendError(res, {
        statusCode: 409,
        message: 'Product is not available',
      });
    }

    if (product.stock < parsedQuantity) {
      return sendError(res, {
        statusCode: 409,
        message: 'Stock not enough',
      });
    }

    item.quantity = parsedQuantity;

    await cart.save();

    return sendSuccess(res, {
      message: 'Cart updated',
      data: cart
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!validateProductId(res, productId)) {
      return undefined;
    }

    const cart = await Cart.findOne({ userId: req.user.userId });

    if (!cart) {
      return sendError(res, { statusCode: 404, message: 'Cart not found' });
    }

    const previousLength = cart.items.length;
    cart.items = cart.items.filter(
      i => i.productId.toString() !== productId
    );

    if (cart.items.length === previousLength) {
      return sendError(res, { statusCode: 404, message: 'Item not found' });
    }

    await cart.save();

    return sendSuccess(res, { message: 'Item removed' });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });

    if (!cart) {
      return sendError(res, { statusCode: 404, message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    return sendSuccess(res, { message: 'Cart cleared' });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};
