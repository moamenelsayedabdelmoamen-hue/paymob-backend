const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrder, acceptOrder, deliverOrder, listOrdersByRestaurant } = require('../utils/orderStore');

test('creates a pending order and exposes it by restaurant', () => {
  const order = createOrder({
    restaurantId: 'rest_1',
    customerName: 'Ali',
    customerPhone: '+201000000000',
    deliveryAddress: 'Cairo',
    deliveryLat: 30.0444,
    deliveryLng: 31.2357,
    totalAmount: 120,
    deliveryFee: 15,
    notes: 'Leave at gate'
  });

  assert.equal(order.status, 'pending');
  assert.equal(order.restaurant_id, 'rest_1');

  const restaurantOrders = listOrdersByRestaurant('rest_1');
  assert.equal(restaurantOrders.length, 1);
  assert.equal(restaurantOrders[0].id, order.id);
});

test('accepts only pending orders and updates captain', () => {
  const order = createOrder({
    restaurantId: 'rest_2',
    customerName: 'Sara',
    customerPhone: '+201111111111',
    deliveryAddress: 'Giza',
    deliveryLat: 30.01,
    deliveryLng: 31.2,
    totalAmount: 90,
    deliveryFee: 10,
    notes: 'Call before arrival'
  });

  const accepted = acceptOrder(order.id, 'captain_1');
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.captain_id, 'captain_1');

  const alreadyAccepted = acceptOrder(order.id, 'captain_2');
  assert.equal(alreadyAccepted.status, 'accepted');
  assert.equal(alreadyAccepted.captain_id, 'captain_1');
});

test('delivers an accepted order', () => {
  const order = createOrder({
    restaurantId: 'rest_3',
    customerName: 'Mona',
    customerPhone: '+201222222222',
    deliveryAddress: 'Alex',
    deliveryLat: 31.2,
    deliveryLng: 29.9,
    totalAmount: 150,
    deliveryFee: 20,
    notes: ''
  });

  acceptOrder(order.id, 'captain_2');
  const delivered = deliverOrder(order.id);
  assert.equal(delivered.status, 'delivered');
});
