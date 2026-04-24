const Product = require('../models/Product');
const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseRating = (value) => {
  const rating = Number(value);

  return Number.isInteger(rating) ? rating : null;
};

// CREATE
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    if (err.code === 11000) {
      return res.status(409).json({ message: 'ISBN already exists' });
    }

    res.status(500).json({ message: err.message });
  }
};

// GET ALL + SEARCH
exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { author: new RegExp(search, 'i') }
      ];
    }

    if (category) {
      query.category = category;
    }

    let products = Product.find(query);

    if (sort === 'cheap') {
      products = products.sort({ price: 1 });
    } else if (sort === 'expensive') {
      products = products.sort({ price: -1 });
    } else {
      products = products.sort({ createdAt: -1 });
    }

    res.json(await products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET BY ID
exports.getProductById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Invalid ID' });
  }
};

// UPDATE
exports.updateProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: err.message });
  }
};

// DELETE
exports.deleteProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD REVIEW
exports.addReview = async (req, res) => {
  try {
    const { rating, comment, username } = req.body;
    const parsedRating = parseRating(rating);

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    if (parsedRating === null || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be 1-5' });
    }

    if (!comment || !username) {
      return res.status(400).json({ message: 'Username and comment are required' });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newReview = {
      rating: parsedRating,
      comment,
      username,
      createdAt: new Date()
    };

    product.reviews.push(newReview);

    const total = product.reviews.reduce((acc, r) => acc + r.rating, 0);
    product.averageRating = total / product.reviews.length;

    await product.save();

    res.json({ message: 'Review added successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const product = await Product.findById(req.params.id).select('reviews');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      totalReviews: product.reviews.length,
      data: product.reviews
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RECOMMENDATIONS
exports.getRecommendations = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ averageRating: -1 })
      .limit(5);

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LATEST
exports.getLatest = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CATEGORIES
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
