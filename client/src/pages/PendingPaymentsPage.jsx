import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPendingPayments } from '../api/paymentsApi';
import SettlePaymentModal from '../components/payments/SettlePaymentModal';
import { useAuth } from '../context/AuthContext';

const INR = (n) => Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

export default function PendingPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  async function loadPayments() {
    setLoading(true);
    setError('');
    try {
      const data = await getPendingPayments();
      setPayments(data);
    } catch (err) {
      setError('Failed to load pending payments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  // Compute stats
  const totalPendingAmt = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const overdueCount = payments.filter(p => p.days_overdue > 0).length;
  const overdueAmt = payments.filter(p => p.days_overdue > 0).reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Payments</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage outstanding waybill invoices and credit collections</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-white">{INR(totalPendingAmt)}</p>
          <p className="text-slate-500 text-xs mt-1">{payments.length} pending payments</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Overdue Amount</p>
          <p className="text-2xl font-bold text-red-400">{INR(overdueAmt)}</p>
          <p className="text-slate-500 text-xs mt-1">{overdueCount} invoices past due date</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Upcoming Credit</p>
          <p className="text-2xl font-bold text-blue-400">{INR(totalPendingAmt - overdueAmt)}</p>
          <p className="text-slate-500 text-xs mt-1">Within normal credit term</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Waybill No</th>
                <th className="px-6 py-4">Booking Date</th>
                <th className="px-6 py-4">Consignor (Sender)</th>
                <th className="px-6 py-4">Consignee</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Overdue</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-500 text-sm">
                    No pending or outstanding payments found!
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const consignorsStr = p.waybill?.consignor_name || '—';
                  const isOverdue = p.days_overdue > 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                       <td className="px-6 py-4">
                        <Link to={`/waybills/${p.waybill_id}`} className="font-mono text-orange-400 hover:text-orange-300 font-bold hover:underline">
                          {p.waybill?.waybill_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs">
                        {p.waybill?.booking_date ? new Date(p.waybill.booking_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-200 text-sm truncate max-w-[180px]">{consignorsStr}</td>
                      <td className="px-6 py-4 text-slate-200 text-sm truncate max-w-[180px]">{p.waybill?.consignee_name}</td>
                      <td className="px-6 py-4 text-white font-semibold">{INR(p.amount)}</td>
                      <td className="px-6 py-4 text-slate-300 text-xs">
                        {p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN') : 'Immediate'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          p.status === 'credit'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="text-red-400 font-bold text-xs">
                            {p.days_overdue} days
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user?.role !== 'viewer' ? (
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <span className="text-slate-500 text-xs italic">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SettlePaymentModal
        isOpen={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onComplete={loadPayments}
      />
    </div>
  );
}
