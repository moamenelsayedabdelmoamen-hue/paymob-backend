const crypto = require('crypto');
const { getDatabase } = require('./firebase');

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

function safeKey(value) {
  const key = String(value ?? '');
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('Invalid Firebase record key.');
  }
  return key;
}

async function recordPaymentEvent({ orderId, transactionId, status, amountCents, currency, source }) {
  const database = getDatabase();
  if (!database) throw new Error('Firebase is not configured.');

  const orderKey = safeKey(orderId);
  const eventKey = database.ref('operation_logs').push().key;
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

  const updates = {
    [`payments/${orderKey}/orderId`]: String(orderId),
    [`payments/${orderKey}/transactionId`]: event.transactionId,
    [`payments/${orderKey}/status`]: status,
    [`payments/${orderKey}/amountCents`]: event.amountCents,
    [`payments/${orderKey}/currency`]: event.currency,
    [`payments/${orderKey}/updatedAt`]: timestamp,
    [`operation_logs/${eventKey}`]: event,
  };

  await database.ref().update(updates);
}

async function recordWebhookEvent(data) {
  const database = getDatabase();
  if (!database) throw new Error('Firebase is not configured.');

  const eventKey = database.ref('webhook_events').push().key;
  const obj = data.obj || {};
  await database.ref(`webhook_events/${eventKey}`).set({
    transactionId: obj.id == null ? null : String(obj.id),
    orderId: obj.order?.id == null ? null : String(obj.order.id),
    success: obj.success === true,
    receivedAt: new Date().toISOString(),
    verified: true,
  });
}

module.exports = { isValidPaymobHmac, recordPaymentEvent, recordWebhookEvent };
