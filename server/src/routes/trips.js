// server/src/routes/trips.js
// Multi-stop Trip model: Trip → Stop[] → StopItem[] → Waybill
//
// Canonical location-match rule (must stay identical to client/src/utils/tripLogic.js):
//   case-insensitive, whitespace-trimmed string equality.
//   role must also match exactly ("pickup" | "drop").

const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logActivity } = require('../lib/logger');

const router = express.Router();
router.use(authenticateToken);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const locMatch = (a, b) =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Full trip include shape reused across queries
const TRIP_INCLUDE = {
  vehicle: { select: { id: true, vehicle_number: true, vehicle_name: true, capacity_kg: true } },
  driver:  { select: { id: true, name: true, role: true } },
  stops: {
    orderBy: { sequence: 'asc' },
    include: {
      items: {
        include: {
          waybill: {
            select: {
              id: true, waybill_number: true, consignee_name: true,
              from_location: true, to_location: true, weight: true,
              status: true, stop_item: { select: { stop: { select: { sequence: true, trip: { select: { id: true } } } } } }
            }
          }
        }
      }
    }
  }
};

// Re-sequence stops after insert/delete (avoids gaps or duplicates)
async function resequenceStops(tx, tripId) {
  const stops = await tx.stop.findMany({
    where: { trip_id: tripId },
    orderBy: { sequence: 'asc' },
    select: { id: true }
  });
  for (let i = 0; i < stops.length; i++) {
    await tx.stop.update({ where: { id: stops[i].id }, data: { sequence: i + 1 } });
  }
}

// ─── GET /api/trips/badge-counts — sidebar badge data ─────────────────────────
// Returns: { unassigned: N, draftTrips: N }
// unassigned = waybills not yet on any trip (stop_item === null)
// draftTrips  = trips in draft or open status

router.get('/badge-counts', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const [unassigned, draftTrips] = await Promise.all([
      prisma.waybill.count({ where: { stop_item: null, status: { not: 'delivered' } } }),
      prisma.trip.count({ where: { status: { in: ['draft', 'in_progress'] } } }),
    ]);
    return res.json({ unassigned, draftTrips });
  } catch (err) {
    console.error('[trips:badge-counts]', err);
    return res.status(500).json({ error: 'Failed to fetch badge counts' });
  }
});

// ─── Legacy endpoints (keep for backward compat) ──────────────────────────────

// GET /api/trips/unassigned-groups  (old AssignTripsPage — kept intact)
router.get('/unassigned-groups', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const unassignedWaybills = await prisma.waybill.findMany({
      where: { daily_collection_id: null, stop_item: null },
      orderBy: { booking_date: 'desc' }
    });

    const groupsMap = {};
    unassignedWaybills.forEach(wb => {
      const fromNorm = (wb.from_location || '').trim().toLowerCase();
      const toNorm   = (wb.to_location   || '').trim().toLowerCase();
      const key = `${fromNorm}_to_${toNorm}`;
      if (!groupsMap[key]) {
        groupsMap[key] = {
          from_location: wb.from_location, to_location: wb.to_location,
          waybill_count: 0, total_packages: 0, waybills: []
        };
      }
      groupsMap[key].waybill_count += 1;
      groupsMap[key].total_packages += parseInt(wb.no_of_packages || 0, 10);
      groupsMap[key].waybills.push({
        id: wb.id, waybill_number: wb.waybill_number,
        from_location: wb.from_location, to_location: wb.to_location,
        no_of_packages: wb.no_of_packages, consignee_name: wb.consignee_name,
        consignee_address: wb.consignee_address, grand_total: wb.grand_total,
        payment_mode: wb.payment_mode, booking_date: wb.booking_date
      });
    });

    return res.json({ groups: Object.values(groupsMap) });
  } catch (err) {
    console.error('[trips:unassigned-groups]', err);
    return res.status(500).json({ error: 'Failed to fetch unassigned groups' });
  }
});

