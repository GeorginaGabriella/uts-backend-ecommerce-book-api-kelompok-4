const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// REGISTER
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return sendError(res, {
        statusCode: 400,
        message: 'Semua field wajib diisi'
      });
    }

    if (!email.includes('@')) {
      return sendError(res, {
        statusCode: 400,
        message: 'Format email tidak valid'
      });
    }

    if (password.length < 6) {
      return sendError(res, {
        statusCode: 400,
        message: 'Password minimal 6 karakter'
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return sendError(res, {
        statusCode: 400,
        message: 'Email sudah digunakan'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'USER'
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Registrasi berhasil',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Terjadi kesalahan saat registrasi'
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, {
        statusCode: 400,
        message: 'Email dan password wajib diisi'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: 'User tidak ditemukan'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendError(res, {
        statusCode: 400,
        message: 'Password salah'
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return sendSuccess(res, {
      message: 'Login berhasil',
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Terjadi kesalahan saat login'
    });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  return sendSuccess(res, {
    message: 'Logout berhasil (hapus token di client)'
  });
};