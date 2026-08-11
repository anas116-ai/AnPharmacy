import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { NAV_ITEMS } from '../lib/types';
import { BrandTile } from '../lib/Logo';
import {
  ChevronLeft, LogOut, Search,
} from 'lucide-react';
import { iconMap, GROUP_LABELS, GROUP_ORDER } from '../lib/nav';
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
    !item.roles || (user && item.roles.includes(user.role))
  );

  const filteredItems = query
    ? visibleItems.filter(i => i.label.toLowerCase().includes(query))
    : visibleItems;

  const groups = GROUP_ORDER
    .map(g => ({ group: g, items: filteredItems.filter(i => (i.group || 'overview') === g) }))
    .filter(g => g.items.length > 0);

  const getRoleColor = () => {
    switch (user?.role) {
      case 'admin': return 'from-accent to-emerald-600';
      case 'sales': return 'from-sky-500 to-blue-600';
      case 'purchase_mgr': return 'from-amber-400 to-orange-500';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  return (
    <div
      className={cn(
        'h-full flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden',
        'bg-slate-950',
        collapsed ? 'w-[72px]' : 'w-[264px]'
      )}
    >
      {/* Ambient gradient wash */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
      </div>

      {/* Logo Section */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex items-center gap-2.5">
          <BrandTile className="w-9 h-9" markClassName="w-5 h-5" />
          {!collapsed && (
            <div>
              <span className="block text-sm font-semibold text-white font-display leading-tight tracking-tight">{t('app.name')}</span>
              <span className="block text-[10px] text-muted-foreground leading-tight truncate tracking-wide">{t('app.tagline')}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="relative px-3 pt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br',
                getRoleColor()
              )}
            >
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-white/90 truncate">{user.displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
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
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg leading-none"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}
        {groups.map(({ group, items }) => (
          <div key={group}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {GROUP_LABELS[group]}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = activeIndex === item.index;
                return (
                  <button
                    key={item.index}
                    onClick={() => onNavigate(item.index, item.path)}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-[9px] text-[13px] font-medium rounded-lg cursor-pointer transition-all duration-200 w-full text-left group',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'bg-gradient-to-r from-accent/15 to-accent/5 text-white border border-accent/25 shadow-inner'
                        : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-full" />
                    )}
                    <span
                      className={cn(
                        'flex-shrink-0 transition-transform duration-200',
                        !isActive && 'group-hover:scale-110',
                        isActive && 'text-accent'
                      )}
                    >
                      {iconMap[item.icon] || item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {isActive && collapsed && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-3 py-2 text-[13px] text-slate-500">No pages match "{searchTerm}".</p>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="relative px-2 pb-3 pt-2 border-t border-white/[0.06] space-y-1">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-lg cursor-pointer transition-all duration-200 w-full text-left',
            'text-muted-foreground hover:text-white hover:bg-white/[0.04]',
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
            'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-lg cursor-pointer transition-all duration-200 w-full text-left',
            'text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.08]',
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
