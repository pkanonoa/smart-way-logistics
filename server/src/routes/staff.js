const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All Staff routes require authentication
router.use(authenticateToken);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

const StaffValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Phone must be a valid 10-digit number'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('role').isIn(['driver', 'staff', 'office_staff', 'other']).withMessage('Invalid role'),
  body('role_other_specify')
    .if((value, { req }) => req.body.role === 'other')
    .trim()
    .notEmpty()
    .withMessage('Please specify the role'),
];

// ─── GET /api/Staffs ───────────────────────────────────────────────────────
// All authenticated roles can view. Supports ?search= for name or mobile.

router.get(
  '/',
  [query('search').optional().trim()],
  async (req, res) => {
    const { search } = req.query;

    try {
      const where = search
        ? {
            OR: [
              { name:   { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {};

      const staffs = await prisma.staff.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return res.status(200).json({ staffs });
    } catch (err) {
      console.error('[Staffs:list]', err);
      return res.status(500).json({ error: 'Failed to fetch Staffs' });
    }
  }
);

// ─── GET /api/Staffs/:id ───────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
    });

    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    return res.status(200).json({ staff });
  } catch (err) {
    console.error('[Staffs:get]', err);
    return res.status(500).json({ error: 'Failed to fetch Staff' });
  }
});

// ─── POST /api/Staffs ──────────────────────────────────────────────────────
// Admin and staff only

router.post(
  '/',
  requireRole('admin', 'staff'),
  StaffValidators,
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { name, phone, address, role, role_other_specify } = req.body;

    try {
      // Check phone uniqueness against other records
      const conflict = await prisma.staff.findUnique({ where: { phone } });
      if (conflict) {
        return res.status(409).json({ error: 'A Staff with this phone number already exists' });
      }

      const staff = await prisma.staff.create({
        data: {
          name,
          phone,
          address,
          role: role || 'staff',
          role_other_specify: role === 'other' ? (role_other_specify || null) : null,
        },
      });

      return res.status(201).json({ message: 'Staff created', staff });
    } catch (err) {
      console.error('[Staffs:create]', err);
      return res.status(500).json({ error: 'Failed to create Staff' });
    }
  }
);

// ─── PUT /api/Staffs/:id ───────────────────────────────────────────────────
// Admin and staff only

router.put(
  '/:id',
  requireRole('admin', 'staff'),
  StaffValidators,
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { name, phone, address, role, role_other_specify } = req.body;

    try {
      // Check phone uniqueness against other records
      const conflict = await prisma.staff.findFirst({
        where: { phone, NOT: { id: req.params.id } },
      });
      if (conflict) {
        return res.status(409).json({ error: 'Phone number already used by another Staff' });
      }

      const staff = await prisma.staff.update({
        where: { id: req.params.id },
        data: {
          name,
          phone,
          address,
          role: role || 'staff',
          role_other_specify: role === 'other' ? (role_other_specify || null) : null,
        },
      });

      return res.status(200).json({ message: 'Staff updated', staff });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Staff not found' });
      }
      console.error('[Staffs:update]', err);
      return res.status(500).json({ error: 'Failed to update Staff' });
    }
  }
);

// ─── DELETE /api/Staffs/:id ────────────────────────────────────────────────
// Admin only

router.delete(
  '/:id',
  requireRole('admin'),
  async (req, res) => {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { assigned_waybills: true } } },
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });
      if (staff._count.assigned_waybills > 0) {
        return res.status(409).json({ error: 'Cannot delete staff because they are assigned to existing waybills.' });
      }

      await prisma.staff.delete({ where: { id: req.params.id } });
      return res.status(200).json({ message: 'Staff deleted' });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Staff not found' });
      }
      console.error('[Staffs:delete]', err);
      return res.status(500).json({ error: 'Failed to delete Staff' });
    }
  }
);

module.exports = router;
