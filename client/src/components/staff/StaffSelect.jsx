import { useState, useEffect, useRef, useCallback } from 'react';
import { getstaffs } from '../../api/staffApi';
import StaffFormModal from './StaffFormModal';

/**
 * Reusable staff search/autocomplete component with Quick Add.
 *
 * Props:
 *  - onSelect(staff)   — called when a result row is clicked; receives the full staff object
 *  - selectedstaff     — currently selected staff (controlled, optional)
 *  - onClear()          — called when the selection is cleared
 *  - placeholder        — input placeholder text
 *  - label              — label text shown above the input
 *  - className          — extra wrapper className
 */
export default function StaffSelect({
  onSelect,
  selectedstaff = null,
  onClear,
  placeholder = 'Search by name or phone…',
  label,
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Quick Add state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // ── Debounced search ────────────────────────────────────────────────────
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
        const data = await getstaffs(q.trim());
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

  function handleSelect(staff) {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect?.(staff);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    onClear?.();
  }

  // ── Close dropdown on outside click ────────────────────────────────────
  useEffect(() => {
    function onClickOutside(e) {
      // Don't close if clicking inside the modal
      if (document.getElementById('staff-form')?.contains(e.target)) return;
      
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Determine initial data for quick add based on whether query looks like a phone number
  const isPhoneQuery = /^\+?[\d\s-]{5,}$/.test(query.trim());
  const quickAddData = isPhoneQuery 
    ? { phone: query.trim() } 
    : { name: query.trim() };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* ── Selected staff chip ── */}
      {selectedstaff ? (
        <div className="flex items-center justify-between bg-slate-800/60 border border-orange-500/30 rounded-xl px-4 py-3">
          <div>
            <p className="text-white text-sm font-medium">{selectedstaff.name}</p>
            <p className="text-slate-400 text-xs">{selectedstaff.phone}</p>
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
        /* ── Search input ── */
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

      {/* ── Dropdown results ── */}
      {open && results.length > 0 && (
        <div className="absolute z-[200] mt-1 w-full bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden">
          {results.map((staff) => (
            <button
              key={staff.id}
              type="button"
              onClick={() => handleSelect(staff)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-orange-400 text-xs font-bold">
                  {staff.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">{staff.name}</p>
                <div className="flex gap-2 text-xs text-slate-400">
                  <span>{staff.phone}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── No results / Quick Add ── */}
      {open && !loading && query && results.length === 0 && (
        <div className="absolute z-[200] mt-1 w-full bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setShowQuickAddModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 rounded-lg text-orange-400 text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add "{query}" as new staff
          </button>
        </div>
      )}
      
      {/* Quick Add Modal */}
      <StaffFormModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        initialData={quickAddData}
        onSaved={(newstaff) => {
          handleSelect(newstaff);
          setShowQuickAddModal(false);
        }}
      />
    </div>
  );
}
