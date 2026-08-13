import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { NAV_ITEMS } from '../lib/types';
import { BrandTile, Wordmark } from '../lib/Logo';
import {
  ChevronLeft, LogOut, Search, Sparkles,
} from 'lucide-react';
import { iconMap, GROUP_LABELS, GROUP_ORDER, GROUP_COLORS, DEFAULT_GROUP_COLOR } from '../lib/nav';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeIndex: number;
  onNavigate: (index: number, path: string) => void;
  onLogout: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ activeIndex, onNavigate, onLogout, collapsed = false, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const query = searchTerm.trim().toLowerCase();

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.hidden && (!item.roles || (user && item.roles.includes(user.role)))
  );

  const filteredItems = query
    ? visibleItems.filter(i => i.label.toLowerCase().includes(query))
    : visibleItems;

  const groups = GROUP_ORDER
    .map(g => ({ group: g, items: filteredItems.filter(i => (i.group || 'overview') === g) }))
    .filter(g => g.items.length > 0);

  const getRoleColor = () => {
    switch (user?.role) {
      case 'admin': return 'from-accent via-teal-400 to-emerald-500';
      case 'sales': return 'from-sky-500 via-blue-500 to-indigo-500';
      case 'purchase_mgr': return 'from-amber-400 via-orange-500 to-rose-500';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  return (
    <div
      className={cn(
        'h-full flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden',
        'bg-slate-950',
        collapsed ? 'w-[72px]' : 'w-[272px]'
      )}
    >
      {/* Aurora ambient background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-emerald-500/[0.16] blur-3xl animate-aurora-breathe" />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-sky-500/[0.12] blur-3xl animate-aurora-breathe" style={{ ['--breathe-dur' as any]: '11s' }} />
        <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-violet-500/[0.12] blur-3xl animate-aurora-breathe" style={{ ['--breathe-dur' as any]: '14s' }} />
        <div className="absolute inset-0 bg-grid-faint opacity-60" />
      </div>

      {/* Logo Section */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <BrandTile className="w-10 h-10" markClassName="w-6 h-6" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <Wordmark white fontSize="text-[24px]" />
              <span className="block text-[10px] text-slate-500 leading-tight truncate tracking-wide mt-0.5">{t('app.tagline')}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="relative px-3 pt-3">
          <div className="aurora-border-card flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-sm">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br shadow-md',
                getRoleColor()
              )}
            >
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-white/90 truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">
                @{user.username} · {user.role === 'admin' ? 'Admin' : user.role === 'sales' ? 'Sales' : 'Purchase'}
              </p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.6)] flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative flex-1 py-4 px-2 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-none">
        {!collapsed && (
          <div className="relative px-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pages…"
              aria-label="Search pages"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/40 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg leading-none cursor-pointer"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}
        {groups.map(({ group, items }) => {
          const colors = GROUP_COLORS[group] || DEFAULT_GROUP_COLOR;
          return (
            <div key={group}>
              {!collapsed && (
                <p className={cn('px-3 pb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]', colors.label)}>
                  <span className={cn('w-1 h-1 rounded-full', colors.dot)} />
                  {GROUP_LABELS[group]}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = activeIndex === item.index;
                  const itemGroup = item.group || 'overview';
                  const itemColors = GROUP_COLORS[itemGroup] || DEFAULT_GROUP_COLOR;
                   return (
                    <button
                      key={item.index}
                      onClick={() => onNavigate(item.index, item.path)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-200 w-full text-left group',
                        collapsed ? 'justify-center px-0 py-2' : 'px-3 py-[9px]',
                        isActive
                          ? cn('text-white font-semibold border shadow-lg', itemColors.activeBg, itemColors.activeBorder, itemColors.activeGlow)
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && !collapsed && (
                        <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b', itemColors.gradient)} />
                      )}
                      {/* Icon chip */}
                      <span
                        className={cn(
                          'flex-shrink-0 transition-all duration-200 rounded-lg flex items-center justify-center w-9 h-9',
                          isActive
                            ? cn('bg-gradient-to-br text-white shadow-md', itemColors.gradient)
                            : cn('bg-white/[0.04] group-hover:bg-white/[0.08] group-hover:scale-110', itemColors.solid)
                        )}
                      >
                        <span className="p-1.5">{iconMap[item.icon] || item.icon}</span>
                      </span>
                      {!collapsed && <span className={cn('truncate text-[13px]', isActive && 'font-semibold')}>{item.label}</span>}
                      {isActive && collapsed && (
                        <div className={cn('absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.5)]', itemColors.dot)} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="px-3 py-2 text-[13px] text-slate-500">No pages match "{searchTerm}".</p>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="relative px-2 pb-3 pt-2 border-t border-white/[0.06] space-y-1">
        <div className="px-3 pb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-400">
          <Sparkles className="w-3 h-3" />
          {!collapsed && <span>Session</span>}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl cursor-pointer transition-all duration-200 w-full text-left',
            'text-slate-400 hover:text-white hover:bg-white/[0.04]',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn('w-[18px] h-[18px] flex-shrink-0 transition-transform duration-300', collapsed && 'rotate-180')}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl cursor-pointer transition-all duration-200 w-full text-left',
            'text-slate-400 hover:text-red-400 hover:bg-red-500/[0.08]',
            collapsed && 'justify-center px-0'
          )}
          title={t('common.logout')}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{t('common.logout')}</span>}
        </button>
      </div>
    </div>
  );
}
