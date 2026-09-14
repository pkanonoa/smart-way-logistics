import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        to: '/staff',
        label: 'Staff',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        to: '/vehicles',
        label: 'Vehicles',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        to: '/bookings/new',
        label: 'New Booking',
        roles: ['admin', 'staff'],
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
      {
        to: '/waybills',
        label: 'Waybills',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        to: '/daily-logs',
        label: 'Daily Logs',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        to: '/daily-collections',
        label: 'Collections',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        to: '/assign-trips',
        label: 'Assign Trips',
        roles: ['admin', 'staff'],
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ),
      },
      {
        to: '/payments',
        label: 'Payments',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        to: '/salaries',
        label: 'Salaries',
        roles: ['admin', 'accountant', 'viewer'],
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        to: '/reports',
        label: 'Reports',
        roles: ['admin', 'accountant', 'viewer'],
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        to: '/users',
        label: 'Users',
        roles: ['admin'],
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent print:bg-white print:text-black print:min-h-0 print:block flex-col md:flex-row">
      
      {/* ── Mobile Top Bar (Transparent) ─────────────────────────────── */}
      <header className="flex md:hidden items-center gap-4 px-6 py-4 bg-transparent border-none print:hidden shrink-0">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
          <div className="w-7 h-7 bg-cyan-500/10 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2zM15 8h2l3 3v5h-5V8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">Smart Way Logistics</span>
        </div>
      </header>

      {/* ── Desktop Floating Sidebar ─────────────────────────────────── */}
      <aside 
        className={`hidden md:flex flex-col m-5 rounded-[32px] bg-[#0f172a]/70 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-300 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-4' : 'gap-3 px-8'} py-8 border-b border-white/5 transition-all duration-300 overflow-hidden`}>
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2zM15 8h2l3 3v5h-5V8z" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 whitespace-nowrap transition-opacity duration-300">
              <p className="text-white text-base font-bold tracking-tight">Smart Way</p>
              <p className="text-cyan-400 text-xs font-medium">Logistics</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 ${isCollapsed ? 'px-4' : 'px-6'} py-6 space-y-6 overflow-y-auto hide-scrollbar`}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && !isCollapsed && (
                <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  {group.label}
                </p>
              )}
              {group.label && isCollapsed && (
                <div className="flex justify-center mb-2">
                  <div className="w-4 h-px bg-white/10"></div>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  if (item.roles && (!user || !item.roles.includes(user.role))) return null;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3'} rounded-2xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20'
                            : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                        }`
                      }
                    >
                      {item.icon}
                      {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Button */}
        <div className={`px-6 py-4 border-t border-white/5 flex ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-3 text-white/40 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </div>
            {!isCollapsed && <span className="text-xs font-semibold whitespace-nowrap">Collapse Sidebar</span>}
          </button>
        </div>

        {/* User footer */}
        <div className={`${isCollapsed ? 'px-4' : 'px-6'} pb-6 pt-2`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-4 py-3'} rounded-2xl bg-black/20 border border-white/5`}>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <span className="text-cyan-400 text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1 whitespace-nowrap">
                  <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="text-white/40 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-white/5 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Modal Overlay ──────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden print:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0f172a]/90 backdrop-blur-2xl flex flex-col h-full border-r border-white/10 shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Logo */}
            <div className="flex items-center gap-3 px-8 py-8 border-b border-white/5">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2zM15 8h2l3 3v5h-5V8z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-base font-bold tracking-tight">Smart Way</p>
                <p className="text-cyan-400 text-xs font-medium">Logistics</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-6 py-6 space-y-6 overflow-y-auto hide-scrollbar">
              {NAV_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.label && (
                    <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      if (item.roles && (!user || !item.roles.includes(user.role))) return null;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20'
                                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                            }`
                          }
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User footer */}
            <div className="px-6 py-6 border-t border-white/5">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/20 border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <span className="text-cyan-400 text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="text-white/40 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-white/5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar print:overflow-visible print:p-0 relative">
        {user?.role === 'viewer' && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 text-cyan-400 text-xs font-semibold px-6 py-2.5 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Viewer Mode — read only
            </span>
            <span className="text-[10px] text-white/50 font-normal">All write operations are disabled</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
