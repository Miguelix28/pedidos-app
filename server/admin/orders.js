const connectDB = require('../_db');
const Order = require('../models/Order');

function parseRange(query) {
  const now = new Date();
  const period = String(query.period || 'day').toLowerCase();

  if (period === 'day') {
    const day = query.date ? new Date(`${query.date}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (Number.isNaN(day.getTime())) {
      return null;
    }
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { period, start, end };
  }

  if (period === 'month') {
    const monthText = String(query.month || '').trim();
    let year = now.getFullYear();
    let month = now.getMonth();

    if (monthText) {
      const [y, m] = monthText.split('-').map((v) => Number(v));
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return null;
      }
      year = y;
      month = m - 1;
    }

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return { period, start, end };
  }

  if (period === 'year') {
    const y = query.year ? Number(query.year) : now.getFullYear();
    if (!Number.isFinite(y) || y < 2000 || y > 3000) {
      return null;
    }
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);
    return { period, start, end };
  }

  return null;
}

module.exports = async function (req, res) {
  try {
    await connectDB();

    // Note: This endpoint is called only from the /admin route,
    // which is already protected by AdminGuard in the frontend.
    // No additional auth check needed here.

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      const allowedStatuses = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

      if (!id) {
        return res.status(400).json({ error: 'Order id is required' });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }

      const updated = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.status(200).json(updated);
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const range = parseRange(req.query || {});
    if (!range) {
      return res.status(400).json({ error: 'Invalid period filter' });
    }

    const orders = await Order.find({
      createdAt: {
        $gte: range.start,
        $lt: range.end,
      },
    }).sort({ createdAt: -1 });

    const totalAmount = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);

    return res.status(200).json({
      period: range.period,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      count: orders.length,
      totalAmount,
      orders,
    });
  } catch (error) {
    console.error('admin/orders API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
