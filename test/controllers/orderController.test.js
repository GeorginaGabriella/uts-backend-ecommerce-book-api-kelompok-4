const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createMockResponse } = require('../helpers/mockHttp');
const { loadWithMocks } = require('../helpers/loadWithMocks');

const controllerPath = path.resolve(
  __dirname,
  '../../src/controllers/orderController.js'
);

const createSessionMock = () => {
  let ended = false;

  return {
    session: {
      async withTransaction(work) {
        return work();
      },
      async endSession() {
        ended = true;
      },
    },
    wasEnded() {
      return ended;
    },
  };
};

const createOrderQueryChain = (value) => {
  return {
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return Promise.resolve(value);
    },
    session() {
      return Promise.resolve(value);
    },
  };
};

test('createOrder creates an order, reduces stock, and clears the cart', async () => {
  const sessionMock = createSessionMock();
  const savedProducts = [];
  let cartSaved = false;
  let createdOrderPayload;

  const product = {
    _id: 'product-1',
    title: 'Clean Code',
    price: 150000,
    stock: 5,
    isActive: true,
    async save() {
      savedProducts.push({
        productId: this._id,
        stock: this.stock,
      });

      return this;
    },
  };

  const cart = {
    items: [
      {
        productId: product,
        quantity: 2,
      },
    ],
    async save() {
      cartSaved = true;
      return this;
    },
  };

  const orderModelMock = {
    ORDER_STATUSES: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
    exists() {
      return {
        session() {
          return Promise.resolve(null);
        },
      };
    },
    async create(documents) {
      createdOrderPayload = documents[0];
      return [documents[0]];
    },
  };

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        startSession: async () => sessionMock.session,
        Types: {
          ObjectId: {
            isValid(value) {
              return typeof value === 'string' && value.length === 24;
            },
          },
        },
      },
      '../models/Cart': {
        findOne() {
          return {
            populate() {
              return this;
            },
            session() {
              return Promise.resolve(cart);
            },
          };
        },
      },
      '../models/Order': orderModelMock,
      '../models/Product': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
    };
    const res = createMockResponse();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, 'Order created successfully');
    assert.equal(res.body.status, 'PENDING_PAYMENT');
    assert.equal(res.body.paymentStatus, 'PENDING_PAYMENT');
    assert.match(res.body.orderId, /^ORD\d+/);
    assert.equal(res.body.data.paymentStatus, 'PENDING_PAYMENT');
    assert.equal(product.stock, 3);
    assert.deepEqual(savedProducts, [
      {
        productId: 'product-1',
        stock: 3,
      },
    ]);
    assert.equal(cart.items.length, 0);
    assert.equal(cartSaved, true);
    assert.equal(createdOrderPayload.userId, 'user-1');
    assert.equal(createdOrderPayload.totalPrice, 300000);
    assert.equal(sessionMock.wasEnded(), true);
  } finally {
    restore();
  }
});

test('createOrder returns 400 when the cart is empty', async () => {
  const sessionMock = createSessionMock();

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        startSession: async () => sessionMock.session,
        Types: {
          ObjectId: {
            isValid() {
              return false;
            },
          },
        },
      },
      '../models/Cart': {
        findOne() {
          return createOrderQueryChain({
            items: [],
          });
        },
      },
      '../models/Order': {
        ORDER_STATUSES: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
      },
      '../models/Product': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
    };
    const res = createMockResponse();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Cart is empty.');
    assert.equal(sessionMock.wasEnded(), true);
  } finally {
    restore();
  }
});

