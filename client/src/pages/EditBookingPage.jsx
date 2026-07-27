import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWaybill, updateWaybill } from '../api/waybillApi';
import StaffSelect from '../components/staff/StaffSelect';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR   = (n) => Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const sum   = (...vals) => vals.reduce((a, v) => a + parseFloat(v || 0), 0);

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-800/80 bg-slate-900/80 rounded-t-2xl">
        <span className="text-orange-400">{icon}</span>
        <h3 className="text-white font-semibold text-sm tracking-wide">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function inputCls(err = '') {
  return `w-full bg-slate-800/60 border ${err ? 'border-red-500/50' : 'border-slate-600/50'} rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all`;
}

function Field({ label, error, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          {label}{required && <span className="text-orange-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function InfoBox({ label, value, className = '' }) {
  return (
    <div className={`bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-2.5 ${className}`}>
      <p className="text-slate-500 text-xs mb-0.5">{label}</p>
      <p className="text-slate-200 text-sm">{value || '—'}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm]                     = useState(null);
  const [consignors, setConsignors]         = useState([null]);
  const [errors, setErrors]                 = useState({});
  const [serverError, setServerError]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [fetching, setFetching]             = useState(true);
  const [waybillNumber, setWaybillNumber]   = useState('');

  useEffect(() => {
    async function load() {
      try {
        const w = await getWaybill(id);
        setWaybillNumber(w.waybill_number);
        setForm({
          booking_date:          w.booking_date ? w.booking_date.slice(0, 10) : '',
          from_location:         w.from_location,
          to_location:           w.to_location,
          consignee_name:        w.consignee_name,
          consignee_mobile:      w.consignee_mobile,
          consignee_address:     w.consignee_address,
          consignee_gst:         w.consignee_gst || '',
          no_of_packages:        String(w.no_of_packages),
          package_type:          w.package_type,
          weight:                String(w.weight),
          volume:                w.volume ? String(w.volume) : '',
          description:           w.description || '',
          freight:               String(w.freight),
          handling_charges:      String(w.handling_charges),
          sgst:                  String(w.sgst),
          cgst:                  String(w.cgst),
          igst:                  String(w.igst),
          payment_mode:          w.payment_mode,
          eway_bill_number:      w.eway_bill_number || '',
          eway_bill_valid_until: w.eway_bill_valid_until ? w.eway_bill_valid_until.slice(0, 10) : '',
        });
        setConsignors(w.consignors?.length ? w.consignors : [null]);
      } catch {
        setServerError('Failed to load waybill');
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id]);

  const grandTotal = form ? sum(form.freight, form.handling_charges, form.sgst, form.cgst, form.igst) : 0;

  function set(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
    setServerError('');
  }

  function handleChange(e) { set(e.target.name, e.target.value); }

  function validate() {
    const e = {};
    if (consignors.filter(Boolean).length === 0) e.consignors = 'At least one Staff/Driver is required';
    if (!form.from_location.trim())        e.from_location     = 'Required';
    if (!form.to_location.trim())          e.to_location       = 'Required';
    if (!form.consignee_name.trim())       e.consignee_name    = 'Required';
    if (!form.consignee_mobile.trim())     e.consignee_mobile  = 'Required';
    if (!form.consignee_address.trim())    e.consignee_address = 'Required';
    if (!form.package_type.trim())         e.package_type      = 'Required';
    if (!form.weight || parseFloat(form.weight) <= 0) e.weight = 'Must be > 0';
    if (!form.no_of_packages || parseInt(form.no_of_packages) < 1) e.no_of_packages = 'Min 1';
    if (form.freight === '' || parseFloat(form.freight) < 0) e.freight = 'Required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (grandTotal >= 50000 && !form.eway_bill_number.trim()) {
      const msg = `This shipment is ${INR(grandTotal)}, which requires an e-way bill under GST rules.\n\nNo e-way bill number has been entered.\n\nContinue anyway?`;
      if (!window.confirm(msg)) return;
    }

    setLoading(true);
    try {
      await updateWaybill(id, {
        ...form,
        no_of_packages:   parseInt(form.no_of_packages),
        weight:           parseFloat(form.weight),
        volume:           form.volume ? parseFloat(form.volume) : null,
        freight:          parseFloat(form.freight),
        handling_charges: parseFloat(form.handling_charges || 0),
        sgst:             parseFloat(form.sgst || 0),
        cgst:             parseFloat(form.cgst || 0),
        igst:             parseFloat(form.igst || 0),
        eway_bill_number:      form.eway_bill_number?.trim() || null,
        eway_bill_valid_until: form.eway_bill_valid_until || null,
      });
      navigate(`/waybills/${id}`);
    } catch (err) {
      setServerError(
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.msg ||
        'Failed to update waybill'
      );
    } finally { setLoading(false); }
  }

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{serverError || 'Waybill not found'}</p>
        <button onClick={() => navigate('/waybills')} className="mt-4 text-orange-400 hover:underline">← Back to Waybills</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Waybill</h1>
          <p className="text-slate-400 text-sm mt-0.5 font-mono text-orange-400">{waybillNumber}</p>
        </div>
        <button onClick={() => navigate(`/waybills/${id}`)}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Details
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Section 1: Booking Details ─────────────────────────── */}
        <Section title="Booking Details" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Waybill Number">
              <div className="flex items-center bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-2.5">
                <span className="text-orange-400 text-sm font-mono font-bold">{waybillNumber}</span>
              </div>
            </Field>
            <Field label="Booking Date" required>
              <input type="date" name="booking_date" value={form.booking_date} onChange={handleChange} className={inputCls()} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Field label="From Location" required error={errors.from_location}>
              <input name="from_location" value={form.from_location} onChange={handleChange}
                placeholder="Mumbai" className={inputCls(errors.from_location)} />
            </Field>
            <Field label="To Location" required error={errors.to_location}>
              <input name="to_location" value={form.to_location} onChange={handleChange}
                placeholder="Delhi" className={inputCls(errors.to_location)} />
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Consignor ─────────────────────────────── */}
        <Section title="Consignor (staff)" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }>
          <Field label="Assigned Staff / Drivers" required error={errors.consignors}>
            <div className="space-y-4">
              {consignors.map((consignor, index) => (
                <div key={index} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 relative">
                  {consignors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConsignors(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className={consignors.length > 1 ? 'pr-8' : ''}>
                    <StaffSelect
                      selectedstaff={consignor}
                      onSelect={(c) => {
                        const newArr = [...consignors];
                        newArr[index] = c;
                        setConsignors(newArr);
                      }}
                      onClear={() => {
                        const newArr = [...consignors];
                        newArr[index] = null;
                        setConsignors(newArr);
                      }}
                    />
                  </div>
                  {consignor && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoBox label="Phone" value={consignor.phone} />
                      <InfoBox label="Role" value={consignor.role === 'other' ? consignor.role_other_specify : consignor.role} />
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setConsignors(prev => [...prev, null])}
                className="w-full py-2.5 border border-dashed border-slate-600 rounded-xl text-slate-400 text-sm hover:text-white hover:border-orange-500/50 hover:bg-orange-500/10 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another Driver/Staff
              </button>
            </div>
          </Field>
        </Section>

        {/* ── Section 3: Consignee ─────────────────────────────── */}
        <Section title="Consignee (Receiver)" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required error={errors.consignee_name}>
              <input name="consignee_name" value={form.consignee_name} onChange={handleChange}
                placeholder="Receiver name" className={inputCls(errors.consignee_name)} />
            </Field>
            <Field label="Mobile" required error={errors.consignee_mobile}>
              <input name="consignee_mobile" value={form.consignee_mobile} onChange={handleChange}
                placeholder="+91 98765 43210" className={inputCls(errors.consignee_mobile)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Address" required error={errors.consignee_address}>
              <textarea name="consignee_address" value={form.consignee_address} onChange={handleChange}
                rows={2} placeholder="Full delivery address"
                className={`${inputCls(errors.consignee_address)} resize-none`} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="GST Number">
              <input name="consignee_gst" value={form.consignee_gst} onChange={handleChange}
                placeholder="Optional" className={inputCls()} />
            </Field>
          </div>
        </Section>

        {/* ── Section 4: Parcel Details ─────────────────────────── */}
        <Section title="Parcel Details" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="No. of Packages" required error={errors.no_of_packages}>
              <input type="number" min="1" name="no_of_packages" value={form.no_of_packages}
                onChange={handleChange} className={inputCls(errors.no_of_packages)} />
            </Field>
            <Field label="Package Type" required error={errors.package_type}>
              <input name="package_type" value={form.package_type} onChange={handleChange}
                placeholder="Box / Bag / Carton" className={inputCls(errors.package_type)} />
            </Field>
            <Field label="Weight (kg)" required error={errors.weight}>
              <input type="number" step="0.001" min="0" name="weight" value={form.weight}
                onChange={handleChange} placeholder="0.000" className={inputCls(errors.weight)} />
            </Field>
            <Field label="Volume (cm³)">
              <input type="number" step="0.001" min="0" name="volume" value={form.volume}
                onChange={handleChange} placeholder="Optional" className={inputCls()} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Description">
              <textarea name="description" value={form.description} onChange={handleChange}
                rows={2} placeholder="Contents, special instructions…"
                className={`${inputCls()} resize-none`} />
            </Field>
          </div>
        </Section>

        {/* ── Section 5: Charges ────────────────────────────────── */}
        <Section title="Charges" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Field label="Freight (₹)" required error={errors.freight}>
              <input type="number" step="0.01" min="0" name="freight" value={form.freight}
                onChange={handleChange} placeholder="0.00" className={inputCls(errors.freight)} />
            </Field>
            <Field label="Handling (₹)">
              <input type="number" step="0.01" min="0" name="handling_charges" value={form.handling_charges}
                onChange={handleChange} placeholder="0.00" className={inputCls()} />
            </Field>
            <Field label="SGST (₹)">
              <input type="number" step="0.01" min="0" name="sgst" value={form.sgst}
                onChange={handleChange} placeholder="0.00" className={inputCls()} />
            </Field>
            <Field label="CGST (₹)">
              <input type="number" step="0.01" min="0" name="cgst" value={form.cgst}
                onChange={handleChange} placeholder="0.00" className={inputCls()} />
            </Field>
            <Field label="IGST (₹)">
              <input type="number" step="0.01" min="0" name="igst" value={form.igst}
                onChange={handleChange} placeholder="0.00" className={inputCls()} />
            </Field>
          </div>
          <div className="mt-5 flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded-xl px-6 py-4">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Grand Total</p>
              <p className="text-xs text-slate-500 mt-0.5">Freight + Handling + Taxes</p>
            </div>
            <p className="text-orange-400 text-2xl font-bold">{INR(grandTotal)}</p>
          </div>
        </Section>

        {/* ── Section 5.5: E-Way Bill ───────────────────────────── */}
        <Section title={
          <div className="flex items-center gap-3">
            <span>E-Way Bill</span>
            {grandTotal >= 50000 ? (
              <span className="bg-orange-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm">
                Required — Grand Total is ₹50,000+
              </span>
            ) : (
              <span className="text-slate-500 font-normal text-xs">(Optional)</span>
            )}
          </div>
        } icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="E-Way Bill Number" required={grandTotal >= 50000}>
              <input name="eway_bill_number" value={form.eway_bill_number} onChange={handleChange}
                placeholder={grandTotal >= 50000 ? 'Required by GST rules' : 'Optional'}
                className={inputCls(grandTotal >= 50000 && !form.eway_bill_number.trim() ? 'border-orange-500' : '')} />
            </Field>
            <Field label="Valid Until">
              <input type="date" name="eway_bill_valid_until" value={form.eway_bill_valid_until}
                onChange={handleChange} className={inputCls()} />
            </Field>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Note: Generate the e-way bill on the government portal and paste the number here.
          </p>
        </Section>

        {/* ── Section 6: Payment Mode ───────────────────────────── */}
        <Section title="Payment Mode" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        }>
          <div className="flex gap-3 flex-wrap">
            {[
              { value: 'paid',   label: 'Paid',   desc: 'Freight collected from staff' },
              { value: 'topay',  label: 'To Pay', desc: 'Collected on delivery' },
              { value: 'credit', label: 'Credit', desc: 'Monthly account billing' },
            ].map(({ value, label, desc }) => (
              <label key={value}
                className={`flex-1 min-w-[140px] flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  form.payment_mode === value
                    ? 'bg-orange-500/10 border-orange-500/40'
                    : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'
                }`}>
                <input type="radio" name="payment_mode" value={value}
                  checked={form.payment_mode === value} onChange={handleChange}
                  className="mt-0.5 accent-orange-500" />
                <div>
                  <p className={`text-sm font-semibold ${form.payment_mode === value ? 'text-orange-300' : 'text-white'}`}>{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Error + Submit ─────────────────────────────────────── */}
        {serverError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-300 text-sm">{serverError}</span>
          </div>
        )}

        <div className="flex justify-end pb-8 gap-3">
          <button type="button" onClick={() => navigate(`/waybills/${id}`)}
            className="px-6 py-3 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-8 py-3 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20">
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Saving Changes…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
