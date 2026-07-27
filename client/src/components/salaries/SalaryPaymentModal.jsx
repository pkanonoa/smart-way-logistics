import { useState, useEffect } from 'react';
import { recordSalaryPayment } from '../../api/salariesApi';

export default function SalaryPaymentModal({ isOpen, onClose, onComplete, salaryWeek }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Pre-fill amount with the remaining balance
  useEffect(() => {
    if (salaryWeek?.computed?.balance > 0) {
      setForm(prev => ({ ...prev, amount: salaryWeek.computed.balance }));
    }
  }, [salaryWeek]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await recordSalaryPayment(salaryWeek.id, {
        amount: Number(form.amount),
        payment_date: form.payment_date,
        notes: form.notes.trim() || undefined
      });
      onComplete?.();
      onClose();
      // Reset is handled by unmounting or the parent
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !salaryWeek) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold">Record Payment</h2>
            <p className="text-slate-400 text-xs mt-1">Balance Due: ₹{salaryWeek.computed?.balance?.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="e.g. 500"
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                name="payment_date"
                value={form.payment_date}
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes (Optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. partial payment, rest next week"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
