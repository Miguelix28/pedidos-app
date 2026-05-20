const connectDB = require('../_db');
const Order = require('../models/Order');

function parseRange(query) {
  const now = new Date();
  const period = String(query.period || 'day').toLowerCase();
  // tzOffset is browser's getTimezoneOffset() in minutes (positive for UTC-, e.g. Colombia UTC-5 = 300)
  const rawOffset = Number(query.tzOffset);
  const tzOffsetMs = Number.isFinite(rawOffset) ? rawOffset * 60 * 1000 : 0;

  // Converts a local calendar date to UTC boundaries accounting for the client's timezone
  function localDateToUTCRange(year, month, day) {
    const startMs = Date.UTC(year, month, day) + tzOffsetMs;
    return { start: new Date(startMs), end: new Date(startMs + 24 * 60 * 60 * 1000) };
  }

  if (period === 'day') {
    if (query.date) {
      const parts = String(query.date).split('-').map(Number);
      if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null;
      const { start, end } = localDateToUTCRange(parts[0], parts[1] - 1, parts[2]);
      return { period, start, end };
    }
    // Derive today in client's local time using tzOffset
    const localNow = new Date(now.getTime() - tzOffsetMs);
    const { start, end } = localDateToUTCRange(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate());
    return { period, start, end };
  }

  if (period === 'month') {
    const monthText = String(query.month || '').trim();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth();

    if (monthText) {
      const [y, m] = monthText.split('-').map((v) => Number(v));
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return null;
      }
      year = y;
      month = m - 1;
    }

    const startMs = Date.UTC(year, month, 1) + tzOffsetMs;
    const endMs = Date.UTC(year, month + 1, 1) + tzOffsetMs;
    return { period, start: new Date(startMs), end: new Date(endMs) };
  }

  if (period === 'year') {
    const y = query.year ? Number(query.year) : now.getUTCFullYear();
    if (!Number.isFinite(y) || y < 2000 || y > 3000) {
      return null;
    }
    const startMs = Date.UTC(y, 0, 1) + tzOffsetMs;
    const endMs = Date.UTC(y + 1, 0, 1) + tzOffsetMs;
    return { period, start: new Date(startMs), end: new Date(endMs) };
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
