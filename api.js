module.exports = async (req, res) => {
  const { method } = req;
  // Vercel strips /api prefix, so we get just the path after /api
  let path = req.url.split('?')[0];
  
  // Add /api prefix back for processing
  if (!path.startsWith('/api')) {
    path = '/api' + path;
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Health check
    if (path === '/api/health' || path === '/api/') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Products routes
    if (path.startsWith('/api/products')) {
      const productsHandler = require('./api/products');
      return await productsHandler(req, res);
    }

    // Categories routes
    if (path.startsWith('/api/categories')) {
      const categoriesHandler = require('./api/categories');
      return await categoriesHandler(req, res);
    }

    // Orders routes
    if (path.startsWith('/api/orders')) {
      const ordersHandler = require('./api/orders');
      return await ordersHandler(req, res);
    }

    // Admin categories
    if (path.startsWith('/api/admin/categories')) {
      const adminCategoriesHandler = require('./api/admin/categories');
      return await adminCategoriesHandler(req, res);
    }

    // Admin orders
    if (path.startsWith('/api/admin/orders')) {
      const adminOrdersHandler = require('./api/admin/orders');
      return await adminOrdersHandler(req, res);
    }

    // Admin products
    if (path.startsWith('/api/admin/products')) {
      const adminProductsHandler = require('./api/admin/products');
      return await adminProductsHandler(req, res);
    }

    // Admin upload
    if (path.startsWith('/api/admin/upload-image')) {
      const adminUploadHandler = require('./api/admin/upload-image');
      return await adminUploadHandler(req, res);
    }

    // Admin users
    if (path.startsWith('/api/admin/users')) {
      const adminUsersHandler = require('./api/admin/users');
      return await adminUsersHandler(req, res);
    }

    // 404
    return res.status(404).json({ error: 'Not found', path });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
