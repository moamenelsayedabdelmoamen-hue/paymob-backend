require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');

let firestore = null;

function initializeFirebase() {
  const configuredSecretFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  const secretCandidates = [configuredSecretFile, '/etc/secrets/firebase-service-account.json', '/etc/secrets/Firebase', '/etc/secrets/firebase']
    .filter(Boolean);
  const secretFile = secretCandidates.find((candidate) => fs.existsSync(candidate));
  const encodedCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!secretFile && !encodedCredentials) {
    console.warn('⚠️ Firebase is not configured. Add the Render secret file or FIREBASE_SERVICE_ACCOUNT_BASE64.');
    return null;
  }

  try {
    const credentialsJson = secretFile
      ? fs.readFileSync(secretFile, 'utf8')
      : Buffer.from(encodedCredentials, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(credentialsJson);

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
