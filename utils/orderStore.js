const crypto = require('crypto');

const orders = [];

function createOrder({ restaurantId, customerName, customerPhone, deliveryAddress, deliveryLat, deliveryLng, totalAmount, deliveryFee, notes }) {
  const order = {
    id: crypto.randomUUID(),
    restaurant_id: restaurantId,
    captain_id: null,
    status: 'pending',
    customer_name: customerName,
    customer_phone: customerPhone,
    delivery_address: deliveryAddress,
    delivery_lat: deliveryLat,
    delivery_lng: deliveryLng,
    total_amount: totalAmount,
    delivery_fee: deliveryFee,
    notes: notes || '',
    created_at: new Date().toISOString(),
    accepted_at: null,
    delivered_at: null,
  };
  orders.push(order);
  return order;
}

function getOrderById(id) {
  return orders.find((order) => order.id === id) || null;
}

function listOrdersByRestaurant(restaurantId) {
  return orders.filter((order) => order.restaurant_id === restaurantId);
}

function listPendingOrders() {
  return orders.filter((order) => order.status === 'pending');
}

function acceptOrder(id, captainId) {
  const order = getOrderById(id);
  if (!order) return null;
  if (order.status !== 'pending') return order;
  order.status = 'accepted';
  order.captain_id = captainId;
  order.accepted_at = new Date().toISOString();
  return order;
}

function deliverOrder(id) {
  const order = getOrderById(id);
  if (!order) return null;
  if (order.status === 'accepted') {
    order.status = 'delivered';
    order.delivered_at = new Date().toISOString();
  }
  return order;
}

module.exports = {
  createOrder,
  getOrderById,
  listOrdersByRestaurant,
  listPendingOrders,
  acceptOrder,
  deliverOrder,
  orders,
};
