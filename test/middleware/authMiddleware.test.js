const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createMockResponse } = require('../helpers/mockHttp');
const { loadWithMocks } = require('../helpers/loadWithMocks');

const authMiddlewarePath = path.resolve(
  __dirname,
  '../../src/middleware/authMiddleware.js'
);

test('authMiddleware rejects requests without a bearer token', async () => {
  const { loadedModule: authMiddleware, restore } = loadWithMocks(
    authMiddlewarePath,
    {
      jsonwebtoken: {
        verify() {
          throw new Error('verify should not be called');
        },
      },
    }
  );

  try {
    const req = {
      headers: {},
    };
    const res = createMockResponse();
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Authorization token is required.');
  } finally {
    restore();
  }
});

test('authMiddleware attaches user data for a valid token', async () => {
  const { loadedModule: authMiddleware, restore } = loadWithMocks(
    authMiddlewarePath,
    {
      jsonwebtoken: {
        verify(token, secret) {
          assert.equal(token, 'valid-token');
          assert.equal(secret, process.env.JWT_SECRET);

          return {
            userId: 'user-1',
            role: 'ADMIN',
            email: 'user@example.com',
          };
        },
      },
    }
  );

  try {
    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    const res = createMockResponse();
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, {
      userId: 'user-1',
      role: 'ADMIN',
      email: 'user@example.com',
    });
  } finally {
    restore();
  }
});

test('authMiddleware rejects tokens without a user identifier', async () => {
  const { loadedModule: authMiddleware, restore } = loadWithMocks(
    authMiddlewarePath,
    {
      jsonwebtoken: {
        verify() {
          return {
            role: 'USER',
          };
        },
      },
    }
  );

  try {
    const req = {
      headers: {
        authorization: 'Bearer missing-user-id',
      },
    };
    const res = createMockResponse();
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Invalid token payload.');
  } finally {
    restore();
  }
});
