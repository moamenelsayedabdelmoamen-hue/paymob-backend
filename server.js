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
const allowedOrigins = [...new Set(['https://elbatalexpress.web.app', ...(process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)])];
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
    if (!isFirebaseConfigured()) return res.status(503).json({ error: 'Firebase is not configured.' });
    if (!PAYMOB_API_KEY || !CARD_INTEGRATION_ID || !WALLET_INTEGRATION_ID || !CARD_IFRAME_ID) return res.status(503).json({ error: 'Paymob environment variables are not configured.' });

    const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/i);
    if (!match) return res.status(401).json({ error: 'Firebase authentication token is required.' });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(match[1]); }
    catch { return res.status(401).json({ error: 'Invalid or expired Firebase token.' }); }

    const db = getFirestore();
    const adminDoc = await db.collection('admins').doc(decoded.uid).get();
    const authorized = decoded.admin === true || decoded.role === 'admin' ||
      (adminDoc.exists && ['admin'].includes(adminDoc.data().role) &&
        (adminDoc.data().isAdmin === true || adminDoc.data().isSuperAdmin === true || adminDoc.data().role === 'admin'));
    if (!authorized) return res.status(403).json({ error: 'Administrator permission is required.' });

    const { restaurant_id, email, first_name, last_name, payment_method, phone_number } = req.body || {};
    if (!restaurant_id || !email || !first_name || !last_name || !payment_method) return res.status(400).json({ error: 'Missing merchant or customer data.' });
    if (!['card', 'wallet'].includes(payment_method)) return res.status(400).json({ error: 'payment_method must be card or wallet.' });
    if (payment_method === 'wallet' && !phone_number) return res.status(400).json({ error: 'Phone number is required for wallet payments.' });

    // The browser cannot choose the amount: read the merchant's configured subscription price.
    const [merchantSnap, directSubSnap] = await Promise.all([
      db.collection('restaurants').doc(String(restaurant_id)).get(),
      db.collection('subscriptions').doc(String(restaurant_id)).get(),
    ]);
    let sub = directSubSnap.exists ? directSubSnap.data() : null;
    if (!sub) {
      const matchSub = await db.collection('subscriptions').where('restaurantId', '==', String(restaurant_id)).limit(1).get();
      if (!matchSub.empty) sub = matchSub.docs[0].data();
    }
    if (!merchantSnap.exists && !sub) return res.status(404).json({ error: 'Merchant or subscription was not found.' });
    const merchant = merchantSnap.exists ? merchantSnap.data() : {};
    const price = Number(sub?.price ?? sub?.subscriptionPrice ?? sub?.subscription?.price ??
      merchant.subscriptionPrice ?? merchant.subscription?.price ?? merchant.price);
    const amountInCents = Math.round(price * 100);
    if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) return res.status(409).json({ error: 'Valid subscription price is not configured.' });

    const authResponse = await axios.post('https://accept.paymob.com/api/auth/tokens', { api_key: PAYMOB_API_KEY }, { timeout: 15000 });
    const authToken = authResponse.data.token;
    const orderResponse = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: authToken, delivery_needed: 'false', amount_cents: String(amountInCents), currency: 'EGP', items: [],
    }, { timeout: 15000 });
    const orderId = orderResponse.data.id;
    const integrationId = payment_method === 'wallet' ? WALLET_INTEGRATION_ID : CARD_INTEGRATION_ID;
    const keyResponse = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: authToken, amount_cents: String(amountInCents), expiration: 3600, order_id: orderId,
      billing_data: {
        apartment: 'NA', email, floor: 'NA', first_name, street: 'NA', building: 'NA',
        phone_number: phone_number || '01000000000', shipping_method: 'NA', postal_code: 'NA',
        city: 'Sadat City', country: 'EG', last_name, state: 'NA',
      },
      currency: 'EGP', integration_id: integrationId, lock_order_when_paid: 'true',
    }, { timeout: 15000 });
    const paymentToken = keyResponse.data.token;
    await recordPaymentEvent({
      orderId, status: 'pending', amountCents: amountInCents, currency: 'EGP', integrationId,
      source: 'payment.created', restaurantId: String(restaurant_id),
      restaurantName: merchant.name || merchant.nameAr || merchant.merchantName || '',
      paymentMethod: payment_method === 'wallet' ? 'Mobile Wallet' : 'Visa',
    });

    if (payment_method === 'wallet') {
      const walletResponse = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: { identifier: phone_number, subtype: 'WALLET' }, payment_token: paymentToken,
      }, { timeout: 15000 });
      return res.status(200).json({ url: walletResponse.data.iframe_redirection_url, type: 'wallet', order_id: orderId });
    }
    return res.status(200).json({
      url: `https://accept.paymob.com/api/acceptance/iframes/${CARD_IFRAME_ID}?payment_token=${paymentToken}`,
      type: 'card', order_id: orderId,
    });
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
