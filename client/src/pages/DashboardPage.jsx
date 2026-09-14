import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../api/dashboardApi';
import { getReportsSummary } from '../api/reportsApi';
import { BarChart, Bar, AreaChart, Area, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const INR = (amount) => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick search state
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [dashResult, reportsResult] = await Promise.all([
          getDashboardSummary(),
          getReportsSummary().catch(() => null)
        ]);
        setData(dashResult);
        setReportsData(reportsResult);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchFrom) params.append('from', searchFrom);
    if (searchTo) params.append('to', searchTo);
    if (searchDate) params.append('date', searchDate);
    navigate(`/assign-trips?${params.toString()}`);
  };

  // Determine current month label for highlighting
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Error loading dashboard.
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-white">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-12">
        
        {/* 1. Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Smart Way Logistics</h1>
          </div>
          <button 
            onClick={() => navigate('/bookings/new')}
            className="px-6 py-3 rounded-full font-semibold text-slate-950 transition-transform hover:scale-105 active:scale-95 bg-orange-400"
          >
            + New Booking
          </button>
        </header>

        {/* 2. Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Collections Trend */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] font-semibold mb-6 text-white/50">
              Total Collections (6 Months)
            </h2>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl h-[300px] w-full">
              {data?.monthlyCollections && data.monthlyCollections.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyCollections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333333', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => [INR(value), 'Collections']}
                      cursor={{ fill: '#333333', opacity: 0.4 }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {data.monthlyCollections.map((entry, index) => {
                        const isCurrent = entry.month.includes(new Date().getFullYear().toString()) && entry.month.startsWith(new Date().toLocaleString('en-US', { month: 'short' }));
                        return <Cell key={`cell-${index}`} fill={isCurrent ? '#06b6d4' : '#475569'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No collection data available.</div>
              )}
            </div>
          </section>

          {/* Financial Trends Area Chart */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] font-semibold mb-6 text-white/50">
              Money Collected vs Spent
            </h2>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl h-[300px] w-full">
              {reportsData?.trends && reportsData.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportsData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCollectedDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpentDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333333', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => [INR(value), undefined]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="collected" name="Money Collected" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCollectedDash)" />
                    <Area type="monotone" dataKey="spent" name="Money Spent" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorSpentDash)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading financial trends...</div>
              )}
            </div>
          </section>
        </div>

        {/* 3. Quick Trip Search */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold mb-6 text-white/50">
            Quick Trip Search
          </h2>
          <form 
            onSubmit={handleQuickSearch}
            className="rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row gap-4 items-center bg-black/40 backdrop-blur-md border border-white/10 shadow-xl"
          >
            <input 
              type="text" 
              placeholder="From Location" 
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              className="w-full lg:w-auto flex-1 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-white/30 bg-black/50 text-white border border-white/5"
            />
            <input 
              type="text" 
              placeholder="To Location" 
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              className="w-full lg:w-auto flex-1 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-white/30 bg-black/50 text-white border border-white/5"
            />
            <input 
              type="date" 
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full lg:w-auto flex-1 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-white/50 focus:text-white bg-black/50 border border-white/5 [color-scheme:dark]"
            />
            <button 
              type="submit"
              className="w-full lg:w-auto rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-8 py-4 transition-colors shrink-0"
            >
              Find Unassigned Waybills
            </button>
          </form>
        </section>

        {/* 4. Popular Routes */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold mb-6 text-white/50">
            Popular Routes This Month
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data?.popularRoutes?.map((route, idx) => (
              <div 
                key={idx}
                className="rounded-2xl p-6 flex flex-col gap-4 bg-black/40 backdrop-blur-md border border-white/10 shadow-xl"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-lg font-medium text-white truncate pr-4">
                    <span className="truncate">{route.from}</span>
                    <span className="text-white/40">&rarr;</span>
                    <span className="truncate">{route.to}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-2 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1 text-white/50">Avg Freight</div>
                    <div className="font-semibold text-lg">{INR(route.avgFreight)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider mb-1 text-white/50">Waybills</div>
                    <div className="font-semibold text-lg">{route.waybills}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.popularRoutes || data.popularRoutes.length === 0) && (
              <div className="text-sm text-white/40">No routes data for this month.</div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
