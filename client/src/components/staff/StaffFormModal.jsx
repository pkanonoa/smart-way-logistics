import { useState, useEffect } from 'react';
import { createstaff, updatestaff } from '../../api/staffApi';

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  role: 'staff',
  role_other_specify: '',
};

/**
 * Modal form for creating or editing a staff.
 *
 * Props:
 *  - isOpen       — controls visibility
 *  - onClose()    — called when the modal should close
 *  - onSaved(staff) — called after a successful save
 *  - staff     — staff object to edit (null = create mode)
 *  - initialData — optional default values (e.g. for quick-add)
 */
export default function StaffFormModal({ isOpen, onClose, onSaved, staff = null, initialData = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!staff;

  // Populate form when editing or quick adding
  useEffect(() => {
    if (staff) {
      setForm({
        name:       staff.name       ?? '',
        phone:      staff.phone      ?? '',
        address:    staff.address    ?? '',
        role:       staff.role       ?? 'staff',
        role_other_specify: staff.role_other_specify ?? '',
      });
    } else if (initialData) {
      setForm({ ...EMPTY_FORM, ...initialData });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError('');
  }, [staff, initialData, isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  }

  function validate() {
    const errs = {};
    if (!form.name.trim())    errs.name    = 'Name is required';
    if (!form.phone.trim()) {
      errs.phone = 'Phone is required';
    } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      errs.phone = 'Phone must be a valid 10-digit number';
    }
    if (form.role === 'other' && !form.role_other_specify.trim()) {
      errs.role_other_specify = 'Please specify the role';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        name:       form.name.trim(),
        phone:      form.phone.trim(),
        address:    form.address ? form.address.trim() : "",
        role:       form.role,
        role_other_specify: form.role === 'other' ? form.role_other_specify.trim() : null,
      };

      const saved = isEdit
        ? await updatestaff(staff.id, payload)
        : await createstaff(payload);

      onSaved?.(saved);
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.msg ||
        'Failed to save staff';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">
            {isEdit ? 'Edit staff' : 'Add staff'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" id="staff-form">
          {/* Row: Name + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.name}>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="Ravi Kumar" className={inputCls(errors.name)} />
            </Field>
            <Field label="Phone *" error={errors.phone}>
              <input name="phone" value={form.phone} onChange={handleChange}
                placeholder="+91 98765 43210" className={inputCls(errors.phone)} />
            </Field>
          </div>

          {/* Row: Role */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              Role *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="driver"
                  checked={form.role === 'driver'}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Driver</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="staff"
                  checked={form.role === 'staff'}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Staff</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="office_staff"
                  checked={form.role === 'office_staff'}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Office Staff</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="other"
                  checked={form.role === 'other'}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Other</span>
              </label>
            </div>
            {form.role === 'other' && (
              <Field error={errors.role_other_specify}>
                <input 
                  name="role_other_specify" 
                  value={form.role_other_specify} 
                  onChange={handleChange}
                  placeholder="Specify role..." 
                  className={inputCls(errors.role_other_specify)} 
                />
              </Field>
            )}
          </div>



          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-300 text-sm">{serverError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} id="staff-form-submit"
              className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function inputCls(error = '') {
  return `w-full bg-slate-800/60 border ${error ? 'border-red-500/50' : 'border-slate-600/50'} rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm
    focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200`;
}

function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
