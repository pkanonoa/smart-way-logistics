const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// ─── Helpers to Compute Balances ──────────────────────────────────────────────

function computeWeekFinancials(week) {
  const base_amount = Number(week.base_amount);
  
  let total_incentives = 0;
  let total_deductions = 0;
  let total_paid = 0;

  for (const adj of week.adjustments || []) {
    const amt = Number(adj.amount);
    if (adj.type === 'incentive' || adj.type === 'bonus') total_incentives += amt;
    else total_deductions += amt; // deduction, advance_recovery, other
  }

  for (const pay of week.payments || []) {
    total_paid += Number(pay.amount);
  }

  const amount_due = base_amount + total_incentives - total_deductions;
  const balance = amount_due - total_paid;

  let status = 'due';
  if (balance <= 0 && amount_due > 0) status = 'paid'; // exactly paid or overpaid
  else if (balance <= 0 && amount_due <= 0 && total_paid > 0) status = 'paid';
  else if (balance <= 0 && amount_due <= 0) status = 'paid'; // zero owed, zero paid -> practically done
  else if (total_paid > 0) status = 'partial';

  return {
    ...week,
    base_amount,
    computed: {
      amount_due,
      total_paid,
      balance,
      status
    }
  };
}

// ─── POST /api/salaries/generate-draft ─────────────────────────────────────────

