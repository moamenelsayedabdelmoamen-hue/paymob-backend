require('dotenv').config();
const admin = require('firebase-admin');

let database = null;

function initializeFirebase() {
  const encodedCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!encodedCredentials || !databaseURL) {
    console.warn('⚠️ Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64 and FIREBASE_DATABASE_URL.');
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
        databaseURL,
      });
    }

    database = admin.database();
    console.log('✅ Firebase Realtime Database connected.');
    return database;
  } catch (error) {
    // Keep the HTTP service alive so Render can complete deployment and /health
    // can report the issue. Payment endpoints already return 503 without Firebase.
    database = null;
    console.error('❌ Firebase initialization failed; payment operations are unavailable:', error.message);
    return null;
  }
}

function isFirebaseConfigured() {
  return Boolean(database);
}

function getDatabase() {
  return database;
}

initializeFirebase();

module.exports = { admin, getDatabase, isFirebaseConfigured };
