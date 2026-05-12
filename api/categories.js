const connectDB = require('./_db');
const Category = require('./models/Category');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

async function ensureFirebase() {
  if (!admin.apps.length) {
    let credentialConfig = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        credentialConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (parseErr) {
        console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_JSON, trying serviceAccountKey.json fallback.');
      }
    }

    if (!credentialConfig && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      try {
        credentialConfig = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
      } catch (fileErr) {
        console.warn('Could not parse serviceAccountKey.json:', fileErr.message);
      }
    }

    if (!credentialConfig) {
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(credentialConfig)
    });
  }

  return admin.firestore();
}

async function firestoreGetCategories() {
  const db = await ensureFirebase();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection('categories').get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((category) => !!category?.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

module.exports = async function (req, res) {
  try {
    let mongoConnected = false;
    try {
      await connectDB();
      mongoConnected = true;
    } catch (connectionError) {
      console.warn('MongoDB connection failed, falling back to Firestore for GET categories:', connectionError.message);
    }

    if (req.method === 'GET') {
      if (mongoConnected) {
        try {
          const categories = await Category.find().sort({ name: 1 });
          if (categories.length > 0) {
            return res.status(200).json(categories);
          }

          console.warn('Mongo categories collection is empty, falling back to Firestore for GET categories.');
        } catch (mongoReadErr) {
          console.warn('Mongo read failed, using Firestore fallback for categories:', mongoReadErr.message);
        }
      }

      const categories = await firestoreGetCategories();
      return res.status(200).json(categories);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('categories API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
