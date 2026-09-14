const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/companies
router.get('/', authenticateToken, requireRole('admin', 'staff', 'accountant', 'viewer'), async (req, res) => {
  try {
    const { search } = req.query;
    let where = {};
    if (search) {
      where = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }
    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// POST /api/companies
router.post('/', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, district, phone, address } = req.body;
    const company = await prisma.company.create({
      data: { name, district, phone, address },
    });
    res.status(201).json(company);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Company with this name already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// GET /api/companies/:id
router.get('/:id', authenticateToken, requireRole('admin', 'staff', 'accountant', 'viewer'), async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
    });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// PUT /api/companies/:id
router.put('/:id', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, district, phone, address } = req.body;
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: { name, district, phone, address },
    });
    res.json(company);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Company with this name already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// GET /api/companies/:id/statement
router.get('/:id/statement', authenticateToken, requireRole('admin', 'accountant', 'viewer'), async (req, res) => {
  try {
    const companyId = req.params.id;
    let { from, to } = req.query;
    
    if (!from || !to) {
      const now = new Date();
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    // Add 1 day to 'to' date to make it inclusive if it's just a YYYY-MM-DD string
    const toDateEnd = new Date(toDate);
    if (typeof to === 'string' && to.length === 10) {
      toDateEnd.setDate(toDateEnd.getDate() + 1);
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, district: true, phone: true, address: true }
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // 1. Calculate Opening Balance prior to fromDate
    const priorWaybills = await prisma.waybill.findMany({
      where: {
        AND: [
          { OR: [{ sender_company_id: companyId }, { receiver_company_id: companyId }] },
          { booking_date: { lt: fromDate } }
        ]
      },
      include: { payment: true },
      orderBy: { booking_date: 'asc' }
    });

    let openingBalance = 0;
    for (const wb of priorWaybills) {
      const isSender = wb.sender_company_id === companyId;
      const isReceiver = wb.receiver_company_id === companyId;
      const amount = Number(wb.grand_total) || 0;
      const pMode = (wb.payment_mode || '').toLowerCase();
      const pStatus = (wb.payment?.status || '').toLowerCase();

      const isLiableForFreight = (isSender && (pMode === 'credit' || pMode === 'paid')) || (isReceiver && pMode === 'topay');
      if (isLiableForFreight) openingBalance -= amount;

      const isPaid = (pMode === 'paid' && isSender) || (pStatus === 'paid');
      if (isLiableForFreight && isPaid) openingBalance += amount;
    }

    // 2. Fetch current period waybills
    const waybills = await prisma.waybill.findMany({
      where: {
        AND: [
          { OR: [{ sender_company_id: companyId }, { receiver_company_id: companyId }] },
          { booking_date: { gte: fromDate, lt: toDateEnd } }
        ]
      },
      include: { 
        payment: true,
        sender_company: { select: { name: true } },
        receiver_company: { select: { name: true } }
      },
      orderBy: { booking_date: 'asc' }
    });

    let totalWeightSent = 0;
    let totalWeightReceived = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let runningBalance = openingBalance;

    let rawTransactions = [];

    for (const wb of waybills) {
      const isSender = wb.sender_company_id === companyId;
      const isReceiver = wb.receiver_company_id === companyId;
      const weight = Number(wb.weight) || 0;
      const amount = Number(wb.grand_total) || 0;
      const pMode = (wb.payment_mode || '').toLowerCase();
      const pStatus = (wb.payment?.status || '').toLowerCase();

      if (isSender) totalWeightSent += weight;
      if (isReceiver) totalWeightReceived += weight;

      const counterpartyName = isSender 
        ? (wb.receiver_company?.name || wb.consignee_name) + ` (${wb.to_location})`
        : (wb.sender_company?.name || wb.consignor_name || 'Consignor') + ` (${wb.from_location})`;

      const directionLabel = isSender ? `To ${counterpartyName}` : `From ${counterpartyName}`;

      // A. Charge / Booking event
      const isLiableForFreight = (isSender && (pMode === 'credit' || pMode === 'paid')) || (isReceiver && pMode === 'topay');
      
      if (isLiableForFreight) {
        rawTransactions.push({
          date: wb.booking_date,
          type: 'booking',
          waybillNumber: wb.waybill_number,
          description: `${wb.waybill_number} - ${directionLabel}`,
          weight,
          debit: amount,
          credit: 0
        });
      }

      // B. Payment / Settlement event
      const isPaid = (pMode === 'paid' && isSender) || (pStatus === 'paid');
      if (isLiableForFreight && isPaid) {
        const payDate = wb.payment?.paid_date || wb.booking_date;
        const payMethod = wb.payment?.payment_method ? ` (${wb.payment.payment_method})` : '';
        rawTransactions.push({
          date: payDate,
          type: 'payment',
          waybillNumber: wb.waybill_number,
          description: `Payment Received - ${wb.waybill_number}${payMethod}`,
          weight: 0,
          debit: 0,
          credit: amount
        });
      }
    }

    // Sort transactions chronologically
    rawTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute running balance & summary totals
    const rows = rawTransactions.map(tx => {
      runningBalance = runningBalance + tx.credit - tx.debit;
      totalDebit += tx.debit;
      totalCredit += tx.credit;
      return {
        ...tx,
        runningBalance
      };
    });

    const summary = {
      totalShipments: waybills.length,
      totalWeightSent,
      totalWeightReceived,
      totalCredit,
      totalDebit,
      openingBalance,
      closingBalance: runningBalance,
      netBalance: runningBalance
    };

    res.json({
      company,
      summary,
      rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

module.exports = router;
