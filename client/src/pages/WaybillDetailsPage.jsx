import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWaybill, updateWaybill, deleteWaybill, downloadWaybillPdf, updateWaybillStatus, getWaybillTracking } from '../api/waybillApi';
import { useAuth } from '../context/AuthContext';

function Badge({ status }) {
  const styles = {
    paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    credit: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

export default function WaybillDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [waybill, setWaybill] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEWayModal, setShowEWayModal] = useState(false);
  const [ewayNumber, setEwayNumber] = useState('');
  const [ewayValidUntil, setEwayValidUntil] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Status update states
  const [selectedStatus, setSelectedStatus] = useState('booked');
  const [statusLocation, setStatusLocation] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [statusPaymentStatus, setStatusPaymentStatus] = useState('pending');
  const [statusPaymentMethod, setStatusPaymentMethod] = useState('cash');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Payment edit states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentPaidDate, setPaymentPaidDate] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('cash');
  const [paymentUpdating, setPaymentUpdating] = useState(false);

  useEffect(() => {
    fetchWaybill();
  }, [id]);

  const fetchWaybill = async () => {
    setLoading(true);
    try {
      const data = await getWaybill(id);
      setWaybill(data);
      setEwayNumber(data.eway_bill_number || '');
      setEwayValidUntil(data.eway_bill_valid_until ? data.eway_bill_valid_until.slice(0, 10) : '');
      setSelectedStatus(data.status);
      setStatusPaymentStatus(data.payment?.status || 'pending');
      setStatusPaymentMethod(data.payment?.payment_method || 'cash');

      const trackingData = await getWaybillTracking(id);
      setTracking(trackingData || []);
    } catch (err) {
      setError('Failed to load waybill details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEWayBill = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const updated = await updateWaybill(id, {
        eway_bill_number: ewayNumber,
        eway_bill_valid_until: ewayValidUntil || null
      });
      setWaybill(updated);
      setShowEWayModal(false);
    } catch (err) {
      alert('Failed to update E-Way Bill');
    } finally {
      setUpdating(false);
    }
  };

  const openPaymentModal = () => {
    if (!waybill?.payment) return;
    setPaymentStatus(waybill.payment.status);
    setPaymentDueDate(waybill.payment.due_date ? waybill.payment.due_date.slice(0, 10) : '');
    setPaymentPaidDate(waybill.payment.paid_date ? waybill.payment.paid_date.slice(0, 10) : '');
    setPaymentMethodInput(waybill.payment.payment_method || 'cash');
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    setPaymentUpdating(true);
    try {
      const updated = await updateWaybill(id, {
        payment_status: paymentStatus,
        payment_due_date: paymentStatus === 'credit' ? (paymentDueDate || null) : null,
        payment_paid_date: paymentStatus === 'paid' ? (paymentPaidDate || new Date().toISOString().slice(0, 10)) : null,
        payment_method: paymentStatus === 'paid' ? paymentMethodInput : null,
      });
      setWaybill(updated);
      setShowPaymentModal(false);
    } catch (err) {
      alert('Failed to update payment status');
    } finally {
      setPaymentUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error || !waybill) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Waybill not found'}</p>
        <button onClick={() => navigate('/waybills')} className="mt-4 text-orange-400 hover:underline">
          &larr; Back to Waybills
        </button>
      </div>
    );
  }

  const isEwayExpired = waybill.eway_bill_valid_until && 
    new Date(waybill.eway_bill_valid_until) < new Date() && 
    waybill.status !== 'delivered';

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusUpdating(true);
    try {
      const payload = {
        status: selectedStatus,
        location: statusLocation,
        remarks: statusRemarks,
        payment_status: statusPaymentStatus,
        payment_method: statusPaymentStatus === 'paid' ? statusPaymentMethod : null,
      };

      const res = await updateWaybillStatus(id, payload);
      setWaybill(res.waybill);
      setStatusLocation('');
      setStatusRemarks('');
      
      // reload tracking
      const trackingData = await getWaybillTracking(id);
      setTracking(trackingData || []);
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    setSelectedStatus(nextStatus);
    try {
      const res = await updateWaybillStatus(id, { status: nextStatus });
      setWaybill(res.waybill);
      const trackingData = await getWaybillTracking(id);
      setTracking(trackingData || []);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete waybill ${waybill.waybill_number}? This will also delete the payment record and cannot be undone.`)) return;
    try {
      await deleteWaybill(id);
      navigate('/waybills');
    } catch (err) {
      alert('Failed to delete waybill');
    }
  };

  const handleDownloadPdf = async (isDuplicate = false) => {
    setPdfLoading(true);
    try {
      await downloadWaybillPdf(id, isDuplicate);
    } catch (err) {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/waybills')}
        className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1.5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Waybills
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">
              {waybill.waybill_number}
            </h1>
            {user?.role === 'viewer' ? (
              <span className="bg-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider border border-slate-700 rounded-lg px-3 py-1.5">
                {waybill.status.replace(/_/g, ' ')}
              </span>
            ) : (
              <select
                value={waybill.status}
                onChange={handleStatusChange}
                className="bg-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <option value="booked">Booked</option>
                <option value="loaded">Loaded</option>
                <option value="in_transit">In Transit</option>
                <option value="arrived">Arrived</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>
            )}
            <button 
              onClick={() => navigate(`/track/${waybill.waybill_number}`)} 
              className="text-xs text-orange-400 hover:text-orange-300 hover:underline"
            >
              Public Tracking Link
            </button>
          </div>
          <p className="text-slate-400 mt-1">Booked on {new Date(waybill.booking_date).toLocaleDateString('en-IN')}</p>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => handleDownloadPdf(false)}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white border border-slate-700 rounded-xl px-4 py-2 text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            onClick={() => handleDownloadPdf(true)}
            disabled={pdfLoading}
            title="Download as Duplicate Copy"
            className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white border border-slate-700/60 rounded-xl px-4 py-2 text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          {user?.role !== 'viewer' && (
            <>
              <button
                onClick={() => navigate(`/bookings/edit/${id}`)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl px-4 py-2 text-sm font-medium transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl px-4 py-2 text-sm font-medium transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Payment & Charges */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-orange-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment Details
            </h3>
            {user?.role !== 'viewer' && (
              <button onClick={openPaymentModal}
                className="text-xs text-orange-400 hover:text-orange-300 hover:underline transition-colors">
                Edit
              </button>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <span className="text-slate-400">Status</span>
              <div className="flex items-center gap-2">
                <Badge status={waybill.payment?.status} />
                {waybill.payment?.status === 'credit' && waybill.payment?.due_date && (
                  <span className="text-xs text-slate-500">
                    Due: {new Date(waybill.payment.due_date).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>
            </div>
            {waybill.payment?.status === 'paid' && (
              <>
                {waybill.payment?.paid_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paid Date</span>
                    <span className="text-white">{new Date(waybill.payment.paid_date).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
                {waybill.payment?.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Method</span>
                    <span className="text-white uppercase">{waybill.payment.payment_method}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Mode</span>
              <span className="text-white uppercase">{waybill.payment_mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Freight</span>
              <span className="text-white">₹{Number(waybill.freight).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold pt-3 border-t border-slate-800 text-lg">
              <span className="text-slate-300">Grand Total</span>
              <span className="text-orange-400">₹{Number(waybill.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* E-Way Bill */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-orange-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              E-Way Bill
            </h3>
            {user?.role !== 'viewer' && (
              <button onClick={() => setShowEWayModal(true)}
                className="text-xs text-orange-400 hover:text-orange-300 hover:underline transition-colors">
                Add/Edit
              </button>
            )}
          </div>
          
          {waybill.eway_bill_number ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">E-Way Bill No.</span>
                <span className="text-white font-mono">{waybill.eway_bill_number}</span>
              </div>
              {waybill.eway_bill_valid_until && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Valid Until</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      {new Date(waybill.eway_bill_valid_until).toLocaleDateString('en-IN')}
                    </span>
                    {isEwayExpired && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : waybill.eway_bill_required ? (
            <div className="text-center py-6 bg-orange-500/10 rounded-xl border border-orange-500/30 border-dashed">
              <svg className="w-6 h-6 text-orange-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-orange-400 text-sm font-semibold">E-Way Bill Required — Not Added</p>
              <p className="text-slate-400 text-xs mt-1">Shipments over ₹50,000 require an E-Way Bill</p>
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-800/40 rounded-xl border border-slate-700/40 border-dashed">
              <p className="text-slate-500 text-sm">No E-Way Bill added</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Route Details */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-orange-400 text-sm font-semibold mb-4 uppercase tracking-wider flex items-center gap-2">
            Route Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-slate-400">A</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider">From</p>
                <p className="text-white font-medium">{waybill.from_location}</p>
              </div>
            </div>
            <div className="w-0.5 h-6 bg-slate-700 ml-4"></div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-orange-400">B</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider">To</p>
                <p className="text-white font-medium">{waybill.to_location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consignee */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-orange-400 text-sm font-semibold mb-4 uppercase tracking-wider flex items-center gap-2">
            Consignee
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Name</span>
              <span className="text-white font-medium">{waybill.consignee_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mobile</span>
              <span className="text-white">{waybill.consignee_mobile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GST</span>
              <span className="text-white">{waybill.consignee_gst || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Address</span>
              <p className="text-slate-300 bg-slate-800/40 p-3 rounded-xl">{waybill.consignee_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Consignor / Staff */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 mt-6">
        <h3 className="text-orange-400 text-sm font-semibold mb-4 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Consignor (Staff / Drivers)
        </h3>
        {waybill.consignors && waybill.consignors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {waybill.consignors.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <span className="text-orange-400 text-sm font-bold">{c.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.name}</p>
                  <p className="text-slate-500 text-xs">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No staff/drivers assigned</p>
        )}
      </div>

      {/* Status Tracking & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Timeline */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-orange-400 text-sm font-semibold mb-6 uppercase tracking-wider flex items-center gap-2">
            Status History
          </h3>
          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
            {['booked', 'loaded', 'in_transit', 'arrived', 'out_for_delivery', 'delivered'].map((status, index) => {
              const currentStatusIndex = ['booked', 'loaded', 'in_transit', 'arrived', 'out_for_delivery', 'delivered'].indexOf(waybill.status);
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const entries = tracking.filter(t => t.status === status);

              return (
                <div key={status} className="relative pl-10">
                  <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 flex items-center justify-center transition-all ${
                    isCurrent ? 'bg-orange-500 border-orange-400 ring-4 ring-orange-500/20' :
                    isCompleted ? 'bg-emerald-500 border-emerald-400' :
                    'bg-slate-950 border-slate-800'
                  }`}>
                    {isCompleted && !isCurrent && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold uppercase tracking-wider ${
                      isCurrent ? 'text-orange-400' : isCompleted ? 'text-white' : 'text-slate-500'
                    }`}>
                      {status.replace(/_/g, ' ')}
                    </p>
                    {entries.map(entry => (
                      <div key={entry.id} className="mt-2 bg-slate-800/30 border border-slate-700/20 rounded-xl p-3 text-xs text-slate-300">
                        <div className="flex justify-between items-center text-slate-400 mb-1">
                          <span>{entry.location || 'Location not specified'}</span>
                          <span>{new Date(entry.timestamp).toLocaleString('en-IN')}</span>
                        </div>
                        {entry.remarks && <p className="italic">“{entry.remarks}”</p>}
                        <p className="text-[10px] text-slate-500 mt-1">Updated by: {entry.user?.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Update Status form */}
        {(user?.role === 'admin' || user?.role === 'staff') ? (
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-orange-400 text-sm font-semibold mb-4 uppercase tracking-wider">
              Update Consignment Status
            </h3>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setSelectedStatus(nextVal);
                    // Auto-prefill payment collected for topay Delivered
                    if (nextVal === 'delivered' && waybill.payment_mode === 'topay' && waybill.payment?.status === 'pending') {
                      setStatusPaymentStatus('paid');
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="booked">Booked</option>
                  <option value="loaded">Loaded</option>
                  <option value="in_transit">In Transit</option>
                  <option value="arrived">Arrived</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="returned">Returned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  value={statusLocation}
                  onChange={(e) => setStatusLocation(e.target.value)}
                  placeholder="e.g. Warehouse 3 / Delhi Hub"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Remarks</label>
                <textarea
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Additional details / comments..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Payment Status</label>
                  <select
                    value={statusPaymentStatus}
                    onChange={(e) => setStatusPaymentStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                {statusPaymentStatus === 'paid' && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wider">Payment Method</label>
                    <select
                      value={statusPaymentMethod}
                      onChange={(e) => setStatusPaymentMethod(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / Online</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={statusUpdating}
                className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20"
              >
                {statusUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-slate-500 text-sm font-medium">Status updates restricted to Staff & Admins.</p>
          </div>
        )}
      </div>

      {/* E-Way Bill Modal */}
      {showEWayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Update E-Way Bill</h3>
              <button onClick={() => setShowEWayModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateEWayBill} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">E-Way Bill Number</label>
                <input
                  type="text"
                  value={ewayNumber}
                  onChange={(e) => setEwayNumber(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Valid Until</label>
                <input
                  type="date"
                  value={ewayValidUntil}
                  onChange={(e) => setEwayValidUntil(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEWayModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={updating}
                  className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
                  {updating ? 'Saving...' : 'Save E-Way Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment Edit Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Update Payment Status</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdatePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              {paymentStatus === 'credit' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 [color-scheme:dark]"
                  />
                </div>
              )}

              {paymentStatus === 'paid' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Paid Date</label>
                    <input
                      type="date"
                      value={paymentPaidDate}
                      onChange={(e) => setPaymentPaidDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Payment Method</label>
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / Online</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={paymentUpdating}
                  className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
                  {paymentUpdating ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
