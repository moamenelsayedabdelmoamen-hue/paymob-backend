const crypto = require('crypto');
const { getFirestore } = require('../firebase');

const PAYMOB_HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
];

function getNestedValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function isValidPaymobHmac(obj, receivedHmac) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !receivedHmac || !obj) return false;

  const message = PAYMOB_HMAC_FIELDS
    .map((field) => {
      const value = getNestedValue(obj, field);
      return value === undefined || value === null ? '' : String(value);
    })
    .join('');
  const expected = crypto.createHmac('sha512', secret).update(message).digest();

  if (!/^[a-f0-9]{128}$/i.test(receivedHmac)) return false;
  const received = Buffer.from(receivedHmac, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function safeDocumentId(value) {
  const id = String(value ?? '');
  if (!id || id.includes('/')) {
    throw new Error('Invalid Firestore document ID.');
  }
  return id;
}

async function recordPaymentEvent({ orderId, transactionId, status, amountCents, currency, source }) {
  const db = getFirestore();
  if (!db) throw new Error('Cloud Firestore is not configured.');

  const orderKey = safeDocumentId(orderId);
  const timestamp = new Date().toISOString();
  const event = {
    action: source,
    collection: 'payments',
    orderId: String(orderId),
    transactionId: transactionId == null ? null : String(transactionId),
    status,
    amountCents: amountCents == null ? null : Number(amountCents),
    currency: currency || null,
    createdAt: timestamp,
  };

  const paymentRef = db.collection('payments').doc(orderKey);
  const logRef = db.collection('operation_logs').doc();
  const batch = db.batch();

  batch.set(paymentRef, {
    orderId: String(orderId),
    transactionId: event.transactionId,
    status,
    amountCents: event.amountCents,
    currency: event.currency,
    updatedAt: timestamp,
  }, { merge: true });
  batch.set(logRef, event);
  await batch.commit();
}

async function recordWebhookEvent(data) {
  const db = getFirestore();
  if (!db) throw new Error('Cloud Firestore is not configured.');

  const obj = data.obj || {};
  await db.collection('webhook_events').add({
    transactionId: obj.id == null ? null : String(obj.id),
    orderId: obj.order?.id == null ? null : String(obj.order.id),
    success: obj.success === true,
    receivedAt: new Date().toISOString(),
    verified: true,
  });
}

module.exports = { isValidPaymobHmac, recordPaymentEvent, recordWebhookEvent };
