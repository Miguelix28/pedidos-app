const admin = require('firebase-admin');
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Tu connection string de MongoDB Atlas
const MONGO_URI = "mongodb+srv://miguelix2805:LuiSan26.@cluster0.bxtvdl9.mongodb.net/pedidos?retryWrites=true&w=majority&appName=Cluster0";

// Tu serviceAccountKey.json descargado de Firebase
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function migrar() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado a MongoDB');

  const db2 = mongoose.connection.db;
  const snapshot2 = await admin.firestore().collection('products').get();

  // Borra todos los productos y los reinserta limpios
  await db2.collection('products').deleteMany({});
  console.log('🗑️ Colección limpiada');

  for (const doc of snapshot2.docs) {
    const data = doc.data();
    await db2.collection('products').insertOne({
      name: data.name,
      description: data.description || '',
      price: data.price,
      image: data.image || '',
      category: data.category,
      available: data.available ?? true,
      customization: data.customization || {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`➕ Insertado: ${data.name}`);
  }

  console.log('✅ Migración completa');
  process.exit(0);
}

migrar().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});