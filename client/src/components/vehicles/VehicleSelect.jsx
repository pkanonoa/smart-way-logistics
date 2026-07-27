import { useState, useEffect, useRef, useCallback } from 'react';
import { getVehicles } from '../../api/vehiclesApi';
import VehicleFormModal from './VehicleFormModal';

export default function VehicleSelect({
  onSelect,
  selectedVehicle = null,
  onClear,
  placeholder = 'Search by vehicle number or name…',
  label,
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getVehicles(q.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }

  function handleSelect(vehicle) {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect?.(vehicle);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    onClear?.();
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (document.getElementById('vehicle-form')?.contains(e.target)) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const quickAddData = { vehicle_number: query.trim() };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {selectedVehicle ? (
        <div className="flex items-center justify-between bg-slate-800/60 border border-orange-500/30 rounded-xl px-4 py-3">
          <div>
            <p className="text-white text-sm font-medium">{selectedVehicle.vehicle_number}</p>
            <p className="text-slate-400 text-xs">{selectedVehicle.vehicle_name}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-white transition-colors ml-3"
            aria-label="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {loading ? (
              <svg className="w-4 h-4 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white
              placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50
              focus:border-orange-500/50 transition-all duration-200"
          />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-[200] mt-1 w-full bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden">
          {results.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => handleSelect(vehicle)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-orange-400 text-xs font-bold">
                  {vehicle.vehicle_number.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-white text-sm font-medium">{vehicle.vehicle_number}</p>
                  {vehicle.is_expiring && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      EXP
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{vehicle.vehicle_name}</span>
                </div>
              </div>
            </button>
          ))}

          <div className="border-t border-slate-800/80 bg-slate-900/50 p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setShowQuickAddModal(true); }}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-orange-400 font-medium hover:bg-orange-500/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Vehicle
            </button>
          </div>
        </div>
      )}

      {open && results.length === 0 && query.length > 0 && !loading && (
        <div className="absolute z-[200] mt-1 w-full bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl p-4 text-center">
          <p className="text-sm text-slate-400 mb-3">No vehicles found matching "{query}"</p>
          <button
            type="button"
            onClick={() => { setOpen(false); setShowQuickAddModal(true); }}
            className="inline-flex items-center gap-2 py-2 px-4 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg text-sm font-medium transition-colors border border-orange-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add "{query}" as New Vehicle
          </button>
        </div>
      )}

      <VehicleFormModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSaved={(saved) => handleSelect(saved)}
        initialData={quickAddData}
      />
    </div>
  );
}
