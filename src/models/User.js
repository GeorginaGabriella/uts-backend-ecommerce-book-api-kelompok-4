const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  zipCode: String,
  isPrimary: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  role: {
    type: String,
    enum: ['buyer', 'admin'],
    default: 'buyer'
  },

  profilePicture: { type: String, default: '' },

  addresses: [addressSchema],

  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);