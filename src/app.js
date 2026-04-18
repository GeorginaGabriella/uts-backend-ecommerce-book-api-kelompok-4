const express = require('express');
const cors = require('cors');

const app = express();

// Untuk  middleware
app.use(cors());
app.use(express.json());

// Untuk import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Untuk pakai routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Untuk test route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

module.exports = app;