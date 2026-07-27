import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicTracking } from '../api/waybillApi';

const STATUS_FLOW = ['booked', 'loaded', 'in_transit', 'arrived', 'out_for_delivery', 'delivered'];

export default function PublicTrackingPage() {
  const { waybill_number } = useParams();
  const [waybill, setWaybill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getPublicTracking(waybill_number);
        setWaybill(data);
      } catch (err) {
        setError('Invalid Waybill number or tracking data could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    if (waybill_number) {
      load();
    }
  }, [waybill_number]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Searching for consignment tracking details...</p>
      </div>
    );
  }

  if (error || !waybill) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 text-2xl font-bold">!</div>
        <h2 className="text-xl font-bold text-white mb-2">Tracking Failed</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">{error || 'Consignment not found'}</p>
        <p className="text-xs text-slate-500">Please check the waybill number and try again.</p>
      </div>
    );
  }

  // Find the index of current status to highlight progress
  const currentStatusIndex = STATUS_FLOW.indexOf(waybill.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-12 px-6">
      <div className="fixed top-0 left-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white tracking-wider">SMART WAY LOGISTICS</h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Public Tracking Portal</p>
        </div>

        {/* Info card */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Waybill Number</p>
              <h2 className="text-2xl font-extrabold text-orange-400 font-mono mt-0.5">{waybill.waybill_number}</h2>
            </div>
            <div className="text-right sm:text-right text-left">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Current Status</p>
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase mt-1">
                {waybill.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block text-xs uppercase">From</span>
              <span className="text-white font-medium">{waybill.from_location}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs uppercase">To</span>
              <span className="text-white font-medium">{waybill.to_location}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs uppercase">Booking Date</span>
              <span className="text-white">{new Date(waybill.booking_date).toLocaleDateString('en-IN')}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs uppercase">Packages</span>
              <span className="text-white">{waybill.no_of_packages} ({waybill.package_type})</span>
            </div>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-white font-semibold text-sm mb-6 uppercase tracking-wider">Consignment Timeline</h3>

          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
            {STATUS_FLOW.map((status, index) => {
              const trackingEntries = waybill.tracking?.filter(t => t.status === status) || [];
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div key={status} className="relative pl-10">
                  {/* Status Indicator Dot */}
                  <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 flex items-center justify-center transition-all ${
                    isCurrent ? 'bg-orange-500 border-orange-400 ring-4 ring-orange-500/20' :
                    isCompleted ? 'bg-emerald-500 border-emerald-400' :
                    'bg-slate-950 border-slate-800'
                  }`}>
                    {isCompleted && !isCurrent && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold uppercase tracking-wider ${
                      isCurrent ? 'text-orange-400' : isCompleted ? 'text-white' : 'text-slate-500'
                    }`}>
                      {status.replace(/_/g, ' ')}
                    </span>

                    {/* Show recorded updates for this status step */}
                    {trackingEntries.length > 0 ? (
                      trackingEntries.map((entry) => (
                        <div key={entry.id} className="mt-2 bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 text-xs">
                          <div className="flex justify-between items-center text-slate-400 mb-1">
                            <span>{entry.location || 'Location Not Specified'}</span>
                            <span>{new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          {entry.remarks && (
                            <p className="text-slate-300 italic">“ {entry.remarks} ”</p>
                          )}
                        </div>
                      ))
                    ) : (
                      isCompleted && (
                        <span className="text-slate-500 text-xs mt-0.5">Step completed</span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
