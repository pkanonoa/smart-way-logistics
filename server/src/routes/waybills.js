const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateWaybillHtml } = require('../lib/waybillPdfTemplate');

const router = express.Router();
router.use(authenticateToken);

function calcTotal(freight, handling, sgst, cgst, igst) {
  return [freight, handling, sgst, cgst, igst].reduce((a, v) => a + parseFloat(v || 0), 0);
}

// Configurable threshold for E-Way Bill requirement (₹50,000 under GST)
const EWAY_BILL_THRESHOLD = 50000;

function mapWaybillResponse(waybill) {
  if (!waybill) return waybill;
  return {
    ...waybill,
    eway_bill_required: parseFloat(waybill.grand_total) >= EWAY_BILL_THRESHOLD
  };
}

async function nextWaybillNumber(tx) {
  const existing = await tx.waybillCounter.findUnique({ where: { id: 1 } });
  if (!existing) await tx.waybillCounter.create({ data: { id: 1, seq: 500 } });
  const updated = await tx.waybillCounter.update({ where: { id: 1 }, data: { seq: { increment: 1 } } });
  return `SWL${updated.seq}`;
}

// ─── POST /api/waybills ───────────────────────────────────────────────────────

router.post('/', requireRole('admin', 'staff'), [
  body('from_location').trim().notEmpty(),
  body('to_location').trim().notEmpty(),
  body('consignor_name').trim().notEmpty().withMessage('Consignor name (Business Name) is required'),
  body('consignor_contact').optional({ checkFalsy: true }).trim(),
  body('consignor_address').trim().notEmpty().withMessage('Consignor address (Pickup Address) is required'),
  body('assigned_staff_ids').isArray({ min: 1 }).withMessage('At least one staff member is required'),
  body('assigned_staff_ids.*').notEmpty(),
  body('consignee_name').trim().notEmpty(),
  body('consignee_mobile')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Consignee mobile must be a valid 10-digit number'),
  body('consignee_address').trim().notEmpty(),
  body('no_of_packages').isInt({ min: 1 }),
  body('package_type').trim().notEmpty(),
  body('weight').optional().isFloat({ min: 0 }),
  body('freight').isFloat({ min: 0 }),
  body('payment_mode').isIn(['paid', 'topay', 'credit']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { booking_date, from_location, to_location,
    consignor_name, consignor_contact, consignor_address, consignor_gst,
    assigned_staff_ids,
    consignee_name, consignee_mobile, consignee_address, consignee_gst,
    no_of_packages, package_type, weight, volume, description,
    freight, handling_charges, sgst, cgst, igst, payment_mode,
    eway_bill_number, eway_bill_valid_until } = req.body;

  const grand_total = calcTotal(freight, handling_charges, sgst, cgst, igst);

  try {
    const waybill = await prisma.$transaction(async (tx) => {
      // Validate all staff exist
      const staffs = await tx.staff.findMany({ where: { id: { in: assigned_staff_ids } } });
      if (staffs.length !== assigned_staff_ids.length) throw Object.assign(new Error('One or more staff not found'), { code: 'NOT_FOUND' });
      
      const bDate = booking_date ? new Date(booking_date) : new Date();
      
      const paymentData = {
        amount: grand_total,
      };

      if (payment_mode === 'paid') {
        paymentData.status = 'paid';
        paymentData.paid_date = bDate;
      } else if (payment_mode === 'credit') {
        paymentData.status = 'credit';
        const dueDate = new Date(bDate);
        dueDate.setDate(dueDate.getDate() + 15);
        paymentData.due_date = dueDate;
      } else {
        paymentData.status = 'pending';
      }

      const waybill_number = await nextWaybillNumber(tx);
      return tx.waybill.create({
        data: {
          waybill_number, booking_date: bDate,
          from_location: from_location.trim(), to_location: to_location.trim(),
          consignor_name: consignor_name.trim(),
          consignor_contact: consignor_contact?.trim() || '',
          consignor_address: consignor_address.trim(),
          consignor_gst: consignor_gst?.trim() || null,
          assigned_staff: {
            connect: assigned_staff_ids.map(id => ({ id }))
          },
          consignee_name: consignee_name.trim(), consignee_mobile: consignee_mobile?.trim() || '',
          consignee_address: consignee_address.trim(), consignee_gst: consignee_gst?.trim() || null,
          no_of_packages: parseInt(no_of_packages), package_type: package_type.trim(),
          weight: weight ? parseFloat(weight) : 0.0, volume: volume ? parseFloat(volume) : null,
          description: description?.trim() || null,
          freight: parseFloat(freight), handling_charges: parseFloat(handling_charges || 0),
          sgst: parseFloat(sgst || 0), cgst: parseFloat(cgst || 0), igst: parseFloat(igst || 0),
          grand_total, payment_mode, created_by: req.user.id,
          eway_bill_number: eway_bill_number?.trim() || null,
          eway_bill_valid_until: eway_bill_valid_until ? new Date(eway_bill_valid_until) : null,
          payment: {
            create: paymentData
          }
        },
        include: { assigned_staff: true, creator: { select: { id: true, name: true } }, payment: true },
      });
    });
    return res.status(201).json({ message: 'Waybill created', waybill: mapWaybillResponse(waybill) });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('[waybills:create]', err);
    return res.status(500).json({ error: 'Failed to create waybill' });
  }
});

// ─── GET /api/waybills ────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { search, status, staffId, startDate, endDate, eway_missing } = req.query;
  try {
    const where = {};
    if (search) where.OR = [
      { waybill_number: { contains: search, mode: 'insensitive' } },
      { consignee_name: { contains: search, mode: 'insensitive' } },
    ];
    if (status === 'in_transit') {
      where.status = { in: ['loaded', 'in_transit', 'arrived', 'out_for_delivery'] };
    } else if (status) {
      where.status = status;
    }
    if (eway_missing === 'true') {
      where.grand_total = { gte: EWAY_BILL_THRESHOLD };
      where.eway_bill_number = null;
      where.status = { not: 'delivered' };
    }
    if (staffId) where.assigned_staff = { some: { id: staffId } };
    if (startDate || endDate) {
      where.booking_date = {};
      if (startDate) where.booking_date.gte = new Date(startDate);
      if (endDate)   where.booking_date.lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const waybills = await prisma.waybill.findMany({
      where, orderBy: [
        { booking_date: 'desc' },
        { created_at: 'desc' }
      ],
      include: { assigned_staff: { select: { id: true, name: true, phone: true } }, creator: { select: { id: true, name: true } }, payment: true },
    });
    return res.status(200).json({ waybills: waybills.map(mapWaybillResponse) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch waybills' });
  }
});

// ─── GET /api/waybills/:id ────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const waybill = await prisma.waybill.findUnique({
      where: { id: req.params.id },
      include: { assigned_staff: true, creator: { select: { id: true, name: true } }, payment: true },
    });
    if (!waybill) return res.status(404).json({ error: 'Waybill not found' });
    return res.status(200).json({ waybill: mapWaybillResponse(waybill) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch waybill' });
  }
});

