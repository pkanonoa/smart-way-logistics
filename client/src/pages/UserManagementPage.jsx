import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../api/usersApi';
import { useAuth } from '../context/AuthContext';

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'staff'
  });
  const [showPassword, setShowPassword] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(id, name) {
    if (id === user?.id) {
      setError('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;
    try {
      await deleteUser(id);
      setSuccess(`User "${name}" deleted successfully.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.phone.trim() || !form.password || !form.role) {
      setError('All fields are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      await createUser({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role
      });
      setSuccess('User account created successfully!');
      setForm({ name: '', phone: '', password: '', role: 'staff' });
      loadUsers();
    } catch (err) {
      const errMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to create user account.';
      setError(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">User Accounts</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage login credentials and system roles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create User Form */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 h-fit">
          <h2 className="text-white font-semibold mb-4">Create New Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-2.5 rounded-xl">
                {success}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone / Username</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-4 pr-10 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">Viewer (Read Only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors mt-2"
            >
              {submitLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Existing Users List */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
            <h2 className="text-white font-semibold">Active Login Accounts</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone / Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/10">
                    <td className="px-6 py-4 text-white font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono">{u.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        u.role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : u.role === 'accountant'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : u.role === 'viewer'
                          ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {u.role === 'viewer' ? 'viewer (read-only)' : u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== user?.id ? (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-slate-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                          title="Delete User"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium italic">Logged In</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
