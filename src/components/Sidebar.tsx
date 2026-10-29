import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { NAV_ITEMS } from '../lib/types';
import { BrandTile, Wordmark } from '../lib/Logo';
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

/**
 * Mint-teal navigation rail.
 *
 * A calm white panel in light mode (deep-teal panel in dark), one deep-teal
 * active pill, and quiet teal-slate type everywhere else. Groups are
 * typographic rules instead of colour dots, so nothing competes with content.
 */
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

  return (
    <div
      className={cn(
        'h-full flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden',
        'bg-white dark:bg-[#0E2429] border-r border-[#DCEAEC] dark:border-white/[0.06]',
        collapsed ? 'w-[72px]' : 'w-[296px]'
      )}
    >
      {/* Surface — a whisper of mint, no hue rotation */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#F4FAFA] via-white to-white dark:from-[#123035] dark:via-[#0E2429] dark:to-[#0A1A1E]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-24 w-72 h-72 rounded-full bg-[#17827A]/[0.10] blur-3xl" />
        <div className="absolute bottom-0 -right-16 w-56 h-56 rounded-full bg-[#4FA8C7]/[0.10] blur-3xl" />
      </div>

      {/* Logo Section */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-4 border-b border-[#E4EEF0] dark:border-white/[0.06]',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <BrandTile className="w-10 h-10" markClassName="w-6 h-6" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3FA79B] border-2 border-white dark:border-[#0E2429]" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex flex-col justify-center">
              <span className="dark:hidden"><Wordmark fontSize="text-[22px]" /></span>
              <span className="hidden dark:inline-flex"><Wordmark white fontSize="text-[22px]" /></span>
              <div className="mt-0.5 leading-[1.25]">
                <span className="block text-[9px] uppercase tracking-[0.14em] text-[#17827A] dark:text-[#5FC9BB]/90 font-bold">
                  Intelligent Pharmacy
                </span>
                <span className="block text-[8.5px] uppercase tracking-[0.1em] text-[#7E9AA2] dark:text-[#93AEB5] font-semibold">
                  Distribution Management
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="relative px-3 pt-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F4FAFA] border border-[#E1EDEE] hover:bg-[#EFF7F7] hover:border-[#C7EBE6] dark:bg-white/[0.045] dark:border-white/[0.07] dark:hover:bg-white/[0.06] dark:hover:border-[#17827A]/40 transition-colors">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[#C7EBE6] text-[#0E3331] border border-[#A8DCD3] dark:bg-[#17827A]/20 dark:text-[#7AD1C5] dark:border-[#17827A]/40">
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#14292E] dark:text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-[#6A8A92] dark:text-[#93AEB5] font-medium truncate">
                @{user.username} · {user.role === 'admin' ? 'Admin' : user.role === 'sales' ? 'Sales' : 'Purchase'}
              </p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#3FA79B] shadow-[0_0_8px_1px_rgba(63,167,155,0.4)] flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative flex-1 py-4 px-2.5 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-none">
        {!collapsed && (
          <div className="relative px-0.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E9AA2] dark:text-[#93AEB5] pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pages…"
              aria-label="Search pages"
              className="w-full bg-[#F4FAFA] border border-[#E1EDEE] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#14292E] placeholder:text-[#8FAAB1] focus:outline-none focus:border-[#17827A]/50 focus:bg-white focus:ring-2 focus:ring-[#17827A]/15 transition-colors dark:bg-white/[0.05] dark:border-white/[0.07] dark:text-white dark:placeholder:text-[#93AEB5] dark:focus:bg-white/[0.07]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E9AA2] hover:text-[#123F3D] dark:hover:text-white text-lg leading-none cursor-pointer"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}
        {groups.map(({ group, items }) => (
          <div key={group}>
            {!collapsed ? (
              <p className="px-2.5 pb-2 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FAAB1] dark:text-[#93AEB5]">
                <span>{GROUP_LABELS[group]}</span>
                <span className="h-px flex-1 bg-[#E4EEF0] dark:bg-white/[0.07]" />
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-[#E4EEF0] dark:bg-white/[0.08]" />
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = activeIndex === item.index;
                return (
                  <button
                    key={item.index}
                    onClick={() => onNavigate(item.index, item.path)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-[10px] cursor-pointer transition-colors duration-150 w-full text-left group',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-[#123F3D] text-white shadow-[0_10px_24px_-14px_rgba(18,63,61,0.85)] dark:bg-[#17827A] dark:shadow-[0_10px_24px_-14px_rgba(23,130,122,0.9)]'
                        : 'text-[#4F6C75] hover:text-[#123F3D] hover:bg-[#F0F7F8] dark:text-[#93AEB5] dark:hover:text-white dark:hover:bg-white/[0.055]'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 flex items-center justify-center transition-colors duration-150',
                        isActive ? 'text-white' : 'text-[#7E9AA2] group-hover:text-[#17827A] dark:text-[#93AEB5] dark:group-hover:text-[#5FC9BB]'
                      )}
                    >
                      {iconMap[item.icon] || item.icon}
                    </span>
                    {!collapsed && (
                      <span className={cn('truncate text-[13px]', isActive ? 'font-semibold' : 'font-medium')}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-3 py-2 text-[13px] text-[#6A8A92] dark:text-[#93AEB5]">No pages match "{searchTerm}".</p>
        )}
      </nav>

      {/* Complete Profile — quiet card, one accent CTA */}
      {!collapsed && (
        <div className="relative px-3 py-3 border-t border-[#E4EEF0] dark:border-white/[0.06]">
          <div className="rounded-xl p-3.5 bg-[#F1F8F7] border border-[#E1EDEE] dark:bg-white/[0.045] dark:border-white/[0.07]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#14292E] dark:text-white">Complete Profile</p>
              <span className="text-[10px] font-mono font-bold text-[#17827A] dark:text-[#5FC9BB]">60%</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-[#DCEAEC] dark:bg-white/10 overflow-hidden">
              <div className="h-full w-[60%] rounded-full bg-[#17827A] dark:bg-[#5FC9BB]" />
            </div>
            <p className="mt-2 text-[10px] text-[#6A8A92] dark:text-[#93AEB5] leading-snug">
              Verify your identity to unlock all features
            </p>
            <button
              onClick={() => onNavigate(9, 'settings')}
              className="mt-3 w-full py-1.5 px-3 rounded-lg bg-white hover:bg-[#F4FAFA] text-[#123F3D] border border-[#C7EBE6] text-[11px] font-semibold text-center transition-colors cursor-pointer active:scale-[0.98] dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:text-[#D9EFE9] dark:border-[#17827A]/35"
            >
              Verify Identity
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="relative px-2.5 pb-3 pt-1 border-t border-[#E4EEF0] dark:border-white/[0.06] space-y-0.5">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-[10px] cursor-pointer transition-colors duration-150 w-full text-left',
            'text-[#4F6C75] hover:text-[#123F3D] hover:bg-[#F0F7F8] dark:text-[#93AEB5] dark:hover:text-white dark:hover:bg-white/[0.055]',
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
            'flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-[10px] cursor-pointer transition-colors duration-150 w-full text-left',
            'text-[#4F6C75] hover:text-red-600 hover:bg-red-500/[0.08] dark:text-[#93AEB5] dark:hover:text-red-300 dark:hover:bg-red-500/[0.12]',
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
