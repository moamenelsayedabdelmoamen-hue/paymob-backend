const express = require('express');
const router = express.Router();
const paymobController = require('../controllers/paymobController');

/**
 * POST /create-payment
 * Create a payment order and generate payment key
 * 
 * Request body:
 * {
 *   "amount": 10000,  // in cents (e.g., 100.00 EGP = 10000)
 *   "currency": "EGP",
 *   "customer_email": "customer@example.com",
 *   "customer_phone": "+201234567890",
 *   "customer_first_name": "John",
 *   "customer_last_name": "Doe",
 *   "items": [
 *     {
 *       "name": "Product Name",
 *       "amount": 10000,
 *       "description": "Product Description",
 *       "quantity": "1"
 *     }
 *   ]
 * }
 */
router.post('/create-payment', paymobController.createPayment);

module.exports = router;
