const express = require('express');
const { body, query, validationResult } = require('express-validator');
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

// GET /api/attendance?staff_id=&date=
router.get('/', requireRole('admin', 'staff'), async (req, res) => {
  const { staff_id, date, month, year } = req.query;

  try {
    const where = {};
    if (staff_id) where.staff_id = staff_id;
    if (date) {
      where.date = new Date(date);
    } else if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { staff: { select: { name: true, role: true } } }
    });

    res.json({ attendance });
  } catch (err) {
    console.error('[Attendance:get]', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance
// Upsert attendance for a staff member on a specific date
router.post(
  '/',
  requireRole('admin', 'staff'),
  [
    body('staff_id').trim().notEmpty().withMessage('Staff ID is required'),
    body('date').isISO8601().toDate().withMessage('Invalid date'),
    body('status').isIn(['present', 'absent', 'half_day']).withMessage('Invalid status')
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    const { staff_id, date, status } = req.body;

    try {
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      const attendance = await prisma.attendance.upsert({
        where: {
          staff_id_date: { staff_id, date: attendanceDate }
        },
        update: { status },
        create: { staff_id, date: attendanceDate, status }
      });

      res.status(200).json({ message: 'Attendance recorded', attendance });
    } catch (err) {
      console.error('[Attendance:post]', err);
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  }
);

module.exports = router;
