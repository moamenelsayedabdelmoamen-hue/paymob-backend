# FlutterFlow integration notes

## New order endpoints

- POST /api/orders
  - Creates a new order for a restaurant
  - Body: restaurantId, customerName, customerPhone, deliveryAddress, deliveryLat, deliveryLng, totalAmount, deliveryFee, notes

- GET /api/orders/pending
  - Returns all pending orders

- GET /api/orders/restaurant/:restaurantId
  - Returns all orders for a specific restaurant

- GET /api/orders/:id
  - Returns a single order by id

- POST /api/orders/:id/accept
  - Accepts an order using a captainId

- POST /api/orders/:id/deliver
  - Marks an order as delivered

## Existing payment endpoint

- POST /pay
  - Keeps the original Paymob payment flow for card/wallet payments
