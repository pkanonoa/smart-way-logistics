import { useState } from 'react';
import { settlePayment } from '../../api/paymentsApi';

export default function SettlePaymentModal({ isOpen, onClose, onComplete, payment }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!paymentMethod.trim()) {
      setError('Please specify a payment method.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await settlePayment(payment.id, paymentMethod.trim());
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to settle payment.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold">Settle Waybill Payment</h2>
            <p className="text-slate-400 text-xs mt-1">Waybill: <span className="font-mono text-orange-400 font-bold">{payment.waybill?.waybill_number}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Amount to Settle
            </label>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white font-bold text-lg">
              ₹{Number(payment.amount).toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="Cash">Cash</option>
              <option value="GPay">GPay</option>
              <option value="PhonePe">PhonePe</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {paymentMethod === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Specify Method *
              </label>
              <input
                type="text"
                placeholder="e.g. Bank Transfer, UPI"
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                required
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Mark as Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
