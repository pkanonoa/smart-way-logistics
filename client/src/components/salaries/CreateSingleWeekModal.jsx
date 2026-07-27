import React, { useState, useEffect } from 'react';
import { generateSalariesConfirm } from '../../api/salariesApi';

export default function CreateSingleWeekModal({ isOpen, onClose, staffId, staffName, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Defaults to Monday of current week
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  
  const [startDate, setStartDate] = useState(monday.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [baseAmount, setBaseAmount] = useState('');

  // Default end date is 6 days after start date, but user can change it manually!
  useEffect(() => {
    if (startDate && !endDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Start and End dates are required.');
      return;
    }
    if (Number(baseAmount) < 0) {
      setError('Base amount cannot be negative.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Re-using the bulk generate-confirm endpoint for a single row
      await generateSalariesConfirm(startDate, endDate, [{
        staff_id: staffId,
        base_amount: Number(baseAmount) || 0
      }]);
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create salary week.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Generate Week for {staffName}</h2>
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              required
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              required
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">You can adjust this for mid-week joiners.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Base Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              placeholder="e.g. 5000"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-800">
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
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Creating...' : 'Create Week'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
