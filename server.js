require('dotenv').config(); // تأكدنا إنها بحرف r صغير تماماً

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());

// الصفحة الرئيسية للاختبار
app.get('/', (req, res) => {
  res.send(`Moamen Server 🔥 - running on port ${PORT}`);
});

// اختبار حالة السيرفر
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ✅ Route الدفع الشامل (فيزا + محفظة إلكترونية)
app.post('/pay', async (req, res) => {
  try {
    const { amount, email, first_name, last_name, payment_method, phone_number } = req.body;

    // التأكد من البيانات الأساسية
    if (!amount || !email || !first_name || !last_name || !payment_method) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    // إذا اختار محفظة، يجب وجود رقم الهاتف
    if (payment_method === 'wallet' && !phone_number) {
      return res.status(400).json({ error: 'Phone number is required for wallet' });
    }

    // 1️⃣ خطوة الـ Auth Token
    const auth = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: process.env.PAYMOB_API_KEY,
    });
    const token = auth.data.token;

    // 2️⃣ خطوة إنشاء الطلب Create Order
    const order = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: false,
      amount_cents: amount * 100, // تحويل القرش لجنيه
      currency: 'EGP',
      items: [],
    });
    const orderId = order.data.id;

    // تحديد الـ Integration ID بناءً على طريقة الدفع
    const integrationId = payment_method === 'wallet' 
      ? process.env.PAYMOB_WALLET_INTEGRATION_ID 
      : process.env.PAYMOB_CARD_INTEGRATION_ID;

    // 3️⃣ خطوة الـ Payment Key
    const payment = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: amount * 100,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        email, first_name, last_name,
        phone_number: phone_number || '01000000000',
        apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA', shipping_method: 'NA', postal_code: '12345', city: 'Cairo', country: 'EG', state: 'NA',
      },
      currency: 'EGP',
      integration_id: integrationId,
    });
    const paymentKey = payment.data.token;

    // 4️⃣ الخطوة النهائية (حسب نوع الدفع)
    if (payment_method === 'wallet') {
      // مسار المحفظة الإلكترونية
      const walletResponse = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: {
          identifier: phone_number,
          subtype: "WALLET"
        },
        payment_token: paymentKey
      });
      return res.json({ url: walletResponse.data.redirect_url, type: 'wallet' });
    } else {
      // مسار الفيزا كارد
      const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;
      return res.json({ url: iframeUrl, type: 'card' });
    }

  } catch (error) {
    console.error("PAYMOB ERROR:", error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment failed',
      details: error.response?.data || error.message,
    });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});