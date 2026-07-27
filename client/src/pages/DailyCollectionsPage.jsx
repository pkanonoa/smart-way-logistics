import { useState, useEffect } from 'react';
import { 
  getDailyCollections, 
  createDailyCollection, 
  updateDailyCollection, 
  deleteDailyCollection 
} from '../api/dailyCollectionsApi';
import { getVehicles } from '../api/vehiclesApi';
import StaffSelect from '../components/staff/StaffSelect';
import VehicleSelect from '../components/vehicles/VehicleSelect';
import { getWaybills } from '../api/waybillApi';
import { useAuth } from '../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const INR = (n) => Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

const INITIAL_FORM = {
  date: today(),
  staff_id: '',
  vehicle_id: '',
  route: '',
  start_km: '',
  end_km: '',
  fuel_expense: '',
  vehicle_rent: '',
  driver_wage: '',
  helper_wage: '',
  advance: '',
  other_expenses: '',
  cash_collection: '',
  upi_collection: '',
  credit_collection: '',
};

export default function DailyCollectionsPage() {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterVehicle, setFilterVehicle] = useState(null);
  const [vehiclesList, setVehiclesList] = useState([]);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [viewingCollection, setViewingCollection] = useState(null);

  // Waybill selection states
  const [dayWaybills, setDayWaybills] = useState([]);
  const [selectedWaybillIds, setSelectedWaybillIds] = useState([]);
  const [loadingWaybills, setLoadingWaybills] = useState(false);
  const [waybillFetchDate, setWaybillFetchDate] = useState('');

  // Load active collections
  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await getDailyCollections({
        startDate,
        endDate,
        vehicleId: filterVehicle?.id || ''
      });
      setCollections(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load vehicles for filters
  const loadVehiclesForFilter = async () => {
    try {
      const list = await getVehicles();
      setVehiclesList(list || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [startDate, endDate, filterVehicle]);

  useEffect(() => {
    loadVehiclesForFilter();
  }, []);

  // Whenever form.date changes, initialize waybillFetchDate to it
  useEffect(() => {
    if (form.date) {
      setWaybillFetchDate(form.date);
    }
  }, [form.date]);

  // Fetch waybills for the selected date to allow linking (strictly on selected filter date)
  useEffect(() => {
    async function fetchWaybills() {
      if (!waybillFetchDate) return;
      setLoadingWaybills(true);
      try {
        const list = await getWaybills({ startDate: waybillFetchDate, endDate: waybillFetchDate });
        setDayWaybills(list || []);
      } catch (err) {
        console.error('Failed to fetch waybills:', err);
      } finally {
        setLoadingWaybills(false);
      }
    }
    fetchWaybills();
  }, [waybillFetchDate]);

  // Live calculations
  const startKm = parseInt(form.start_km || 0);
  const endKm = parseInt(form.end_km || 0);
  const totalKm = Math.max(0, endKm - startKm);

  const fuel = parseFloat(form.fuel_expense || 0);
  const rent = parseFloat(form.vehicle_rent || 0);
  const driver = parseFloat(form.driver_wage || 0);
  const helper = parseFloat(form.helper_wage || 0);
  const adv = parseFloat(form.advance || 0);
  const other = parseFloat(form.other_expenses || 0);
  const totalExpense = fuel + rent + driver + helper + adv + other;

  const cash = parseFloat(form.cash_collection || 0);
  const upi = parseFloat(form.upi_collection || 0);
  const credit = parseFloat(form.credit_collection || 0);
  const totalCollection = cash + upi + credit;

  const balance = totalCollection - totalExpense;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Auto-calculate collections from selected waybills
  const syncCollectionsFromWaybills = (newIds, waybillList) => {
    let cashSum = 0;
    let upiSum = 0;
    let creditSum = 0;

    newIds.forEach(id => {
      const wb = waybillList.find(w => w.id === id);
      if (!wb) return;
      const amt = parseFloat(wb.grand_total || 0);

      if (wb.payment_mode === 'credit') {
        creditSum += amt;
      } else if (wb.payment_mode === 'paid') {
        const method = wb.payment?.payment_method?.toLowerCase() || 'cash';
        if (method === 'upi') upiSum += amt;
        else cashSum += amt;
      } else if (wb.payment_mode === 'topay') {
        if (wb.payment?.status === 'paid') {
          const method = wb.payment?.payment_method?.toLowerCase() || 'cash';
          if (method === 'upi') upiSum += amt;
          else cashSum += amt;
        }
      }
    });

    setForm(prev => ({
      ...prev,
      cash_collection: cashSum.toString(),
      upi_collection: upiSum.toString(),
      credit_collection: creditSum.toString(),
    }));
  };

  const handleWaybillToggle = (waybillId) => {
    let nextIds = [];
    const isAdding = !selectedWaybillIds.includes(waybillId);
    if (!isAdding) {
      nextIds = []; // Clear selection if clicking the already selected one
    } else {
      nextIds = [waybillId]; // Enforce single selection
    }
    setSelectedWaybillIds(nextIds);
    syncCollectionsFromWaybills(nextIds, dayWaybills);

    // Auto-fill route and staff details from the selected waybill
    if (isAdding) {
      const wb = dayWaybills.find(w => w.id === waybillId);
      if (wb) {
        setForm(prev => ({ ...prev, route: `${wb.from_location} to ${wb.to_location}` }));
        if (wb.consignors && wb.consignors.length > 0) {
          const staffObj = wb.consignors[0];
          setSelectedStaff(staffObj);
          setForm(prev => ({ ...prev, staff_id: staffObj.id }));
        }
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.date) newErrors.date = 'Date is required';
    if (!form.staff_id) newErrors.staff_id = 'Staff selection is required';
    if (!form.vehicle_id) newErrors.vehicle_id = 'Vehicle selection is required';
    if (!form.route.trim()) newErrors.route = 'Route is required';
    if (form.start_km === '') newErrors.start_km = 'Start KM is required';
    if (form.end_km === '') newErrors.end_km = 'End KM is required';
    if (parseInt(form.end_km) < parseInt(form.start_km)) {
      newErrors.end_km = 'End KM cannot be less than Start KM';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
    setSelectedStaff(null);
    setSelectedVehicle(null);
    setEditingId(null);
    setSelectedWaybillIds([]);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setForm({
      date: new Date(rec.date).toISOString().slice(0, 10),
      staff_id: rec.staff_id,
      vehicle_id: rec.vehicle_id,
      route: rec.route,
      start_km: rec.start_km.toString(),
      end_km: rec.end_km.toString(),
      fuel_expense: rec.fuel_expense.toString(),
      vehicle_rent: rec.vehicle_rent.toString(),
      driver_wage: rec.driver_wage.toString(),
      helper_wage: rec.helper_wage.toString(),
      advance: rec.advance.toString(),
      other_expenses: rec.other_expenses.toString(),
      cash_collection: rec.cash_collection.toString(),
      upi_collection: rec.upi_collection.toString(),
      credit_collection: rec.credit_collection.toString(),
    });
    setSelectedStaff(rec.staff);
    setSelectedVehicle(rec.vehicle);
    setEditingId(rec.id);
    setSelectedWaybillIds(rec.waybills?.map(w => w.id) || []);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        start_km: parseInt(form.start_km),
        end_km: parseInt(form.end_km),
        fuel_expense: parseFloat(form.fuel_expense || 0),
        vehicle_rent: parseFloat(form.vehicle_rent || 0),
        driver_wage: parseFloat(form.driver_wage || 0),
        helper_wage: parseFloat(form.helper_wage || 0),
        advance: parseFloat(form.advance || 0),
        other_expenses: parseFloat(form.other_expenses || 0),
        cash_collection: parseFloat(form.cash_collection || 0),
        upi_collection: parseFloat(form.upi_collection || 0),
        credit_collection: parseFloat(form.credit_collection || 0),
        waybill_ids: selectedWaybillIds
      };

      if (editingId) {
        await updateDailyCollection(editingId, payload);
      } else {
        await createDailyCollection(payload);
      }
      setIsModalOpen(false);
      loadCollections();
    } catch (err) {
      alert('Failed to save daily collection record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDailyCollection(id);
      loadCollections();
    } catch (err) {
      alert('Failed to delete daily collection record.');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterVehicle(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="print:hidden">
      {/* Background glow */}
      <div className="fixed top-0 left-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Collection Register</h1>
          <p className="text-sm text-slate-400 mt-1">Record and review trip-level collections, expenses, and vehicle logs</p>
        </div>
        {user?.role !== 'viewer' && (
          <button 
            onClick={openCreateModal}
            className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Collection Sheet
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 mb-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 [color-scheme:dark]"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Filter by Vehicle</label>
            <select
              value={filterVehicle?.id || ''}
              onChange={(e) => {
                const selected = vehiclesList.find(v => v.id === e.target.value);
                setFilterVehicle(selected || null);
              }}
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="">All Vehicles</option>
              {vehiclesList.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicle_number} ({v.vehicle_name})</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {(startDate || endDate || filterVehicle) && (
              <button 
                onClick={clearFilters}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors h-10 flex items-center"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sheet List Table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Vehicle & Staff</th>
                <th className="px-6 py-4 font-medium">Route / KM</th>
                <th className="px-6 py-4 font-medium text-right">Collections</th>
                <th className="px-6 py-4 font-medium text-right">Expenses</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      Loading collection sheets...
                    </div>
                  </td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    No collection sheets found.
                  </td>
                </tr>
              ) : (
                collections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                      {new Date(c.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-white">{c.vehicle?.vehicle_number}</div>
                      <div className="text-xs text-slate-400">{c.staff?.name}</div>
                      {c.waybills && c.waybills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.waybills.map(wb => (
                            <span key={wb.id} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono border border-slate-700 text-slate-300">
                              {wb.waybill_number}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{c.route}</div>
                      <div className="text-xs text-slate-400">{c.total_km} KM ({c.start_km} &rarr; {c.end_km})</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="font-semibold text-emerald-400">{INR(c.total_collection)}</div>
                      <div className="text-[10px] text-slate-500">Cash: {INR(c.cash_collection)} | UPI: {INR(c.upi_collection)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-red-400 font-semibold">
                      {INR(c.total_expense)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={`font-bold px-2 py-1 rounded text-xs border ${
                        parseFloat(c.balance) >= 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {INR(c.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => setViewingCollection(c)}
                          className="text-slate-400 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {user?.role !== 'viewer' && (
                          <>
                            <button 
                              onClick={() => openEditModal(c)}
                              className="text-slate-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDelete(c.id)}
                              className="text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record/Edit Collection Sheet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Daily Collection Sheet' : 'New Daily Collection Sheet'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Row 1: Trip Meta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-800 border ${errors.date ? 'border-red-500/50' : 'border-slate-700'} rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 [color-scheme:dark]`}
                  />
                  {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Staff *</label>
                  <StaffSelect
                    selectedstaff={selectedStaff}
                    onSelect={(s) => {
                      setSelectedStaff(s);
                      setForm(prev => ({ ...prev, staff_id: s?.id || '' }));
                      if (errors.staff_id) setErrors(p => ({ ...p, staff_id: '' }));
                    }}
                    onClear={() => {
                      setSelectedStaff(null);
                      setForm(prev => ({ ...prev, staff_id: '' }));
                    }}
                  />
                  {errors.staff_id && <p className="text-red-400 text-xs mt-1">{errors.staff_id}</p>}
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Vehicle *</label>
                  <VehicleSelect
                    selectedVehicle={selectedVehicle}
                    onSelect={(v) => {
                      setSelectedVehicle(v);
                      setForm(prev => ({ ...prev, vehicle_id: v?.id || '' }));
                      if (errors.vehicle_id) setErrors(p => ({ ...p, vehicle_id: '' }));
                    }}
                    onClear={() => {
                      setSelectedVehicle(null);
                      setForm(prev => ({ ...prev, vehicle_id: '' }));
                    }}
                  />
                  {errors.vehicle_id && <p className="text-red-400 text-xs mt-1">{errors.vehicle_id}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Route *</label>
                  <input
                    type="text"
                    name="route"
                    value={form.route}
                    onChange={handleInputChange}
                    placeholder="e.g. Mumbai to Delhi"
                    className={`w-full bg-slate-800 border ${errors.route ? 'border-red-500/50' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                  />
                  {errors.route && <p className="text-red-400 text-xs mt-1">{errors.route}</p>}
                </div>
              </div>

              {/* Row 2: KM tracking */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-3">Vehicle Mileage (KM)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Start KM *</label>
                    <input
                      type="number"
                      name="start_km"
                      value={form.start_km}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-800 border ${errors.start_km ? 'border-red-500/50' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                    />
                    {errors.start_km && <p className="text-red-400 text-xs mt-1">{errors.start_km}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">End KM *</label>
                    <input
                      type="number"
                      name="end_km"
                      value={form.end_km}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-800 border ${errors.end_km ? 'border-red-500/50' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                    />
                    {errors.end_km && <p className="text-red-400 text-xs mt-1">{errors.end_km}</p>}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total KM Driven</span>
                    <span className="text-white text-lg font-bold mt-0.5">{totalKm} KM</span>
                  </div>
                </div>
              </div>

              {/* Waybills checklist */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    <span>Assigned Waybills</span>
                    {loadingWaybills && <span className="text-xs font-normal text-slate-500 lowercase">loading...</span>}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-450 uppercase font-semibold">Filter Date:</span>
                    <input
                      type="date"
                      value={waybillFetchDate}
                      onChange={(e) => setWaybillFetchDate(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/50 [color-scheme:dark]"
                    />
                  </div>
                </div>
                {dayWaybills.length === 0 ? (
                  <p className="text-slate-500 text-xs py-3 text-center">No waybills found on {waybillFetchDate ? new Date(waybillFetchDate).toLocaleDateString('en-IN') : 'selected date'}.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2">
                    {dayWaybills.map((wb) => {
                      const isChecked = selectedWaybillIds.includes(wb.id);
                      return (
                        <label 
                          key={wb.id} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-orange-500/10 border-orange-500/30' 
                              : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleWaybillToggle(wb.id)}
                            className="mt-0.5 accent-orange-500 rounded"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white font-mono">{wb.waybill_number}</p>
                            <p className="text-[11px] text-slate-400 truncate">{wb.from_location} &rarr; {wb.to_location}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              ₹{Number(wb.grand_total).toFixed(2)} ({wb.payment_mode})
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2">Checking waybills will auto-prefill cash/upi/credit collections based on their payment modes.</p>
              </div>

              {/* Grid 3: Expenses and Collections splits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Expenses */}
                <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-widest border-b border-slate-800 pb-2">Trip Expenses</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Fuel Expense (₹)</label>
                      <input
                        type="number"
                        name="fuel_expense"
                        value={form.fuel_expense}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Vehicle Rent (₹)</label>
                      <input
                        type="number"
                        name="vehicle_rent"
                        value={form.vehicle_rent}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Driver Wage (₹)</label>
                      <input
                        type="number"
                        name="driver_wage"
                        value={form.driver_wage}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Helper Wage (₹)</label>
                      <input
                        type="number"
                        name="helper_wage"
                        value={form.helper_wage}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Advance (₹)</label>
                      <input
                        type="number"
                        name="advance"
                        value={form.advance}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Other Expenses (₹)</label>
                      <input
                        type="number"
                        name="other_expenses"
                        value={form.other_expenses}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Collections */}
                <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-widest border-b border-slate-800 pb-2">Trip Collections</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Cash Collection (₹)</label>
                        <input
                          type="number"
                          name="cash_collection"
                          value={form.cash_collection}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">UPI Collection (₹)</label>
                        <input
                          type="number"
                          name="upi_collection"
                          value={form.upi_collection}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Credit Account Collection (₹)</label>
                        <input
                          type="number"
                          name="credit_collection"
                          value={form.credit_collection}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Footer */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-8 text-center sm:text-left flex-wrap justify-center sm:justify-start">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Collections</span>
                    <p className="text-white text-lg font-bold mt-0.5">{INR(totalCollection)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Expenses</span>
                    <p className="text-white text-lg font-bold mt-0.5">{INR(totalExpense)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net Balance</span>
                    <p className={`text-xl font-black mt-0.5 ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{INR(balance)}</p>
                  </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 sm:flex-initial bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-orange-500/20"
                  >
                    {submitting ? 'Saving...' : 'Save Collection Sheet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      {/* Read-Only View Modal */}
      {viewingCollection && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:hidden">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Daily Collection Details</h3>
                <p className="text-slate-400 text-xs mt-0.5">Date: {new Date(viewingCollection.date).toLocaleDateString('en-IN')}</p>
              </div>
              <button 
                onClick={() => setViewingCollection(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Trip Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Staff / Driver</span>
                  <p className="text-white font-medium text-sm mt-1">{viewingCollection.staff?.name || '—'}</p>
                  <p className="text-slate-450 text-xs mt-0.5">{viewingCollection.staff?.phone || '—'}</p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Vehicle</span>
                  <p className="text-white font-medium text-sm mt-1">{viewingCollection.vehicle?.vehicle_number || '—'}</p>
                  <p className="text-slate-450 text-xs mt-0.5">{viewingCollection.vehicle?.vehicle_name || '—'}</p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Route & Distance</span>
                  <p className="text-white font-medium text-sm mt-1 truncate">{viewingCollection.route || '—'}</p>
                  <p className="text-orange-400 text-xs mt-0.5 font-semibold">
                    {viewingCollection.start_km} KM &rarr; {viewingCollection.end_km} KM ({viewingCollection.total_km} KM)
                  </p>
                </div>
              </div>

              {/* Collections & Expenses breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expenses */}
                <div className="bg-slate-950/20 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider pb-2 border-b border-slate-800">Trip Expenses</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Fuel Expense</span><span className="text-white">{INR(viewingCollection.fuel_expense)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Vehicle Rent</span><span className="text-white">{INR(viewingCollection.vehicle_rent)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Driver Wage</span><span className="text-white">{INR(viewingCollection.driver_wage)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Helper Wage</span><span className="text-white">{INR(viewingCollection.helper_wage)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Advance</span><span className="text-white">{INR(viewingCollection.advance)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Other Expenses</span><span className="text-white">{INR(viewingCollection.other_expenses)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-850 font-bold"><span className="text-red-400">Total Expense</span><span className="text-red-400">{INR(viewingCollection.total_expense)}</span></div>
                  </div>
                </div>

                {/* Collections */}
                <div className="bg-slate-950/20 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider pb-2 border-b border-slate-800">Trip Collections</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Cash Collection</span><span className="text-white">{INR(viewingCollection.cash_collection)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">UPI Collection</span><span className="text-white">{INR(viewingCollection.upi_collection)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Credit Collection</span><span className="text-white">{INR(viewingCollection.credit_collection)}</span></div>
                    <div className="flex justify-between pt-10 border-t border-slate-850 font-bold"><span className="text-emerald-400">Total Collection</span><span className="text-emerald-400">{INR(viewingCollection.total_collection)}</span></div>
                  </div>
                </div>
              </div>

              {/* Waybills Linked */}
              {viewingCollection.waybills && viewingCollection.waybills.length > 0 && (
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">Linked Waybills</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {viewingCollection.waybills.map(wb => (
                      <div key={wb.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                        <p className="text-xs font-mono font-bold text-white">{wb.waybill_number}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{wb.from_location} &rarr; {wb.to_location}</p>
                        <p className="text-[10px] text-orange-400 font-semibold mt-0.5">{INR(wb.grand_total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Net Balance Footer Card */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Net Balance</span>
                  <p className="text-slate-400 text-xs mt-0.5">Calculated: Total Collections - Total Expenses</p>
                </div>
                <div className={`text-lg font-black ${parseFloat(viewingCollection.balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {INR(viewingCollection.balance)}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Sheet
              </button>
              <button 
                type="button" 
                onClick={() => setViewingCollection(null)}
                className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-5 py-2 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Print Sheet - Shown only when printing */}
      {viewingCollection && (
        <div id="print-sheet" className="hidden print:block bg-white text-black p-8 max-w-4xl mx-auto font-sans">
          <div className="text-center border-b-2 border-gray-850 pb-4 mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider">Smart Way Logistics</h1>
            <p className="text-sm font-semibold text-gray-600 tracking-wide">Daily Collection Register / Trip Sheet</p>
            <p className="text-xs text-gray-500 mt-1">Date: {new Date(viewingCollection.date).toLocaleDateString('en-IN')}</p>
          </div>

          <div className="grid grid-cols-3 gap-6 border border-gray-300 rounded p-4 mb-6 text-xs">
            <div>
              <p className="font-bold text-[10px] uppercase text-gray-500 mb-1">Staff / Driver</p>
              <p className="font-semibold text-sm">{viewingCollection.staff?.name || '—'}</p>
              <p className="text-gray-600 mt-0.5">{viewingCollection.staff?.phone || '—'}</p>
            </div>
            <div>
              <p className="font-bold text-[10px] uppercase text-gray-500 mb-1">Vehicle Details</p>
              <p className="font-semibold text-sm">{viewingCollection.vehicle?.vehicle_number || '—'}</p>
              <p className="text-gray-600 mt-0.5">{viewingCollection.vehicle?.vehicle_name || '—'}</p>
            </div>
            <div>
              <p className="font-bold text-[10px] uppercase text-gray-500 mb-1">Route & Mileage</p>
              <p className="font-semibold text-sm">{viewingCollection.route || '—'}</p>
              <p className="text-gray-600 mt-0.5 font-medium">
                {viewingCollection.start_km} KM &rarr; {viewingCollection.end_km} KM ({viewingCollection.total_km} KM driven)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Expenses */}
            <div className="border border-gray-300 rounded p-4">
              <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-2 mb-3 text-red-650">Trip Expenses</h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Fuel Expense</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.fuel_expense)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Vehicle Rent</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.vehicle_rent)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Driver Wage</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.driver_wage)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Helper Wage</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.helper_wage)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Advance</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.advance)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Other Expenses</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.other_expenses)}</td></tr>
                  <tr className="font-bold text-sm text-red-650"><td className="pt-3">Total Expense</td><td className="pt-3 text-right">{INR(viewingCollection.total_expense)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Collections */}
            <div className="border border-gray-300 rounded p-4">
              <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-2 mb-3 text-emerald-650">Trip Collections</h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Cash Collection</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.cash_collection)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">UPI Collection</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.upi_collection)}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-600">Credit Collection</td><td className="py-1.5 text-right font-medium">{INR(viewingCollection.credit_collection)}</td></tr>
                  <tr><td className="py-5"></td><td></td></tr>
                  <tr className="font-bold text-sm text-emerald-650 border-t border-gray-300"><td className="pt-3">Total Collection</td><td className="pt-3 text-right">{INR(viewingCollection.total_collection)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked Waybills */}
          {viewingCollection.waybills && viewingCollection.waybills.length > 0 && (
            <div className="border border-gray-300 rounded p-4 mb-6">
              <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-2 mb-3 text-gray-800">Linked Waybills</h3>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-gray-350">
                    <th className="p-2">Waybill No</th>
                    <th className="p-2">Route</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingCollection.waybills.map(wb => (
                    <tr key={wb.id} className="border-b border-gray-200">
                      <td className="p-2 font-mono font-semibold">{wb.waybill_number}</td>
                      <td className="p-2">{wb.from_location} &rarr; {wb.to_location}</td>
                      <td className="p-2 text-right font-medium">{INR(wb.grand_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Net balance footer */}
          <div className="border-2 border-gray-850 p-4 rounded flex items-center justify-between font-bold text-base">
            <div>
              <p className="uppercase text-xs text-gray-500">Net Trip Balance</p>
              <p className="text-[10px] text-gray-400 font-normal mt-0.5">Calculated: Total Collections - Total Expenses</p>
            </div>
            <div className={parseFloat(viewingCollection.balance) >= 0 ? 'text-emerald-650' : 'text-red-650'}>
              {INR(viewingCollection.balance)}
            </div>
          </div>

          <div className="flex justify-between mt-16 text-xs text-gray-500 font-medium">
            <p className="border-t border-gray-400 pt-1.5 px-8">Prepared By</p>
            <p className="border-t border-gray-400 pt-1.5 px-8">Authorized Signatory</p>
          </div>
        </div>
      )}
    </div>
  );
}
