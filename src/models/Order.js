const mongoose = require('mongoose');

const ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'CANCELLED'];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return items.length > 0;
        },
        message: 'Order must contain at least one item.',
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      default: null,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: '',
    },
    paymentProof: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING_PAYMENT',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
