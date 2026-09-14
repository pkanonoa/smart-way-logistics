import React, { useState, useEffect } from 'react';
import { getCompanies, createCompany, updateCompany } from '../api/companiesApi';
import { useAuth } from '../context/AuthContext';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', district: '', phone: '', address: '' });
  const [error, setError] = useState('');

  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleOpenModal = (comp = null) => {
    if (comp) {
      setEditingId(comp.id);
      setFormData({ name: comp.name, district: comp.district || '', phone: comp.phone || '', address: comp.address || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', district: '', phone: '', address: '' });
    }
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateCompany(editingId, formData);
      } else {
        await createCompany(formData);
      }
      setShowModal(false);
      loadCompanies();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save company');
    }
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 text-white max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Companies</h1>
        {canEdit && (
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-medium transition-colors">
            + New Company
          </button>
        )}
      </div>

      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Search companies..." 
          className="w-full sm:w-96 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <div className="w-8 h-8 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 border-b border-white/10 text-white/50">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">District</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                  <td className="px-6 py-4">{c.district || '—'}</td>
                  <td className="px-6 py-4">{c.phone || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    {canEdit && (
                      <button onClick={() => handleOpenModal(c)} className="text-cyan-400 hover:text-cyan-300 mr-4">Edit</button>
                    )}
                    <a href={`/reports/companies/${c.id}`} className="text-emerald-400 hover:text-emerald-300">Statement</a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-white/50">No companies found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'New'} Company</h2>
            {error && <div className="mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Company Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">District</label>
                <input value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Phone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 h-20 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-xl font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
