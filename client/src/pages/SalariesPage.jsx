import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSalariesSummary } from '../api/salariesApi';
import GenerateSalariesModal from '../components/salaries/GenerateSalariesModal';

export default function SalariesPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const data = await getSalariesSummary();
      setStaffList(data);
    } catch (err) {
      setError('Failed to load salaries summary.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const totalOwed = staffList.reduce((sum, s) => sum + s.total_balance, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="fixed top-0 left-0 w-[500px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Salaries Overview</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Total Outstanding Balance: <strong className="text-emerald-400 text-lg">₹{totalOwed.toFixed(2)}</strong>
            </p>
          </div>

          <button
            onClick={() => setGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white
              rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20
              hover:shadow-emerald-500/30 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Generate This Week's Records
          </button>
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
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : staffList.length === 0 ? (
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
                    <th className="px-6 py-4 text-left">Phone</th>
                    <th className="px-6 py-4 text-right">Balance Owed</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {staffList.map(st => (
                    <tr key={st.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-white font-medium">{st.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                          {st.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{st.phone}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${st.total_balance > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                          ₹{st.total_balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/staff/${st.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-slate-700/50"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <GenerateSalariesModal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        onComplete={loadData}
      />
    </div>
  );
}
