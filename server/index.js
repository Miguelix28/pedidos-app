const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import route handlers
const healthHandler = require('./health');
const productsHandler = require('./products');
const categoriesHandler = require('./categories');
const ordersHandler = require('./orders');
const adminCategoriesHandler = require('./admin/categories');
const adminOrdersHandler = require('./admin/orders');
const adminProductsHandler = require('./admin/products');
const adminUploadHandler = require('./admin/upload-image');
const adminUsersHandler = require('./admin/users');

// Routes
app.get('/api/health', (req, res) => healthHandler(req, res));
app.get('/api/products', (req, res) => productsHandler(req, res));
app.post('/api/products', (req, res) => productsHandler(req, res));
app.get('/api/categories', (req, res) => categoriesHandler(req, res));
app.post('/api/categories', (req, res) => categoriesHandler(req, res));
app.get('/api/orders', (req, res) => ordersHandler(req, res));
app.post('/api/orders', (req, res) => ordersHandler(req, res));

// Admin Routes
app.get('/api/admin/categories', (req, res) => adminCategoriesHandler(req, res));
app.post('/api/admin/categories', (req, res) => adminCategoriesHandler(req, res));
app.put('/api/admin/categories/:id', (req, res) => adminCategoriesHandler(req, res));
app.delete('/api/admin/categories/:id', (req, res) => adminCategoriesHandler(req, res));

app.get('/api/admin/orders', (req, res) => adminOrdersHandler(req, res));
app.post('/api/admin/orders', (req, res) => adminOrdersHandler(req, res));
app.put('/api/admin/orders/:id', (req, res) => adminOrdersHandler(req, res));

app.get('/api/admin/products', (req, res) => adminProductsHandler(req, res));
app.post('/api/admin/products', (req, res) => adminProductsHandler(req, res));
app.put('/api/admin/products/:id', (req, res) => adminProductsHandler(req, res));
app.delete('/api/admin/products/:id', (req, res) => adminProductsHandler(req, res));

app.post('/api/admin/upload-image', (req, res) => adminUploadHandler(req, res));

app.get('/api/admin/users', (req, res) => adminUsersHandler(req, res));
app.post('/api/admin/users', (req, res) => adminUsersHandler(req, res));

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
