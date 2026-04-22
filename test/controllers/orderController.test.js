const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createMockResponse } = require('../helpers/mockHttp');
const { loadWithMocks } = require('../helpers/loadWithMocks');

const controllerPath = path.resolve(
  __dirname,
  '../../src/controllers/orderController.js'
);

const createCartQuery = (cart) => ({
  populate() {
    return Promise.resolve(cart);
  },
});

test('createOrder creates an order from cart items and clears the cart', async () => {
  let createdOrderPayload;
  let deletedCartFilter;

  const cart = {
    items: [
      {
        productId: {
          _id: 'product-1',
          title: 'Clean Code',
          price: 150000,
        },
        quantity: 2,
      },
    ],
    totalPrice: 300000,
  };

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {
        async create(payload) {
          createdOrderPayload = payload;
          return {
            _id: 'order-1',
            ...payload,
          };
        },
      },
      '../models/Cart': {
        findOne(filter) {
          assert.deepEqual(filter, {
            $or: [{ user: 'user-1' }, { userId: 'user-1' }],
          });
          return createCartQuery(cart);
        },
        async findOneAndDelete(filter) {
          deletedCartFilter = filter;
          return null;
        },
      },
      '../models/User': {
        async findById(userId) {
          assert.equal(userId, 'user-1');
          return {
            addresses: [
              {
                street: 'Jl. Mawar',
                city: 'Jakarta',
                zipCode: '12345',
                isPrimary: true,
              },
            ],
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
    };
    const res = createMockResponse();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(
      res.body.message,
      'Pesanan berhasil dibuat, silakan lakukan pembayaran'
    );
    assert.equal(createdOrderPayload.user, 'user-1');
    assert.equal(createdOrderPayload.totalAmount, 300000);
    assert.deepEqual(createdOrderPayload.items, [
      {
        product: 'product-1',
        title: 'Clean Code',
        quantity: 2,
        price: 150000,
      },
    ]);
    assert.deepEqual(createdOrderPayload.shippingAddress, {
      street: 'Jl. Mawar',
      city: 'Jakarta',
      zipCode: '12345',
    });
    assert.deepEqual(deletedCartFilter, {
      $or: [{ user: 'user-1' }, { userId: 'user-1' }],
    });
  } finally {
    restore();
  }
});

test('createOrder returns 400 when the cart is empty', async () => {
  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {},
      '../models/Cart': {
        findOne() {
          return createCartQuery({
            items: [],
          });
        },
        async findOneAndDelete() {
          throw new Error('should not delete cart');
        },
      },
      '../models/User': {
        async findById() {
          throw new Error('should not load user');
        },
      },
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
    assert.equal(res.body.message, 'Keranjang kosong');
  } finally {
    restore();
  }
});

test('createOrder returns 400 when the user has no shipping address', async () => {
  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {},
      '../models/Cart': {
        findOne() {
          return createCartQuery({
            items: [
              {
                productId: {
                  _id: 'product-1',
                  title: 'Book',
                  price: 50000,
                },
                quantity: 1,
              },
            ],
          });
        },
        async findOneAndDelete() {
          throw new Error('should not delete cart');
        },
      },
      '../models/User': {
        async findById() {
          return {
            addresses: [],
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
    };
    const res = createMockResponse();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.message,
      'Harap tambahkan alamat pengiriman terlebih dahulu'
    );
  } finally {
    restore();
  }
});

test('getMyOrders returns the current user orders', async () => {
  const orders = [
    { _id: 'order-2' },
    { _id: 'order-1' },
  ];

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {
        find(filter) {
          assert.deepEqual(filter, { user: 'user-1' });
          return {
            sort(sortBy) {
              assert.deepEqual(sortBy, { createdAt: -1 });
              return Promise.resolve(orders);
            },
          };
        },
      },
      '../models/Cart': {},
      '../models/User': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
      },
    };
    const res = createMockResponse();

    await orderController.getMyOrders(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, orders);
  } finally {
    restore();
  }
});

test('getOrderById rejects access to another user order', async () => {
  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {
        async findById(orderId) {
          assert.equal(orderId, 'order-1');
          return {
            user: {
              toString() {
                return 'user-2';
              },
            },
          };
        },
      },
      '../models/Cart': {},
      '../models/User': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
        role: 'USER',
      },
      params: {
        id: 'order-1',
      },
    };
    const res = createMockResponse();

    await orderController.getOrderById(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Akses ditolak');
  } finally {
    restore();
  }
});

test('cancelOrder rejects non-pending orders', async () => {
  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {
        async findById() {
          return {
            user: {
              toString() {
                return 'user-1';
              },
            },
            status: 'PAID',
            async save() {
              throw new Error('should not save');
            },
          };
        },
      },
      '../models/Cart': {},
      '../models/User': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
        role: 'USER',
      },
      params: {
        id: 'order-1',
      },
    };
    const res = createMockResponse();

    await orderController.cancelOrder(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.message,
      'Pesanan yang sudah dibayar/diproses tidak bisa dibatalkan'
    );
  } finally {
    restore();
  }
});

test('cancelOrder marks a pending order as cancelled', async () => {
  let saveCalled = false;

  const order = {
    user: {
      toString() {
        return 'user-1';
      },
    },
    status: 'PENDING',
    async save() {
      saveCalled = true;
      return this;
    },
  };

  const { loadedModule: orderController, restore } = loadWithMocks(
    controllerPath,
    {
      '../models/Order': {
        async findById(orderId) {
          assert.equal(orderId, 'order-1');
          return order;
        },
      },
      '../models/Cart': {},
      '../models/User': {},
    }
  );

  try {
    const req = {
      user: {
        userId: 'user-1',
        role: 'USER',
      },
      params: {
        id: 'order-1',
      },
    };
    const res = createMockResponse();

    await orderController.cancelOrder(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Pesanan berhasil dibatalkan');
    assert.equal(order.status, 'CANCELLED');
    assert.equal(saveCalled, true);
  } finally {
    restore();
  }
});
