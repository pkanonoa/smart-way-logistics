import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getstaffs, deletestaff } from '../api/staffApi';
import { useAuth } from '../context/AuthContext';
import StaffFormModal from '../components/staff/StaffFormModal';
import AttendanceModal from '../components/staff/AttendanceModal';

const canEdit = (role) => role === 'admin' || role === 'staff';

export default function StaffPage() {
  const { user } = useAuth();

  const [staffs, setstaffs]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null); // null = create mode

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceTarget, setAttendanceTarget] = useState(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  // ── Fetch all staffs ────────────────────────────────────────────────
  const loadstaffs = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await getstaffs(search);
      setstaffs(data);
    } catch {
      setError('Failed to load staffs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadstaffs(); }, [loadstaffs]);

  // ── Search (page-level, full table filter via API) ─────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => loadstaffs(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, loadstaffs]);

  // ── Handlers ───────────────────────────────────────────────────────────

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(c)  { setEditTarget(c);    setModalOpen(true); }
  function openAttendance(c) { setAttendanceTarget(c); setAttendanceModalOpen(true); }

  function handleSaved(saved) {
    setstaffs((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deletestaff(deleteTarget.id);
      setstaffs((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete staff member.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Decorative glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Staff</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {staffs.length} staff{staffs.length !== 1 ? 's' : ''} total
            </p>
          </div>

          {canEdit(user?.role) && (
            <button
              id="add-staff-btn"
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white
                rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20
                hover:shadow-orange-500/30 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Staff
            </button>
          )}
        </div>

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="staff-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white
                placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50
                focus:border-orange-500/50 transition-all"
            />
          </div>
        </div>

        {/* ── Error state ─────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : staffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">No staffs found</p>
              <p className="text-slate-400 text-sm">
                {searchQuery ? `No results for "${searchQuery}"` : 'Add your first staff member to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Staff</th>
                    <th className="px-6 py-4 text-left">Role</th>
                    <th className="px-6 py-4 text-left">Phone</th>
                    <th className="px-6 py-4 text-left hidden lg:table-cell">Added</th>
                    {canEdit(user?.role) && (
                      <th className="px-6 py-4 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {staffs.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Name + address */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20
                            flex items-center justify-center shrink-0">
                            <span className="text-orange-400 text-sm font-bold">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <Link to={`/staff/${c.id}`} className="text-white font-medium hover:text-orange-400 transition-colors">
                              {c.name}
                            </Link>
                            <p className="text-slate-500 text-xs truncate">{c.address}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                          {c.role === 'other' && c.role_other_specify ? c.role_other_specify : c.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {c.phone}
                      </td>

                      <td className="px-6 py-4 text-slate-400 hidden lg:table-cell">
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>

                      {canEdit(user?.role) && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openAttendance(c)}
                              className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                              aria-label="Attendance"
                              title="Attendance"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEdit(c)}
                              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-all"
                              aria-label="Edit staff"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => setDeleteTarget(c)}
                                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                                aria-label="Delete staff"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
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

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <StaffFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        staff={editTarget}
      />

      <AttendanceModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        staff={attendanceTarget}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Delete staff?</h3>
                <p className="text-slate-400 text-sm">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-6">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>?
            </p>
            {deleteError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
