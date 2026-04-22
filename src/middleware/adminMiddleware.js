const { sendError } = require('../utils/responseHandler');

module.exports = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return sendError(res, {
      statusCode: 403,
      message: 'Akses ditolak: Hanya untuk Admin'
    });
  }
};