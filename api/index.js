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
app.get('/health', healthHandler);
app.get('/products', productsHandler);
app.post('/products', productsHandler);
app.get('/categories', categoriesHandler);
app.post('/categories', categoriesHandler);
app.get('/orders', ordersHandler);
app.post('/orders', ordersHandler);

// Admin Routes
app.get('/admin/categories', adminCategoriesHandler);
app.post('/admin/categories', adminCategoriesHandler);
app.put('/admin/categories/:id', adminCategoriesHandler);
app.delete('/admin/categories/:id', adminCategoriesHandler);

app.get('/admin/orders', adminOrdersHandler);
app.post('/admin/orders', adminOrdersHandler);
app.put('/admin/orders/:id', adminOrdersHandler);

app.get('/admin/products', adminProductsHandler);
app.post('/admin/products', adminProductsHandler);
app.put('/admin/products/:id', adminProductsHandler);
app.delete('/admin/products/:id', adminProductsHandler);

app.post('/admin/upload-image', adminUploadHandler);

app.get('/admin/users', adminUsersHandler);
app.post('/admin/users', adminUsersHandler);

// Export for Vercel
module.exports = app;
