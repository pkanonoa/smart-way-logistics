import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getWaybills } from '../api/waybillsApi';

import { useAuth } from '../context/AuthContext';

function INR(amount) {
  return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });
}

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function WaybillsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const initialEwayMissing = searchParams.get('eway_missing') === 'true';

  const [waybills, setWaybills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ewayMissing, setEwayMissing] = useState(initialEwayMissing);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getWaybills({ search, status, startDate, endDate, eway_missing: ewayMissing });
      setWaybills(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search, status, startDate, endDate, ewayMissing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Waybills</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage and track all booked parcels</p>
          </div>
          
          {user?.role !== 'viewer' && (
            <div className="flex items-center gap-3">
              <Link to="/bookings/new" className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Booking
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 relative w-full">
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Search</label>
            <svg className="w-4 h-4 absolute left-3 top-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by Waybill Number or Consignee..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
          
          <div className="w-full md:w-44">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
            <select 
              value={status} 
              onChange={e => {
                setStatus(e.target.value);
                setSearchParams(prev => {
                  if (e.target.value) prev.set('status', e.target.value);
                  else prev.delete('status');
                  return prev;
                });
              }}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
            >
              <option value="">All Statuses</option>
              <option value="in_transit">In Transit (Active)</option>
              <option value="booked">Booked</option>
              <option value="loaded">Loaded</option>
              <option value="in_transit">In Transit</option>
              <option value="arrived">Arrived</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div className="w-full md:w-44">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]"
            />
          </div>

          <div className="w-full md:w-44">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 [color-scheme:dark]"
            />
          </div>

          {(startDate || endDate || search || status || ewayMissing) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearch('');
                setStatus('');
                setEwayMissing(false);
                setSearchParams({});
              }}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors h-10 px-2 flex items-center shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

        {ewayMissing && (
          <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-4 py-2.5 rounded-xl mb-6 flex justify-between items-center">
            <span>Currently filtering by <strong>Missing E-Way Bills (In-Transit compliance risks only)</strong>.</span>
            <button 
              onClick={() => {
                setEwayMissing(false);
                setSearchParams(prev => {
                  prev.delete('eway_missing');
                  return prev;
                });
              }}
              className="font-bold underline hover:text-orange-300"
            >
              Show All
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          {loading ? (
             <div className="flex items-center justify-center py-20">
               <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
             </div>
          ) : waybills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-white font-medium mb-1">No waybills found</p>
              <p className="text-slate-400 text-sm">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Waybill</th>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Consignee</th>
                    <th className="px-6 py-4 text-left">Route</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {waybills.map(wb => (
                    <tr key={wb.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/waybills/${wb.id}`} className="text-white font-bold hover:text-orange-400 transition-colors">
                          {wb.waybill_number}
                        </Link>
                        {wb.eway_bill_required && !wb.eway_bill_number && (
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold uppercase rounded">
                              E-Way Bill Required
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {formatDate(wb.booking_date)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{wb.consignee_name}</p>
                        <p className="text-slate-500 text-xs">{wb.no_of_packages} {wb.package_type}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-300 text-xs">
                          <span>{wb.from_location}</span>
                          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          <span>{wb.to_location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-white font-semibold">{INR(wb.grand_total)}</p>
                        <p className={`text-[10px] font-medium uppercase mt-0.5 ${wb.payment?.status === 'paid' ? 'text-emerald-400' : wb.payment?.status === 'credit' ? 'text-blue-400' : 'text-orange-400'}`}>
                          {wb.payment?.status}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                          {wb.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/waybills/${wb.id}`} className="text-sm text-orange-400 hover:text-orange-300 font-medium">
                          View
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
    </div>
  );
}
