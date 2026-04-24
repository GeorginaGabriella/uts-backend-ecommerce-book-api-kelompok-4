const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createMockResponse } = require('../helpers/mockHttp');
const { loadWithMocks } = require('../helpers/loadWithMocks');

const controllerPath = path.resolve(
  __dirname,
  '../../src/controllers/paymentController.js'
);

test('confirmPayment marks an existing pending order as paid', async () => {
  let saveCalled = false;

  const order = {
    _id: 'order-1',
    orderNumber: 'ORD123456',
    status: 'PENDING_PAYMENT',
    items: [
      {
        productId: 'product-1',
        quantity: 1,
      },
    ],
    async save() {
      saveCalled = true;
      return this;
    },
  };

  const { loadedModule: paymentController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        Types: {
          ObjectId: {
            isValid() {
              return false;
            },
          },
        },
      },
      '../models/Order': {
        findOne(filter) {
          assert.deepEqual(filter, { orderNumber: 'ORD123456' });
          return Promise.resolve(order);
        },
      },
    }
  );

  try {
    const req = {
      body: {
        orderId: 'ORD123456',
      },
    };
    const res = createMockResponse();

    await paymentController.confirmPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Pembayaran berhasil dikonfirmasi');
    assert.equal(order.status, 'PAID');
    assert.equal(saveCalled, true);
  } finally {
    restore();
  }
});
