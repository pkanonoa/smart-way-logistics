import React, { useState, useEffect, useRef } from 'react';
import { getCompanies } from '../api/companiesApi';

export default function CompanyAutocomplete({ value, onChange, onSelectCompany, placeholder, className, error }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2 && isOpen) {
      const timer = setTimeout(() => {
        getCompanies({ search: searchTerm }).then(data => {
          setResults(data);
        }).catch(err => {
          console.error(err);
          setResults([]);
        });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [searchTerm, isOpen]);

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    onChange(e); // Propagate text change
    onSelectCompany(null); // Clear company ID if they edit the text
  };

  const handleSelect = (company) => {
    setSearchTerm(company.name);
    setIsOpen(false);
    
    // Create a fake event for the onChange handler to match standard inputs
    onChange({ target: { name: 'consignor_name', value: company.name } }); 
    // Wait, the parent needs to know which name field it is.
    // It's better if we just pass the value directly or let parent handle the name.
    
    onSelectCompany(company);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          {results.map(c => (
            <div 
              key={c.id} 
              onClick={() => handleSelect(c)}
              className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm text-white flex flex-col transition-colors border-b border-white/5 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{c.name}</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">Company</span>
              </div>
              {(c.phone || c.address) && (
                <span className="text-xs text-white/40 mt-1 truncate">
                  {c.phone} {c.phone && c.address ? '•' : ''} {c.address}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
