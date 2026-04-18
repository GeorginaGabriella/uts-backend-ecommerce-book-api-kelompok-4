const { sendError } = require('../utils/responseHandler');

module.exports = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return sendError(res, {
      statusCode: 403,
      message: 'Admin only',
    });
  }
  next();
};