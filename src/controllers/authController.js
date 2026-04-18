const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Untuk Register (Daftar User)
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Cek email sudah ada atau belum
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah digunakan' });
    }

    // Untuk hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Untak simpan user (role otomatis akan buyer)
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'buyer'
    });

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Untuk Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buat cek user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Buat cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password salah' });
    }

    // Buat kasih token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};