const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, { message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return sendError(res, { message: 'Stock not enough' });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    const item = cart.items.find(
      i => i.productId.toString() === productId
    );

    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
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

    const cart = await Cart.findOne({ userId: req.user.userId });

    if (!cart) {
      return sendError(res, { message: 'Cart not found' });
    }

    const item = cart.items.find(
      i => i.productId.toString() === productId
    );

    if (!item) {
      return sendError(res, { message: 'Item not found' });
    }

    item.quantity = quantity;

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

    const cart = await Cart.findOne({ userId: req.user.userId });

    if (!cart) {
      return sendError(res, { message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      i => i.productId.toString() !== productId
    );

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
      return sendError(res, { message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    return sendSuccess(res, { message: 'Cart cleared' });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};