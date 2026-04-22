const sendSuccess = (
  res,
  { statusCode = 200, message = 'Success', data, meta, ...extras } = {}
) => {
  const payload = {
    success: true,
    message,
    ...extras,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const sendError = (
  res,
  { statusCode = 500, message = 'Internal server error', errors } = {}
) => {
  const payload = {
    success: false,
    message,
  };

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

const createHttpError = (statusCode, message, errors) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (errors !== undefined) {
    error.errors = errors;
  }

  return error;
};

module.exports = {
  sendSuccess,
  sendError,
  createHttpError,
};
