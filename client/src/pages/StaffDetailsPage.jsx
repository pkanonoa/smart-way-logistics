import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStaffSalarySummary, deleteSalaryAdjustment, deleteSalaryWeek, deleteSalaryPayment, getStaffAdvances, deleteStaffAdvance } from '../api/salariesApi';
import { getSenderPaymentHistory } from '../api/paymentsApi';
import SalaryAdjustmentModal from '../components/salaries/SalaryAdjustmentModal';
import SalaryPaymentModal from '../components/salaries/SalaryPaymentModal';
import AdvanceModal from '../components/salaries/AdvanceModal';
import EditBaseAmountModal from '../components/salaries/EditBaseAmountModal';
import CreateSingleWeekModal from '../components/salaries/CreateSingleWeekModal';
import SettlePaymentModal from '../components/payments/SettlePaymentModal';
import { useAuth } from '../context/AuthContext';

export default function StaffDetailsPage() {
  const { user } = useAuth();
  const { id } = useParams();
  
  const [data, setData] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeTab, setActiveTab] = useState('salary'); // We can add more tabs later (e.g. attendance, trips)
  
  // Payments state
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Modals state
  const [adjModalWeekId, setAdjModalWeekId] = useState(null);
  const [payModalWeek, setPayModalWeek] = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showCreateWeekModal, setShowCreateWeekModal] = useState(false);
  const [editBaseModalWeek, setEditBaseModalWeek] = useState(null);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  
  const [expandedWeeks, setExpandedWeeks] = useState({});

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [summary, advs] = await Promise.all([
        getStaffSalarySummary(id, startDate, endDate),
        getStaffAdvances(id)
      ]);
      setData(summary);
      setAdvances(advs);
    } catch (err) {
      setError('Failed to load staff details.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    try {
      const history = await getSenderPaymentHistory(id);
      setPayments(history);
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentsLoading(false);
    }
  }

  useEffect(() => { 
    loadData(); 
  }, [id, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments();
    }
  }, [id, activeTab]);

  async function handleDeleteAdjustment(adjId) {
    if (!confirm('Are you sure you want to delete this adjustment?')) return;
    try {
      await deleteSalaryAdjustment(adjId);
      loadData();
    } catch (err) {
      alert('Failed to delete adjustment');
    }
  }

  async function handleDeleteWeek(weekId) {
    if (!confirm('Are you sure you want to delete this entire salary week?')) return;
    try {
      await deleteSalaryWeek(weekId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete salary week');
    }
  }

  async function handleDeletePayment(payId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await deleteSalaryPayment(payId);
      loadData();
    } catch (err) {
      alert('Failed to delete payment');
    }
  }

  async function handleDeleteAdvance(advId) {
    if (!confirm('Are you sure you want to delete this advance?')) return;
    try {
      await deleteStaffAdvance(advId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete advance');
    }
  }

  function toggleWeek(weekId) {
    setExpandedWeeks(prev => ({ ...prev, [weekId]: !prev[weekId] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <p className="text-red-400 mb-4">{error || 'Staff not found'}</p>
        <Link to="/staff" className="text-blue-400 hover:underline">Back to Staff</Link>
      </div>
    );
  }

  const { staff, total_balance, weeks } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Profile Section */}
      <div className="bg-slate-900/60 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 text-2xl font-bold">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{staff.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                  {staff.role.replace('_', ' ')}
                </span>
                <span className="text-sm text-slate-400">Staff ID: {staff.id.split('-')[0]}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 border-b border-slate-800 md:border-b-0 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('salary')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'salary' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Salary & Payments
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'payments' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Waybill Payments
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        {activeTab === 'salary' && (
          <div className="space-y-6">
            
            {/* Balance Card */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Total Balance Owed</p>
                <h2 className={`text-4xl font-bold tracking-tight ${total_balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  ₹{total_balance.toFixed(2)}
                </h2>
              </div>
              <div className="text-sm text-slate-400">
                Across {weeks.filter(w => w.computed.balance > 0).length} unpaid/partial weeks
              </div>
            </div>

            {/* Advances Section */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Advances (Loans)</h3>
                {user?.role !== 'viewer' && (
                  <button
                    onClick={() => setShowAdvanceModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    + Record Advance
                  </button>
                )}
              </div>
              
              {advances.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No advances recorded.</p>
              ) : (
                <div className="space-y-2">
                  {advances.map(adv => (
                    <div key={adv.id} className={`flex items-center justify-between p-3 rounded-lg border ${adv.is_recovered ? 'bg-slate-800/30 border-slate-700/30 opacity-70' : 'bg-slate-800/50 border-slate-600/50'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">₹{Number(adv.amount).toFixed(2)}</span>
                          {adv.is_recovered ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">RECOVERED</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">PENDING</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{new Date(adv.date).toLocaleDateString()} - {adv.reason}</p>
                      </div>
                      {!adv.is_recovered && user?.role !== 'viewer' && (
                        <button
                          onClick={() => handleDeleteAdvance(adv.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
                          title="Delete Advance"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weeks List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">Salary History</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-transparent text-white text-xs px-2 py-1 focus:outline-none [color-scheme:dark]"
                      title="From Date"
                    />
                    <span className="text-slate-500 text-xs">to</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent text-white text-xs px-2 py-1 focus:outline-none [color-scheme:dark]"
                      title="To Date"
                    />
                  </div>
                  {user?.role !== 'viewer' && (
                    <button
                      onClick={() => setShowCreateWeekModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors border border-slate-700/50"
                    >
                      + Add Week
                    </button>
                  )}
                </div>
              </div>
              
              {weeks.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 text-center">
                  <p className="text-slate-400">No salary records generated yet.</p>
                </div>
              ) : (
                weeks.map(week => {
                  const { base_amount, computed, adjustments, payments } = week;
                  const isExpanded = expandedWeeks[week.id];

                  // Status Badge Colors
                  let statusColor = 'bg-slate-800 text-slate-400 border-slate-700'; // fallback
                  if (computed.status === 'paid') statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  else if (computed.status === 'partial') statusColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                  else if (computed.status === 'due') statusColor = 'bg-red-500/10 text-red-400 border-red-500/20';

                  // Progress bar logic
                  const progress = computed.amount_due > 0 ? Math.min(100, Math.max(0, (computed.total_paid / computed.amount_due) * 100)) : 100;
                  const barColor = computed.status === 'paid' ? 'bg-emerald-500' : computed.status === 'partial' ? 'bg-orange-500' : 'bg-red-500';

                  return (
                    <div key={week.id} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden transition-all">
                      {/* Week Header (Clickable) */}
                      <div 
                        className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        onClick={() => toggleWeek(week.id)}
                      >
                        <div className="flex-1 flex items-center gap-4">
                          <div className={`p-2 rounded-xl shrink-0 ${isExpanded ? 'bg-slate-800 text-white' : 'bg-slate-800/50 text-slate-500'}`}>
                            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium group flex items-center gap-2">
                              Week: {new Date(week.week_start_date).toLocaleDateString()} – {new Date(week.week_end_date).toLocaleDateString()}
                              {payments.length === 0 && user?.role !== 'viewer' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteWeek(week.id); }}
                                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                  title="Delete Week"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </p>
                            <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                              <span>Base: ₹{base_amount.toFixed(2)}</span>
                              {user?.role !== 'viewer' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditBaseModalWeek(week); }}
                                  className="text-blue-400 hover:text-blue-300 font-medium underline decoration-blue-400/50 underline-offset-2"
                                  title="Edit Base Amount"
                                >
                                  Edit Amount
                                </button>
                              )}
                              <span>| Net Due: ₹{computed.amount_due.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 sm:justify-end shrink-0 w-full sm:w-auto pl-14 sm:pl-0">
                          <div className="text-right">
                            <p className="text-slate-400 text-xs mb-1">Balance</p>
                            <p className={`font-bold ${computed.balance > 0 ? 'text-white' : 'text-slate-500'}`}>
                              ₹{computed.balance.toFixed(2)}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${statusColor}`}>
                            {computed.status}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar (Visual indicator of payment status) */}
                      <div className="h-1 w-full bg-slate-800">
                        <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${progress}%` }} />
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800 bg-slate-900/40 space-y-6">
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Adjustments Section */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-white">Adjustments</h4>
                                {user?.role !== 'viewer' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setAdjModalWeekId(week.id); setEditingAdjustment(null); }}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 bg-blue-500/10 rounded-lg transition-colors"
                                  >
                                    + Add Adj.
                                  </button>
                                )}
                              </div>
                              {adjustments.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No adjustments this week.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {adjustments.map(adj => {
                                    const isPos = adj.type === 'incentive' || adj.type === 'bonus';
                                    return (
                                      <li key={adj.id} className="flex justify-between items-start p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30 group">
                                        <div>
                                          <p className="text-xs text-slate-300 capitalize font-medium">{adj.type.replace('_', ' ')}</p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">{adj.reason}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <span className={`text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {isPos ? '+' : '-'}₹{Number(adj.amount).toFixed(2)}
                                          </span>
                                          {user?.role !== 'viewer' && (
                                            <div className="flex gap-2">
                                              <button 
                                                onClick={() => { setAdjModalWeekId(week.id); setEditingAdjustment(adj); }}
                                                className="text-[10px] text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                Edit
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteAdjustment(adj.id)}
                                                className="text-[10px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            {/* Payments Section */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-white">Payments</h4>
                                {(computed.status === 'due' || computed.status === 'partial') && user?.role !== 'viewer' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPayModalWeek(week); }}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 bg-emerald-500/10 rounded-lg transition-colors"
                                  >
                                    + Pay
                                  </button>
                                )}
                              </div>
                              {payments.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No payments recorded.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {payments.map(pay => (
                                    <li key={pay.id} className="flex justify-between items-start p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30 group">
                                      <div>
                                        <p className="text-xs text-slate-300 font-medium">{new Date(pay.payment_date).toLocaleDateString()}</p>
                                        {pay.notes && <p className="text-[10px] text-slate-500 mt-0.5">{pay.notes}</p>}
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-bold text-white">
                                          ₹{Number(pay.amount).toFixed(2)}
                                        </span>
                                        {user?.role !== 'viewer' && (
                                          <button 
                                            onClick={() => handleDeletePayment(pay.id)}
                                            className="text-[10px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                          </div>
                          
                          {/* Week Summary Footer */}
                          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><span className="text-slate-500">Base:</span><span className="text-slate-300">₹{base_amount.toFixed(2)}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-500">Net Due:</span><span className="text-white font-semibold">₹{computed.amount_due.toFixed(2)}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-500">Total Paid:</span><span className="text-emerald-400">₹{computed.total_paid.toFixed(2)}</span></div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sender Waybill Payment History</h3>
              
              {paymentsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-6 text-center">No payment history found for this consignor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        <th className="pb-3 pr-4">Waybill No</th>
                        <th className="pb-3 px-4">Booking Date</th>
                        <th className="pb-3 px-4">Amount</th>
                        <th className="pb-3 px-4">Due/Paid Date</th>
                        <th className="pb-3 px-4">Method</th>
                        <th className="pb-3 px-4">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/10">
                          <td className="py-3 pr-4 font-mono font-bold text-orange-400">
                            <Link to={`/waybills/${p.waybill_id}`} className="hover:underline">
                              {p.waybill?.waybill_number}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-xs">
                            {p.waybill?.booking_date ? new Date(p.waybill.booking_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">₹{Number(p.amount).toFixed(2)}</td>
                          <td className="py-3 px-4 text-slate-300 text-xs">
                            {p.status === 'paid'
                              ? `Paid: ${p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-IN') : '—'}`
                              : `Due: ${p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN') : 'Immediate'}`
                            }
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs">{p.payment_method || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                              p.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : p.status === 'credit'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {p.status !== 'paid' ? (
                              user?.role !== 'viewer' ? (
                                <button
                                  onClick={() => setSelectedPayment(p)}
                                  className="bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
                                >
                                  Settle
                                </button>
                              ) : (
                                <span className="text-slate-500 text-xs italic">Unpaid</span>
                              )
                            ) : (
                              <span className="text-slate-500 text-xs font-medium">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <SalaryAdjustmentModal
        isOpen={!!adjModalWeekId}
        onClose={() => { setAdjModalWeekId(null); setEditingAdjustment(null); }}
        salaryWeekId={adjModalWeekId}
        staffId={staff.id}
        editingAdjustment={editingAdjustment}
        onComplete={loadData}
      />
      
      <SalaryPaymentModal
        isOpen={!!payModalWeek}
        onClose={() => setPayModalWeek(null)}
        salaryWeek={payModalWeek}
        onComplete={loadData}
      />

      <AdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        staffId={staff.id}
        staffName={staff.name}
        onSaved={loadData}
      />

      <EditBaseAmountModal
        isOpen={!!editBaseModalWeek}
        onClose={() => setEditBaseModalWeek(null)}
        weekId={editBaseModalWeek?.id}
        currentBaseAmount={editBaseModalWeek?.base_amount}
        onSaved={loadData}
      />

      <CreateSingleWeekModal
        isOpen={showCreateWeekModal}
        onClose={() => setShowCreateWeekModal(false)}
        staffId={staff.id}
        staffName={staff.name}
        onComplete={loadData}
      />

      <SettlePaymentModal
        isOpen={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onComplete={loadPayments}
      />

    </div>
  );
}
