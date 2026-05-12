const connectDB = require('../_db');
const Category = require('../models/Category');
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
      const categories = await Category.find().sort({ name: 1 });
      return res.status(200).json(categories);
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload.name || !payload.slug) {
        return res.status(400).json({ error: 'name and slug are required' });
      }
      const category = new Category(payload);
      const saved = await category.save();
      return res.status(201).json(saved);
    }

    if (req.method === 'PUT') {
      const { id, ...payload } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Category id is required' });
      }
      const updated = await Category.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ error: 'Category not found' });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Category id is required' });
      }

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const escapedName = String(category.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const usageCount = await Product.countDocuments({
        category: { $regex: `^${escapedName}$`, $options: 'i' }
      });

      if (usageCount > 0) {
        return res.status(409).json({
          error: 'Category is in use by products',
          category: category.name,
          usageCount
        });
      }

      await Category.findByIdAndDelete(id);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('admin/categories API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
