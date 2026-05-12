const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

function setAuthError(req, code) {
  if (req && typeof req === 'object') {
    req.authErrorCode = code;
  }
}

function loadServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', error);
    return null;
  }
}

function loadServiceAccountFromFile() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      return null;
    }

    const fileContents = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error reading local serviceAccountKey.json:', error);
    return null;
  }
}

function ensureFirebaseAdmin() {
  if (admin.apps.length) {
    return true;
  }

  const envConfig = loadServiceAccountFromEnv();
  const fileConfig = envConfig ? null : loadServiceAccountFromFile();
  const credentialConfig = envConfig || fileConfig;

  if (!credentialConfig) {
    console.warn('Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or provide api/serviceAccountKey.json.');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(credentialConfig),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    return true;
  } catch (error) {
    console.error('Firebase admin init error:', error);
    return false;
  }
}

async function verifyFirebaseToken(req) {
  if (!ensureFirebaseAdmin()) {
    setAuthError(req, 'firebase_admin_not_configured');
    return null;
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    setAuthError(req, 'missing_authorization_header');
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    setAuthError(req, 'missing_bearer_token');
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    setAuthError(req, null);
    return decoded;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    setAuthError(req, 'invalid_or_expired_token');
    return null;
  }
}

async function verifyAdmin(req) {
  const user = await verifyFirebaseToken(req);
  if (!user || !user.uid) {
    if (!req.authErrorCode) {
      setAuthError(req, 'token_not_verified');
    }
    return null;
  }

  // Support Firebase custom claims so admin access can work without a Firestore users/{uid} document.
  if (user.admin === true || user.role === 'admin') {
    setAuthError(req, null);
    return user;
  }

  try {
    const firestore = admin.firestore();
    const userDoc = await firestore.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      setAuthError(req, 'user_profile_not_found');
      return null;
    }

    const userData = userDoc.data();
    const role = userData?.role || 'user';

    if (role === 'admin') {
      setAuthError(req, null);
      return user;
    }

    setAuthError(req, 'role_not_admin');
    return null;
  } catch (error) {
    console.error('Error checking admin role:', error);
    setAuthError(req, 'admin_role_lookup_failed');
    return null;
  }
}

module.exports = {
  verifyFirebaseToken,
  verifyAdmin,
};
