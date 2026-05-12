const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  customization: { type: Object, default: {} }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: String },
  userEmail: { type: String },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  orderType: { type: String, enum: ['restaurant', 'takeaway', 'delivery'], required: true },
  source: { type: String, enum: ['cliente', 'mesero'], default: 'cliente' },
  tableNumber: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], required: true },
  paymentAmount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'], default: 'pending' },
  items: { type: [orderItemSchema], required: true },
}, {
  timestamps: true
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