// ─── PUT /api/waybills/:id ────────────────────────────────────────────────────

router.put('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const existing = await prisma.waybill.findUnique({ where: { id: req.params.id }, include: { payment: true } });
    if (!existing) return res.status(404).json({ error: 'Waybill not found' });

    const f = (k, d) => req.body[k] !== undefined ? parseFloat(req.body[k]) : parseFloat(d);
    const freight = f('freight', existing.freight), handling = f('handling_charges', existing.handling_charges);
    const sgst = f('sgst', existing.sgst), cgst = f('cgst', existing.cgst), igst = f('igst', existing.igst);
    const grand_total = freight + handling + sgst + cgst + igst;

    if (existing.payment?.status === 'paid' && grand_total !== parseFloat(existing.grand_total)) {
      return res.status(400).json({ error: 'Cannot change charges because the payment is already marked as paid' });
    }

    const { from_location, to_location, consignee_name, consignee_mobile, consignee_address,
      consignee_gst, no_of_packages, package_type, weight, volume, description, payment_mode, status,
      eway_bill_number, eway_bill_valid_until,
      payment_status, payment_due_date, payment_paid_date, payment_method,
      consignor_name, consignor_contact, consignor_address, consignor_gst, assigned_staff_ids } = req.body;

    const waybill = await prisma.waybill.update({
      where: { id: req.params.id },
      data: {
        ...(from_location && { from_location }), ...(to_location && { to_location }),
        ...(consignor_name && { consignor_name }), ...(consignor_contact && { consignor_contact }),
        ...(consignor_address && { consignor_address }),
        ...(consignor_gst !== undefined && { consignor_gst: consignor_gst || null }),
        ...(assigned_staff_ids && {
          assigned_staff: {
            set: assigned_staff_ids.map(id => ({ id }))
          }
        }),
        ...(consignee_name && { consignee_name }), ...(consignee_mobile && { consignee_mobile }),
        ...(consignee_address && { consignee_address }),
        ...(consignee_gst !== undefined && { consignee_gst: consignee_gst || null }),
        ...(no_of_packages && { no_of_packages: parseInt(no_of_packages) }),
        ...(package_type && { package_type }), ...(weight && { weight: parseFloat(weight) }),
        ...(volume !== undefined && { volume: volume ? parseFloat(volume) : null }),
        ...(description !== undefined && { description: description || null }),
        freight, handling_charges: handling, sgst, cgst, igst, grand_total,
        ...(payment_mode && { payment_mode }), ...(status && { status }),
        ...(eway_bill_number !== undefined && { eway_bill_number: eway_bill_number || null }),
        ...(eway_bill_valid_until !== undefined && { eway_bill_valid_until: eway_bill_valid_until ? new Date(eway_bill_valid_until) : null }),
        ...(existing.payment && {
          payment: {
            update: {
              amount: grand_total,
              // If payment mode changes and not paid, update status appropriately
              ...(payment_mode && payment_mode !== existing.payment_mode && existing.payment.status !== 'paid' ? {
                status: payment_mode === 'credit' ? 'credit' : 'pending',
                ...(payment_mode === 'credit' ? {
                  due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                } : { due_date: null })
              } : {}),
              ...(payment_status && { status: payment_status }),
              ...(payment_due_date !== undefined && { due_date: payment_due_date ? new Date(payment_due_date) : null }),
              ...(payment_paid_date !== undefined && { paid_date: payment_paid_date ? new Date(payment_paid_date) : null }),
              ...(payment_method !== undefined && { payment_method: payment_method || null }),
            }
          }
        })
      },
      include: { assigned_staff: true, creator: { select: { id: true, name: true } }, payment: true },
    });
    return res.status(200).json({ message: 'Waybill updated', waybill: mapWaybillResponse(waybill) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Waybill not found' });
    return res.status(500).json({ error: 'Failed to update waybill' });
  }
});

