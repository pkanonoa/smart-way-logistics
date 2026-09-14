const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── GET /api/dashboard/summary ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 1. Monthly Collections Trend (Last 6 months)
    const monthlyCollectionsRaw = await prisma.$queryRaw`
      SELECT 
        to_char(date, 'Mon YYYY') as month_label,
        date_trunc('month', date) as month_date,
        SUM(total_collection) as total
      FROM daily_collections
      WHERE date >= NOW() - INTERVAL '6 months'
      GROUP BY month_date, month_label
      ORDER BY month_date ASC
    `;

    const monthlyCollections = monthlyCollectionsRaw.map(row => ({
      month: row.month_label.trim(),
      total: Number(row.total || 0)
    }));

    // 2. Popular Routes (This month)
    const popularRoutesRaw = await prisma.$queryRaw`
      SELECT 
        from_location,
        to_location,
        COUNT(id) as waybills_count,
        AVG(freight) as avg_freight
      FROM waybills
      WHERE booking_date >= ${monthStart}
      GROUP BY from_location, to_location
      ORDER BY COUNT(id) DESC
      LIMIT 6
    `;

    const popularRoutes = popularRoutesRaw.map(row => ({
      from: row.from_location,
      to: row.to_location,
      waybills: Number(row.waybills_count || 0),
      avgFreight: Number(row.avg_freight || 0)
    }));

    return res.status(200).json({
      monthlyCollections,
      popularRoutes
    });
  } catch (err) {
    console.error('[Dashboard:summary]', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// ─── GET /api/dashboard/search ────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json({ results: [] });
  const queryStr = q.trim();

  try {
    const waybills = await prisma.waybill.findMany({
      where: {
        OR: [
          { waybill_number: { contains: queryStr, mode: 'insensitive' } },
          { consignee_mobile: { contains: queryStr, mode: 'insensitive' } },
          { consignee_name: { contains: queryStr, mode: 'insensitive' } },
        ]
      },
      take: 8,
      orderBy: { booking_date: 'desc' }
    });

    const results = waybills.map(wb => ({
      id: wb.id,
      waybill_number: wb.waybill_number,
      consignee_name: wb.consignee_name,
      consignee_mobile: wb.consignee_mobile,
      from_location: wb.from_location,
      to_location: wb.to_location,
    }));

    return res.status(200).json({ results });
  } catch (err) {
    console.error('[Dashboard:search]', err);
    return res.status(500).json({ error: 'Failed to perform quick search' });
  }
});

module.exports = router;
