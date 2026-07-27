import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, searchDashboard } from '../api/dashboardApi';

const INR = (amount) => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchDashboard(searchQuery);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      {/* Background glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white leading-tight">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Here's your Smart Way Logistics dashboard overview.</p>
        </div>

        {/* Quick Search */}
        <div ref={dropdownRef} className="relative w-full md:w-96">
          <div className="relative">
            <input
              type="text"
              placeholder="Quick search waybills, mobile, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching && (
              <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-64 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">No matching consignments found</div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {searchResults.map((wb) => (
                    <button
                      key={wb.id}
                      onClick={() => {
                        setShowDropdown(false);
                        setSearchQuery('');
                        navigate(`/waybills/${wb.id}`);
                      }}
                      className="w-full text-left p-3.5 hover:bg-slate-800/40 transition-colors flex flex-col gap-0.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white font-mono font-bold text-xs">{wb.waybill_number}</span>
                        <span className="text-slate-500 text-[10px]">{wb.from_location} &rarr; {wb.to_location}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-xs mt-0.5">
                        <span className="truncate max-w-[150px]">{wb.consignee_name}</span>
                        <span className="font-mono text-[10px] text-slate-505">{wb.consignee_mobile}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Compliance Alerts */}
          {summary?.ewayBillMissingCount > 0 && (
            <div 
              onClick={() => navigate('/waybills?eway_missing=true')}
              className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-orange-500/15 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-sm font-bold">Compliance Warning</h3>
                  <p className="text-orange-300 text-xs mt-0.5">
                    There are {summary.ewayBillMissingCount} in-transit waybills that require but are missing an E-Way Bill Number.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-orange-400 group-hover:underline flex items-center gap-1">
                Resolve Risks
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stat: Today's Bookings */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Today's Bookings</span>
                <p className="text-white text-3xl font-black mt-2">{summary?.todayBookingsCount}</p>
              </div>
              <div className="mt-8 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Parcels booked today</span>
                <span className="text-orange-400 font-bold hover:underline cursor-pointer" onClick={() => navigate('/waybills')}>View List</span>
              </div>
            </div>

            {/* Stat: In Transit */}
            <div 
              onClick={() => navigate('/waybills?status=in_transit')}
              className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between cursor-pointer hover:border-orange-500/35 transition-all group"
            >
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Parcels In Transit</span>
                <p className="text-white text-3xl font-black mt-2">{summary?.inTransitCount}</p>
              </div>
              <div className="mt-8 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Active shipments on route</span>
                <span className="text-orange-450 font-bold group-hover:underline flex items-center gap-0.5">
                  Filter List
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Stat: Delivered Today */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Delivered Today</span>
                <p className="text-white text-3xl font-black mt-2">{summary?.deliveredTodayCount}</p>
              </div>
              <div className="mt-8 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Successful deliveries today</span>
                <span className="text-slate-550">Realtime tracker</span>
              </div>
            </div>

            {/* Stat: Pending Payments */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Pending Collections</span>
                <p className="text-white text-3xl font-black mt-2">{INR(summary?.totalPendingPayments)}</p>
              </div>
              <div className="mt-8 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Pending & credit accounts</span>
                <span className="text-slate-550">Outstanding</span>
              </div>
            </div>

            {/* Stat: Today's Total Collection */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Today's Collections</span>
                <p className="text-white text-3xl font-black mt-2">{INR(summary?.todayTotalCollection)}</p>
              </div>
              <div className="mt-8 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>From daily collection register</span>
                <span className="text-orange-400 font-bold hover:underline cursor-pointer" onClick={() => navigate('/daily-collections')}>Open Register</span>
              </div>
            </div>

            {/* Stat: This Month's Income */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">This Month's Income</span>
                <p className="text-emerald-450 text-3xl font-black mt-2">{INR(summary?.thisMonthIncome)}</p>
              </div>
              <div className="mt-8 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Sum of all paid accounts</span>
                <span className="text-emerald-500/90 font-bold">Month to Date</span>
              </div>
            </div>

            {/* Stat: E-Way Bill Missing (Highlighted Card) */}
            <div 
              onClick={() => navigate('/waybills?eway_missing=true')}
              className={`backdrop-blur-sm border rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all group ${
                summary?.ewayBillMissingCount > 0 
                  ? 'bg-orange-500/10 border-orange-500/40 hover:border-orange-500/70' 
                  : 'bg-slate-900/60 border-slate-700/50 hover:border-orange-500/35'
              }`}
            >
              <div>
                <span className={`text-[10px] uppercase tracking-widest font-black ${summary?.ewayBillMissingCount > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                  E-Way Bill Missing
                </span>
                <p className={`text-3xl font-black mt-2 ${summary?.ewayBillMissingCount > 0 ? 'text-orange-400' : 'text-white'}`}>
                  {summary?.ewayBillMissingCount}
                </p>
              </div>
              <div className={`mt-8 flex justify-between items-center text-xs border-t pt-4 ${
                summary?.ewayBillMissingCount > 0 
                  ? 'border-orange-500/20 text-orange-300/80' 
                  : 'border-slate-800/80 text-slate-400'
              }`}>
                <span>In-transit compliance risk</span>
                <span className={`font-bold group-hover:underline flex items-center gap-0.5 ${summary?.ewayBillMissingCount > 0 ? 'text-orange-400' : 'text-orange-450'}`}>
                  Filter List
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
