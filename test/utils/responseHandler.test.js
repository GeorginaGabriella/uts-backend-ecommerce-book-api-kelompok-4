const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sendSuccess,
  sendError,
  createHttpError,
} = require('../../src/utils/responseHandler');
const { createMockResponse } = require('../helpers/mockHttp');

test('sendSuccess returns a standardized success payload', () => {
  const res = createMockResponse();

  sendSuccess(res, {
    statusCode: 201,
    message: 'Created',
    data: { id: 1 },
    meta: { page: 1 },
    orderId: 'ORD1',
  });

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    success: true,
    message: 'Created',
    orderId: 'ORD1',
    data: { id: 1 },
    meta: { page: 1 },
  });
});

test('sendError returns a standardized error payload', () => {
  const res = createMockResponse();

  sendError(res, {
    statusCode: 409,
    message: 'Conflict',
    errors: ['stock'],
  });

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Conflict',
    errors: ['stock'],
  });
});

test('createHttpError attaches statusCode and errors to the Error instance', () => {
  const error = createHttpError(400, 'Bad request', { field: 'email' });

  assert.equal(error.message, 'Bad request');
  assert.equal(error.statusCode, 400);
  assert.deepEqual(error.errors, { field: 'email' });
});
