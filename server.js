require('dotenv').config();

console.log("🔥🔥🔥 THIS IS MY SERVER.JS 🔥🔥🔥");

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('✅ server.js is the active entrypoint for this app');
console.log('📍 Registered routes: GET /, POST /subscribe, GET /health');

// Middleware: logging
app.use((req, res, next) => {
  console.log(`REQUEST ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Root route
app.get('/', (req, res) => {
  res.send(`Moamen Server 123 🔥 - live on port ${PORT}`);
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ✅ Subscribe endpoint
app.post('/subscribe', (req, res) => {
  const { name, email } = req.body || {};

  console.log('New subscription:', { name, email });

  res.status(200).json({
    success: true,
    message: 'تم الاشتراك بنجاح'
  });
});

// ❗ لازم يكون آخر حاجة
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ✅ شغل السيرفر مباشرة (مهم جدًا لـ Render)
app.listen(PORT, () => {
  console.log(`🚀 Paymob Backend Server running on port ${PORT}`);
});
// ✅ ROUTE الدفع
app.post('/pay', async (req, res) => {
  try {
    const { amount, email, first_name, last_name } = req.body;

    const axios = require('axios');

    // 1️⃣ auth
    const auth = await axios.post(
      'https://accept.paymob.com/api/auth/tokens',
      {
        api_key: process.env.PAYMOB_API_KEY,
      }
    );

    const token = auth.data.token;

    // 2️⃣ order
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
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EG',
          state: 'NA',
        },
        currency: 'EGP',
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
      }
    );

    const paymentKey = payment.data.token;

    // 4️⃣ iframe
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    res.json({ iframeUrl });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Payment failed' });
  }
});
