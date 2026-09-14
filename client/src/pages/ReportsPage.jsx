import React, { useState, useEffect } from 'react';
import { getReportsSummary, downloadReportBlob } from '../api/reportsApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getCompanies } from '../api/companiesApi';
import { useNavigate } from 'react-router-dom';

const INR = (amount) => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportDate, setExportDate] = useState(new Date().toISOString().substring(0, 10));
  const [exportRange, setExportRange] = useState('monthly');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [reportType, setReportType] = useState('overview');
  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getReportsSummary();
        if (result && result.stats) {
          setData(result);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Failed to load reports summary:', err);
        setError(err.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (reportType === 'company_statement' && companySearch.length > 1) {
      const timer = setTimeout(() => {
        getCompanies({ search: companySearch }).then(setCompanies).catch(console.error);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCompanies([]);
    }
  }, [reportType, companySearch]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const blob = await downloadReportBlob('/reports/bookings', { range: exportRange, date: exportDate }, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportRange}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report data');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async (waybillNumber) => {
    const win = window.open('about:blank', '_blank');
    try {
      const blob = await downloadReportBlob(`/waybills/${waybillNumber}/pdf`, {}, 'pdf');
      const url = window.URL.createObjectURL(blob);
      if (win) {
        win.location.href = url;
      }
    } catch (err) {
      if (win) win.close();
      console.error('PDF print failed', err);
      alert('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'No data available'}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  const filteredWaybills = data?.recentWaybills?.filter(w => 
    w.waybill_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.consignee.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen font-sans text-white pb-12">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports &amp; Overview</h1>
            <p className="text-sm text-slate-400 mt-1">Key metrics and recent operational logs</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-xl">
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="bg-black/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors font-semibold text-cyan-400"
            >
              <option value="overview">Overview</option>
              <option value="company_statement">Company Statement</option>
            </select>
            
            {reportType === 'overview' && (
              <>
                <select 
                  value={exportRange} 
                  onChange={e => setExportRange(e.target.value)} 
                  className="bg-black/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
            <input 
              type="date" 
              value={exportDate} 
              onChange={e => setExportDate(e.target.value)} 
              className="bg-black/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white/70 outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]" 
            />
            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-emerald-400 px-4 py-2 rounded-xl text-xs font-semibold border border-emerald-500/20 transition-colors cursor-pointer"
            >
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              {exporting ? 'Exporting...' : 'PDF'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            </>
            )}
          </div>
        </header>

        {reportType === 'company_statement' ? (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-white">Search Company</h2>
            <div className="relative max-w-md">
              <input 
                type="text" 
                placeholder="Type company name..." 
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder:text-white/30"
              />
              {companies.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  {companies.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => navigate(`/reports/companies/${c.id}`)}
                      className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm text-white flex justify-between items-center transition-colors"
                    >
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-xs text-white/40">{c.district || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
        {/* Top Stat Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Waybills This Month', val: data.stats.waybills.value, delta: data.stats.waybills.delta, prefix: '' },
            { label: 'Money Collected', val: data.stats.collected.value, delta: data.stats.collected.delta, prefix: '₹' },
            { label: 'Money Spent', val: data.stats.spent.value, delta: data.stats.spent.delta, prefix: '₹' },
            { label: 'Net Balance', val: data.stats.net.value, delta: data.stats.net.delta, prefix: '₹', isRed: data.stats.net.value < 0 },
            { label: 'Pending Deliveries', val: data.stats.pending.value, delta: null, prefix: '' }
          ].map((stat, i) => (
            <div key={i} className="bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between border border-white/10 shadow-xl">
              <span className="text-xs font-semibold text-white/50 mb-2">{stat.label}</span>
              <div className="flex items-end justify-between gap-2">
                <span className={`text-2xl font-bold ${stat.isRed ? 'text-red-400' : 'text-white'}`}>
                  {stat.prefix === '₹' ? INR(stat.val) : stat.val}
                </span>
                {stat.delta !== null && stat.delta !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stat.delta > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {stat.delta > 0 ? '+' : ''}{stat.delta.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Left Column */}
          <div className="flex-1 flex flex-col gap-8 min-w-0">
            
            {/* Trends Chart */}
            <section className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
              <h2 className="text-sm font-bold mb-6 text-white">Financial Trends (6 Months)</h2>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="collected" name="Money Collected" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" />
                    <Area type="monotone" dataKey="spent" name="Money Spent" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Recent Waybills Table */}
            <section className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-sm font-bold text-white">Recent Waybills</h2>
                <input 
                  type="text"
                  placeholder="Search by Waybill No or Consignee..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-black/50 border border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-cyan-500 w-full sm:w-64 text-white placeholder:text-white/30"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-semibold uppercase tracking-wider bg-black/30">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Waybill No</th>
                      <th className="px-5 py-3">Route</th>
                      <th className="px-5 py-3">Consignee</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Payment</th>
                      <th className="px-5 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80 font-medium">
                    {filteredWaybills.map((w, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => setExpandedRowId(expandedRowId === w.waybill_number ? null : w.waybill_number)}
                          className={`hover:bg-white/5 cursor-pointer transition-colors ${expandedRowId === w.waybill_number ? 'bg-white/10' : ''}`}
                        >
                          <td className="px-5 py-4">{w.date}</td>
                          <td className="px-5 py-4 font-bold text-white">{w.waybill_number}</td>
                          <td className="px-5 py-4 truncate max-w-[150px]">{w.route}</td>
                          <td className="px-5 py-4 truncate max-w-[150px]">{w.consignee}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white/70 border border-white/10">
                              {w.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              w.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                              w.payment_status === 'pending' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {w.payment_status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            <svg className={`w-4 h-4 transition-transform ${expandedRowId === w.waybill_number ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>
                        {/* Expanded Detail Row */}
                        {expandedRowId === w.waybill_number && (
                          <tr className="bg-black/30">
                            <td colSpan={7} className="px-5 py-4 border-l-4 border-cyan-500">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex gap-8">
                                  <div>
                                    <div className="text-[10px] text-white/50 uppercase font-bold mb-1">Freight Amount</div>
                                    <div className="text-sm font-bold text-white">{INR(w.freight)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-white/50 uppercase font-bold mb-1">Assigned Staff</div>
                                    <div className="text-sm text-white/80">{w.staff}</div>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => handlePrintPdf(w.waybill_number)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 transition-colors">
                                    View PDF
                                  </button>
                                  <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 transition-colors">
                                    Track Status
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {filteredWaybills.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                          No recent waybills found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Sidebar Columns */}
          <div className="w-full lg:w-80 flex flex-col gap-8 shrink-0">
            
            {/* This Week */}
            <section className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-5">This Week</h2>
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <span className="text-xs font-semibold text-white/50">Deliveries Completed</span>
                  <span className="text-xl font-bold text-white">{data.sidebar.deliveriesCompleted}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <span className="text-xs font-semibold text-white/50">On-Time Rate</span>
                  <span className="text-xl font-bold text-emerald-400">{data.sidebar.onTimeRate}%</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-white/50">Active Trips Today</span>
                  <span className="text-xl font-bold text-cyan-400">{data.sidebar.activeTrips}</span>
                </div>
              </div>
            </section>

            {/* Top Routes */}
            <section className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-5">Top Routes (This Month)</h2>
              <div className="flex flex-col gap-4">
                {data.sidebar.topRoutes.map((route, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-[10px] font-bold text-white/50 border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium text-white/80 truncate max-w-[150px]">{route.route}</span>
                    </div>
                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded-md border border-white/10">
                      {route.count}
                    </span>
                  </div>
                ))}
                {data.sidebar.topRoutes.length === 0 && (
                  <div className="text-xs text-white/50">No route data for this month.</div>
                )}
              </div>
            </section>
            
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
