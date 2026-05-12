const connectDB = require('./_db');
const Order = require('./models/Order');
const { verifyFirebaseToken } = require('./middleware/auth');

module.exports = async function (req, res) {
  try {
    await connectDB();

    if (req.method === 'POST') {
      // Guest checkout: allow POST without auth token
      const authUser = await verifyFirebaseToken(req);

      const {
        customerName,
        customerPhone,
        orderType,
        source,
        tableNumber,
        mesa,
        table,
        deliveryAddress,
        paymentMethod,
        paymentAmount,
        subtotal,
        total,
        note,
        items,
      } = req.body;

      if (!customerName || !customerPhone || !orderType || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order payload' });
      }

      // Normalize item IDs defensively so legacy payloads using id/_id still work.
      const normalizedItems = items.map((item = {}) => ({
        ...item,
        productId: String(item.productId || item.id || item._id || '').trim(),
      }));

      if (normalizedItems.some((item) => !item.productId)) {
        return res.status(400).json({ error: 'Each item requires productId' });
      }

      const normalizedTableNumber = String(tableNumber || mesa || table || '').trim();
      const normalizedSource = String(source || (authUser ? 'mesero' : 'cliente')).toLowerCase() === 'mesero' ? 'mesero' : 'cliente';

      const order = new Order({
        userId: authUser?.uid || '',
        userEmail: authUser?.email || '',
        customerName,
        customerPhone,
        orderType,
        source: normalizedSource,
        tableNumber: normalizedTableNumber,
        deliveryAddress: deliveryAddress || '',
        paymentMethod,
        paymentAmount: Number(paymentAmount || 0),
        subtotal: Number(subtotal || 0),
        total: Number(total || 0),
        note: note || '',
        items: normalizedItems,
      });

      const saved = await order.save();
      return res.status(201).json(saved);
    }

    if (req.method === 'GET') {
      // Only authenticated users can view their own orders
      const authUser = await verifyFirebaseToken(req);
      if (!authUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orders = await Order.find({ userId: authUser.uid }).sort({ createdAt: -1 });
      return res.status(200).json(orders);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('orders API error:', error);
    if (error && error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Order validation failed',
        detail: error.message,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
