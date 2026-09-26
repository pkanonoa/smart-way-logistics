import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTrips, deleteTrip } from '../api/tripsApi';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/rbac';
import ConfirmModal from '../components/common/ConfirmModal';

const STATUS_STYLES = {
  draft:       'bg-slate-800 text-slate-300 border-slate-700',
  in_progress: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  completed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const STATUS_LABELS = {
  draft:       'Draft',
  in_progress: 'In Progress',
  completed:   'Completed',
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TripsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState(null);

  async function loadTrips() {
    setLoading(true);
    setError('');
    try {
      const data = await getTrips({
        ...(filterStatus   ? { status: filterStatus } : {}),
        ...(filterDistrict ? { district: filterDistrict } : {}),
      });
      setTrips(data || []);
    } catch (err) {
      setError('Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadTrips, 300);
    return () => clearTimeout(t);
  }, [filterStatus, filterDistrict]);

  function handleDelete(id) {
    setConfirmDeleteTripId(id);
  }

  async function executeDeleteTrip() {
    if (!confirmDeleteTripId) return;
    const id = confirmDeleteTripId;
    setConfirmDeleteTripId(null);
    setDeletingId(id);
    try {
      await deleteTrip(id);
      setTrips(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('Failed to delete trip.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-transparent pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Trips</h1>
            <p className="text-slate-400 text-sm mt-0.5">Plan and manage multi-stop district runs</p>
          </div>
          <button
            onClick={() => navigate('/trips/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Trip
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Filter by district..."
            value={filterDistrict}
            onChange={e => setFilterDistrict(e.target.value)}
            className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">No trips found</p>
              <p className="text-slate-400 text-sm">Create a new trip to start planning routes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">District</th>
                    <th className="px-6 py-4 text-left">Driver</th>
                    <th className="px-6 py-4 text-left">Vehicle</th>
                    <th className="px-6 py-4 text-center">Stops</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {trips.map(trip => (
                    <tr key={trip.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300">{formatDate(trip.trip_date)}</td>
                      <td className="px-6 py-4 text-white font-medium">{trip.district}</td>
                      <td className="px-6 py-4 text-slate-300">{trip.driver?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="text-white text-xs font-mono">{trip.vehicle?.vehicle_number}</div>
                        {trip.vehicle?.vehicle_name && (
                          <div className="text-slate-500 text-xs">{trip.vehicle.vehicle_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold">
                          {trip._count?.stops ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[trip.status]}`}>
                          {STATUS_LABELS[trip.status] || trip.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/trips/${trip.id}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors border border-slate-700/50"
                          >
                            Open
                          </Link>
                          {isAdmin(user) && (
                            <button
                              onClick={() => handleDelete(trip.id)}
                              disabled={deletingId === trip.id}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors border border-red-500/20 disabled:opacity-50"
                            >
                              {deletingId === trip.id ? '…' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteTripId}
        title="Delete Trip"
        message="Are you sure you want to delete this trip and all its associated stops?"
        confirmText="Delete Trip"
        cancelText="Cancel"
        type="danger"
        onConfirm={executeDeleteTrip}
        onCancel={() => setConfirmDeleteTripId(null)}
      />
    </div>
  );
}
