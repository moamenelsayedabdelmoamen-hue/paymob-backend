Require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`Moamen Server 🔥 - running on port ${PORT}`);
});

// health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ✅ route الدفع Paymob
app.post('/pay', async (req, res) => {
  try {
    const { amount, email, first_name, last_name } = req.body;

    if (!amount || !email || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // 1️⃣ auth token
    const auth = await axios.post(
      'https://accept.paymob.com/api/auth/tokens',
      {
        api_key: process.env.PAYMOB_API_KEY,
      }
    );

    const token = auth.data.token;

    // 2️⃣ create order
    const order = await axios.post(
      'https://accept.paymob.com/api/ecommerce/orders',
      {
        auth_token: token,
        delivery_needed: false,
        amount_cents: amount * 100,
        currency: 'EGP',
        items: [],
      }
    );

    const orderId = order.data.id;

    // 3️⃣ payment key
    const payment = await axios.post(
      'https://accept.paymob.com/api/acceptance/payment_keys',
      {
        auth_token: token,
        amount_cents: amount * 100,
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          email,
          first_name,
          last_name,
          phone_number: '01000000000',
          apartment: 'NA',
          floor: 'NA',
          street: 'NA',
          building: 'NA',
          shipping_method: 'NA',
          postal_code: '12345',
          city: 'Cairo',
          country: 'EG',
          state: 'NA',
        },
        currency: 'EGP',
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
      }
    );

    const paymentKey = payment.data.token;

    // 4️⃣ iframe url
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    res.json({ iframeUrl });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment failed',
      details: error.response?.data || error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
