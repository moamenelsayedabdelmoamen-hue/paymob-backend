require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { isFirebaseConfigured } = require('./firebase');
const {
  isValidPaymobHmac,
  recordPaymentEvent,
  applyVerifiedWebhook,
} = require('./utils/firebasePayments');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean) : false }));
app.use(express.json({ limit: '32kb' }));

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const CARD_INTEGRATION_ID = process.env.CARD_INTEGRATION_ID;
const WALLET_INTEGRATION_ID = process.env.WALLET_INTEGRATION_ID;
const CARD_IFRAME_ID = process.env.CARD_IFRAME_ID;

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    firebase: isFirebaseConfigured() ? 'connected' : 'not_configured',
  });
});

// Create a Paymob payment and persist its state before returning the payment URL.
app.post('/pay', async (req, res) => {
  try {
    if (!isFirebaseConfigured()) {
      return res.status(503).json({ error: 'Firebase is not configured; payment was not started.' });
    }
    if (!PAYMOB_API_KEY || !CARD_INTEGRATION_ID || !WALLET_INTEGRATION_ID || !CARD_IFRAME_ID) {
      return res.status(503).json({ error: 'Paymob environment variables are not configured.' });
    }

    const { amount, email, first_name, last_name, payment_method, phone_number } = req.body;
    if (!amount || !email || !first_name || !last_name || !payment_method) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    if (!['card', 'wallet'].includes(payment_method)) {
      return res.status(400).json({ error: 'payment_method must be card or wallet' });
    }
    if (payment_method === 'wallet' && !phone_number) {
      return res.status(400).json({ error: 'Phone number is required for wallet payments' });
    }

    const amountInCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const authResponse = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: PAYMOB_API_KEY,
    });
    const authToken = authResponse.data.token;

    const orderResponse = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: authToken,
      delivery_needed: 'false',
      amount_cents: String(amountInCents),
      currency: 'EGP',
      items: [],
    });
    const orderId = orderResponse.data.id;
    const integrationId = payment_method === 'wallet' ? WALLET_INTEGRATION_ID : CARD_INTEGRATION_ID;

    const paymentKeyResponse = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: authToken,
      amount_cents: String(amountInCents),
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: 'NA',
        email,
        floor: 'NA',
        first_name,
        street: 'NA',
        building: 'NA',
        phone_number: phone_number || '01000000000',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'Sadat City',
        country: 'EG',
        last_name,
        state: 'NA',
      },
      currency: 'EGP',
      integration_id: integrationId,
      lock_order_when_paid: 'true',
    });
    const paymentToken = paymentKeyResponse.data.token;

    await recordPaymentEvent({
      orderId,
      status: 'pending',
      amountCents: amountInCents,
      currency: 'EGP',
      integrationId,
      source: 'payment.created',
    });

    if (payment_method === 'wallet') {
      const walletResponse = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: { identifier: phone_number, subtype: 'WALLET' },
        payment_token: paymentToken,
      });
      return res.status(200).json({ url: walletResponse.data.iframe_redirection_url, type: 'wallet', order_id: orderId });
    }

    const cardIframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${CARD_IFRAME_ID}?payment_token=${paymentToken}`;
    return res.status(200).json({ url: cardIframeUrl, type: 'card', order_id: orderId });
  } catch (error) {
    console.error('❌ Payment processing failed:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Payment failed' });
  }
});

// Only trust Paymob webhook events after validating their HMAC signature.
app.post('/webhook', async (req, res) => {
  const obj = req.body?.obj;
  const receivedHmac = req.query.hmac || req.body?.hmac;

  if (!process.env.PAYMOB_HMAC_SECRET) {
    return res.status(503).send('Webhook HMAC secret is not configured');
  }
  if (!isValidPaymobHmac(obj, receivedHmac)) {
    return res.status(401).send('Invalid Paymob HMAC');
  }
  if (!isFirebaseConfigured()) {
    return res.status(503).send('Firebase is not configured');
  }

  try {
    const orderId = obj.order?.id;
    if (orderId == null) return res.status(400).send('Missing Paymob order ID');

    const result = await applyVerifiedWebhook(obj);
    return res.status(200).send(result.duplicate ? 'Already processed' : 'OK');
  } catch (error) {
    console.error('❌ Could not persist Paymob webhook:', error.message);
    return res.status(500).send('Could not persist webhook');
  }
});

app.get('/callback', (_req, res) => {
  res.send('<div style="text-align:center;margin-top:100px;font-family:sans-serif;"><h1 style="color:#2ecc71">🎉 تم اكتمال العملية بنجاح!</h1><p style="color:#34495e">شكراً لك، يمكنك العودة إلى التطبيق الآن.</p></div>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل بنجاح على بورت: ${PORT}`));
