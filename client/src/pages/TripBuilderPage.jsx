import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTrip, createTrip, updateTrip,
  addWaybillToTrip, reorderStop as apiReorderStop, removeStop as apiRemoveStop,
  getUnassignedWaybillsByDistrict,
} from '../api/tripsApi';
import { getVehicles } from '../api/vehiclesApi';
import { getstaffs } from '../api/staffApi';
import {
  mergeWaybillIntoStops,
  computeRunningLoad,
  peakLoad,
  reorderStop as localReorderStop,
  removeStop as localRemoveStop,
} from '../utils/tripLogic';
import { useAuth } from '../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const pct = (load, cap) => cap > 0 ? Math.min(100, Math.round((load / cap) * 100)) : 0;

const ROLE_COLORS = {
  pickup: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  drop:   'bg-amber-500/15  text-amber-400  border-amber-500/25',
};

export default function TripBuilderPage() {
  const { id } = useParams();   // undefined = new trip
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isNew = !id;

  // ── Trip header state ────────────────────────────────────────────────────────
  const [header, setHeader] = useState({
    vehicle_id: '', driver_id: '', trip_date: today(), district: '', status: 'draft',
  });
  const [trip, setTrip] = useState(null);   // server trip record
  const [stops, setStops] = useState([]);   // optimistic local stops

  // ── Master data ───────────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [waybillPool, setWaybillPool] = useState([]);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedWaybills, setSelectedWaybills] = useState([]);

  // ── Derived capacity info ─────────────────────────────────────────────────────
  const selectedVehicle = vehicles.find(v => v.id === header.vehicle_id);
  const capacityKg = selectedVehicle?.capacity_kg ? parseFloat(selectedVehicle.capacity_kg) : null;
  const peak = peakLoad(stops);
  const overCapacity = capacityKg != null && peak > capacityKg;
  const runningLoads = computeRunningLoad(stops);

  // ── Load master data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [v, s] = await Promise.all([getVehicles(), getstaffs()]);
        setVehicles(v || []);
        setStaff(s || []);

        if (!isNew) {
          const t = await getTrip(id);
          setTrip(t);
          setHeader({
            vehicle_id: t.vehicle_id,
            driver_id:  t.driver_id,
            trip_date:  t.trip_date?.slice(0, 10) || today(),
            district:   t.district,
            status:     t.status,
          });
          setStops(t.stops || []);
        }
      } catch (err) {
        setError('Failed to load trip data.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isNew]);

  // ── Reload waybill pool when district changes ─────────────────────────────────
  useEffect(() => {
    if (!header.district) { setWaybillPool([]); return; }
    getUnassignedWaybillsByDistrict(header.district)
      .then(setWaybillPool)
      .catch(() => setWaybillPool([]));
  }, [header.district]);

  // ── Header save / create ──────────────────────────────────────────────────────
  async function handleSaveHeader() {
    if (!header.vehicle_id || !header.driver_id || !header.trip_date || !header.district) {
      setError('Vehicle, driver, date, and district are all required.'); return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (isNew) {
        const created = await createTrip(header);
        setTrip(created);
        setSuccess('Trip created.');
        navigate(`/trips/${created.id}`, { replace: true });
      } else {
        const updated = await updateTrip(id, header);
        setTrip(updated);
        setStops(updated.stops || []);
        setSuccess('Trip updated.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  }

  // ── Add selected waybills ─────────────────────────────────────────────────────
  async function handleAddWaybills() {
    if (!trip) { setError('Save the trip header first.'); return; }
    if (!selectedWaybills.length) { setError('Select at least one waybill.'); return; }

    setAdding(true); setError(''); setSuccess('');
    let updatedTrip = null;
    for (const wbId of selectedWaybills) {
      const wb = waybillPool.find(w => w.id === wbId);
      if (!wb) continue;
      // Optimistic update
      setStops(prev => mergeWaybillIntoStops(prev, {
        id: wb.id, waybillNumber: wb.waybill_number,
        consigneeName: wb.consignee_name,
        pickupLoc: wb.from_location,
        dropLoc:   wb.to_location,
        weight:    parseFloat(wb.weight || 0),
      }));
      try {
        // Server merge — response is source of truth
        updatedTrip = await addWaybillToTrip(trip.id, wb.id, parseFloat(wb.weight || 0));
      } catch (err) {
        setError(`Failed to add waybill ${wb.waybill_number}: ${err.response?.data?.error || err.message}`);
        break;
      }
    }
    if (updatedTrip) {
      // Replace optimistic state with server truth
      setStops(updatedTrip.stops || []);
      setTrip(updatedTrip);
    }
    setSelectedWaybills([]);
    // Refresh pool
    getUnassignedWaybillsByDistrict(header.district).then(setWaybillPool);
    setAdding(false);
    setSuccess(`Added ${selectedWaybills.length} waybill(s).`);
  }

  // ── Reorder ───────────────────────────────────────────────────────────────────
  async function handleReorder(stopId, direction) {
    setStops(prev => localReorderStop(prev, stopId, direction)); // optimistic
    try {
      const updated = await apiReorderStop(trip.id, stopId, direction);
      setStops(updated.stops || []);
    } catch {
      setError('Failed to reorder stop.');
      const t = await getTrip(trip.id);
      setStops(t.stops || []);
    }
  }

  // ── Remove stop ────────────────────────────────────────────────────────────────
  async function handleRemoveStop(stopId) {
    setStops(prev => localRemoveStop(prev, stopId)); // optimistic
    try {
      const updated = await apiRemoveStop(trip.id, stopId);
      setStops(updated.stops || []);
    } catch {
      setError('Failed to remove stop.');
      const t = await getTrip(trip.id);
      setStops(t.stops || []);
    }
  }

  const toggleWaybill = useCallback((id) => {
    setSelectedWaybills(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const orderedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-screen-xl mx-auto px-6 py-8 relative z-10">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isNew ? 'New Trip' : `Trip Builder${trip ? ` — ${trip.district}` : ''}`}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">Plan the route, assign waybills, monitor capacity</p>
          </div>
          <button
            onClick={() => navigate('/trips')}
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Trips
          </button>
        </div>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        {error   && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">{success}</div>}

        {/* ── Trip Header Form ─────────────────────────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Vehicle */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Vehicle *</label>
              <select
                value={header.vehicle_id}
                onChange={e => setHeader(p => ({ ...p, vehicle_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">Select vehicle…</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number}{v.vehicle_name ? ` (${v.vehicle_name})` : ''}{v.capacity_kg ? ` · ${v.capacity_kg}kg` : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Driver */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Driver *</label>
              <select
                value={header.driver_id}
                onChange={e => setHeader(p => ({ ...p, driver_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">Select driver…</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role?.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Date *</label>
              <input
                type="date"
                value={header.trip_date}
                onChange={e => setHeader(p => ({ ...p, trip_date: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 [color-scheme:dark]"
              />
            </div>
            {/* District */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">District *</label>
              <input
                type="text"
                placeholder="e.g. Chennai"
                value={header.district}
                onChange={e => setHeader(p => ({ ...p, district: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {!isNew && (
              <select
                value={header.status}
                onChange={e => setHeader(p => ({ ...p, status: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            )}
            <button
              onClick={handleSaveHeader}
              disabled={saving}
              className="ml-auto px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
            >
              {saving ? 'Saving…' : isNew ? 'Create Trip' : 'Update Trip'}
            </button>
          </div>
        </div>

        {/* ── Two-column builder (only shown after trip is created) ────────── */}
        {!isNew && trip && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* ── LEFT: Waybill Pool ──────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                  Waybill Pool
                  {header.district && <span className="ml-2 text-cyan-400 normal-case font-normal">({header.district})</span>}
                </h2>
                {selectedWaybills.length > 0 && (
                  <button
                    onClick={handleAddWaybills}
                    disabled={adding}
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all active:scale-[0.98]"
                  >
                    {adding ? 'Adding…' : `Add ${selectedWaybills.length} to Trip`}
                  </button>
                )}
              </div>

              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {waybillPool.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <p className="text-white text-sm font-medium mb-1">No unassigned waybills</p>
                    <p className="text-slate-500 text-xs">
                      {header.district ? `No waybills match district "${header.district}"` : 'Enter a district above to filter'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
                    {waybillPool.map(wb => {
                      const checked = selectedWaybills.includes(wb.id);
                      return (
                        <div
                          key={wb.id}
                          onClick={() => toggleWaybill(wb.id)}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${
                            checked ? 'bg-cyan-500/10' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-0.5 h-4 w-4 rounded border-slate-600 text-cyan-500 bg-slate-800 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white font-mono">{wb.waybill_number}</span>
                              <span className="text-slate-400 shrink-0">{wb.weight}kg</span>
                            </div>
                            <p className="text-slate-400 mt-0.5">{wb.consignor_name || wb.consignee_name}</p>
                            <p className="text-cyan-400/70 mt-0.5 truncate">
                              {wb.from_location} → {wb.to_location}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Route ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Route</h2>

              {orderedStops.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center py-16 text-center px-4">
                  <p className="text-white text-sm font-medium mb-1">No stops yet</p>
                  <p className="text-slate-500 text-xs">Select waybills from the pool and click "Add to Trip"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderedStops.map((stop, idx) => {
                    const rl = runningLoads.find(r => r.stopId === stop.id);
                    const loadAfter = rl?.runningLoad ?? 0;
                    const loadOver = capacityKg != null && loadAfter > capacityKg;

                    return (
                      <div
                        key={stop.id}
                        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
                      >
                        {/* Stop Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60">
                          <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {stop.sequence}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${ROLE_COLORS[stop.role]}`}>
                            {stop.role}
                          </span>
                          <span className="text-white text-sm font-medium flex-1 truncate">{stop.location}</span>
                          {stop.items?.length > 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-bold border border-cyan-500/20 shrink-0">
                              {stop.items.length} items
                            </span>
                          )}
                          {/* Reorder & Remove */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleReorder(stop.id, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                              title="Move up"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleReorder(stop.id, 'down')}
                              disabled={idx === orderedStops.length - 1}
                              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                              title="Move down"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveStop(stop.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                              title="Remove stop"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Stop Items */}
                        {stop.items?.length > 0 && (
                          <div className="px-4 py-2 space-y-1">
                            {stop.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs text-slate-400">
                                <span className="font-mono text-slate-300">{item.waybill?.waybill_number || item.waybillNumber}</span>
                                <span>{parseFloat(item.weight || item.waybill?.weight || 0)}kg</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Running load after this stop */}
                        <div className={`px-4 py-2 text-xs flex items-center justify-between border-t border-slate-800/60 ${
                          loadOver ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          <span>Load after this stop</span>
                          <span className={`font-bold ${loadOver ? 'text-red-400' : 'text-slate-300'}`}>
                            {loadAfter.toFixed(1)} kg
                            {loadOver && ' ⚠ OVER'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Capacity Meter ───────────────────────────────────────── */}
              {capacityKg != null && orderedStops.length > 0 && (
                <div className={`rounded-2xl border p-4 ${
                  overCapacity
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-slate-900/60 border-slate-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peak Load</span>
                    <span className={`text-sm font-bold ${overCapacity ? 'text-red-400' : 'text-white'}`}>
                      {peak.toFixed(1)} / {capacityKg} kg
                      {overCapacity && (
                        <span className="ml-2 text-xs text-red-400 font-normal">⚠ Over capacity</span>
                      )}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        overCapacity ? 'bg-red-500' : peak / capacityKg > 0.8 ? 'bg-amber-400' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${pct(peak, capacityKg)}%` }}
                    />
                  </div>
                  {overCapacity && (
                    <p className="mt-2 text-xs text-red-400/80">
                      Reorder stops — move a drop earlier in the route to reduce peak load.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isNew && (
          <div className="text-center py-12 text-slate-500 text-sm">
            Fill in the trip details above and click <strong className="text-white">Create Trip</strong> to start building the route.
          </div>
        )}
      </div>
    </div>
  );
}
