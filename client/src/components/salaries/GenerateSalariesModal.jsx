import { useState, useEffect } from 'react';
import { generateSalariesDraft, generateSalariesConfirm } from '../../api/salariesApi';

export default function GenerateSalariesModal({ isOpen, onClose, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');
  
  // Start date defaults to current week's Monday
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday...
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  
  const [startDate, setStartDate] = useState(monday.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // Auto-calculate end date (Sunday) based on start date
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate]);

  async function handleFetchDrafts() {
    setLoading(true);
    setError('');
    try {
      const data = await generateSalariesDraft(startDate, endDate);
      if (data.length === 0) {
        setError('No active staff found needing a salary record for this week.');
      }
      // Initialize editable rows
      setDrafts(data.map(d => ({ ...d, base_amount: d.suggested_base_amount })));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch draft.');
    } finally {
      setLoading(false);
    }
  }

  function handleBaseAmountChange(index, value) {
    setDrafts(prev => {
      const next = [...prev];
      next[index].base_amount = value;
      return next;
    });
  }

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      const rows = drafts.map(d => ({
        staff_id: d.staff_id,
        base_amount: Number(d.base_amount) || 0
      }));

      await generateSalariesConfirm(startDate, endDate, rows);
      onComplete?.();
      onClose();
      setDrafts([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm salaries.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold text-lg">Generate Weekly Salaries</h2>
            <p className="text-slate-400 text-xs mt-1">Review and set the base amount for each staff member.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {drafts.length === 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Week Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Week End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    readOnly
                    className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-slate-400 text-sm opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                onClick={handleFetchDrafts}
                disabled={loading || !startDate}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all"
              >
                {loading ? 'Fetching...' : 'Fetch Staff List'}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  Week: <strong className="text-white">{startDate}</strong> to <strong className="text-white">{endDate}</strong>
                </span>
                <button onClick={() => setDrafts([])} className="text-emerald-400 hover:text-emerald-300 text-xs">
                  Change Week
                </button>
              </div>

              <div className="border border-slate-700/50 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800/50 border-b border-slate-700/50 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Staff Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Base Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {drafts.map((d, idx) => (
                      <tr key={d.staff_id} className="hover:bg-slate-800/20">
                        <td className="px-4 py-3 text-white font-medium">{d.name}</td>
                        <td className="px-4 py-3 text-slate-400 capitalize">{d.role.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={d.base_amount}
                            onChange={(e) => handleBaseAmountChange(idx, e.target.value)}
                            className="w-32 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-right focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {drafts.length > 0 && (
          <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Saving...' : 'Confirm & Create'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
