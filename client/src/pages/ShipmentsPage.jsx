import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import NewBookingPage from './NewBookingPage';
import WaybillsPage from './WaybillsPage';

const TABS = [
  { id: 'all',    label: 'All Shipments' },
  { id: 'create', label: 'Create Booking' },
];

export default function ShipmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'create' ? 'create' : 'all';
  const [activeTab, setActiveTab] = useState(initialTab);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setSearchParams(activeTab !== 'all' ? { tab: activeTab } : {}, { replace: true });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-transparent pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Shipments</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create bookings and manage all shipments</p>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-700/50 rounded-2xl mb-6 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'all' && <WaybillsPage embedded />}
        {activeTab === 'create' && <NewBookingPage embedded />}
      </div>
    </div>
  );
}
