import { useState, useEffect } from 'react';
import { getUnassignedGroups, assignTrip } from '../api/tripsApi';
import { getstaffs } from '../api/staffApi';
import { getVehicles } from '../api/vehiclesApi';
import { useAuth } from '../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const INR = (n) => Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

export default function AssignTripsPage() {
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [staff, setStaff] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expand state for groups (using the group key: `from_to`)
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Form states per group
  const [assignments, setAssignments] = useState({});

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [groupsData, staffData, vehiclesData] = await Promise.all([
        getUnassignedGroups(),
        getstaffs(),
        getVehicles()
      ]);
      setGroups(groupsData || []);
      setStaff(staffData || []);
      setVehicles(vehiclesData || []);

      // Initialize assignments state for each group
      const initialAssignments = {};
      groupsData.forEach(g => {
        const key = `${g.from_location}_to_${g.to_location}`.trim().toLowerCase();
        initialAssignments[key] = {
          selectedWaybills: g.waybills.map(wb => wb.id), // Checked by default
          staff_id: '',
          vehicle_id: '',
          date: today(),
          route: `${g.from_location} -> ${g.to_location}`,
          submitting: false,
          error: ''
        };
      });
      setAssignments(initialAssignments);
    } catch (err) {
      setError('Failed to load unassigned waybills or master data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWaybill = (groupKey, waybillId) => {
    setAssignments(prev => {
      const groupState = prev[groupKey];
      const selected = groupState.selectedWaybills.includes(waybillId)
        ? groupState.selectedWaybills.filter(id => id !== waybillId)
        : [...groupState.selectedWaybills, waybillId];
      return {
        ...prev,
        [groupKey]: { ...groupState, selectedWaybills: selected }
      };
    });
  };

  const handleFormChange = (groupKey, field, value) => {
    setAssignments(prev => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], [field]: value }
    }));
  };

  const handleAssign = async (groupKey) => {
    const state = assignments[groupKey];
    if (state.selectedWaybills.length === 0) {
      setAssignments(prev => ({
        ...prev,
        [groupKey]: { ...prev[groupKey], error: 'Please select at least one waybill.' }
      }));
      return;
    }
    if (!state.staff_id) {
      setAssignments(prev => ({
        ...prev,
        [groupKey]: { ...prev[groupKey], error: 'Driver/Staff is required.' }
      }));
      return;
    }
    if (!state.vehicle_id) {
      setAssignments(prev => ({
        ...prev,
        [groupKey]: { ...prev[groupKey], error: 'Vehicle is required.' }
      }));
      return;
    }
    if (!state.route.trim()) {
      setAssignments(prev => ({
        ...prev,
        [groupKey]: { ...prev[groupKey], error: 'Route is required.' }
      }));
      return;
    }

    setAssignments(prev => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], submitting: true, error: '' }
    }));

    try {
      await assignTrip({
        waybill_ids: state.selectedWaybills,
        staff_id: state.staff_id,
        vehicle_id: state.vehicle_id,
        date: state.date,
        route: state.route,
        start_km: 0,
        end_km: 0
      });
      // Refresh
      await loadData();
      setExpandedGroup(null);
    } catch (err) {
      const apiErr = err.response?.data?.error || 'Failed to assign trip.';
      setAssignments(prev => ({
        ...prev,
        [groupKey]: { ...prev[groupKey], submitting: false, error: apiErr }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Bulk Trip Assignment</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Group unassigned waybills by route and assign them to driver & vehicle trips in bulk.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-slate-900/40 border border-slate-850 rounded-2xl">
            <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">All waybills assigned</p>
            <p className="text-slate-450 text-sm">No unassigned waybills currently available for booking trips.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const groupKey = `${group.from_location}_to_${group.to_location}`.trim().toLowerCase();
              const isExpanded = expandedGroup === groupKey;
              const state = assignments[groupKey] || {};

              return (
                <div key={groupKey} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm transition-all">
                  {/* Collapsible Header */}
                  <div
                    onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
                    className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 transition-all select-none"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-3">
                        <span className="text-slate-400 font-medium text-sm">Route:</span>
                        {group.from_location} &rarr; {group.to_location}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-lg text-orange-400 font-bold">
                          {group.waybill_count} Waybill{group.waybill_count !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span>Total Packages: {group.total_packages}</span>
                      </div>
                    </div>
                    <div>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-6">
                      {/* Waybill Checklist */}
                      <div>
                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">Select Waybills to Assign</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.waybills.map((wb) => {
                            const isChecked = state.selectedWaybills?.includes(wb.id);
                            return (
                              <div
                                key={wb.id}
                                onClick={() => handleToggleWaybill(groupKey, wb.id)}
                                className={`p-4 border rounded-xl cursor-pointer select-none transition-all flex items-start gap-3 ${
                                  isChecked
                                    ? 'bg-orange-500/10 border-orange-500/40'
                                    : 'bg-slate-950/20 border-slate-800 hover:border-slate-750'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked || false}
                                  onChange={() => {}} // Handled by container onClick
                                  className="mt-0.5 h-4 w-4 rounded border-slate-700 text-orange-500 focus:ring-orange-500/50 bg-slate-900 cursor-pointer"
                                />
                                <div className="flex-1 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono font-bold text-white text-sm">{wb.waybill_number}</span>
                                    <span className="text-slate-400 font-semibold">{wb.no_of_packages} Pkgs</span>
                                  </div>
                                  <p className="text-slate-400 mt-1 truncate">Consignee: {wb.consignee_name}</p>
                                  <p className="text-slate-500 mt-0.5 truncate text-[11px]">{wb.consignee_address}</p>
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/50">
                                    <span className="text-[10px] text-slate-500 uppercase">{wb.payment_mode}</span>
                                    <span className="text-orange-400 font-bold">{INR(wb.grand_total)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Assignment Form */}
                      <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest pb-2 border-b border-slate-800/50">Trip Log & Staff Assignment</h4>

                        {state.error && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                            {state.error}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Date *</label>
                            <input
                              type="date"
                              value={state.date || today()}
                              onChange={(e) => handleFormChange(groupKey, 'date', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 [color-scheme:dark]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Driver/Staff *</label>
                            <select
                              value={state.staff_id || ''}
                              onChange={(e) => handleFormChange(groupKey, 'staff_id', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            >
                              <option value="">Select Staff + Driver...</option>
                              {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role?.replace('_', ' ')})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Vehicle *</label>
                            <select
                              value={state.vehicle_id || ''}
                              onChange={(e) => handleFormChange(groupKey, 'vehicle_id', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            >
                              <option value="">Select Vehicle...</option>
                              {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.vehicle_number} {v.vehicle_name ? `(${v.vehicle_name})` : ''}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-semibold">Route *</label>
                            <input
                              type="text"
                              value={state.route || ''}
                              onChange={(e) => handleFormChange(groupKey, 'route', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-850">
                          <button
                            type="button"
                            disabled={state.submitting}
                            onClick={() => handleAssign(groupKey)}
                            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                          >
                            {state.submitting ? 'Assigning...' : `Assign ${state.selectedWaybills?.length || 0} Waybill${state.selectedWaybills?.length !== 1 ? 's' : ''} to Trip`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
