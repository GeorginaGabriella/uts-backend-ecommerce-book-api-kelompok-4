const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHandler');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, {
      statusCode: 401,
      message: 'Token diperlukan'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    return next();
  } catch (err) {
    return sendError(res, {
      statusCode: 401,
      message: 'Token tidak valid'
    });
  }
};