import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { NAV_ITEMS } from '../lib/types';
import Logo from '../lib/Logo';
import {
  LayoutDashboard, Package, PlusCircle, ShoppingCart,
  DollarSign, BarChart3, Settings, ScanLine, Users, LogOut,
  Pill, ChevronLeft, HardDrive, Factory,
  FlaskRound, UserPlus, RotateCcw, Undo2, Building2,
  Truck, Wallet, Tag, Target, Receipt, Bot, FolderOpen, Calendar,
  Bell,
} from 'lucide-react';
import { cn } from '../lib/utils';

const iconMap: Record<string, React.ReactNode> = {
  '📊': <LayoutDashboard className="w-5 h-5" />,
  '📦': <Package className="w-5 h-5" />,
  '➕': <PlusCircle className="w-5 h-5" />,
  '🛒': <ShoppingCart className="w-5 h-5" />,
  '💰': <DollarSign className="w-5 h-5" />,
  '📈': <BarChart3 className="w-5 h-5" />,
  '⚙️': <Settings className="w-5 h-5" />,
  '📷': <ScanLine className="w-5 h-5" />,
  '👥': <Users className="w-5 h-5" />,
  '🔒': <HardDrive className="w-5 h-5" />,
  '🏭': <Factory className="w-5 h-5" />,
  '💊': <FlaskRound className="w-5 h-5" />,
  '👤': <UserPlus className="w-5 h-5" />,
  '🔄': <RotateCcw className="w-5 h-5" />,
  '↩️': <Undo2 className="w-5 h-5" />,
  '🏠': <Building2 className="w-5 h-5" />,
  '🚚': <Truck className="w-5 h-5" />,
  '💸': <Wallet className="w-5 h-5" />,
  '🏷️': <Tag className="w-5 h-5" />,
  '🎯': <Target className="w-5 h-5" />,
  '🧾': <Receipt className="w-5 h-5" />,
  '🤖': <Bot className="w-5 h-5" />,
  '🧠': <Bot className="w-5 h-5" />,
  '📁': <FolderOpen className="w-5 h-5" />,
  '📅': <Calendar className="w-5 h-5" />,
  '🔔': <Bell className="w-5 h-5" />,
  '📥': <FolderOpen className="w-5 h-5" />,
};

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

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const getRoleColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-primary';
      case 'sales': return 'bg-success';
      case 'purchase_mgr': return 'bg-warning';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        'h-full flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden',
        'bg-slate-900 dark:bg-slate-900',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo Section */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-white/8',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/90 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <svg
              className="w-4 h-4 text-slate-900 dark:text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <span className="text-[13px] font-semibold text-white leading-tight">{t('app.name')}</span>
              <span className="block text-navy-400 text-[10px] leading-tight truncate">{t('app.tagline')}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="px-3 py-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/5">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0',
                getRoleColor()
              )}
            >
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/90 truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">
                @{user.username} · {user.role === 'admin' ? 'Admin' : user.role === 'sales' ? 'Sales' : 'Purchase'}
              </p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const isActive = activeIndex === item.index;
          return (
            <button
              key={item.index}
              onClick={() => onNavigate(item.index, item.path)}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 w-full text-left group',
                collapsed ? 'justify-center px-0' : 'px-3',
                isActive
                  ? 'bg-white/[0.06] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-400 rounded-full" />
              )}
              <span
                className={cn(
                  'flex-shrink-0 transition-transform duration-200',
                  !isActive && 'group-hover:scale-110',
                  isActive && 'text-emerald-400'
                )}
              >
                {iconMap[item.icon] || item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {isActive && collapsed && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-2 pb-3 pt-2 border-t border-white/8 space-y-1">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 w-full text-left',
            'text-slate-400 hover:text-white hover:bg-white/[0.04]',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn('w-5 h-5 flex-shrink-0 transition-transform duration-300', collapsed && 'rotate-180')}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 w-full text-left',
            'text-slate-400 hover:text-red-400 hover:bg-red-500/[0.08]',
            collapsed && 'justify-center px-0'
          )}
          title={t('common.logout')}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{t('common.logout')}</span>}
        </button>
      </div>
    </div>
  );
}
