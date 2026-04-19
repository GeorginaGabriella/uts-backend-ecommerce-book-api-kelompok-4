const express = require('express');
const cors = require('cors');
const { sendError } = require('./utils/responseHandler');

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ROUTES
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes')

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// TEST ROUTES
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// 404 HANDLER
app.use((req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: 'Route not found',
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);
  return sendError(res, {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;