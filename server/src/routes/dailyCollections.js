const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Helper for parsing float safely
const floatVal = (v) => parseFloat(v || 0);

// Helper to compute calculated fields
function calculateFields(data) {
  const start_km = parseInt(data.start_km || 0);
  const end_km = parseInt(data.end_km || 0);
  const total_km = Math.max(0, end_km - start_km);

  const fuel_expense = floatVal(data.fuel_expense);
  const vehicle_rent = floatVal(data.vehicle_rent);
  const driver_wage = floatVal(data.driver_wage);
  const helper_wage = floatVal(data.helper_wage);
  const advance = floatVal(data.advance);
  const other_expenses = floatVal(data.other_expenses);

  const cash_collection = floatVal(data.cash_collection);
  const upi_collection = floatVal(data.upi_collection);
  const credit_collection = floatVal(data.credit_collection);

  const total_expense = fuel_expense + vehicle_rent + driver_wage + helper_wage + advance + other_expenses;
  const total_collection = cash_collection + upi_collection + credit_collection;
  const balance = total_collection - total_expense;

  return {
    start_km,
    end_km,
    total_km,
    fuel_expense,
    vehicle_rent,
    driver_wage,
    helper_wage,
    advance,
    other_expenses,
    cash_collection,
    upi_collection,
    credit_collection,
    total_expense,
    total_collection,
    balance
  };
}

// ─── GET /api/daily-collections ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { startDate, endDate, vehicleId } = req.query;
  try {
    const where = {};
    if (vehicleId) {
      where.vehicle_id = vehicleId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const collections = await prisma.dailyCollection.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        staff: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicle_number: true, vehicle_name: true } },
        waybills: { include: { payment: true } }
      }
    });

    return res.status(200).json({ collections });
  } catch (err) {
    console.error('[dailyCollections:list]', err);
    return res.status(500).json({ error: 'Failed to fetch daily collections' });
  }
});

// ─── GET /api/daily-collections/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const collection = await prisma.dailyCollection.findUnique({
      where: { id: req.params.id },
      include: {
        staff: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicle_number: true, vehicle_name: true } },
        waybills: { include: { payment: true } }
      }
    });
    if (!collection) return res.status(404).json({ error: 'Record not found' });
    return res.status(200).json({ collection });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch daily collection' });
  }
});

// ─── POST /api/daily-collections ───────────────────────────────────────────────
router.post('/', requireRole('admin', 'staff'), [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('staff_id').notEmpty().withMessage('Staff is required'),
  body('vehicle_id').notEmpty().withMessage('Vehicle is required'),
  body('route').trim().notEmpty().withMessage('Route is required'),
  body('start_km').isInt({ min: 0 }).withMessage('Start KM must be 0 or more'),
  body('end_km').isInt({ min: 0 }).withMessage('End KM must be 0 or more'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { date, staff_id, vehicle_id, route, waybill_ids } = req.body;

  const calculated = calculateFields(req.body);

  try {
    const record = await prisma.dailyCollection.create({
      data: {
        date: new Date(date),
        staff_id,
        vehicle_id,
        route: route.trim(),
        ...calculated,
        ...(waybill_ids && waybill_ids.length > 0 && {
          waybills: {
            connect: waybill_ids.map(id => ({ id }))
          }
        })
      },
      include: {
        staff: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicle_number: true, vehicle_name: true } },
        waybills: { include: { payment: true } }
      }
    });

    return res.status(201).json({ message: 'Daily collection recorded successfully', collection: record });
  } catch (err) {
    console.error('[dailyCollections:create]', err);
    return res.status(500).json({ error: 'Failed to create daily collection record' });
  }
});

// ─── PUT /api/daily-collections/:id ────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'staff'), [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('staff_id').notEmpty().withMessage('Staff is required'),
  body('vehicle_id').notEmpty().withMessage('Vehicle is required'),
  body('route').trim().notEmpty().withMessage('Route is required'),
  body('start_km').isInt({ min: 0 }).withMessage('Start KM must be 0 or more'),
  body('end_km').isInt({ min: 0 }).withMessage('End KM must be 0 or more'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { date, staff_id, vehicle_id, route, waybill_ids } = req.body;
  const calculated = calculateFields(req.body);

  try {
    const record = await prisma.dailyCollection.update({
      where: { id: req.params.id },
      data: {
        date: new Date(date),
        staff_id,
        vehicle_id,
        route: route.trim(),
        ...calculated,
        waybills: {
          set: (waybill_ids || []).map(id => ({ id }))
        }
      },
      include: {
        staff: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicle_number: true, vehicle_name: true } },
        waybills: { include: { payment: true } }
      }
    });

    return res.status(200).json({ message: 'Daily collection updated successfully', collection: record });
  } catch (err) {
    console.error('[dailyCollections:update]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    return res.status(500).json({ error: 'Failed to update daily collection record' });
  }
});

// ─── DELETE /api/daily-collections/:id ─────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    await prisma.dailyCollection.delete({
      where: { id: req.params.id }
    });
    return res.status(200).json({ message: 'Daily collection deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    return res.status(500).json({ error: 'Failed to delete daily collection record' });
  }
});

module.exports = router;
