const connectDB = require('./_db');
const Product = require('./models/Product');
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
        const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
        credentialConfig = JSON.parse(raw);
      } catch (fileErr) {
        console.warn('Could not parse serviceAccountKey.json:', fileErr.message);
      }
    }

    if (!credentialConfig) {
      console.warn('Firebase credentials not found; Firestore will be unavailable. Falling back to sample data.');
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(credentialConfig)
    });
  }
  return admin.firestore();
}

async function firestoreGetProducts(category, search) {
  const db = await ensureFirebase();
  if (!db) {
    const items = [
      { id: 'sample1', name: 'Hamburguesa con Queso', description: 'Hamburguesa jugosa', price: 700, image: '', category: 'HAMBURGUESAS', available: true },
      { id: 'sample2', name: 'Salchipapa Especial', description: 'Sabrosa y crujiente', price: 500, image: '', category: 'SALCHIS', available: true }
    ];

    if (category && category !== 'all') {
      return items.filter(it => it.category === category);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      return items.filter(product =>
        (product.name || '').toLowerCase().includes(lowerSearch) ||
        (product.description || '').toLowerCase().includes(lowerSearch) ||
        (product.category || '').toLowerCase().includes(lowerSearch)
      );
    }

    return items;
  }

  let query = db.collection('products');

  if (category && category !== 'all') {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.get();
  let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (search) {
    const lowerSearch = search.toLowerCase();
    docs = docs.filter(product =>
      (product.name || '').toLowerCase().includes(lowerSearch) ||
      (product.description || '').toLowerCase().includes(lowerSearch) ||
      (product.category || '').toLowerCase().includes(lowerSearch)
    );
  }

  return docs;
}

module.exports = async function (req, res) {
  try {
    let mongoConnected = false;
    try {
      await connectDB();
      mongoConnected = true;
    } catch (connectionError) {
      console.warn('MongoDB connection failed, falling back to Firestore for GET products:', connectionError.message);
    }

    if (req.method === 'GET') {
      const { id, category, search } = req.query;

      if (id) {
        if (mongoConnected) {
          try {
            const product = await Product.findById(id);
            if (!product) return res.status(404).json({ error: 'Product not found' });
            return res.status(200).json(product);
          } catch (mongoReadErr) {
            console.warn('Mongo read by id failed, using Firestore fallback:', mongoReadErr.message);
          }
        }

        const productList = await firestoreGetProducts(undefined, undefined);
        const product = productList.find(p => p.id === id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        return res.status(200).json(product);
      }

      if (mongoConnected) {
        try {
          const filter = { available: true };

          if (category && category !== 'all') {
            filter.category = category;
          }

          if (search) {
            filter.$or = [
              { name: new RegExp(search, 'i') },
              { description: new RegExp(search, 'i') },
              { category: new RegExp(search, 'i') }
            ];
          }

          const products = await Product.find(filter).sort({ createdAt: 1 });
          if (products.length > 0) {
            return res.status(200).json(products);
          }

          console.warn('Mongo products collection is empty, falling back to Firestore for GET products.');
        } catch (mongoReadErr) {
          console.warn('Mongo read failed, using Firestore fallback:', mongoReadErr.message);
        }
      }

      const products = await firestoreGetProducts(category, search);
      return res.status(200).json(products);
    }

    if (req.method === 'POST') {
      const payload = req.body || {};

      const name = payload.name || payload.nombre;
      const description = payload.description || payload.descripcion || '';
      const price = payload.price || payload.precio;
      const image = payload.image || payload.imagen || '';
      const category = payload.category || payload.categoria || 'general';

      if (!name || !price) {
        return res.status(400).json({ error: 'name and price are required (o nombre y precio)' });
      }

      // Intenta guardar en Mongo primero
      try {
        const product = new Product({
          name,
          description,
          price: Number(price),
          image,
          category,
          available: true,
        });

        const saved = await product.save();
        return res.status(201).json(saved);
      } catch (mongoWriteErr) {
        console.warn('Mongo write failed, using Firestore fallback (POST):', mongoWriteErr.message);
        const db = await ensureFirebase();
        const docRef = await db.collection('products').add({
          name,
          description,
          price: Number(price),
          image,
          category,
          available: true,
          createdAt: new Date().toISOString()
        });
        const created = (await docRef.get()).data();
        return res.status(201).json({ id: docRef.id, ...created });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('products API error:', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};