// POST /api/trips/assign  (old AssignTripsPage — kept intact)
router.post('/assign', requireRole('admin', 'staff'), async (req, res) => {
  const { waybill_ids, staff_id, helper_id, vehicle_id, date, route, start_km, end_km } = req.body;
  if (!waybill_ids?.length) return res.status(400).json({ error: 'Waybill IDs are required' });
  if (!staff_id || !vehicle_id || !date || !route) return res.status(400).json({ error: 'Staff ID, vehicle ID, date, and route are required' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const alreadyAssigned = await tx.waybill.findMany({
        where: { id: { in: waybill_ids }, daily_collection_id: { not: null } },
        select: { waybill_number: true }
      });
      if (alreadyAssigned.length > 0) throw new Error(`Conflict: Waybills ${alreadyAssigned.map(w => w.waybill_number).join(', ')} are already assigned.`);

      const startKmVal = parseInt(start_km || 0, 10);
      const endKmVal   = parseInt(end_km   || 0, 10);

      return tx.dailyCollection.create({
        data: {
          date: new Date(date), staff_id, helper_id: helper_id || null, vehicle_id,
          route: route.trim(), start_km: startKmVal, end_km: endKmVal,
          total_km: Math.max(0, endKmVal - startKmVal),
          fuel_expense_cash: 0, fuel_expense_owner: 0, vehicle_rent: 0,
          driver_wage: 0, helper_wage: 0, advance: 0, other_expenses: 0,
          cash_collection: 0, upi_collection: 0, credit_collection: 0,
          total_collection: 0, total_expense: 0, balance: 0,
          waybills: { connect: waybill_ids.map(id => ({ id })) }
        },
        include: {
          waybills: true,
          staff:   { select: { name: true } },
          helper:  { select: { name: true } },
          vehicle: { select: { vehicle_number: true } }
        }
      });
    });

    await logActivity(req, 'daily_collection', 'CREATE', result.id,
      `Bulk-assigned ${waybill_ids.length} waybills to trip for ${result.staff?.name} / ${result.vehicle?.vehicle_number} on route ${result.route}`);
    return res.status(201).json({ message: 'Trip assigned successfully', trip: result });
  } catch (err) {
    console.error('[trips:assign]', err);
    if (err.message.startsWith('Conflict:')) return res.status(400).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to assign trip' });
  }
});

// ─── New Trip Builder Endpoints ────────────────────────────────────────────────

// GET /api/trips/badge-counts
router.get('/badge-counts', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const [unassigned, draftTrips] = await Promise.all([
      prisma.waybill.count({ where: { daily_collection_id: null, stop_item: null } }),
      prisma.trip.count({ where: { status: 'draft' } })
    ]);
    return res.json({ unassigned, draftTrips });
  } catch (err) {
    console.error('[trips:badge-counts]', err);
    return res.status(500).json({ error: 'Failed to fetch badge counts' });
  }
});

// GET /api/trips/unassigned-waybills?district=
router.get('/unassigned-waybills', requireRole('admin', 'staff'), async (req, res) => {
  const { district } = req.query;
  try {
    // Unassigned = no DailyCollection AND no StopItem
    const waybills = await prisma.waybill.findMany({
      where: {
        daily_collection_id: null,
        stop_item: null,
        ...(district ? {
          OR: [
            { from_location: { contains: district, mode: 'insensitive' } },
            { to_location:   { contains: district, mode: 'insensitive' } }
          ]
        } : {})
      },
      orderBy: { booking_date: 'desc' },
      select: {
        id: true, waybill_number: true, consignor_name: true, consignee_name: true,
        from_location: true, to_location: true, weight: true,
        no_of_packages: true, grand_total: true, payment_mode: true, booking_date: true
      }
    });
    return res.json({ waybills });
  } catch (err) {
    console.error('[trips:unassigned-waybills]', err);
    return res.status(500).json({ error: 'Failed to fetch unassigned waybills' });
  }
});

// GET /api/trips  (list)
router.get('/', requireRole('admin', 'staff'), async (req, res) => {
  const { district, status, date } = req.query;
  try {
    const trips = await prisma.trip.findMany({
      where: {
        ...(district ? { district: { contains: district, mode: 'insensitive' } } : {}),
        ...(status   ? { status } : {}),
        ...(date     ? { trip_date: new Date(date) } : {})
      },
      orderBy: { trip_date: 'desc' },
      include: {
        vehicle: { select: { vehicle_number: true, vehicle_name: true, capacity_kg: true } },
        driver:  { select: { name: true } },
        _count:  { select: { stops: true } }
      }
    });
    return res.json({ trips });
  } catch (err) {
    console.error('[trips:list]', err);
    return res.status(500).json({ error: 'Failed to list trips' });
  }
});

