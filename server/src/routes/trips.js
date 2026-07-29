const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logActivity } = require('../lib/logger');

const router = express.Router();
router.use(authenticateToken);

// GET /api/trips/unassigned-groups
router.get('/unassigned-groups', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const unassignedWaybills = await prisma.waybill.findMany({
      where: { daily_collection_id: null },
      orderBy: { booking_date: 'desc' }
    });

    const groupsMap = {};

    unassignedWaybills.forEach(wb => {
      const fromNorm = (wb.from_location || '').trim().toLowerCase();
      const toNorm = (wb.to_location || '').trim().toLowerCase();
      const key = `${fromNorm}_to_${toNorm}`;

      if (!groupsMap[key]) {
        groupsMap[key] = {
          from_location: wb.from_location,
          to_location: wb.to_location,
          waybill_count: 0,
          total_packages: 0,
          waybills: []
        };
      }

      groupsMap[key].waybill_count += 1;
      groupsMap[key].total_packages += parseInt(wb.no_of_packages || 0, 10);
      groupsMap[key].waybills.push({
        id: wb.id,
        waybill_number: wb.waybill_number,
        from_location: wb.from_location,
        to_location: wb.to_location,
        no_of_packages: wb.no_of_packages,
        consignee_name: wb.consignee_name,
        consignee_address: wb.consignee_address,
        grand_total: wb.grand_total,
        payment_mode: wb.payment_mode,
        booking_date: wb.booking_date
      });
    });

    const groups = Object.values(groupsMap);
    return res.json({ groups });
  } catch (err) {
    console.error('[trips:unassigned-groups]', err);
    return res.status(500).json({ error: 'Failed to fetch unassigned groups' });
  }
});

// POST /api/trips/assign
router.post('/assign', requireRole('admin', 'staff'), async (req, res) => {
  const { waybill_ids, staff_id, vehicle_id, date, route, start_km, end_km } = req.body;

  if (!waybill_ids || !Array.isArray(waybill_ids) || waybill_ids.length === 0) {
    return res.status(400).json({ error: 'Waybill IDs are required' });
  }
  if (!staff_id || !vehicle_id || !date || !route) {
    return res.status(400).json({ error: 'Staff ID, vehicle ID, date, and route are required' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const alreadyAssigned = await tx.waybill.findMany({
        where: {
          id: { in: waybill_ids },
          daily_collection_id: { not: null }
        },
        select: { waybill_number: true }
      });

      if (alreadyAssigned.length > 0) {
        const numbers = alreadyAssigned.map(w => w.waybill_number).join(', ');
        throw new Error(`Conflict: Waybills ${numbers} are already assigned to a trip.`);
      }

      const startKmVal = parseInt(start_km || 0, 10);
      const endKmVal = parseInt(end_km || 0, 10);

      const trip = await tx.dailyCollection.create({
        data: {
          date: new Date(date),
          staff_id,
          vehicle_id,
          route: route.trim(),
          start_km: startKmVal,
          end_km: endKmVal,
          total_km: Math.max(0, endKmVal - startKmVal),
          fuel_expense_cash: 0,
          fuel_expense_owner: 0,
          vehicle_rent: 0,
          driver_wage: 0,
          helper_wage: 0,
          advance: 0,
          other_expenses: 0,
          cash_collection: 0,
          upi_collection: 0,
          credit_collection: 0,
          total_collection: 0,
          total_expense: 0,
          balance: 0,
          waybills: {
            connect: waybill_ids.map(id => ({ id }))
          }
        },
        include: {
          waybills: true,
          staff: { select: { name: true } },
          vehicle: { select: { vehicle_number: true } }
        }
      });

      return trip;
    });

    await logActivity(req, 'daily_collection', 'CREATE', result.id, `Bulk-assigned ${waybill_ids.length} waybills to trip for ${result.staff?.name || 'staff'} / ${result.vehicle?.vehicle_number || 'vehicle'} on route ${result.route}`);

    return res.status(201).json({ message: 'Trip assigned successfully', trip: result });
  } catch (err) {
    console.error('[trips:assign]', err);
    if (err.message.startsWith('Conflict:')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to assign trip' });
  }
});

module.exports = router;
