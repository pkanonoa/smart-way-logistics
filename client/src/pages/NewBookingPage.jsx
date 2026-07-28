import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWaybill } from '../api/waybillApi';
import StaffSelect from '../components/staff/StaffSelect';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const INR   = (n) => Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const sum   = (...vals) => vals.reduce((a, v) => a + parseFloat(v || 0), 0);

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Section({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-slate-900/60 border border-slate-700/50 rounded-2xl ${className}`}>
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

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ waybill, onNewBooking }) {
  return (
    <>
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
        }
      `}</style>
      <div>

      <div className="max-w-xl mx-auto px-6 py-16 text-center print:hidden">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
        <p className="text-slate-400 mb-8">Your waybill has been created successfully.</p>

        <div className="inline-flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl px-8 py-5 mb-6">
          <div>
            <p className="text-slate-400 text-xs mb-1">Waybill Number</p>
            <p className="text-orange-400 text-3xl font-bold tracking-widest">{waybill.waybill_number}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 mb-8 text-left space-y-2">
          <Row label="From"      value={waybill.from_location} />
          <Row label="To"        value={waybill.to_location} />
          <Row label="Consignor" value={waybill.consignor_name} />
          <Row label="Consignee" value={waybill.consignee_name} />
          <Row label="Staff/Drivers" value={waybill.assigned_staff?.map(c => c.name).join(', ') || '—'} />
          <Row label="Packages"  value={`${waybill.no_of_packages} × ${waybill.package_type}`} />
          <Row label="Payment"   value={waybill.payment_mode?.toUpperCase()} />
          
          <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
            <span className="text-slate-400 text-sm">E-Way Bill</span>
            {waybill.eway_bill_number ? (
              <span className="text-white font-mono">{waybill.eway_bill_number}</span>
            ) : waybill.eway_bill_required ? (
              <span className="text-orange-400 text-xs font-bold px-2 py-0.5 bg-orange-500/10 rounded border border-orange-500/20">
                REQUIRED - NOT ADDED
              </span>
            ) : (
              <span className="text-slate-500 text-sm">Not required</span>
            )}
          </div>

          <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
            <span className="text-slate-400 text-sm">Grand Total</span>
            <span className="text-white font-bold text-lg">{INR(waybill.grand_total)}</span>
          </div>
        </div>



        <div className="flex gap-3 justify-center">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-6 py-3 text-sm font-medium transition-all border border-slate-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          <button id="new-booking-btn" onClick={onNewBooking}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Booking
          </button>
        </div>
      </div>

      {/* Print Receipt - Shown only when printing */}
      <div id="print-receipt" className="hidden print:block bg-white text-black p-8 max-w-2xl mx-auto">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-2xl font-bold">SMART WAY LOGISTICS</h1>
          <p className="text-xs text-gray-600">Waybill / Consignment Note</p>
          <p className="text-xl font-bold mt-2">{waybill.waybill_number}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><strong>Date & Time:</strong> {new Date(waybill.booking_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          <div><strong>Payment:</strong> {waybill.payment_mode?.toUpperCase()}</div>
          <div><strong>From:</strong> {waybill.from_location}</div>
          <div><strong>To:</strong> {waybill.to_location}</div>
          <div className="col-span-2">
            <strong>Staff/Drivers:</strong> {waybill.assigned_staff?.map(c => c.name).join(', ') || '—'}
          </div>
          <div className="col-span-2">
            <strong>E-Way Bill:</strong> {waybill.eway_bill_number ? waybill.eway_bill_number : waybill.eway_bill_required ? 'REQUIRED - NOT ADDED' : 'Not Required'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border border-gray-300 rounded p-4 mb-4 text-sm">
          <div>
            <p className="font-bold text-xs uppercase mb-1">Consignor (Sender)</p>
            <p className="font-semibold">{waybill.consignor_name}</p>
            <p>{waybill.consignor_contact}</p>
            {waybill.consignor_gst && <p>GST: {waybill.consignor_gst}</p>}
            <p className="text-xs text-gray-600 mt-1">{waybill.consignor_address}</p>
          </div>
          <div>
            <p className="font-bold text-xs uppercase mb-1">Consignee (Receiver)</p>
            <p className="font-semibold">{waybill.consignee_name}</p>
            <p>{waybill.consignee_mobile}</p>
            {waybill.consignee_gst && <p>GST: {waybill.consignee_gst}</p>}
            <p className="text-xs text-gray-600 mt-1">{waybill.consignee_address}</p>
          </div>
        </div>
        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Description</th>
              <th className="border border-gray-300 p-2">Pkgs</th>
              <th className="border border-gray-300 p-2">Type</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">{waybill.description || '—'}</td>
              <td className="border border-gray-300 p-2 text-center">{waybill.no_of_packages}</td>
              <td className="border border-gray-300 p-2 text-center">{waybill.package_type}</td>
            </tr>
          </tbody>
        </table>
        <div className="text-right text-sm space-y-1">
          <p>Freight: ₹{Number(waybill.freight).toFixed(2)}</p>
          {Number(waybill.handling_charges) > 0 && <p>Handling: ₹{Number(waybill.handling_charges).toFixed(2)}</p>}
          {Number(waybill.sgst) > 0 && <p>SGST: ₹{Number(waybill.sgst).toFixed(2)}</p>}
          {Number(waybill.cgst) > 0 && <p>CGST: ₹{Number(waybill.cgst).toFixed(2)}</p>}
          {Number(waybill.igst) > 0 && <p>IGST: ₹{Number(waybill.igst).toFixed(2)}</p>}
          <p className="text-base font-bold border-t-2 border-gray-800 pt-2 mt-2">
            Grand Total: ₹{Number(waybill.grand_total).toFixed(2)}
          </p>
        </div>
        <p className="text-xs text-gray-400 text-center mt-8 border-t border-gray-200 pt-4">
          Computer-generated receipt — Smart Way Logistics
        </p>
      </div>

      </div>
    </>
  );
}

// ─── Form initial state ───────────────────────────────────────────────────────

const EMPTY = {
  booking_date:      today(),
  from_location:     '',
  to_location:       '',
  consignor_name:    '',
  consignor_contact: '',
  consignor_address: '',
  consignor_gst:     '',
  consignee_name:    '',
  consignee_mobile:  '',
  consignee_address: '',
  consignee_gst:     '',
  no_of_packages:    '1',
  package_type:      '',
  weight:            '',
  volume:            '',
  description:       '',
  freight:           '',
  handling_charges:  '0',
  sgst:              '0',
  cgst:              '0',
  igst:              '0',
  payment_mode:      'paid',
  eway_bill_number:  '',
  eway_bill_valid_until: '',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const navigate = useNavigate();

  const [form, setForm]                     = useState(EMPTY);
  const [consignors, setConsignors]           = useState([null]);
  const [errors, setErrors]                 = useState({});
  const [serverError, setServerError]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [createdWaybill, setCreatedWaybill] = useState(null);

  const grandTotal = sum(form.freight, form.handling_charges, form.sgst, form.cgst, form.igst);

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
    if (!form.consignor_name.trim())       e.consignor_name    = 'Required';
    if (!form.consignor_address.trim())    e.consignor_address = 'Required';
    if (!form.consignee_name.trim())       e.consignee_name    = 'Required';
    if (form.consignee_mobile.trim() && !/^[6-9]\d{9}$/.test(form.consignee_mobile.trim())) {
      e.consignee_mobile = 'Must be a valid 10-digit number';
    }
    if (!form.consignee_address.trim())    e.consignee_address = 'Required';
    if (!form.package_type.trim())         e.package_type      = 'Required';
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
      if (!window.confirm(msg)) {
        return;
      }
    }

    setLoading(true);
    try {
      const waybill = await createWaybill({
        ...form,
        assigned_staff_ids: consignors.filter(Boolean).map(c => c.id),
        no_of_packages: parseInt(form.no_of_packages),
        weight:         0.0,
        volume:         form.volume ? parseFloat(form.volume) : undefined,
        freight:        parseFloat(form.freight),
        handling_charges: parseFloat(form.handling_charges || 0),
        sgst:           parseFloat(form.sgst || 0),
        cgst:           parseFloat(form.cgst || 0),
        igst:           parseFloat(form.igst || 0),
        eway_bill_number: form.eway_bill_number?.trim() || undefined,
        eway_bill_valid_until: form.eway_bill_valid_until || undefined,
      });
      setCreatedWaybill(waybill);
    } catch (err) {
      setServerError(
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.msg ||
        'Failed to create waybill'
      );
    } finally { setLoading(false); }
  }

  if (createdWaybill) {
    return (
      <SuccessScreen
        waybill={createdWaybill}
        onNewBooking={() => { setCreatedWaybill(null); setForm(EMPTY); setConsignors([null]); }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">New Booking</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create a new parcel waybill</p>
        </div>
        <button onClick={() => navigate('/waybills')}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Waybills
        </button>
      </div>

      <form onSubmit={handleSubmit} id="new-booking-form" className="space-y-5">

        {/* ── Section 1: Booking Details ─────────────────────────── */}
        <Section title="Booking Details" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Waybill Number">
              <div className="flex items-center bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-2.5">
                <span className="text-slate-500 text-sm font-mono">Auto-generated on save</span>
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

        {/* ── Section 2: Consignor (Sender) ─────────────────────── */}
        <Section title="Consignor (Sender Company)" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Name" required error={errors.consignor_name}>
              <input name="consignor_name" value={form.consignor_name} onChange={handleChange}
                placeholder="Sender company name" className={inputCls(errors.consignor_name)} />
            </Field>
            <Field label="Contact Person" error={errors.consignor_contact}>
              <input name="consignor_contact" value={form.consignor_contact} onChange={handleChange}
                placeholder="Sender contact name/mobile" className={inputCls(errors.consignor_contact)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Pickup Address" required error={errors.consignor_address}>
              <textarea name="consignor_address" value={form.consignor_address} onChange={handleChange}
                rows={2} placeholder="Full pickup address"
                className={`${inputCls(errors.consignor_address)} resize-none`} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Tax / Identification Number (GST)">
              <input name="consignor_gst" value={form.consignor_gst} onChange={handleChange}
                placeholder="Optional GSTIN" className={inputCls()} />
            </Field>
          </div>
        </Section>

        {/* ── Section 2.5: Assigned Staff / Drivers ─────────────── */}
        <Section title="Assigned Staff / Drivers" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }>
          <Field label="Delivery Team" required error={errors.consignors}>
            <div className="space-y-4">
              {consignors.map((consignor, index) => (
                <div key={index} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 relative">
                  {consignors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConsignors(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  
                  <div className={consignors.length > 1 ? "pr-8" : ""}>
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
                      <InfoBox label="Phone"  value={consignor.phone} />
                      <InfoBox label="Role"    value={consignor.role === 'other' ? consignor.role_other_specify : consignor.role} />
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
            <Field label="Mobile" error={errors.consignee_mobile}>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="No. of Packages" required error={errors.no_of_packages}>
              <input type="number" min="1" name="no_of_packages" value={form.no_of_packages}
                onChange={handleChange} className={inputCls(errors.no_of_packages)} />
            </Field>
            <Field label="Package Type" required error={errors.package_type}>
              <input name="package_type" value={form.package_type} onChange={handleChange}
                placeholder="Box / Bag / Carton" className={inputCls(errors.package_type)} />
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
          {/* Live grand total */}
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
                placeholder={grandTotal >= 50000 ? "Required by GST rules" : "Optional"} 
                className={inputCls(grandTotal >= 50000 && !form.eway_bill_number.trim() ? "border-orange-500" : "")} />
            </Field>
            <Field label="Valid Until">
              <input type="date" name="eway_bill_valid_until" value={form.eway_bill_valid_until}
                onChange={handleChange} className={inputCls()} />
            </Field>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Note: You can add the e-way bill later after generating it on the government portal.
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

        <div className="flex justify-end pb-8">
          <button type="submit" disabled={loading} id="submit-booking-btn"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-8 py-3 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98]">
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Creating Waybill…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
