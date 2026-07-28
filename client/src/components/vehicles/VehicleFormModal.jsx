import { useState, useEffect } from 'react';
import { createVehicle, updateVehicle } from '../../api/vehiclesApi';

const EMPTY_FORM = {
  vehicle_number: '',
  vehicle_name: '',
  insurance_expiry: '',
  rc_expiry: '',
  pollution_expiry: '',
  last_service_date: '',
};

export default function VehicleFormModal({ isOpen, onClose, onSaved, vehicle = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!vehicle;

  useEffect(() => {
    if (vehicle) {
      setForm({
        vehicle_number: vehicle.vehicle_number ?? '',
        vehicle_name: vehicle.vehicle_name ?? '',
        insurance_expiry: vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toISOString().split('T')[0] : '',
        rc_expiry: vehicle.rc_expiry ? new Date(vehicle.rc_expiry).toISOString().split('T')[0] : '',
        pollution_expiry: vehicle.pollution_expiry ? new Date(vehicle.pollution_expiry).toISOString().split('T')[0] : '',
        last_service_date: vehicle.last_service_date ? new Date(vehicle.last_service_date).toISOString().split('T')[0] : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError('');
  }, [vehicle, isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  }

  function validate() {
    const errs = {};
    if (!form.vehicle_number.trim()) errs.vehicle_number = 'Vehicle number is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        vehicle_number: form.vehicle_number.trim(),
        vehicle_name: form.vehicle_name.trim() || null,
        insurance_expiry: form.insurance_expiry || null,
        rc_expiry: form.rc_expiry || null,
        pollution_expiry: form.pollution_expiry || null,
        last_service_date: form.last_service_date || null,
      };

      const saved = isEdit
        ? await updateVehicle(vehicle.id, payload)
        : await createVehicle(payload);

      onSaved?.(saved);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || 'Failed to save vehicle';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const inputCls = (err) => `w-full bg-slate-800 border ${err ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:border-orange-500 focus:ring-orange-500/50'} rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all`;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Vehicle Number *</label>
              <input name="vehicle_number" value={form.vehicle_number} onChange={handleChange} placeholder="MH 04 AB 1234" className={inputCls(errors.vehicle_number)} />
              {errors.vehicle_number && <p className="text-red-400 text-xs mt-1">{errors.vehicle_number}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Vehicle Name</label>
              <input name="vehicle_name" value={form.vehicle_name} onChange={handleChange} placeholder="Tata Ace" className={inputCls(errors.vehicle_name)} />
              {errors.vehicle_name && <p className="text-red-400 text-xs mt-1">{errors.vehicle_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Insurance Expiry</label>
              <input type="date" name="insurance_expiry" value={form.insurance_expiry} onChange={handleChange} className={inputCls(errors.insurance_expiry)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">RC Expiry</label>
              <input type="date" name="rc_expiry" value={form.rc_expiry} onChange={handleChange} className={inputCls(errors.rc_expiry)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Pollution Expiry</label>
              <input type="date" name="pollution_expiry" value={form.pollution_expiry} onChange={handleChange} className={inputCls(errors.pollution_expiry)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Service Date</label>
              <input type="date" name="last_service_date" value={form.last_service_date} onChange={handleChange} className={inputCls(errors.last_service_date)} />
            </div>
          </div>

          {serverError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
