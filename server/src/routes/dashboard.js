const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── GET /api/dashboard/summary ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 1. Today's bookings count
    const todayBookingsCount = await prisma.waybill.count({
      where: {
        booking_date: {
          gte: todayStart,
          lte: todayEnd,
        }
      }
    });

    // 2. In transit parcels count
    const inTransitCount = await prisma.waybill.count({
      where: {
        status: {
          in: ['loaded', 'in_transit', 'arrived', 'out_for_delivery']
        }
      }
    });

    // 3. Delivered today count
    const deliveredTodayCount = await prisma.parcelTracking.count({
      where: {
        status: 'delivered',
        timestamp: {
          gte: todayStart,
          lte: todayEnd,
        }
      }
    });

    // 4. Total pending payments amount
    const pendingPaymentsSum = await prisma.payment.aggregate({
      where: {
        status: { in: ['pending', 'credit'] }
      },
      _sum: {
        amount: true
      }
    });
    const totalPendingPayments = Number(pendingPaymentsSum._sum.amount || 0);

    // 5. Today's total collection from DailyCollection logs
    const todayCollectionSum = await prisma.dailyCollection.aggregate({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        }
      },
      _sum: {
        total_collection: true
      }
    });
    const todayTotalCollection = Number(todayCollectionSum._sum.total_collection || 0);

    // 6. This month's total income (paid waybills)
    const thisMonthIncomeSum = await prisma.payment.aggregate({
      where: {
        status: 'paid',
        paid_date: {
          gte: monthStart,
          lte: todayEnd,
        }
      },
      _sum: {
        amount: true
      }
    });
    const thisMonthIncome = Number(thisMonthIncomeSum._sum.amount || 0);

    // 7. E-way bill missing count (in-transit ones only)
    const ewayBillMissingCount = await prisma.waybill.count({
      where: {
        grand_total: { gte: 50000 },
        eway_bill_number: null,
        status: {
          not: 'delivered'
        }
      }
    });

    return res.status(200).json({
      todayBookingsCount,
      inTransitCount,
      deliveredTodayCount,
      totalPendingPayments,
      todayTotalCollection,
      thisMonthIncome,
      ewayBillMissingCount,
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
