const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// 🟢 Route اختبار
app.get('/', (req, res) => {
  res.send('Server is running 🚀');
});

// 🟢 Payment Link (Visa)
app.get('/pay-link', async (req, res) => {
  try {
    const amount = 100;
    const email = "test@test.com";
    const first_name = "Moamen";
    const last_name = "Test";

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
          postal_code: '12345',
          city: 'Cairo',
          country: 'EG',
          state: 'NA',
        },
        currency: 'EGP',
        integration_id: process.env.PAYMOB_CARD_INTEGRATION_ID,
      }
    );

    const paymentKey = payment.data.token;

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    // 🔥 تحويل مباشر لصفحة الدفع
    res.redirect(iframeUrl);

  } catch (error) {
    res.status(500).json({
      error: 'Payment failed',
      details: error.response?.data || error.message,
    });
  }
});

// 🟢 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});