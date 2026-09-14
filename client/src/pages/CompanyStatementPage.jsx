import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompanyStatement } from '../api/companiesApi';

const INR = (amount) => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function CompanyStatementPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);
  
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);

  useEffect(() => {
    loadStatement();
  }, [companyId, from, to]);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const res = await getCompanyStatement(companyId, { from, to });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load statement');
    }
    setLoading(false);
  };

  if (loading && !data) {
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
          <p className="text-red-400 mb-4">{error || 'Company not found'}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-800 rounded-lg">Go Back</button>
        </div>
      </div>
    );
  }

  const { company, summary, rows = [] } = data;
  const currentDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen font-sans text-white print:text-black print:bg-white pb-12">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      `}</style>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col print:p-0 print:m-0 print:max-w-none">
        
        {/* Top Control Header (Screen Only) */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <div>
            <button onClick={() => navigate(-1)} className="text-cyan-400 text-xs font-bold mb-2 flex items-center gap-1 hover:text-cyan-300">
              &larr; Back
            </button>
            <h1 className="text-2xl font-bold text-white">Company Statement</h1>
            <p className="text-sm text-slate-400 mt-0.5">Passbook statement for {company.name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700/60 shadow-xl">
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={from} 
                onChange={e => setFrom(e.target.value)} 
                className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]" 
              />
              <span className="text-slate-400 text-xs">to</span>
              <input 
                type="date" 
                value={to} 
                onChange={e => setTo(e.target.value)} 
                className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]" 
              />
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Statement
            </button>
          </div>
        </header>

        {/* Bank Passbook Statement Card Container */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl print:bg-white print:border-none print:shadow-none print:p-0 print:m-0 w-full">
          
          {/* Letterhead */}
          <div className="border-b border-slate-700/60 pb-6 mb-6 print:border-slate-300 print:pb-4 print:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center font-black text-black text-base print:bg-black print:text-white shrink-0">
                  S
                </div>
                <h1 className="text-xl font-extrabold text-white print:text-black tracking-tight uppercase">
                  SMART WAY LOGISTICS
                </h1>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Express Cargo &amp; Parcel Logistics
              </p>
            </div>

            <div className="sm:text-right">
              <h2 className="text-lg font-bold text-cyan-400 print:text-black uppercase tracking-wider">
                Statement of Account
              </h2>
              <p className="text-xs text-slate-300 print:text-slate-800 font-semibold mt-0.5">
                Period: {formatDate(from)} to {formatDate(to)}
              </p>
              <p className="text-[11px] text-slate-500 print:text-slate-500 mt-0.5">
                Generated on {currentDateStr}
              </p>
            </div>
          </div>

          {/* Party Details Block */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 mb-6 print:bg-slate-50 print:border-slate-300 print:rounded-none print:p-4">
            <h3 className="text-[10px] font-bold text-cyan-400 print:text-slate-600 uppercase tracking-widest mb-1">
              Account Holder Details
            </h3>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
              <div>
                <h4 className="text-xl font-bold text-white print:text-black">{company.name}</h4>
                <p className="text-xs text-slate-400 print:text-slate-700 mt-0.5">
                  {company.district ? `${company.district} District` : ''}
                  {company.district && company.address ? ' • ' : ''}
                  {company.address || ''}
                </p>
              </div>
              {company.phone && (
                <div className="text-xs text-slate-400 print:text-slate-800 font-medium">
                  Phone: <span className="text-white print:text-black font-semibold">{company.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 print:grid-cols-6 print:gap-2 print:mb-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-semibold text-slate-400 print:text-slate-500 uppercase">Shipments</span>
              <div className="text-sm font-bold text-white print:text-black mt-0.5">{summary.totalShipments}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-semibold text-slate-400 print:text-slate-500 uppercase">Wt Sent</span>
              <div className="text-sm font-bold text-white print:text-black mt-0.5">{summary.totalWeightSent} kg</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-semibold text-slate-400 print:text-slate-500 uppercase">Wt Received</span>
              <div className="text-sm font-bold text-white print:text-black mt-0.5">{summary.totalWeightReceived} kg</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-semibold text-slate-400 print:text-slate-500 uppercase">Total Debit</span>
              <div className="text-sm font-bold text-red-400 print:text-black mt-0.5">{INR(summary.totalDebit)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-semibold text-slate-400 print:text-slate-500 uppercase">Total Credit</span>
              <div className="text-sm font-bold text-emerald-400 print:text-black mt-0.5">{INR(summary.totalCredit)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 print:bg-slate-100 print:border-slate-400 print:rounded-none">
              <span className="text-[10px] font-semibold text-slate-400 print:text-slate-600 uppercase">Closing Balance</span>
              <div className={`text-sm font-bold mt-0.5 print:text-black ${summary.closingBalance < 0 ? 'text-red-400' : summary.closingBalance > 0 ? 'text-emerald-400' : 'text-white'}`}>
                {INR(summary.closingBalance)}
              </div>
            </div>
          </div>

          {/* Passbook Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-slate-300 print:rounded-none">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="print:table-header-group">
                <tr className="border-b border-slate-700 text-slate-400 uppercase text-[11px] font-bold bg-slate-900/90 print:bg-slate-100 print:text-slate-800 print:border-slate-400">
                  <th className="px-4 py-3 w-28">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right w-32">Debit (₹)</th>
                  <th className="px-4 py-3 text-right w-32">Credit (₹)</th>
                  <th className="px-4 py-3 text-right w-36">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {/* Opening Balance Row */}
                <tr className="bg-slate-800/30 font-semibold print:bg-slate-50 print:break-inside-avoid">
                  <td className="px-4 py-3 text-slate-400 print:text-slate-700 whitespace-nowrap">{formatDate(from)}</td>
                  <td className="px-4 py-3 text-slate-300 print:text-slate-900" colSpan={3}>
                    Opening Balance
                  </td>
                  <td className={`px-4 py-3 text-right font-bold whitespace-nowrap print:text-black ${summary.openingBalance < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                    {INR(summary.openingBalance)}
                  </td>
                </tr>

                {/* Transaction Rows */}
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 print:hover:bg-transparent print:break-inside-avoid">
                    <td className="px-4 py-3 text-slate-300 print:text-slate-800 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-white print:text-black">
                      <div className="font-medium">{row.description}</div>
                      {row.weight > 0 && (
                        <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
                          Weight: {row.weight} kg
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 print:text-black font-semibold whitespace-nowrap">
                      {row.debit > 0 ? INR(row.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 print:text-black font-semibold whitespace-nowrap">
                      {row.credit > 0 ? INR(row.credit) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap print:text-black ${row.runningBalance < 0 ? 'text-red-400' : row.runningBalance > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {INR(row.runningBalance)}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr className="print:break-inside-avoid">
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 print:text-slate-600">
                      No transaction entries found for this period.
                    </td>
                  </tr>
                )}

                {/* Closing Balance Row */}
                <tr className="border-t-2 border-slate-700 bg-slate-900/90 font-bold text-white print:bg-slate-100 print:border-slate-400 print:text-black print:break-inside-avoid">
                  <td className="px-4 py-3 text-slate-400 print:text-slate-700 whitespace-nowrap">{formatDate(to)}</td>
                  <td className="px-4 py-3">Closing Balance</td>
                  <td className="px-4 py-3 text-right text-red-400 print:text-black font-bold whitespace-nowrap">
                    {summary.totalDebit > 0 ? INR(summary.totalDebit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 print:text-black font-bold whitespace-nowrap">
                    {summary.totalCredit > 0 ? INR(summary.totalCredit) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-black whitespace-nowrap print:text-black ${summary.closingBalance < 0 ? 'text-red-400' : 'text-white'}`}>
                    {INR(summary.closingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statement Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-slate-500 print:border-slate-300 print:text-slate-600 print:mt-6">
            Statement generated on {currentDateStr} — Smart Way Logistics.
          </div>

        </div>
      </div>
    </div>
  );
}
