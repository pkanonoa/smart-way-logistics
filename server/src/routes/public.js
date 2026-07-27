const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// ─── GET /api/public/track/:waybill_number ────────────────────────────────────
// No authentication required — customer-facing tracking

router.get('/track/:waybill_number', async (req, res) => {
  try {
    const waybill = await prisma.waybill.findUnique({
      where: { waybill_number: req.params.waybill_number },
      select: {
        id: true,
        waybill_number: true,
        booking_date: true,
        from_location: true,
        to_location: true,
        consignee_name: true,
        consignee_mobile: true,
        status: true,
        no_of_packages: true,
        package_type: true,
        weight: true,
        payment_mode: true,
        eway_bill_number: true,
        eway_bill_valid_until: true,
        tracking: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            status: true,
            location: true,
            remarks: true,
            timestamp: true,
          }
        }
      }
    });
    if (!waybill) return res.status(404).json({ error: 'Waybill not found' });
    return res.status(200).json({ waybill });
  } catch (err) {
    console.error('[public:track]', err);
    return res.status(500).json({ error: 'Failed to fetch tracking info' });
  }
});

module.exports = router;
