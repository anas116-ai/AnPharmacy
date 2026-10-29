import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuthStore, ROUTE_STORAGE_KEY } from '../stores/authStore';
import { NAV_ITEMS } from '../lib/types';
import { GROUP_COLORS, GROUP_LABELS } from '../lib/nav';
import { ArrowLeft, ChevronDown, LogOut, Settings as SettingsIcon, Keyboard, Loader2, Lock, PanelLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { useGlobalShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import NotificationBell from './NotificationBell';
import TitleBar from './TitleBar';
import StatusBar from './StatusBar';
import { cn } from '../lib/utils';

// Lazy-loaded route components for faster initial load
const Dashboard = lazy(() => import('./Dashboard'));
const StockManagement = lazy(() => import('./StockManagement'));
const AddStock = lazy(() => import('./AddStock'));
const Sales = lazy(() => import('./Sales'));
const Reports = lazy(() => import('./Reports'));
const Settings = lazy(() => import('./Settings'));
const Purchases = lazy(() => import('./Purchases'));
const UserManagement = lazy(() => import('./UserManagement'));
const BackupRestore = lazy(() => import('./BackupRestore'));
const Suppliers = lazy(() => import('./Suppliers'));
const Manufacturers = lazy(() => import('./Manufacturers'));
const GenericMedicines = lazy(() => import('./GenericMedicines'));
const Customers = lazy(() => import('./Customers'));
const PurchaseReturns = lazy(() => import('./PurchaseReturns'));
const SalesReturns = lazy(() => import('./SalesReturns'));
const Warehouses = lazy(() => import('./Warehouses'));
const StockTransfers = lazy(() => import('./StockTransfers'));
const Expenses = lazy(() => import('./Expenses'));
const PricingRules = lazy(() => import('./PricingRules'));
const DiscountSchemes = lazy(() => import('./DiscountSchemes'));
const GstHsn = lazy(() => import('./GstHsn'));
const AiInsights = lazy(() => import('./AiInsights'));
const SupplierProfileManager = lazy(() => import('./SupplierProfileManager'));
const Documents = lazy(() => import('./Documents'));
const Reminders = lazy(() => import('./Reminders'));
const SalesHistory = lazy(() => import('./SalesHistory'));
const DataImportStudio = lazy(() => import('./DataImportStudio'));
const NotificationsPanel = lazy(() => import('./NotificationsPanel'));
const RecycleBin = lazy(() => import('./RecycleBin'));

/**
 * Last visited module, so a full refresh (Ctrl+Shift+R) reopens the same page
 * instead of dropping the user back on the dashboard. A hash deep-link wins.
 */
function readInitialRoute(): number {
  try {
    const hashPath = window.location.hash.replace(/^#\/?/, '').trim();
    if (hashPath) {
      const fromHash = NAV_ITEMS.find(i => i.path === hashPath);
      if (fromHash) return fromHash.index;
    }
    const saved = Number(localStorage.getItem(ROUTE_STORAGE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < NAV_ITEMS.length) return saved;
  } catch {
    // malformed storage / no hash — fall through to the dashboard
  }
  return 0;
}

export default function MainShell() {
  const { theme, toggle } = useTheme();
  const { user, logout, hasPermission } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(readInitialRoute);
  const [pageHistory, setPageHistory] = useState<number[]>(() => [activeIndex]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // One ambient brand wash for every module — no per-module hue shifts.
  const GROUP_TINT = 'bg-[radial-gradient(70%_55%_at_50%_-10%,rgba(23,130,122,0.05),transparent_62%)]';

  // Per-module accent for the header chip
  const activeGroup = NAV_ITEMS.find(i => i.index === activeIndex)?.group || 'overview';
  const gColor = GROUP_COLORS[activeGroup] || GROUP_COLORS.overview;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = useCallback((index: number, path?: string) => {
    setPageHistory(prev => {
      if (prev[prev.length - 1] === index) return prev;
      const next = [...prev, index];
      if (next.length > 20) next.shift();
      return next;
    });
    setActiveIndex(index);
  }, []);

  // NotificationBell deep-links via location.hash (e.g. #stock) — honor it
  useEffect(() => {
    const navigateToHash = () => {
      const path = window.location.hash.replace(/^#\/?/, '').trim();
      if (!path) return;
      const item = NAV_ITEMS.find(i => i.path === path);
      if (item) handleNavigate(item.index, path);
    };
    window.addEventListener('hashchange', navigateToHash);
    return () => window.removeEventListener('hashchange', navigateToHash);
  }, [handleNavigate]);

  const handleBack = useCallback(() => {
    setPageHistory(prev => {
      if (prev.length > 1) {
        const newHistory = [...prev];
        newHistory.pop();
        return newHistory;
      }
      setActiveIndex(0);
      return [0];
    });
  }, []);

  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (pageHistory.length > 0) {
      const lastIndex = pageHistory[pageHistory.length - 1];
      setActiveIndex(lastIndex);
    }
  }, [pageHistory]);

  // Reset scroll position when navigating between pages
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeIndex]);

  // Remember the current module (and mirror it into the URL hash) so a refresh
  // restores this exact page. replaceState keeps the browser history clean.
  useEffect(() => {
    const item = NAV_ITEMS.find(i => i.index === activeIndex);
    try {
      localStorage.setItem(ROUTE_STORAGE_KEY, String(activeIndex));
    } catch {
      // storage unavailable — refresh falls back to the dashboard
    }
    if (item) {
      const nextHash = `#/${item.path}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    }
  }, [activeIndex]);

  // A restored route (refresh / deep link) must be allowed for the signed-in
  // role — otherwise fall back to the dashboard.
  useEffect(() => {
    const item = NAV_ITEMS.find(i => i.index === activeIndex);
    if (!item?.roles || !user?.role) return;
    if (!item.roles.includes(user.role)) {
      setActiveIndex(0);
      setPageHistory([0]);
    }
  }, [activeIndex, user?.role]);

  useGlobalShortcuts(handleNavigate);

  // ── Desktop: respond to native app menu (File > Backup, Settings, About) ──
  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;
    window.electronAPI.onMenuAction((action) => {
      if (action === 'backup') {
        const idx = NAV_ITEMS.findIndex(i => i.label === 'Backup & Restore');
        if (idx >= 0) handleNavigate(idx);
      } else if (action === 'settings') {
        handleNavigate(9);
      } else if (action === 'about') {
        window.electronAPI.getAppInfo().then(r => {
          alert(`AnPharmacy v${r?.version || '1.0.0'}\nElectron ${r?.electron || ''}\nPlatform: ${r?.platform || ''}\n\nYour data lives 100% on this device — offline & private.`);
        });
      }
    });
  }, [handleNavigate]);

  // ── Desktop: drag & drop invoice/import files onto the window ──
  useEffect(() => {
    if (!window.electronAPI?.isDesktop) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length === 0) return;
      const file = files[0];
      const name = (file as any).name?.toLowerCase() || '';
      // route by extension: images → Scan Invoice, spreadsheets → Data Import
      if (/\.(png|jpe?g|pdf)$/i.test(name)) {
        const idx = NAV_ITEMS.findIndex(i => i.label === 'Scan Invoice');
        if (idx >= 0) handleNavigate(idx);
      } else if (/\.(xlsx?|csv)$/i.test(name)) {
        const idx = NAV_ITEMS.findIndex(i => i.label === 'Data Import');
        if (idx >= 0) handleNavigate(idx);
      }
      if (window.electronAPI?.showNativeNotification) {
        window.electronAPI.showNativeNotification({ title: 'File dropped', body: `Opening ${name} — pick the file inside the screen to import it.` });
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleNavigate]);

  const handleLogout = () => { logout(); };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin': return 'bg-[#17827A]/10 text-[#123F3D] dark:bg-[#17827A]/20 dark:text-[#2E9C90]';
      case 'sales': return 'bg-[#EDF5F6] text-[#223A40] dark:bg-white/10 dark:text-slate-200';
      case 'purchase_mgr': return 'bg-[#EDF5F6] text-[#223A40] dark:bg-white/10 dark:text-slate-200';
      default: return 'bg-muted text-muted-foreground dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Administrator';
      case 'sales': return 'Sales Representative';
      case 'purchase_mgr': return 'Purchase Manager';
      default: return '';
    }
  };

  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl mb-4"><Lock className="w-14 h-14 mx-auto text-muted-foreground" /></p>
      <h2 className="text-lg font-semibold text-foreground mb-1">No access to this page</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Your role doesn't have permission to view this page. Contact an administrator if you need access.
      </p>
      <button
        onClick={() => handleNavigate(0)}
        className="mt-5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 cursor-pointer"
      >
        Go to Dashboard
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeIndex) {
      case 0: return <Dashboard onNavigate={handleNavigate} />;
      case 1: return <StockManagement />;
      case 2: return hasPermission('add_stock') ? <AddStock /> : <AccessDenied />;
      case 3: return hasPermission('view_purchases') ? <Purchases /> : <AccessDenied />;
      case 4: return hasPermission('make_sales') ? <Sales /> : <AccessDenied />;
      case 5: return hasPermission('view_reports') ? <Reports /> : <AccessDenied />;
      case 6: return hasPermission('scan_invoices') ? <DataImportStudio key="hub-scan" initialMode="scan" /> : <AccessDenied />;
      case 7: return hasPermission('manage_users') ? <UserManagement /> : <AccessDenied />;
      case 8: return <BackupRestore />;
      case 9: return <Settings />;
      case 10: return hasPermission('add_stock') ? <Suppliers /> : <AccessDenied />;
      case 11: return hasPermission('add_stock') ? <Manufacturers /> : <AccessDenied />;
      case 12: return hasPermission('add_stock') ? <GenericMedicines /> : <AccessDenied />;
      case 13: return hasPermission('make_sales') ? <Customers /> : <AccessDenied />;
      case 14: return <PurchaseReturns />;
      case 15: return <SalesReturns />;
      case 16: return <Warehouses />;
      case 17: return <StockTransfers />;
      case 18: return <Expenses />;
      case 19: return <PricingRules />;
      case 20: return <DiscountSchemes />;
      case 21: return <GstHsn />;
      case 22: return <AiInsights />;
      case 23: return <Documents />;
      case 24: return <Reminders />;
      case 25: return <NotificationsPanel />;
      case 26: return hasPermission('view_sales') ? <SalesHistory /> : <AccessDenied />;
      case 27: return hasPermission('add_stock') ? <DataImportStudio key="hub-import" initialMode="import" /> : <AccessDenied />;
      case 28: return <SupplierProfileManager />;
      case 29: return <DataImportStudio key="hub-history" initialMode="history" />;
      case 30: return <RecycleBin />;
      default: return <Dashboard />;
    }
  };

  const pageTitles: Record<number, string> = {
    0: 'Dashboard', 1: 'Stock Management', 2: 'Add Stock', 3: 'Purchases', 4: 'Sales',
    5: 'Reports', 6: 'Data Import', 7: 'User Management', 8: 'Backup & Restore', 9: 'Settings',
    10: 'Suppliers', 11: 'Manufacturers', 12: 'Generic Medicines', 13: 'Customers', 14: 'Purchase Returns',
    15: 'Sales Returns', 16: 'Warehouses', 17: 'Stock Transfers', 18: 'Expenses', 19: 'Pricing Rules',
    20: 'Discount Schemes', 21: 'GST & HSN', 22: 'AI Insights', 23: 'Documents', 24: 'Reminders',
    25: 'Notifications', 26: 'Sales History', 27: 'Data Import', 28: 'AI Learning & Profiles',
    29: 'Data Import', 30: 'Recycle Bin',
  };

  // Expose shortcuts for the help dialog
  const shortcuts: KeyboardShortcut[] = [
    { key: 'd', ctrlKey: true, action: () => handleNavigate(0), description: 'Go to Dashboard', category: 'Navigation' },
    { key: 's', ctrlKey: true, action: () => handleNavigate(1), description: 'Go to Stock', category: 'Navigation' },
    { key: 'n', ctrlKey: true, action: () => handleNavigate(2), description: 'Add New Stock', category: 'Navigation' },
    { key: 'p', ctrlKey: true, action: () => handleNavigate(3), description: 'Go to Purchases', category: 'Navigation' },
    { key: 'm', ctrlKey: true, action: () => handleNavigate(4), description: 'Go to Sales', category: 'Navigation' },
    { key: 'r', ctrlKey: true, action: () => handleNavigate(5), description: 'Go to Reports', category: 'Navigation' },
    { key: 'Escape', action: () => {
      const modals = document.querySelectorAll('[role="dialog"]');
      const last = modals[modals.length - 1] as HTMLElement | undefined;
      const closeBtn = last?.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement | undefined;
      closeBtn?.click();
    }, description: 'Close Modal/Dialog', category: 'Actions' },
    { key: 'f', ctrlKey: true, action: () => {
      const search = document.querySelector('input[placeholder*="Search"], input[type="search"]') as HTMLElement | undefined;
      search?.focus();
    }, description: 'Focus Search', category: 'Actions' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950">
      {/* ───── CUSTOM WINDOW TITLEBAR (desktop only, renders null in browser) ───── */}
      <TitleBar />
      {/* ───── APP BODY ───── */}
      <div className="flex flex-1 min-h-0">
      {/* ───── SIDEBAR ───── */}
      <Sidebar
        activeIndex={activeIndex}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      {/* ───── MAIN AREA ───── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Luxury App Bar */}
        <header className="relative h-14 bg-background/90 backdrop-blur-md dark:bg-[#0E2429] border-b border-[#DCEAEC] dark:border-[#223A40] flex items-center px-3 gap-2 flex-shrink-0 z-40 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#17827A]/70 to-transparent pointer-events-none" aria-hidden="true" />
          {/* Collapse sidebar */}
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="flex-shrink-0 w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft className="w-4.5 h-4.5" />
          </button>

          {/* Universal Back button — always visible whenever on any page other than Dashboard */}
          {activeIndex !== 0 && (
            <button
              onClick={handleBack}
              className="flex-shrink-0 inline-flex items-center gap-1.5 h-8.5 px-3 rounded-xl bg-[#14292E] hover:bg-[#223A40] text-white active:scale-95 transition-all duration-150 cursor-pointer text-xs font-semibold shadow-xs"
              aria-label="Go back to previous page or dashboard"
              title="Back (Alt+Left or Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2E9C90]" />
              <span>Back</span>
            </button>
          )}

          {/* Page title + breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className={cn(
              'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0',
              gColor.activeBg, gColor.activeBorder
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', gColor.dot)} />
              {GROUP_LABELS[activeGroup]}
            </span>
            <h1 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight truncate font-display">
              {pageTitles[activeIndex] || 'Dashboard'}
            </h1>
            <span className="hidden md:inline-flex w-1 h-4 rounded-full bg-slate-300 dark:bg-slate-700" />
            <nav className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
              <span className="hover:text-[#123F3D] dark:hover:text-[#2E9C90] cursor-pointer transition-colors flex-shrink-0 font-medium" onClick={() => handleNavigate(0)}>
                Dashboard
              </span>
              <span className="flex-shrink-0 text-slate-400">/</span>
              <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">{pageTitles[activeIndex] || 'Dashboard'}</span>
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Quick status pill */}
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/70 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
            <ThemeToggle theme={theme} onToggle={toggle} />
            <NotificationBell />
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Keyboard shortcuts"
              title="Keyboard Shortcuts (Ctrl+Shift+/)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* User Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all duration-150 group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-[#17827A] shadow-xs">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{user?.displayName}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getRoleBadge())}>
                    {getRoleLabel()}
                  </span>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-slate-500 transition-transform duration-200',
                  showUserMenu && 'rotate-180'
                )} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl border border-border shadow-lg dark:shadow-slate-900/50 animate-scale-in overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowUserMenu(false); handleNavigate(9); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main ref={mainRef} className={cn(
          'relative flex-1 overflow-auto app-mesh transition-colors duration-300'
        )}>
          {/* Ambient brand wash layered over the mesh */}
          <div className={cn(
            'pointer-events-none absolute inset-0',
            GROUP_TINT
          )} />
          <div className="relative z-10 p-6 lg:p-8 max-w-[1440px] mx-auto">
            <div className="page-enter">
              <Suspense fallback={
                <div className="flex items-center justify-center py-32">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading {pageTitles[activeIndex] || 'page'}...</p>
                  </div>
                </div>
              }>
                {renderContent()}
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* Status bar — full width under everything (desktop only) */}
      <StatusBar />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
}