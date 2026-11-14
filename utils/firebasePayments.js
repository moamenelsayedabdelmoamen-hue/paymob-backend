const crypto = require('crypto');
const { getFirestore } = require('../firebase');

const PAYMOB_HMAC_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured',
  'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
  'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
  'is_voided', 'order.id', 'owner', 'pending', 'source_data.pan',
  'source_data.sub_type', 'source_data.type', 'success',
];

function getNestedValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function isValidPaymobHmac(obj, receivedHmac) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !receivedHmac || !obj) return false;
  const message = PAYMOB_HMAC_FIELDS.map((field) => {
    const value = getNestedValue(obj, field);
    return value === undefined || value === null ? '' : String(value);
  }).join('');
  const expected = crypto.createHmac('sha512', secret).update(message).digest();
  if (!/^[a-f0-9]{128}$/i.test(receivedHmac)) return false;
  const received = Buffer.from(receivedHmac, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function safeDocumentId(value) {
  const id = String(value ?? '');
  if (!id || id.includes('/') || id.length > 1500) throw new Error('Invalid Firestore document ID.');
  return id;
}

async function recordPaymentEvent({ orderId, transactionId, status, amountCents, currency, integrationId, source, restaurantId, restaurantName, paymentMethod }) {
  const db = getFirestore();
  if (!db) throw new Error('Cloud Firestore is not configured.');
  const orderKey = safeDocumentId(orderId);
  const amount = Number(amountCents);
  if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== 'EGP') {
    throw new Error('Invalid payment amount or currency.');
  }
  if (status !== 'pending') throw new Error('Final payment states must be applied through verified webhook processing.');

  const paymentRef = db.collection('payments').doc(orderKey);
  const logRef = db.collection('operation_logs').doc();
  const timestamp = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(paymentRef);
    if (existing.exists) throw new Error('Payment order already exists.');
    tx.create(paymentRef, {
      orderId: orderKey,
      restaurantId: restaurantId || '',
      restaurantName: restaurantName || '',
      paymentMethod: paymentMethod || 'Paymob',
      transactionId: null,
      status: 'pending',
      amountCents: amount,
      currency: 'EGP',
      integrationId: integrationId == null ? null : Number(integrationId),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    tx.create(logRef, {
      action: source || 'payment.created',
      collection: 'payments',
      orderId: orderKey,
      status: 'pending',
      amountCents: amount,
      currency: 'EGP',
      createdAt: timestamp,
    });
  });
}

async function applyVerifiedWebhook(obj) {
  const db = getFirestore();
  if (!db) throw new Error('Cloud Firestore is not configured.');
  const orderId = safeDocumentId(obj?.order?.id);
  const transactionId = safeDocumentId(obj?.id);
  const amount = Number(obj?.amount_cents);
  const currency = String(obj?.currency || '');
  const integrationId = Number(obj?.integration_id);
  if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== 'EGP' || !Number.isSafeInteger(integrationId)) {
    throw new Error('Webhook amount, currency, or integration ID is invalid.');
  }

  const paymentRef = db.collection('payments').doc(orderId);
  const transactionRef = db.collection('paymob_transactions').doc(transactionId);
  const logRef = db.collection('operation_logs').doc();
  const timestamp = new Date().toISOString();
  const status = obj.success === true ? 'success' : 'failed';

  return db.runTransaction(async (tx) => {
    const [paymentSnap, transactionSnap] = await Promise.all([
      tx.get(paymentRef),
      tx.get(transactionRef),
    ]);
    if (transactionSnap.exists) return { duplicate: true };
    if (!paymentSnap.exists) throw new Error('No pending payment matches this Paymob order.');
    const expected = paymentSnap.data();
    if (expected.status !== 'pending') throw new Error('Payment is already in a final state.');
    if (Number(expected.amountCents) !== amount || expected.currency !== currency) {
      throw new Error('Paymob amount or currency does not match the pending payment.');
    }
    if (expected.integrationId != null && Number(expected.integrationId) !== integrationId) {
      throw new Error('Paymob integration does not match the pending payment.');
    }

    let subscriptionRef = null;
    let restaurantRef = null;
    let subscriptionData = {};
    if (status === 'success') {
      const restaurantId = String(expected.restaurantId || '');
      if (!restaurantId) throw new Error('Payment is not linked to a merchant.');
      const captainsByPrice = { 40000: 2, 80000: 4, 120000: 6, 160000: 8 };
      const captainsCount = captainsByPrice[amount];
      if (!captainsCount) throw new Error('Paid amount does not match an official captain package.');

      subscriptionRef = db.collection('subscriptions').doc(restaurantId);
      restaurantRef = db.collection('restaurants').doc(restaurantId);
      const [subscriptionSnap, restaurantSnap] = await Promise.all([
        tx.get(subscriptionRef),
        tx.get(restaurantRef),
      ]);
      subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() : {};
      const restaurantData = restaurantSnap.exists ? restaurantSnap.data() : {};
      const price = amount / 100;
      const plan = `${captainsCount} كابتن - ${price} جنيه`;
      const today = new Date();
      const startDate = today.toISOString().slice(0, 10);
      const end = new Date(today);
      end.setUTCDate(end.getUTCDate() + 30);
      const endDate = end.toISOString().slice(0, 10);
      const merchantName = expected.restaurantName || restaurantData.name || restaurantData.nameAr ||
        restaurantData.merchantName || restaurantData.restaurantName || '';

      tx.set(subscriptionRef, {
        restaurantId,
        restaurantName: merchantName,
        plan,
        captainsCount,
        price,
        startDate,
        endDate,
        status: 'Active',
        paymentOrderId: orderId,
        paymentTransactionId: transactionId,
        updatedAt: timestamp,
        ...(subscriptionData.createdAt ? {} : { createdAt: timestamp }),
      }, { merge: true });

      if (restaurantSnap.exists) {
        tx.update(restaurantRef, {
          subscriptionStatus: 'Active',
          subscriptionPlan: plan,
          captainsCount,
          subscriptionPrice: price,
          subscriptionStartDate: startDate,
          startDate,
          subscriptionEndDate: endDate,
          endDate,
          updatedAt: timestamp,
        });
      }
    }

    tx.update(paymentRef, {
      transactionId,
      status,
      amountCents: amount,
      currency,
      integrationId,
      updatedAt: timestamp,
    });
    tx.create(transactionRef, {
      transactionId,
      orderId,
      status,
      amountCents: amount,
      currency,
      integrationId,
      verified: true,
      receivedAt: timestamp,
    });
    tx.create(logRef, {
      action: `payment.${status}`,
      collection: 'payments',
      orderId,
      transactionId,
      status,
      amountCents: amount,
      currency,
      createdAt: timestamp,
    });
    return { duplicate: false, status };
  });
}

module.exports = { isValidPaymobHmac, recordPaymentEvent, applyVerifiedWebhook };
