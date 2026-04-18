const express = require('express');
const cors = require('cors');
const orderRoutes = require('./routes/orderRoutes');
const { sendError } = require('./utils/responseHandler');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.use('/orders', orderRoutes);

// test route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use((req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: 'Route not found.',
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  return sendError(res, {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal server error.',
    errors: err.errors,
  });
});

module.exports = app;
