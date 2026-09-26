/**
 * AppShell.jsx — Smart Way Logistics
 * Centralized layout shell with:
 *  - Grouped, collapsible sidebar (Overview / Operations / Finance / Admin)
 *  - Role-based trimming (inaccessible routes hidden entirely)
 *  - Favorites section with drag-and-drop reordering (@hello-pangea/dnd)
 *  - Search/filter input
 *  - Badge counts on Shipments and Trips
 *  - Collapsible group state persisted to localStorage per user
 *  - Favorites order persisted to localStorage per user
 *  - Glassmorphism floating sidebar (desktop) / full-screen overlay (mobile)
 *  - Viewer Mode banner
 */

import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getTripBadgeCounts } from '../api/tripsApi';

// ─── Icons (inline SVG helpers) ───────────────────────────────────────────────

const Icon = ({ path, path2, className = 'w-5 h-5 shrink-0' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path2} />}
  </svg>
);

const ICONS = {
  dashboard:   { path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  reports:     { path: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  shipments:   { path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  trips:       { path: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  fleet:       { path: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z', path2: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2zM15 8h2l3 3v5h-5V8z' },
  payments:    { path: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  payroll:     { path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  users:       { path: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  chevronDown: { path: 'M19 9l-7 7-7-7' },
  chevronLeft: { path: 'M11 19l-7-7 7-7m8 14l-7-7 7-7' },
  grip:        { path: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  star:        { path: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  search:      { path: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' },
  eye:         { path: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z', path2: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  logout:      { path: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  menu:        { path: 'M4 6h16M4 12h16M4 18h16' },
  close:       { path: 'M6 18L18 6M6 6l12 12' },
};

// ─── Nav definition ────────────────────────────────────────────────────────────
// roles: if omitted, all roles see the item.
// badgeKey: key into badge counts object fetched from server.

const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard',  to: '/dashboard',  label: 'Dashboard', icon: ICONS.dashboard },
      { id: 'reports',    to: '/reports',    label: 'Reports',   icon: ICONS.reports, roles: ['admin', 'accountant', 'viewer'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'shipments', to: '/shipments',   label: 'Shipments',    icon: ICONS.shipments, roles: ['admin', 'staff'], badgeKey: 'unassigned', badgeLabel: 'unassigned' },
      { id: 'trips',     to: '/trips',       label: 'Trips',        icon: ICONS.trips,     roles: ['admin', 'staff'], badgeKey: 'draftTrips', badgeLabel: 'draft' },
      { id: 'fleet',     to: '/fleet-staff', label: 'Fleet & Staff', icon: ICONS.fleet },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { id: 'payments', to: '/payments', label: 'Payments', icon: ICONS.payments },
      { id: 'payroll',  to: '/payroll',  label: 'Payroll',  icon: ICONS.payroll, roles: ['admin', 'accountant', 'viewer'] },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { id: 'users', to: '/users', label: 'Users & Roles', icon: ICONS.users, roles: ['admin'] },
    ],
  },
];

// Flatten all nav items for lookup
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ─── Local-storage helpers ─────────────────────────────────────────────────────

function lsKey(userId, suffix) {
  return `swl_sidebar_${userId}_${suffix}`;
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// Default group-open state: all groups open
const defaultGroupOpen = () =>
  Object.fromEntries(NAV_GROUPS.map(g => [g.id, true]));

// ─── Badge pill ────────────────────────────────────────────────────────────────
function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[20px] px-1.5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/20 flex items-center justify-center tabular-nums shrink-0">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─── Single nav link ───────────────────────────────────────────────────────────
function NavItem({ item, collapsed, badges, onClick, dragHandleProps }) {
  const count = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'} rounded-2xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20'
            : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
        }`
      }
    >
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          className="text-white/20 hover:text-white/50 transition-colors cursor-grab active:cursor-grabbing shrink-0"
          onClick={e => e.preventDefault()}
        >
          <Icon path={ICONS.grip.path} className="w-3 h-3" />
        </span>
      )}
      <Icon path={item.icon.path} path2={item.icon.path2} />
      {!collapsed && (
        <>
          <span className="flex-1 whitespace-nowrap">{item.label}</span>
          {count > 0 && <Badge count={count} />}
        </>
      )}
    </NavLink>
  );
}

// ─── Collapsible group header ──────────────────────────────────────────────────
function GroupHeader({ label, open, collapsed, onToggle }) {
  if (collapsed) {
    return <div className="flex justify-center my-1.5"><div className="w-4 h-px bg-white/10" /></div>;
  }
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 mb-1.5 group"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
        {label}
      </p>
      <Icon
        path={ICONS.chevronDown.path}
        className={`w-3 h-3 text-white/20 group-hover:text-white/40 transition-all duration-200 ${open ? '' : '-rotate-90'}`}
      />
    </button>
  );
}

// ─── Main AppShell ─────────────────────────────────────────────────────────────
export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userId = user?.id ?? 'guest';

  // Sidebar expand/collapse (desktop icon-only mode)
  const [isCollapsed, setIsCollapsed] = useState(() =>
    readLS(lsKey(userId, 'collapsed'), true)
  );
  // Mobile overlay
  const [mobileOpen, setMobileOpen] = useState(false);
  // Search query
  const [search, setSearch] = useState('');
  // Group open/closed state
  const [groupOpen, setGroupOpen] = useState(() =>
    readLS(lsKey(userId, 'groups'), defaultGroupOpen())
  );
  // Favorites list (item ids)
  const [favorites, setFavorites] = useState(() =>
    readLS(lsKey(userId, 'favorites'), [])
  );
  // Badge counts from server
  const [badges, setBadges] = useState({ unassigned: 0, draftTrips: 0 });

  // Persist collapsed state
  useEffect(() => { writeLS(lsKey(userId, 'collapsed'), isCollapsed); }, [userId, isCollapsed]);
  // Persist group open state
  useEffect(() => { writeLS(lsKey(userId, 'groups'), groupOpen); }, [userId, groupOpen]);
  // Persist favorites
  useEffect(() => { writeLS(lsKey(userId, 'favorites'), favorites); }, [userId, favorites]);

  // Fetch badge counts (poll every 60s) — only for roles that can see badge routes
  useEffect(() => {
    if (!user || !['admin', 'staff'].includes(user.role)) return;
    const fetchBadges = () => getTripBadgeCounts().then(d => setBadges(d)).catch(() => {});
    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleGroup(id) {
    setGroupOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Filter items visible to the current role
  function isVisible(item) {
    if (!item.roles) return true;
    return !!user && item.roles.includes(user.role);
  }

  // Items matching the search query (case-insensitive substring)
  function matchesSearch(item) {
    if (!search) return true;
    return item.label.toLowerCase().includes(search.toLowerCase());
  }

  // Favorite items (validated: must still exist & be visible to user)
  const validFavoriteIds = favorites.filter(fid => {
    const item = ALL_NAV_ITEMS.find(i => i.id === fid);
    return item && isVisible(item);
  });

  const favoriteItems = validFavoriteIds
    .map(fid => ALL_NAV_ITEMS.find(i => i.id === fid))
    .filter(Boolean);

  function toggleFavorite(itemId) {
    setFavorites(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [itemId, ...prev]
    );
  }

  function onDragEnd(result) {
    const { source, destination } = result;
    if (!destination) return;
    const updated = Array.from(validFavoriteIds);
    const [moved] = updated.splice(source.index, 1);
    updated.splice(destination.index, 0, moved);
    setFavorites(updated);
  }

  // ── Sidebar content renderer — shared between desktop & mobile ───────────────
  function renderSidebarContent({ collapsed, onLinkClick }) {
    const isSearching = search.trim().length > 0;

    return (
      <>
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-4' : 'gap-3 px-7'} py-7 border-b border-white/5 overflow-hidden`}>
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2zM15 8h2l3 3v5h-5V8z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 whitespace-nowrap">
              <p className="text-white text-sm font-bold tracking-tight">Smart Way</p>
              <p className="text-cyan-400 text-[11px] font-medium">Logistics</p>
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 focus-within:border-cyan-500/40 focus-within:bg-white/8 transition-all">
              <Icon path={ICONS.search.path} className="w-4 h-4 text-white/30 shrink-0" />
              <input
                type="text"
                placeholder="Search modules…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white placeholder-white/30 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-white/30 hover:text-white transition-colors"
                >
                  <Icon path={ICONS.close.path} className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? 'px-3' : 'px-3'} py-3 space-y-4 overflow-y-auto hide-scrollbar`}>

          {/* ── Favorites (only when not searching and has favorites) ────────── */}
          {!isSearching && favoriteItems.length > 0 && (
            <div>
              {!collapsed && (
                <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/60 flex items-center gap-1.5">
                  <Icon path={ICONS.star.path} className="w-3 h-3" />
                  Favorites
                </p>
              )}
              {collapsed && <div className="flex justify-center my-1.5"><div className="w-4 h-px bg-amber-500/20" /></div>}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="favorites">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-0.5"
                    >
                      {favoriteItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                          isDragDisabled={collapsed}
                        >
                          {(drag, snapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className={snapshot.isDragging ? 'opacity-80 scale-[0.98]' : ''}
                            >
                              <div className="flex items-center gap-0.5 group/fav">
                                <div className="flex-1">
                                  <NavItem
                                    item={item}
                                    collapsed={collapsed}
                                    badges={badges}
                                    onClick={onLinkClick}
                                    dragHandleProps={!collapsed ? drag.dragHandleProps : null}
                                  />
                                </div>
                                {!collapsed && (
                                  <button
                                    onClick={() => toggleFavorite(item.id)}
                                    title="Remove from favorites"
                                    className="opacity-0 group-hover/fav:opacity-100 p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all shrink-0"
                                  >
                                    <Icon path={ICONS.star.path} className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}

          {/* ── Grouped nav or search results ────────────────────────────────── */}
          {isSearching ? (
            <div className="space-y-0.5">
              {!collapsed && (
                <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                  Results
                </p>
              )}
              {ALL_NAV_ITEMS.filter(item => isVisible(item) && matchesSearch(item)).map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  badges={badges}
                  onClick={onLinkClick}
                />
              ))}
              {ALL_NAV_ITEMS.filter(item => isVisible(item) && matchesSearch(item)).length === 0 && !collapsed && (
                <p className="px-4 py-3 text-white/30 text-xs">No modules match &quot;{search}&quot;</p>
              )}
            </div>
          ) : (
            NAV_GROUPS.map(group => {
              const visibleItems = group.items.filter(isVisible);
              if (visibleItems.length === 0) return null;
              const isOpen = groupOpen[group.id] !== false;

              return (
                <div key={group.id}>
                  <GroupHeader
                    label={group.label}
                    open={isOpen}
                    collapsed={collapsed}
                    onToggle={() => toggleGroup(group.id)}
                  />
                  {isOpen && (
                    <div className="space-y-0.5">
                      {visibleItems.map(item => {
                        const isFav = favorites.includes(item.id);
                        return (
                          <div key={item.id} className="flex items-center gap-0.5 group/nav">
                            <div className="flex-1">
                              <NavItem
                                item={item}
                                collapsed={collapsed}
                                badges={badges}
                                onClick={onLinkClick}
                              />
                            </div>
                            {/* Star/unstar — only in expanded state */}
                            {!collapsed && (
                              <button
                                onClick={() => toggleFavorite(item.id)}
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                                className={`opacity-0 group-hover/nav:opacity-100 p-1.5 rounded-lg transition-all shrink-0 ${
                                  isFav
                                    ? 'text-amber-400 hover:bg-amber-500/10'
                                    : 'text-white/20 hover:text-amber-400 hover:bg-amber-500/10'
                                }`}
                              >
                                <Icon
                                  path={ICONS.star.path}
                                  className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`}
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Collapse toggle (hidden inside mobile overlay) */}
        {!mobileOpen && (
          <div className={`px-4 py-3 border-t border-white/5 flex ${collapsed ? 'justify-center' : 'justify-start'}`}>
            <button
              onClick={() => setIsCollapsed(c => !c)}
              className="flex items-center gap-3 text-white/40 hover:text-white transition-colors"
            >
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Icon
                  path={ICONS.chevronLeft.path}
                  className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
                />
              </div>
              {!collapsed && <span className="text-xs font-semibold whitespace-nowrap">Collapse</span>}
            </button>
          </div>
        )}

        {/* User footer */}
        <div className={`${collapsed ? 'px-3' : 'px-4'} pb-5 pt-2`}>
          <div className={`flex items-center ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'} rounded-2xl bg-black/20 border border-white/5`}>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <span className="text-cyan-400 text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            {!collapsed && (
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
                  <Icon path={ICONS.logout.path} className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent print:bg-white print:text-black print:min-h-0 print:block flex-col md:flex-row">

      {/* ── Mobile Top Bar ──────────────────────────────────────────────────── */}
      <header className="flex md:hidden items-center gap-4 px-5 py-4 bg-transparent border-none print:hidden shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-lg"
        >
          <Icon path={ICONS.menu.path} className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
          <div className="w-6 h-6 bg-cyan-500/10 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2zM15 8h2l3 3v5h-5V8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">Smart Way Logistics</span>
        </div>
      </header>

      {/* ── Desktop Floating Sidebar ────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col m-5 rounded-[28px] bg-[#0f172a]/75 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-300 shrink-0 print:hidden ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {renderSidebarContent({ collapsed: isCollapsed, onLinkClick: null })}
      </aside>

      {/* ── Mobile Sidebar Overlay ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden print:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[90vw] bg-[#0f172a]/95 backdrop-blur-2xl flex flex-col h-full border-r border-white/10 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all z-10"
            >
              <Icon path={ICONS.close.path} className="w-4 h-4" />
            </button>
            {renderSidebarContent({ collapsed: false, onLinkClick: () => setMobileOpen(false) })}
          </aside>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar print:overflow-visible print:p-0 relative">
        {/* Viewer Mode banner */}
        {user?.role === 'viewer' && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 text-cyan-400 text-xs font-semibold px-6 py-2.5 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <Icon path={ICONS.eye.path} path2={ICONS.eye.path2} className="w-3.5 h-3.5" />
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
