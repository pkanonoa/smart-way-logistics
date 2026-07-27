import { useState, useEffect } from 'react';
import { getAttendance, markAttendance } from '../../api/staffApi';

export default function AttendanceModal({ isOpen, onClose, staff }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('present');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && staff) {
      loadAttendance(date);
    }
  }, [isOpen, staff, date]);

  async function loadAttendance(selectedDate) {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const records = await getAttendance(staff.id, selectedDate);
      if (records && records.length > 0) {
        setStatus(records[0].status);
      } else {
        setStatus('present');
      }
    } catch (err) {
      setError('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await markAttendance({
        staff_id: staff.id,
        date: date,
        status: status
      });
      setSuccess('Attendance saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold text-lg">Attendance</h2>
            <p className="text-slate-400 text-sm mt-0.5">{staff.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500 focus:ring-orange-500/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all" 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${status === 'present' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'}`}>
                <input type="radio" name="status" value="present" checked={status === 'present'} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                <span className="text-sm font-medium">Present</span>
              </label>
              
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${status === 'absent' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'}`}>
                <input type="radio" name="status" value="absent" checked={status === 'absent'} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                <span className="text-sm font-medium">Absent</span>
              </label>
              
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${status === 'half-day' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'}`}>
                <input type="radio" name="status" value="half-day" checked={status === 'half-day'} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                <span className="text-sm font-medium">Half Day</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-300 text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors">Close</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20">
              {loading ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
