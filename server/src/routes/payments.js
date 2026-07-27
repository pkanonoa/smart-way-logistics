const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── GET /api/payments/pending ────────────────────────────────────────────────
router.get('/pending', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ['pending', 'credit'] }
      },
      include: {
        waybill: {
          include: {
            assigned_staff: { select: { id: true, name: true, phone: true } }
          }
        }
      },
      orderBy: {
        due_date: 'asc' // Oldest due first
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formattedPayments = payments.map(payment => {
      let daysOverdue = 0;
      if (payment.due_date) {
        const dueDate = new Date(payment.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = today - dueDate;
        if (diffTime > 0) {
          daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      return {
        ...payment,
        days_overdue: daysOverdue
      };
    });

    return res.status(200).json({ payments: formattedPayments });
  } catch (err) {
    console.error('[payments:pending]', err);
    return res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// ─── GET /api/senders/:id/payments ────────────────────────────────────────────
// In this schema, assigned_staff (Staff) act as the delivery team of the waybills
router.get('/senders/:id/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        waybill: {
          assigned_staff: {
            some: { id: req.params.id }
          }
        }
      },
      include: {
        waybill: true
      },
      orderBy: {
        waybill: {
          booking_date: 'desc'
        }
      }
    });

    return res.status(200).json({ payments });
  } catch (err) {
    console.error('[payments:sender-history]', err);
    return res.status(500).json({ error: 'Failed to fetch sender payment history' });
  }
});

// ─── PUT /api/payments/:id/settle ─────────────────────────────────────────────
router.put('/:id/settle', [
  body('payment_method').trim().notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { payment_method } = req.body;

  try {
    const existing = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) return res.status(404).json({ error: 'Payment not found' });

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'paid',
        payment_method,
        paid_date: new Date(),
        due_date: null
      },
      include: {
        waybill: {
          include: {
            assigned_staff: { select: { id: true, name: true } }
          }
        }
      }
    });

    return res.status(200).json({ message: 'Payment settled successfully', payment });
  } catch (err) {
    console.error('[payments:settle]', err);
    return res.status(500).json({ error: 'Failed to settle payment' });
  }
});

module.exports = router;
