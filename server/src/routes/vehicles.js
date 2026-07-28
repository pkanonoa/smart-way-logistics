const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

const VehicleValidators = [
  body('vehicle_number').trim().notEmpty().withMessage('Vehicle number is required'),
  body('vehicle_name').optional({ checkFalsy: true }).trim(),
  body('insurance_expiry').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date'),
  body('rc_expiry').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date'),
  body('pollution_expiry').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date'),
  body('last_service_date').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date'),
];

// GET /api/vehicles
router.get('/', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { q } = req.query;
    const where = {};
    if (q) {
      where.OR = [
        { vehicle_number: { contains: q, mode: 'insensitive' } },
        { vehicle_name: { contains: q, mode: 'insensitive' } },
      ];
    }
    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { vehicle_number: 'asc' },
    });

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const enriched = vehicles.map(v => {
      const expiring = [];
      const checkExpiry = (date, name) => {
        if (!date) return;
        const diffDays = Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) expiring.push(`${name} in ${diffDays} days`);
        if (diffDays < 0) expiring.push(`${name} EXPIRED`);
      };
      
      checkExpiry(v.insurance_expiry, 'Insurance');
      checkExpiry(v.rc_expiry, 'RC');
      checkExpiry(v.pollution_expiry, 'Pollution');

      return {
        ...v,
        is_expiring: expiring.length > 0,
        expiring_warnings: expiring
      };
    });

    res.json({ vehicles: enriched });
  } catch (err) {
    console.error('[Vehicles:get]', err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ vehicle });
  } catch (err) {
    console.error('[Vehicles:getById]', err);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// POST /api/vehicles
router.post('/', requireRole('admin', 'staff'), VehicleValidators, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const { vehicle_number, vehicle_name, insurance_expiry, rc_expiry, pollution_expiry, last_service_date } = req.body;
  try {
    const conflict = await prisma.vehicle.findUnique({ where: { vehicle_number } });
    if (conflict) return res.status(409).json({ error: 'Vehicle number already exists' });
    const vehicle = await prisma.vehicle.create({
      data: { vehicle_number, vehicle_name: vehicle_name || null, insurance_expiry, rc_expiry, pollution_expiry, last_service_date }
    });
    res.status(201).json({ vehicle });
  } catch (err) {
    console.error('[Vehicles:create]', err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// PUT /api/vehicles/:id
router.put('/:id', requireRole('admin', 'staff'), VehicleValidators, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const { vehicle_number, vehicle_name, insurance_expiry, rc_expiry, pollution_expiry, last_service_date } = req.body;
  try {
    const conflict = await prisma.vehicle.findFirst({
      where: { vehicle_number, NOT: { id: req.params.id } }
    });
    if (conflict) return res.status(409).json({ error: 'Vehicle number already exists' });
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { vehicle_number, vehicle_name: vehicle_name || null, insurance_expiry, rc_expiry, pollution_expiry, last_service_date }
    });
    res.json({ vehicle });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Vehicle not found' });
    console.error('[Vehicles:update]', err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Vehicle not found' });
    console.error('[Vehicles:delete]', err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

module.exports = router;