// ─── POST /api/waybills/:id/status ───────────────────────────────────────────

router.post('/:id/status', requireRole('admin', 'staff'), [
  body('status').isIn(['booked','loaded','in_transit','arrived','out_for_delivery','delivered','returned']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { status, location, remarks, confirmPaymentCollected, payment_method, payment_status } = req.body;

  try {
    const existing = await prisma.waybill.findUnique({
      where: { id: req.params.id },
      include: { payment: true }
    });
    if (!existing) return res.status(404).json({ error: 'Waybill not found' });

    const isDelivered = status === 'delivered';
    const isTopayPending = existing.payment_mode === 'topay' && existing.payment?.status === 'pending';
    const suggestPaymentCollected = isDelivered && isTopayPending;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Add tracking entry
      const tracking = await tx.parcelTracking.create({
        data: {
          waybill_id: existing.id,
          status,
          location: location?.trim() || null,
          remarks: remarks?.trim() || null,
          updated_by: req.user.id,
        }
      });

      // 2. Update waybill status
      const waybill = await tx.waybill.update({
        where: { id: existing.id },
        data: { status },
        include: { assigned_staff: true, creator: { select: { id: true, name: true } }, payment: true }
      });

      // 3. Update payment details
      if ((confirmPaymentCollected && isTopayPending) || payment_status) {
        const finalStatus = payment_status || 'paid';
        await tx.payment.upsert({
          where: { waybill_id: existing.id },
          update: {
            status: finalStatus,
            ...(finalStatus === 'paid' ? {
              paid_date: new Date(),
              payment_method: payment_method || null,
              due_date: null,
            } : finalStatus === 'credit' ? {
              due_date: existing.payment?.due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
              paid_date: null,
              payment_method: null,
            } : {
              paid_date: null,
              payment_method: null,
              due_date: null,
            })
          },
          create: {
            waybill_id: existing.id,
            amount: existing.grand_total,
            status: finalStatus,
            ...(finalStatus === 'paid' ? {
              paid_date: new Date(),
              payment_method: payment_method || null,
            } : finalStatus === 'credit' ? {
              due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            } : {})
          }
        });
        waybill.payment = await tx.payment.findUnique({ where: { waybill_id: existing.id } });
      }

      return { waybill, tracking };
    });

    return res.status(200).json({
      message: 'Status updated',
      waybill: mapWaybillResponse(result.waybill),
      tracking: result.tracking,
      suggestPaymentCollected: suggestPaymentCollected && !confirmPaymentCollected,
    });
  } catch (err) {
    console.error('[waybills:status]', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// ─── GET /api/waybills/:id/tracking ──────────────────────────────────────────

router.get('/:id/tracking', async (req, res) => {
  try {
    const waybill = await prisma.waybill.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!waybill) return res.status(404).json({ error: 'Waybill not found' });

    const history = await prisma.parcelTracking.findMany({
      where: { waybill_id: req.params.id },
      orderBy: { timestamp: 'asc' },
      include: { user: { select: { id: true, name: true } } }
    });
    return res.status(200).json({ tracking: history });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tracking' });
  }
});
// ─── DELETE /api/waybills/:id ─────────────────────────────────────────────────

router.delete('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const existing = await prisma.waybill.findUnique({
      where: { id: req.params.id },
      include: { payment: true },
    });
    if (!existing) return res.status(404).json({ error: 'Waybill not found' });

    await prisma.$transaction(async (tx) => {
      // Explicitly delete the related payment first to avoid FK constraint errors
      if (existing.payment) {
        await tx.payment.delete({ where: { waybill_id: req.params.id } });
      }
      // Then delete the waybill (many-to-many join table rows for consignors are handled automatically)
      await tx.waybill.delete({ where: { id: req.params.id } });
    });

    return res.status(200).json({ message: 'Waybill deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Waybill not found' });
    console.error('[waybills:delete]', err);
    return res.status(500).json({ error: 'Failed to delete waybill' });
  }
});

// ─── GET /api/waybills/:id/pdf ───────────────────────────────────────────────

router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const waybill = await prisma.waybill.findUnique({
      where: { id: req.params.id },
      include: {
        assigned_staff: { select: { id: true, name: true, phone: true } },
        creator: { select: { id: true, name: true } },
        payment: true,
      },
    });
    if (!waybill) return res.status(404).json({ error: 'Waybill not found' });

    const isDuplicate = req.query.copy === 'duplicate';
    const html = generateWaybillHtml({ ...waybill, eway_bill_required: parseFloat(waybill.grand_total) >= EWAY_BILL_THRESHOLD }, isDuplicate);

    // Launch Puppeteer and render PDF
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    await browser.close();

    const filename = isDuplicate
      ? `${waybill.waybill_number}-DUPLICATE.pdf`
      : `${waybill.waybill_number}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[waybills:pdf]', err);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
