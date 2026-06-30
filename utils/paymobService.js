const axios = require('axios');

const PAYMOB_API_URL = process.env.PAYMOB_API_URL || 'https://accept.paymobsolutions.com/api';
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_MERCHANT_ID = process.env.PAYMOB_MERCHANT_ID;

class PaymobService {
  /**
   * Get authentication token from Paymob
   * This token is required for subsequent API calls
   */
  static async getAuthToken() {
    try {
      console.log('📡 Calling Paymob auth endpoint...');
      
      const response = await axios.post(
        `${PAYMOB_API_URL}/auth/tokens`,
        {
          api_key: PAYMOB_API_KEY
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.token) {
        console.log('✅ Auth token received');
        return response.data.token;
      } else {
        throw new Error('Invalid auth token response from Paymob');
      }
    } catch (error) {
      console.error('❌ Auth token error:', error.response?.data || error.message);
      throw new Error(`Paymob Auth Error: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Create an order on Paymob
   * @param {Object} orderData - Order information
   */
  static async createOrder(orderData) {
    try {
      console.log('📡 Creating order on Paymob...');
      
      const response = await axios.post(
        `${PAYMOB_API_URL}/ecommerce/orders`,
        {
          auth_token: orderData.auth_token,
          delivery_needed: orderData.delivery_needed,
          currency: orderData.currency,
          amount_cents: orderData.amount_cents,
          merchant_order_id: orderData.merchant_order_id,
          items: orderData.items || []
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.id) {
        console.log(`✅ Order created with ID: ${response.data.id}`);
        return response.data;
      } else {
        throw new Error('Invalid order response from Paymob');
      }
    } catch (error) {
      console.error('❌ Order creation error:', error.response?.data || error.message);
      throw new Error(`Paymob Order Error: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Generate a payment key for the order
   * This key is used to load the payment iframe
   * @param {Object} paymentKeyData - Payment key request data
   */
  static async getPaymentKey(paymentKeyData) {
    try {
      console.log('📡 Generating payment key...');
      
      const response = await axios.post(
        `${PAYMOB_API_URL}/acceptance/payment_keys`,
        {
          auth_token: paymentKeyData.auth_token,
          amount_cents: paymentKeyData.amount_cents,
          expiration: paymentKeyData.expiration,
          order_id: paymentKeyData.order_id,
          billing_data: paymentKeyData.billing_data,
          customer_phone: paymentKeyData.customer_phone,
          currency: paymentKeyData.currency || 'EGP',
          integration_id: parseInt(process.env.PAYMOB_IFRAME_ID) // iframe ID
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.token) {
        console.log('✅ Payment key generated');
        return response.data.token;
      } else {
        throw new Error('Invalid payment key response from Paymob');
      }
    } catch (error) {
      console.error('❌ Payment key error:', error.response?.data || error.message);
      throw new Error(`Paymob Payment Key Error: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Verify a transaction (optional)
   * Can be used to check payment status
   * @param {number} transactionId - Paymob transaction ID
   * @param {string} authToken - Auth token
   */
  static async verifyTransaction(transactionId, authToken) {
    try {
      console.log(`📡 Verifying transaction ${transactionId}...`);
      
      const response = await axios.get(
        `${PAYMOB_API_URL}/acceptance/transactions/${transactionId}`,
        {
          params: {
            auth_token: authToken
          },
          timeout: 10000
        }
      );

      console.log('✅ Transaction verified');
      return response.data;
    } catch (error) {
      console.error('❌ Transaction verification error:', error.response?.data || error.message);
      throw new Error(`Paymob Verification Error: ${error.response?.data?.detail || error.message}`);
    }
  }
}

module.exports = PaymobService;
