import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import DailyCollectionsPage from './DailyCollectionsPage';
import PendingPaymentsPage from './PendingPaymentsPage';

const TABS = [
  {
    id: 'inflow',
    label: 'Inflow',
    description: 'Daily collections & trip receipts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    id: 'outflow',
    label: 'Outflow',
    description: 'Pending & settled credit payments',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 12H4" />
      </svg>
    ),
  },
];

export default function PaymentsLedgerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'outflow' ? 'outflow' : 'inflow';
  const [activeTab, setActiveTab] = useState(initialTab);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setSearchParams(activeTab !== 'inflow' ? { tab: activeTab } : {}, { replace: true });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-transparent pb-12">
      <div className="fixed top-0 left-0 w-[500px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-slate-400 text-sm mt-0.5">Ledger of all inflows and outflows</p>
        </div>

        {/* Toggle */}
        <div className="flex items-stretch gap-3 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20 shadow-[0_0_16px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-900/60 text-white/50 border-slate-700/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <div className="text-left">
                <div>{tab.label}</div>
                <div className="text-[10px] font-normal opacity-60">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'inflow'  && <DailyCollectionsPage embedded />}
        {activeTab === 'outflow' && <PendingPaymentsPage embedded />}
      </div>
    </div>
  );
}
