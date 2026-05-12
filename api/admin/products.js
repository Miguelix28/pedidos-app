const connectDB = require('../_db');
const Product = require('../models/Product');
const { verifyAdmin } = require('../middleware/auth');

function forbiddenAdminResponse(req, res) {
  const payload = { error: 'Forbidden: admin only' };
  if (process.env.NODE_ENV !== 'production' && req.authErrorCode) {
    payload.reason = req.authErrorCode;
  }
  return res.status(403).json(payload);
}

module.exports = async function (req, res) {
  try {
    await connectDB();

    const adminUser = await verifyAdmin(req);
    if (!adminUser) {
      return forbiddenAdminResponse(req, res);
    }

if (req.method === 'GET') {
  const products = await Product.find().sort({ createdAt: -1 });
  // 👇 Mapear _id a id
  const mapped = products.map(p => ({
    ...p.toObject(),
    id: p._id.toString()
  }));
  return res.status(200).json(mapped);
}

    if (req.method === 'POST') {
      const payload = req.body;
      const product = new Product(payload);
      const saved = await product.save();
      return res.status(201).json(saved);
    }

    if (req.method === 'PUT') {
  const { id, _id, ...payload } = req.body;
  const productId = id || _id;
  if (!productId) {
    return res.status(400).json({ error: 'Product id is required' });
  }
  const updated = await Product.findByIdAndUpdate(productId, payload, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  return res.status(200).json({ ...updated.toObject(), id: updated._id.toString() });
}

    if (req.method === 'DELETE') {
  const { id } = req.query;
  const productId = id;
  if (!productId) {
    return res.status(400).json({ error: 'Product id is required' });
  }
  await Product.findByIdAndDelete(productId);
  return res.status(204).end();
}

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('admin/products API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
