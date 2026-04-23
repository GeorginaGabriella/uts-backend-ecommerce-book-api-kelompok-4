const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHandler');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, {
      statusCode: 401,
      message: 'Authorization token is required.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid token payload.',
      });
    }

    req.user = {
      userId,
      role: decoded.role || 'USER',
      email: decoded.email,
    };

    return next();
  } catch (error) {
    return sendError(res, {
      statusCode: 401,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authMiddleware;