test('createOrder falls back when MongoDB transactions are unsupported', async () => {
  const sessionMock = createSessionMock();
  const savedProducts = [];
  let cartSaved = false;
  let createdOrderPayload;

  sessionMock.session.withTransaction = async () => {
    throw new Error(
      'Transaction numbers are only allowed on a replica set member or mongos'
    );
  };

  const product = {
    _id: 'product-1',
    title: 'Clean Code',
    price: 150000,
    stock: 5,
    isActive: true,
    async save(options) {
      savedProducts.push({
        productId: this._id,
        stock: this.stock,
        options,
      });

      return this;
    },
  };

  const cart = {
    items: [
      {
        productId: product,
        quantity: 2,
      },
    ],
    async save(options) {
      cartSaved = true;
      assert.equal(options, undefined);
      return this;
    },
  };

  const orderModelMock = {
    ORDER_STATUSES: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
    exists() {
      return Promise.resolve(null);
    },
    async create(document) {
      createdOrderPayload = document;
      return document;
    },
  };

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        startSession: async () => sessionMock.session,
        Types: {
          ObjectId: {
            isValid(value) {
              return typeof value === 'string' && value.length === 24;
            },
          },
        },
      },
      '../models/Cart': {
        findOne() {
          return {
            populate() {
              return this;
            },
            then(resolve) {
              return Promise.resolve(cart).then(resolve);
            },
          };
        },
      },
      '../models/Order': orderModelMock,
      '../models/Product': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
    };
    const res = createMockResponse();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, 'Order created successfully');
    assert.equal(product.stock, 3);
    assert.deepEqual(savedProducts, [
      {
        productId: 'product-1',
        stock: 3,
        options: undefined,
      },
    ]);
    assert.equal(cartSaved, true);
    assert.equal(createdOrderPayload.userId, 'user-1');
    assert.equal(sessionMock.wasEnded(), true);
  } finally {
    restore();
  }
});

test('getOrderHistory returns 400 for an invalid status filter', async () => {
  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        startSession: async () => {
          throw new Error('not used');
        },
        Types: {
          ObjectId: {
            isValid() {
              return false;
            },
          },
        },
      },
      '../models/Cart': {},
      '../models/Order': {
        ORDER_STATUSES: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
      },
      '../models/Product': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
      query: {
        status: 'SHIPPED',
      },
    };
    const res = createMockResponse();

    await orderController.getOrderHistory(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Allowed values/);
  } finally {
    restore();
  }
});

test('cancelOrder rejects cancelling a paid order', async () => {
  const sessionMock = createSessionMock();
  let restockCalled = false;

  const order = {
    _id: 'order-1',
    orderNumber: 'ORD123456',
    status: 'PAID',
    items: [
      {
        productId: 'product-1',
        quantity: 1,
      },
    ],
    async save() {
      throw new Error('save should not be called');
    },
  };

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        startSession: async () => sessionMock.session,
        Types: {
          ObjectId: {
            isValid() {
              return true;
            },
          },
        },
      },
      '../models/Cart': {},
      '../models/Order': {
        ORDER_STATUSES: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
        findOne() {
          return {
            session() {
              return Promise.resolve(order);
            },
          };
        },
      },
      '../models/Product': {
        async findByIdAndUpdate() {
          restockCalled = true;
          return null;
        },
      },
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
      params: {
        id: '507f191e810c19729de860ea',
      },
    };
    const res = createMockResponse();

    await orderController.cancelOrder(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(
      res.body.message,
      'Only orders with PENDING_PAYMENT status can be cancelled.'
    );
    assert.equal(restockCalled, false);
    assert.equal(sessionMock.wasEnded(), true);
  } finally {
    restore();
  }
});

test('cancelOrder restores stock and updates the order status when allowed', async () => {
  const sessionMock = createSessionMock();
  const restockCalls = [];
  let saveCalled = false;

  const order = {
    _id: 'order-1',
    orderNumber: 'ORD123456',
    totalPrice: 150000,
    status: 'PENDING_PAYMENT',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
      },
    ],
    async save() {
      saveCalled = true;
      return this;
    },
  };

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      mongoose: {
        startSession: async () => sessionMock.session,
        Types: {
          ObjectId: {
            isValid() {
              return true;
            },
          },
        },
      },
      '../models/Cart': {},
      '../models/Order': {
        ORDER_STATUSES: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
        findOne() {
          return {
            session() {
              return Promise.resolve(order);
            },
          };
        },
      },
      '../models/Product': {
        async findByIdAndUpdate(productId, update) {
          restockCalls.push({ productId, update });
          return {
            _id: productId,
          };
        },
      },
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
      params: {
        id: '507f191e810c19729de860ea',
      },
    };
    const res = createMockResponse();

    await orderController.cancelOrder(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Order cancelled successfully');
    assert.equal(order.status, 'CANCELLED');
    assert.equal(saveCalled, true);
    assert.deepEqual(restockCalls, [
      {
        productId: 'product-1',
        update: { $inc: { stock: 2 } },
      },
    ]);
    assert.equal(sessionMock.wasEnded(), true);
  } finally {
    restore();
  }
});
