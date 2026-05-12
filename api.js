module.exports = async (req, res) => {
  const { query, body, method } = req;
  const path = req.url.replace('/api', '').split('?')[0];

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Health check
    if (path === '/health' || path === '/') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Products routes
    if (path.startsWith('/products')) {
      const productsHandler = require('./products');
      return productsHandler(req, res);
    }

    // Categories routes
    if (path.startsWith('/categories')) {
      const categoriesHandler = require('./categories');
      return categoriesHandler(req, res);
    }

    // Orders routes
    if (path.startsWith('/orders')) {
      const ordersHandler = require('./orders');
      return ordersHandler(req, res);
    }

    // Admin categories
    if (path.startsWith('/admin/categories')) {
      const adminCategoriesHandler = require('./admin/categories');
      return adminCategoriesHandler(req, res);
    }

    // Admin orders
    if (path.startsWith('/admin/orders')) {
      const adminOrdersHandler = require('./admin/orders');
      return adminOrdersHandler(req, res);
    }

    // Admin products
    if (path.startsWith('/admin/products')) {
      const adminProductsHandler = require('./admin/products');
      return adminProductsHandler(req, res);
    }

    // Admin upload
    if (path.startsWith('/admin/upload-image')) {
      const adminUploadHandler = require('./admin/upload-image');
      return adminUploadHandler(req, res);
    }

    // Admin users
    if (path.startsWith('/admin/users')) {
      const adminUsersHandler = require('./admin/users');
      return adminUsersHandler(req, res);
    }

    // 404
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
