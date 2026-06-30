const PaymobService = require('../utils/paymobService');

/**
 * Create payment endpoint
 * Handles the complete payment flow:
 * 1. Get auth token from Paymob
 * 2. Create an order
 * 3. Generate payment key
 * 4. Return payment URL with iframe
 */
exports.createPayment = async (req, res, next) => {
  try {
    const {
      amount,
      currency = 'EGP',
      customer_email,
      customer_phone,
      customer_first_name,
      customer_last_name,
      items = []
    } = req.body;

    // Validate required fields
    if (!amount || !customer_email || !customer_phone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, customer_email, customer_phone'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    console.log('🔄 Starting payment flow for:', customer_email);

    // Step 1: Get auth token
    console.log('1️⃣ Getting auth token from Paymob...');
    const authToken = await PaymobService.getAuthToken();
    if (!authToken) {
      throw new Error('Failed to obtain authentication token from Paymob');
    }

    // Step 2: Create order
    console.log('2️⃣ Creating order...');
    const orderData = {
      auth_token: authToken,
      delivery_needed: false,
      currency,
      amount_cents: amount,
      merchant_order_id: `order_${Date.now()}`,
      items: items.length > 0 ? items : [
        {
          name: 'Service',
          amount_cents: amount,
          description: 'Payment Service',
          quantity: '1'
        }
      ]
    };

    const order = await PaymobService.createOrder(orderData);
    if (!order || !order.id) {
      throw new Error('Failed to create order');
    }

    // Step 3: Register payment key
    console.log('3️⃣ Registering payment key...');
    const paymentKeyData = {
      auth_token: authToken,
      amount_cents: amount,
      expiration: 3600,
      order_id: order.id,
      billing_data: {
        apartment: 'NA',
        email: customer_email,
        floor: 'NA',
        first_name: customer_first_name || 'Customer',
        street: 'NA',
        building: 'NA',
        phone_number: customer_phone,
        postal_code: 'NA',
        city: 'NA',
        country: 'NA',
        last_name: customer_last_name || 'Customer',
        state: 'NA'
      },
      customer_phone: customer_phone
    };

    const paymentKey = await PaymobService.getPaymentKey(paymentKeyData);
    if (!paymentKey) {
      throw new Error('Failed to generate payment key');
    }

    // Step 4: Generate payment URL
    console.log('4️⃣ Generating payment URL...');
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    if (!iframeId) {
      throw new Error('PAYMOB_IFRAME_ID not configured in environment variables');
    }

    const paymentUrl = `https://accept.paymobsolutions.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    console.log('✅ Payment URL generated successfully');

    res.status(200).json({
      success: true,
      data: {
        payment_url: paymentUrl,
        payment_key: paymentKey,
        order_id: order.id,
        amount_cents: amount,
        currency,
        iframe_id: iframeId,
        merchant_order_id: orderData.merchant_order_id
      },
      message: 'Payment URL generated successfully. Use the payment_url in an iframe.'
    });

  } catch (error) {
    console.error('❌ Payment creation error:', error.message);
    next(error);
  }
};
