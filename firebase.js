require('dotenv').config();
const admin = require('firebase-admin');

let firestore = null;

function initializeFirebase() {
  const encodedCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encodedCredentials) {
    console.warn('⚠️ Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64.');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(encodedCredentials, 'base64').toString('utf8')
    );

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Service account JSON must include project_id, client_email, and private_key.');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    }

    firestore = admin.firestore();
    console.log(`✅ Cloud Firestore initialized for project ${serviceAccount.project_id}.`);
    return firestore;
  } catch (error) {
    // Keep the HTTP service available so Render can complete deployment and /health
    // can report the issue. Payment endpoints return 503 without Firestore.
    firestore = null;
    console.error('❌ Cloud Firestore initialization failed; payment operations are unavailable:', error.message);
    return null;
  }
}

function isFirebaseConfigured() {
  return Boolean(firestore);
}

function getFirestore() {
  return firestore;
}

initializeFirebase();

module.exports = { admin, getFirestore, isFirebaseConfigured };
