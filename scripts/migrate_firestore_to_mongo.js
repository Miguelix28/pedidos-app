const admin = require('firebase-admin');
const mongoose = require('mongoose');
const Product = require('../api/models/Product');
const Category = require('../api/models/Category');

async function connectFirebase() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON required');
  }

  const firebaseConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });

  return admin.firestore();
}

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI required');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function migrateProducts(db) {
  const snapshot = await db.collection('products').get();
  console.log(`Productos Firestore: ${snapshot.size}`);

  if (snapshot.empty) return;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const productData = {
      name: data.name || data.nombre || 'Sin nombre',
      description: data.description || data.descripcion || '',
      price: typeof data.price === 'number' ? data.price : Number(data.price || 0),
      image: data.image || data.imagen || '',
      category: data.category || data.categoria || 'sin-categoria',
      available: data.available !== undefined ? data.available : true,
      metadata: data.metadata || {}
    };

    await Product.findOneAndUpdate(
      { name: productData.name, category: productData.category },
      productData,
      { upsert: true, new: true }
    );
  }

  console.log('Productos migrados a MongoDB');
}

async function migrateCategories(db) {
  const snapshot = await db.collection('categories').get();
  console.log(`Categorías Firestore: ${snapshot.size}`);

  if (snapshot.empty) return;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const categoryData = {
      name: data.name || data.nombre || 'Sin nombre',
      icon: data.icon || data.ICON || '',
      slug: data.slug || (data.name ? data.name.toLowerCase().replace(/\s+/g, '-') : `cat-${doc.id}`)
    };

    await Category.findOneAndUpdate(
      { slug: categoryData.slug },
      categoryData,
      { upsert: true, new: true }
    );
  }

  console.log('Categorías migradas a MongoDB');
}

async function main() {
  try {
    const db = await connectFirebase();
    await connectMongo();

    await migrateCategories(db);
    await migrateProducts(db);

    console.log('Migración completada.');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
}

main();
