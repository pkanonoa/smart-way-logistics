import { useState, useEffect, useCallback } from 'react';
import { getVehicles, deleteVehicle } from '../api/vehiclesApi';
import { useAuth } from '../context/AuthContext';
import VehicleFormModal from '../components/vehicles/VehicleFormModal';

const canEdit = (role) => role === 'admin' || role === 'staff';

export default function VehiclesPage() {
  const { user } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const loadVehicles = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await getVehicles(search);
      setVehicles(data);
    } catch {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  useEffect(() => {
    const t = setTimeout(() => loadVehicles(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, loadVehicles]);

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(v) { setEditTarget(v); setModalOpen(true); }

  function handleSaved(saved) {
    loadVehicles(searchQuery); // Reload to get fresh expiry calculations
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteVehicle(deleteTarget.id);
      setVehicles(prev => prev.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete vehicle.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Vehicles</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} total
            </p>
          </div>

          {canEdit(user?.role) && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Vehicle
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search vehicles…" className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all" />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">No vehicles found</p>
              <p className="text-slate-400 text-sm">{searchQuery ? `No results for "${searchQuery}"` : 'Add your first vehicle'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Vehicle Number</th>
                    <th className="px-6 py-4 text-left">Vehicle Name</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left hidden lg:table-cell">Insurance</th>
                    <th className="px-6 py-4 text-left hidden lg:table-cell">RC</th>
                    <th className="px-6 py-4 text-left hidden lg:table-cell">Pollution</th>
                    {canEdit(user?.role) && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-white font-medium">
                        <span className="font-mono">{v.vehicle_number}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{v.vehicle_name}</td>
                      <td className="px-6 py-4">
                        {v.is_expiring ? (
                          <div className="flex flex-col gap-1">
                            {v.expiring_warnings.map((warn, i) => (
                              <span key={i} className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${warn.includes('EXPIRED') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                                {warn}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 hidden lg:table-cell">{v.insurance_expiry ? new Date(v.insurance_expiry).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-slate-400 hidden lg:table-cell">{v.rc_expiry ? new Date(v.rc_expiry).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-slate-400 hidden lg:table-cell">{v.pollution_expiry ? new Date(v.pollution_expiry).toLocaleDateString() : '—'}</td>
                      {canEdit(user?.role) && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {user?.role === 'admin' && (
                              <button onClick={() => setDeleteTarget(v)} className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <VehicleFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} vehicle={editTarget} />

      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Vehicle</h3>
            <p className="text-slate-400 text-sm mb-5">
              Are you sure you want to delete <span className="text-white font-medium">{deleteTarget.vehicle_number}</span>? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