router.post(
  '/generate-draft',
  requireRole('admin', 'accountant'),
  [
    body('week_start_date').isISO8601().toDate(),
    body('week_end_date').isISO8601().toDate()
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    const { week_start_date, week_end_date } = req.body;

    try {
      // Find all staff
      const allStaff = await prisma.staff.findMany({
        orderBy: { name: 'asc' }
      });

      // Find existing weeks for this start_date
      const existingWeeks = await prisma.salaryWeek.findMany({
        where: { week_start_date }
      });
      const existingStaffIds = new Set(existingWeeks.map(w => w.staff_id));

      const drafts = [];
      for (const st of allStaff) {
        if (existingStaffIds.has(st.id)) continue; // skip

        // Find most recent week to suggest base_amount
        const lastWeek = await prisma.salaryWeek.findFirst({
          where: { staff_id: st.id },
          orderBy: { week_start_date: 'desc' }
        });

        drafts.push({
          staff_id: st.id,
          name: st.name,
          role: st.role,
          suggested_base_amount: lastWeek ? Number(lastWeek.base_amount) : 0
        });
      }

      res.json({ drafts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate drafts' });
    }
  }
);

// ─── POST /api/salaries/generate-confirm ───────────────────────────────────────

router.post(
  '/generate-confirm',
  requireRole('admin', 'accountant'),
  [
    body('week_start_date').isISO8601().toDate(),
    body('week_end_date').isISO8601().toDate(),
    body('rows').isArray()
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    const { week_start_date, week_end_date, rows } = req.body;

    try {
      let created = 0;
      for (const row of rows) {
        // Skip if exists
        const exists = await prisma.salaryWeek.findUnique({
          where: { staff_id_week_start_date: { staff_id: row.staff_id, week_start_date } }
        });
        if (exists) continue;

        await prisma.salaryWeek.create({
          data: {
            staff_id: row.staff_id,
            week_start_date,
            week_end_date,
            base_amount: row.base_amount
          }
        });
        created++;
      }
      res.json({ message: `Created ${created} salary weeks.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to confirm salary weeks' });
    }
  }
);

// ─── GET /api/salaries ─────────────────────────────────────────────────────────
// Global summary for all staff

router.get('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const allStaff = await prisma.staff.findMany({
      include: {
        salary_weeks: {
          include: { adjustments: true, payments: true }
        }
      }
    });

    const summary = allStaff.map(st => {
      let total_balance = 0;
      st.salary_weeks.forEach(w => {
        const computed = computeWeekFinancials(w).computed;
        total_balance += computed.balance;
      });

      return {
        id: st.id,
        name: st.name,
        role: st.role,
        phone: st.phone,
        total_balance
      };
    });

    summary.sort((a, b) => b.total_balance - a.total_balance);

    res.json({ staff: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch global salaries' });
  }
});

// ─── GET /api/salaries/staff/:staff_id ─────────────────────────────────────────

router.get('/staff/:staff_id', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const weekFilter = {};
    if (start_date) weekFilter.week_start_date = { gte: new Date(start_date) };
    if (end_date) weekFilter.week_end_date = { lte: new Date(end_date) };

    const staff = await prisma.staff.findUnique({
      where: { id: req.params.staff_id },
      include: {
        salary_weeks: {
          where: Object.keys(weekFilter).length > 0 ? weekFilter : undefined,
          include: {
            adjustments: { orderBy: { created_at: 'asc' } },
            payments: { orderBy: { payment_date: 'asc' } }
          },
          orderBy: { week_start_date: 'desc' }
        }
      }
    });

    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    let total_balance = 0;
    const computedWeeks = staff.salary_weeks.map(w => {
      const cWeek = computeWeekFinancials(w);
      total_balance += cWeek.computed.balance;
      return cWeek;
    });

    res.json({
      staff: { id: staff.id, name: staff.name, role: staff.role },
      total_balance,
      weeks: computedWeeks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff salary' });
  }
});

// ─── PUT /api/salaries/weeks/:id/base ──────────────────────────────────────────

router.put(
  '/weeks/:id/base',
  requireRole('admin', 'accountant'),
  [body('base_amount').isFloat({ min: 0 })],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const week = await prisma.salaryWeek.update({
        where: { id: req.params.id },
        data: { base_amount: req.body.base_amount }
      });
      res.json({ week });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update base amount' });
    }
  }
);

// ─── DELETE /api/salaries/weeks/:id ────────────────────────────────────────────

router.delete('/weeks/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const week = await prisma.salaryWeek.findUnique({
      where: { id: req.params.id },
      include: { payments: true }
    });
    if (!week) return res.status(404).json({ error: 'Salary week not found' });
    if (week.payments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete week because payments have been made.' });
    }
    await prisma.salaryWeek.delete({ where: { id: req.params.id } });
    res.json({ message: 'Salary week deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete salary week' });
  }
});

// ─── POST /api/salaries/weeks/:id/adjustments ──────────────────────────────────

router.post(
  '/weeks/:id/adjustments',
  requireRole('admin', 'accountant'),
  [
    body('type').isIn(['incentive', 'bonus', 'deduction', 'advance_recovery', 'other']),
    body('amount').isFloat({ min: 0.01 }),
    body('reason').trim().notEmpty().withMessage('Reason is required'),
    body('advance_id').optional().isUUID()
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    
    try {
      const week = await prisma.salaryWeek.findUnique({ where: { id: req.params.id } });
      if (!week) return res.status(404).json({ error: 'Salary week not found' });

      // Transaction to create adjustment and update advance if provided
      const adj = await prisma.$transaction(async (tx) => {
        const adjustment = await tx.salaryAdjustment.create({
          data: {
            salary_week_id: week.id,
            type: req.body.type,
            amount: req.body.amount,
            reason: req.body.reason,
            added_by: req.user.id,
            advance_id: req.body.advance_id || null
          }
        });

        if (req.body.advance_id && req.body.type === 'advance_recovery') {
          await tx.staffAdvance.update({
            where: { id: req.body.advance_id },
            data: { is_recovered: true }
          });
        }
        
        return adjustment;
      });

      res.json({ adjustment: adj });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add adjustment' });
    }
  }
);

// ─── PUT /api/salaries/adjustments/:id ───────────────────────────────────────

router.put(
  '/adjustments/:id',
  requireRole('admin', 'accountant'),
  [
    body('amount').isFloat({ min: 0.01 }),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const adj = await prisma.salaryAdjustment.findUnique({ where: { id: req.params.id } });
      if (!adj) return res.status(404).json({ error: 'Adjustment not found' });

      // If it's an advance_recovery, the amount should technically not exceed the advance amount, 
      // but to keep it simple, we just update the adjustment amount.
      const updated = await prisma.salaryAdjustment.update({
        where: { id: req.params.id },
        data: {
          amount: req.body.amount,
          reason: req.body.reason !== undefined ? req.body.reason : adj.reason
        }
      });
      res.json({ adjustment: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update adjustment' });
    }
  }
);

// ─── DELETE /api/salaries/adjustments/:id ──────────────────────────────────────

router.delete('/adjustments/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const adj = await prisma.salaryAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adj) return res.status(404).json({ error: 'Adjustment not found' });

    // Using a transaction to delete adjustment and un-recover advance
    await prisma.$transaction(async (tx) => {
      await tx.salaryAdjustment.delete({ where: { id: req.params.id } });
      if (adj.advance_id) {
        await tx.staffAdvance.update({
          where: { id: adj.advance_id },
          data: { is_recovered: false }
        });
      }
    });

    res.json({ message: 'Adjustment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete adjustment' });
  }
});

// ─── DELETE /api/salaries/payments/:id ─────────────────────────────────────────

router.delete('/payments/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await prisma.salaryPayment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ─── POST /api/salaries/weeks/:id/pay ──────────────────────────────────────────

router.post(
  '/weeks/:id/pay',
  requireRole('admin', 'accountant'),
  [
    body('amount').isFloat({ min: 0.01 }),
    body('payment_date').isISO8601().toDate(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const week = await prisma.salaryWeek.findUnique({
        where: { id: req.params.id },
        include: { adjustments: true, payments: true }
      });
      if (!week) return res.status(404).json({ error: 'Salary week not found' });

      const computed = computeWeekFinancials(week).computed;
      const amountToPay = Number(req.body.amount);

      // We allow a tiny tolerance due to floating point, but typically keep it exact
      if (amountToPay > (computed.balance + 0.01)) {
        return res.status(400).json({
          error: `Payment amount (₹${amountToPay}) exceeds the remaining balance due (₹${computed.balance.toFixed(2)}). Please adjust the payment amount.`
        });
      }

      const pay = await prisma.salaryPayment.create({
        data: {
          salary_week_id: week.id,
          amount: req.body.amount,
          payment_date: req.body.payment_date,
          notes: req.body.notes || null,
          paid_by: req.user.id
        }
      });
      res.json({ payment: pay });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }
);

// ─── Advances ──────────────────────────────────────────────────────────────────

router.get('/advances/staff/:staff_id', async (req, res) => {
  try {
    const advances = await prisma.staffAdvance.findMany({
      where: { staff_id: req.params.staff_id },
      orderBy: { date: 'desc' }
    });
    res.json({ advances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch advances' });
  }
});

router.post(
  '/advances/staff/:staff_id',
  requireRole('admin', 'accountant'),
  [
    body('amount').isFloat({ min: 0.01 }),
    body('date').isISO8601().toDate(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const advance = await prisma.staffAdvance.create({
        data: {
          staff_id: req.params.staff_id,
          amount: req.body.amount,
          date: req.body.date,
          reason: req.body.reason,
          added_by: req.user.id
        }
      });
      res.json({ advance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record advance' });
    }
  }
);

router.delete('/advances/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const advance = await prisma.staffAdvance.findUnique({ where: { id: req.params.id } });
    if (!advance) return res.status(404).json({ error: 'Advance not found' });
    
    if (advance.is_recovered) {
      return res.status(400).json({ error: 'Cannot delete an advance that has already been recovered.' });
    }

    await prisma.staffAdvance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Advance deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete advance' });
  }
});

module.exports = router;
