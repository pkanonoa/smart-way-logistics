import { useState, useEffect } from 'react';
import { getActivityLogs } from '../../api/activityLogsApi';

export default function ActivityHistory({ module, recordId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError('');
      try {
        const data = await getActivityLogs({ module, recordId });
        setLogs(data || []);
      } catch (err) {
        setError('Failed to load edit history.');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [module, recordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-xs py-4 text-center">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-slate-500 text-xs py-6 text-center italic">
        No edit history found.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 text-xs bg-slate-800/20 border border-slate-700/30 rounded-xl p-3 hover:border-slate-700/50 transition-colors">
          <div className="flex-1">
            <p className="text-slate-300 leading-relaxed font-medium">{log.description}</p>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
              <span className="font-semibold text-slate-400">By: {log.user_name || 'System'}</span>
              <span>•</span>
              <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span className="uppercase text-orange-400/80 font-bold bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 rounded text-[8px]">
                {log.action}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
