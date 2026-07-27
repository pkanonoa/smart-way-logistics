import { useState, useEffect } from 'react';
import { getDailyLogs, recordDailyEarning } from '../api/dailyLogsApi';
import { useAuth } from '../context/AuthContext';

function INR(amount) {
  return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });
}

export default function DailyLogsPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [earningInputs, setEarningInputs] = useState({});
  const [savingId, setSavingId] = useState(null);

  async function loadData(selectedDate) {
    setLoading(true);
    setError('');
    try {
      const data = await getDailyLogs(selectedDate);
      setLogs(data.logs);
      
      // Initialize earning inputs
      const initialInputs = {};
      data.logs.forEach(log => {
        initialInputs[log.staff_id] = log.earnings_total.toString();
      });
      setEarningInputs(initialInputs);
      
    } catch (err) {
      setError('Failed to load daily logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(date);
  }, [date]);

  function handleEarningChange(staff_id, val) {
    setEarningInputs(p => ({ ...p, [staff_id]: val }));
  }

  async function handleSaveEarning(staff_id) {
    setSavingId(staff_id);
    try {
      const amount = parseFloat(earningInputs[staff_id] || '0');
      await recordDailyEarning({ staff_id, date, amount });
      
      // Update local state without full reload
      setLogs(p => p.map(log => 
        log.staff_id === staff_id ? { ...log, earnings_total: amount } : log
      ));
    } catch (err) {
      alert('Failed to save daily earning');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="fixed top-0 left-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Daily Logs & Earnings</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Track attendance, trips, advances, and record earnings for a specific day.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1">
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-white text-sm px-4 py-2 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-white font-medium mb-1">No staff records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Staff Name</th>
                    <th className="px-6 py-4 text-left">Role</th>
                    <th className="px-6 py-4 text-center">Attendance</th>
                    <th className="px-6 py-4 text-center">Trips (Waybills)</th>
                    <th className="px-6 py-4 text-right">Advances</th>
                    <th className="px-6 py-4 text-right min-w-[200px]">Daily Earning (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {logs.map(log => {
                    const isChanged = parseFloat(earningInputs[log.staff_id] || 0) !== log.earnings_total;
                    
                    return (
                      <tr key={log.staff_id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 text-white font-medium">
                          {log.name}
                          <div className="text-xs text-slate-500 font-normal">{log.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                            {log.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                            log.attendance === 'present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            log.attendance === 'absent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {log.attendance}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {log.waybills.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {log.waybills.map(wb => (
                                <span key={wb} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                  {wb}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={log.advances_total > 0 ? 'text-red-400 font-medium' : 'text-slate-500'}>
                            {log.advances_total > 0 ? INR(log.advances_total) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user?.role !== 'viewer' ? (
                              <>
                                <input 
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={earningInputs[log.staff_id] || ''}
                                  onChange={e => handleEarningChange(log.staff_id, e.target.value)}
                                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-right text-sm focus:outline-none focus:border-orange-500/50"
                                />
                                {isChanged ? (
                                  <button
                                    onClick={() => handleSaveEarning(log.staff_id)}
                                    disabled={savingId === log.staff_id}
                                    className="bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-lg shadow-orange-500/20"
                                  >
                                    {savingId === log.staff_id ? '...' : 'Save'}
                                  </button>
                                ) : (
                                  <div className="w-11"></div> // placeholder for button width
                                )}
                              </>
                            ) : (
                              <span className="text-white font-medium">{INR(log.earnings_total)}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
