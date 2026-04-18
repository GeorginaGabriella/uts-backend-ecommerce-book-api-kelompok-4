const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, token = null }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    token
  });
};

const sendError = (res, { statusCode = 500, message = 'Internal Server Error' }) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = { sendSuccess, sendError };