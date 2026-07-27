import { useState, useEffect } from 'react';
import { addSalaryAdjustment, updateSalaryAdjustment, getStaffAdvances } from '../../api/salariesApi';

export default function SalaryAdjustmentModal({ isOpen, onClose, onComplete, salaryWeekId, staffId, editingAdjustment }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unrecoveredAdvances, setUnrecoveredAdvances] = useState([]);
  
  const [form, setForm] = useState({
    type: 'incentive',
    amount: '',
    reason: '',
    advance_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editingAdjustment) {
        setForm({
          type: editingAdjustment.type,
          amount: editingAdjustment.amount,
          reason: editingAdjustment.reason || '',
          advance_id: editingAdjustment.advance_id || ''
        });
      } else {
        setForm({ type: 'incentive', amount: '', reason: '', advance_id: '' });
      }
      
      if (staffId && !editingAdjustment) {
        getStaffAdvances(staffId).then(data => {
          setUnrecoveredAdvances(data.filter(a => !a.is_recovered));
        }).catch(console.error);
      }
    } else {
      setUnrecoveredAdvances([]);
      setForm({ type: 'incentive', amount: '', reason: '', advance_id: '' });
      setError('');
    }
  }, [isOpen, staffId, editingAdjustment]);

  function handleChange(e) {
    const { name, value } = e.target;
    
    // Auto-fill amount and reason if an advance is selected
    if (name === 'advance_id' && value) {
      const adv = unrecoveredAdvances.find(a => a.id === value);
      if (adv) {
        setForm(prev => ({ ...prev, advance_id: value, amount: adv.amount, reason: `Advance Recovery: ${adv.reason}` }));
        return;
      }
    }

    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!form.reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (editingAdjustment) {
        await updateSalaryAdjustment(editingAdjustment.id, {
          amount: Number(form.amount),
          reason: form.reason.trim()
        });
      } else {
        await addSalaryAdjustment(salaryWeekId, {
          type: form.type,
          amount: Number(form.amount),
          reason: form.reason.trim(),
          advance_id: form.type === 'advance_recovery' ? form.advance_id : undefined
        });
      }
      onComplete?.();
      onClose();
      setForm({ type: 'incentive', amount: '', reason: '', advance_id: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add adjustment.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !salaryWeekId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-semibold">{editingAdjustment ? 'Edit Adjustment' : 'Add Adjustment'}</h2>
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Type *</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              disabled={!!editingAdjustment}
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              <option value="incentive">Incentive (+)</option>
              <option value="bonus">Bonus (+)</option>
              <option value="deduction">Deduction (-)</option>
              <option value="advance_recovery">Advance Recovery (-)</option>
              <option value="other">Other (-)</option>
            </select>
          </div>

          {form.type === 'advance_recovery' && unrecoveredAdvances.length > 0 && !editingAdjustment && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Select Advance (Optional)</label>
              <select
                name="advance_id"
                value={form.advance_id}
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">-- Manual Entry --</option>
                {unrecoveredAdvances.map(a => (
                  <option key={a.id} value={a.id}>
                    ₹{a.amount} - {new Date(a.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Reason *</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. Extra trip to Kollam"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Saving...' : (editingAdjustment ? 'Update Adjustment' : 'Add Adjustment')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
