import React, { useState, useEffect, useRef } from 'react';
import { getCompanies } from '../api/companiesApi';

export default function CompanyAutocomplete({
  name,
  value,
  onChange,
  onSelectCompany,
  placeholder = 'Search or enter business name...',
  className = '',
  error,
  partyType = 'business' // 'consignor' | 'consignee' | 'business'
}) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [allCompanies, setAllCompanies] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch companies list from server
  const fetchCompanies = async (query = '') => {
    setLoading(true);
    try {
      const data = await getCompanies({ search: query });
      if (Array.isArray(data)) {
        setFilteredResults(data);
        if (!query) {
          setAllCompanies(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on typing with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchCompanies(searchTerm);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const handleFocus = () => {
    setIsOpen(true);
    fetchCompanies(searchTerm);
  };

  const handleToggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      setIsOpen(true);
      fetchCompanies(searchTerm);
      inputRef.current?.focus();
    } else {
      setIsOpen(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setJustSelected(false);
    setIsOpen(true);
    onChange({ target: { name: name || e.target.name, value: val } });
    if (onSelectCompany) {
      onSelectCompany(null);
    }
  };

  const handleSelect = (company) => {
    setSearchTerm(company.name);
    setIsOpen(false);
    setJustSelected(true);
    setTimeout(() => setJustSelected(false), 2500);

    onChange({ target: { name: name || 'business_name', value: company.name } });
    if (onSelectCompany) {
      onSelectCompany(company);
    }
  };

  const handleAddNew = (customName) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setSearchTerm(trimmed);
    setIsOpen(false);
    onChange({ target: { name: name || 'business_name', value: trimmed } });
    if (onSelectCompany) {
      onSelectCompany(null);
    }
  };

  // Check if current search term exactly matches an existing business
  const exactMatch = filteredResults.find(
    (c) => c.name.trim().toLowerCase() === searchTerm.trim().toLowerCase()
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={searchTerm}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          className={`${className} pr-16`}
        />

        <div className="absolute right-2 flex items-center gap-1.5 z-10">
          {loading && (
            <svg
              className="animate-spin h-4 w-4 text-orange-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}

          {justSelected && (
            <span
              title="Details auto-filled"
              className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 animate-pulse"
            >
              ✓ Auto-filled
            </span>
          )}

          {searchTerm && !loading && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                onChange({ target: { name: name || 'business_name', value: '' } });
                if (onSelectCompany) onSelectCompany(null);
                setIsOpen(true);
                fetchCompanies('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              title="Clear text"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleDropdown}
            className="text-slate-400 hover:text-orange-400 p-1 rounded-md transition-colors focus:outline-none"
            title="Select from saved businesses"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-72 flex flex-col backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">
              {searchTerm ? `Matching Businesses (${filteredResults.length})` : `Saved Businesses (${filteredResults.length})`}
            </span>
            <span className="text-[11px] text-slate-500">Tap to auto-fill details</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-800/80 max-h-60">
            {filteredResults.length > 0 ? (
              filteredResults.map((c, idx) => (
                <div
                  key={c.id || `${c.name}-${idx}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(c);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleSelect(c);
                  }}
                  className="px-4 py-3 hover:bg-orange-500/10 active:bg-orange-500/20 cursor-pointer text-sm text-white flex flex-col transition-colors group"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.gst && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                          GST: {c.gst}
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        Party
                      </span>
                    </div>
                  </div>

                  {(c.phone || c.contact_person || c.address) && (
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 line-clamp-2">
                      {(c.contact_person || c.phone) && (
                        <span className="text-slate-300 font-medium">
                          📞 {c.contact_person ? `${c.contact_person} (${c.phone || 'No phone'})` : c.phone}
                        </span>
                      )}
                      {c.address && (
                        <span className="text-slate-400 truncate max-w-full">
                          📍 {c.address.replace(/\n+/g, ', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : !loading ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                No saved business found matching &quot;{searchTerm}&quot;
              </div>
            ) : null}

            {/* "+ Add as new business" option */}
            {searchTerm.trim() && !exactMatch && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddNew(searchTerm);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleAddNew(searchTerm);
                }}
                className="px-4 py-2.5 bg-slate-800/40 hover:bg-orange-500/15 active:bg-orange-500/25 cursor-pointer text-xs text-orange-400 font-medium flex items-center gap-2 transition-colors border-t border-slate-700/60"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Use &quot;<strong className="text-white">{searchTerm.trim()}</strong>&quot; as new business</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
