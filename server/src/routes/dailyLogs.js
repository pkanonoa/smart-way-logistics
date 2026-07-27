const express = require('express');
const { query, body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();
router.use(authenticateToken);

// Helper to get start of week (Monday)
function getStartOfWeek(dateStr) {
  const date = dayjs(dateStr);
  const day = date.day(); // 0 is Sunday, 1 is Monday
  const diff = date.date() - day + (day === 0 ? -6 : 1);
  return date.date(diff).startOf('day').toDate();
}

function getEndOfWeek(dateStr) {
  const date = dayjs(dateStr);
  const day = date.day();
  const diff = date.date() - day + (day === 0 ? -6 : 1) + 6; // Sunday
  return date.date(diff).endOf('day').toDate();
}

// ─── GET /api/daily-logs ───────────────────────────────────────────────────────
// Fetches all staff activity for a specific date
router.get('/', [
  query('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { date } = req.query;
  const startOfDay = dayjs(date).startOf('day').toDate();
  const endOfDay = dayjs(date).endOf('day').toDate();
  const dateString = dayjs(date).format('YYYY-MM-DD'); // For exact matching

  try {
    // Get all staff
    const staffList = await prisma.staff.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true, phone: true }
    });

    // 1. Attendance for the day
    const attendances = await prisma.attendance.findMany({
      where: { date: startOfDay }
    });
    const attMap = {};
    attendances.forEach(a => { attMap[a.staff_id] = a.status; });

    // 2. Waybills for the day (assigned to staff)
    const waybills = await prisma.waybill.findMany({
      where: {
        booking_date: { gte: startOfDay, lte: endOfDay }
      },
      include: { assigned_staff: { select: { id: true } } }
    });
    const wbMap = {};
    waybills.forEach(wb => {
      wb.assigned_staff.forEach(c => {
        if (!wbMap[c.id]) wbMap[c.id] = [];
        wbMap[c.id].push(wb.waybill_number);
      });
    });

    // 3. Advances given on the day
    const advances = await prisma.staffAdvance.findMany({
      where: { date: startOfDay }
    });
    const advMap = {};
    advances.forEach(adv => {
      if (!advMap[adv.staff_id]) advMap[adv.staff_id] = 0;
      advMap[adv.staff_id] += parseFloat(adv.amount);
    });

    // 4. Daily Earnings (Salary adjustments with reason containing the date)
    const earnings = await prisma.salaryAdjustment.findMany({
      where: {
        reason: { startsWith: `Daily Earning: ${dateString}` }
      },
      include: { salary_week: { select: { staff_id: true } } }
    });
    const earnMap = {};
    earnings.forEach(e => {
      const sId = e.salary_week.staff_id;
      if (!earnMap[sId]) earnMap[sId] = 0;
      earnMap[sId] += parseFloat(e.amount);
    });

    // Combine into a neat array
    const logs = staffList.map(st => ({
      staff_id: st.id,
      name: st.name,
      role: st.role,
      phone: st.phone,
      attendance: attMap[st.id] || 'Not Marked',
      waybills: wbMap[st.id] || [],
      advances_total: advMap[st.id] || 0,
      earnings_total: earnMap[st.id] || 0,
    }));

    res.json({ logs, date: dateString });
  } catch (err) {
    console.error('[dailyLogs:get]', err);
    res.status(500).json({ error: 'Failed to fetch daily logs' });
  }
});

// ─── POST /api/daily-logs/earnings ─────────────────────────────────────────────
// Records a daily earning for a staff member, creating/updating the SalaryWeek
router.post('/earnings', requireRole('admin', 'accountant'), [
  body('staff_id').notEmpty(),
  body('date').isISO8601(),
  body('amount').isFloat({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { staff_id, date, amount } = req.body;
  const dateString = dayjs(date).format('YYYY-MM-DD');
  
  const weekStart = getStartOfWeek(date);
  const weekEnd = getEndOfWeek(date);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create the salary week for this date
      let week = await tx.salaryWeek.findUnique({
        where: {
          staff_id_week_start_date: {
            staff_id,
            week_start_date: weekStart
          }
        }
      });

      if (!week) {
        week = await tx.salaryWeek.create({
          data: {
            staff_id,
            week_start_date: weekStart,
            week_end_date: weekEnd,
            base_amount: 0
          }
        });
      }

      // 2. Check if a daily earning already exists for this date, to prevent duplicates / allow updates
      const existing = await tx.salaryAdjustment.findFirst({
        where: {
          salary_week_id: week.id,
          reason: { startsWith: `Daily Earning: ${dateString}` }
        }
      });

      let adjustment;
      if (existing) {
        // Update
        if (parseFloat(amount) === 0) {
           // If amount is 0, just delete it to clean up
           await tx.salaryAdjustment.delete({ where: { id: existing.id } });
           return { message: 'Daily earning removed' };
        } else {
          adjustment = await tx.salaryAdjustment.update({
            where: { id: existing.id },
            data: { amount: parseFloat(amount) }
          });
        }
      } else {
        // Create new
        if (parseFloat(amount) > 0) {
          adjustment = await tx.salaryAdjustment.create({
            data: {
              salary_week_id: week.id,
              type: 'incentive', // Treat daily earning as incentive addition to week
              amount: parseFloat(amount),
              reason: `Daily Earning: ${dateString}`,
              added_by: req.user.id
            }
          });
        }
      }

      return { message: 'Daily earning recorded', adjustment };
    });

    res.json(result);
  } catch (err) {
    console.error('[dailyLogs:earnings]', err);
    res.status(500).json({ error: 'Failed to record daily earning' });
  }
});

module.exports = router;