// POST /api/trips  (create)
router.post('/', requireRole('admin', 'staff'), async (req, res) => {
  const { vehicle_id, driver_id, trip_date, district } = req.body;
  if (!vehicle_id || !driver_id || !trip_date || !district) {
    return res.status(400).json({ error: 'vehicle_id, driver_id, trip_date, and district are required' });
  }
  try {
    const trip = await prisma.trip.create({
      data: { vehicle_id, driver_id, trip_date: new Date(trip_date), district: district.trim(), status: 'draft' },
      include: TRIP_INCLUDE
    });
    await logActivity(req, 'trip', 'CREATE', trip.id, `Created trip for ${trip.driver.name} on ${trip_date} in ${district}`);
    return res.status(201).json({ trip });
  } catch (err) {
    console.error('[trips:create]', err);
    return res.status(500).json({ error: 'Failed to create trip' });
  }
});

// GET /api/trips/:id
router.get('/:id', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id }, include: TRIP_INCLUDE });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    return res.json({ trip });
  } catch (err) {
    console.error('[trips:get]', err);
    return res.status(500).json({ error: 'Failed to get trip' });
  }
});

// PUT /api/trips/:id  (update header)
router.put('/:id', requireRole('admin', 'staff'), async (req, res) => {
  const { vehicle_id, driver_id, trip_date, district, status } = req.body;
  try {
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...(vehicle_id ? { vehicle_id } : {}),
        ...(driver_id  ? { driver_id  } : {}),
        ...(trip_date  ? { trip_date: new Date(trip_date) } : {}),
        ...(district   ? { district: district.trim() } : {}),
        ...(status     ? { status } : {})
      },
      include: TRIP_INCLUDE
    });
    return res.json({ trip });
  } catch (err) {
    console.error('[trips:update]', err);
    return res.status(500).json({ error: 'Failed to update trip' });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    // Cascade via Prisma: stops + items deleted automatically
    await prisma.trip.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Trip deleted' });
  } catch (err) {
    console.error('[trips:delete]', err);
    return res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// POST /api/trips/:id/add-waybill
// Merge-by-location rule (canonical — must stay identical to client/src/utils/tripLogic.js):
//   case-insensitive, whitespace-trimmed string equality.
router.post('/:id/add-waybill', requireRole('admin', 'staff'), async (req, res) => {
  const { waybillId, weight } = req.body;
  if (!waybillId) return res.status(400).json({ error: 'waybillId is required' });

  try {
    const waybill = await prisma.waybill.findUnique({
      where: { id: waybillId },
      select: { id: true, from_location: true, to_location: true, weight: true, stop_item: true }
    });
    if (!waybill) return res.status(404).json({ error: 'Waybill not found' });
    if (waybill.stop_item) return res.status(409).json({ error: 'Waybill already assigned to a trip' });

    const itemWeight = weight != null ? parseFloat(weight) : parseFloat(waybill.weight || 0);
    const pickupLoc  = waybill.from_location;
    const dropLoc    = waybill.to_location;

    const trip = await prisma.$transaction(async (tx) => {
      // Load existing stops
      const stops = await tx.stop.findMany({
        where: { trip_id: req.params.id },
        orderBy: { sequence: 'asc' }
      });

      // Helper: find or create a stop for a given (location, role)
      async function findOrCreateStop(location, role) {
        const existing = stops.find(
          s => s.role === role && locMatch(s.location, location)
        );
        if (existing) return existing;

        // Determine where to insert
        if (role === 'pickup') {
          const firstDrop = stops.find(s => s.role === 'drop');
          const seq = firstDrop ? firstDrop.sequence : (stops.length + 1);
          // Shift all stops at seq+ up by 1
          for (const s of stops.filter(st => st.sequence >= seq)) {
            await tx.stop.update({ where: { id: s.id }, data: { sequence: s.sequence + 1 } });
          }
          return tx.stop.create({ data: { trip_id: req.params.id, location, role, sequence: seq } });
        } else {
          const maxSeq = stops.reduce((m, s) => Math.max(m, s.sequence), 0);
          return tx.stop.create({ data: { trip_id: req.params.id, location, role, sequence: maxSeq + 1 } });
        }
      }

      const pickupStop = await findOrCreateStop(pickupLoc, 'pickup');
      const dropStop   = await findOrCreateStop(dropLoc,   'drop');

      await tx.stopItem.create({ data: { stop_id: pickupStop.id, waybill_id: waybillId, weight: itemWeight } });
      // Note: each waybill goes into ONE pickup stop and ONE drop stop
      // The StopItem is only on the pickup stop — the drop is represented by the stop itself
      // Actually per spec: StopItem references one waybill per StopItem; we need items on BOTH stops
      // Correction: the spec says StopItem{stop_id, waybill_id, weight} — waybill appears in both pickup and drop stops
      // But waybill_id is @unique on StopItem — so each waybill can only be in ONE stop.
      // Resolution: StopItem lives on the PICKUP stop. Drop stops list their items derived from the same waybills
      // that will drop at that location. We only create one StopItem per waybill (on the pickup stop).
      // The drop stop association is implied by the waybill's to_location matching the drop stop location.
      // This also means peakLoad works: +weight at pickup stop, -weight at drop stop (by matching to_location).

      // Re-associate drop: we DON'T create a second StopItem. The drop stop will infer its items
      // from waybills whose to_location matches. The client computeRunningLoad already accounts for this
      // by summing items on pickup stops and subtracting on drop stops.

      // For now: only create the pickup StopItem (waybill_id unique constraint).
      // If we need items on drop too, we'd need to remove the @unique or use a different join table.
      // For v1, only pickup stops carry StopItems; drop stops are structural.

      await resequenceStops(tx, req.params.id);
      return tx.trip.findUnique({ where: { id: req.params.id }, include: TRIP_INCLUDE });
    });

    return res.json({ trip });
  } catch (err) {
    console.error('[trips:add-waybill]', err);
    return res.status(500).json({ error: 'Failed to add waybill to trip' });
  }
});

// PUT /api/trips/:id/stops/:stopId/reorder
router.put('/:id/stops/:stopId/reorder', requireRole('admin', 'staff'), async (req, res) => {
  const { direction } = req.body; // 'up' | 'down'
  if (!['up', 'down'].includes(direction)) return res.status(400).json({ error: 'direction must be "up" or "down"' });

  try {
    const trip = await prisma.$transaction(async (tx) => {
      const stops = await tx.stop.findMany({
        where: { trip_id: req.params.id },
        orderBy: { sequence: 'asc' }
      });

      const idx = stops.findIndex(s => s.id === req.params.stopId);
      if (idx === -1) throw new Error('Stop not found');
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= stops.length) throw new Error('Cannot move stop in that direction');

      const aSeq = stops[idx].sequence;
      const bSeq = stops[swapIdx].sequence;

      // Use a temp sequence to avoid unique constraint violation
      await tx.stop.update({ where: { id: stops[idx].id    }, data: { sequence: 99999 } });
      await tx.stop.update({ where: { id: stops[swapIdx].id }, data: { sequence: aSeq } });
      await tx.stop.update({ where: { id: stops[idx].id    }, data: { sequence: bSeq } });

      return tx.trip.findUnique({ where: { id: req.params.id }, include: TRIP_INCLUDE });
    });

    return res.json({ trip });
  } catch (err) {
    console.error('[trips:reorder-stop]', err);
    return res.status(500).json({ error: err.message || 'Failed to reorder stop' });
  }
});

// DELETE /api/trips/:id/stops/:stopId
router.delete('/:id/stops/:stopId', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const trip = await prisma.$transaction(async (tx) => {
      await tx.stop.delete({ where: { id: req.params.stopId } }); // cascades StopItems
      await resequenceStops(tx, req.params.id);
      return tx.trip.findUnique({ where: { id: req.params.id }, include: TRIP_INCLUDE });
    });
    return res.json({ trip });
  } catch (err) {
    console.error('[trips:remove-stop]', err);
    return res.status(500).json({ error: 'Failed to remove stop' });
  }
});

module.exports = router;
