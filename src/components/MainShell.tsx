import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuthStore } from '../stores/authStore';
import { NAV_ITEMS } from '../lib/types';
import { ArrowLeft, ChevronDown, LogOut, Settings as SettingsIcon, Keyboard, Loader2, Lock, PanelLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { useGlobalShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import NotificationBell from './NotificationBell';
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
const ScanInvoice = lazy(() => import('./ScanInvoice'));
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
const ImportHistoryLog = lazy(() => import('./ImportHistoryLog'));
const RecycleBin = lazy(() => import('./RecycleBin'));

export default function MainShell() {
  const { theme, toggle } = useTheme();
  const { user, logout, hasPermission } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageHistory, setPageHistory] = useState<number[]>([0]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Distinct subtle background per navigation group — each layout reads differently
  const groupTints: Record<string, string> = {
    overview: 'bg-gradient-to-b from-emerald-50/60 to-slate-100 dark:from-emerald-950/20 dark:to-slate-950',
    stock: 'bg-gradient-to-b from-emerald-50/80 to-slate-100 dark:from-emerald-950/30 dark:to-slate-950',
    sales: 'bg-gradient-to-b from-sky-50/70 to-slate-100 dark:from-sky-950/25 dark:to-slate-950',
    returns: 'bg-gradient-to-b from-amber-50/60 to-slate-100 dark:from-amber-950/20 dark:to-slate-950',
    people: 'bg-gradient-to-b from-violet-50/50 to-slate-100 dark:from-violet-950/20 dark:to-slate-950',
    operations: 'bg-gradient-to-b from-cyan-50/60 to-slate-100 dark:from-cyan-950/20 dark:to-slate-950',
    insights: 'bg-gradient-to-b from-indigo-50/50 to-slate-100 dark:from-indigo-950/20 dark:to-slate-950',
    admin: 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-950',
  };

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
      if (prev.length <= 1) return prev;
      const newHistory = [...prev];
      newHistory.pop();
      return newHistory;
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

  useGlobalShortcuts(handleNavigate);

  const handleLogout = () => { logout(); };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin': return 'bg-accent-light text-accent dark:bg-accent/20 dark:text-accent';
      case 'sales': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'purchase_mgr': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
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
      case 6: return hasPermission('scan_invoices') ? <ScanInvoice /> : <AccessDenied />;
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
      case 27: return hasPermission('add_stock') ? <DataImportStudio /> : <AccessDenied />;
      case 28: return <SupplierProfileManager />;
      case 29: return <ImportHistoryLog />;
      case 30: return <RecycleBin />;
      default: return <Dashboard />;
    }
  };

  const pageTitles: Record<number, string> = {
    0: 'Dashboard', 1: 'Stock Management', 2: 'Add Stock', 3: 'Purchases', 4: 'Sales',
    5: 'Reports', 6: 'Scan Invoice', 7: 'User Management', 8: 'Backup & Restore', 9: 'Settings',
    10: 'Suppliers', 11: 'Manufacturers', 12: 'Generic Medicines', 13: 'Customers', 14: 'Purchase Returns',
    15: 'Sales Returns', 16: 'Warehouses', 17: 'Stock Transfers', 18: 'Expenses', 19: 'Pricing Rules',
    20: 'Discount Schemes', 21: 'GST & HSN', 22: 'AI Insights', 23: 'Documents', 24: 'Reminders',
    25: 'Notifications', 26: 'Sales History', 27: 'Data Import Studio', 28: 'AI Learning & Profiles',
    29: 'Import History', 30: 'Recycle Bin',
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
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
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
        {/* Clean app bar */}
        <header className="h-14 bg-slate-950 border-b border-white/[0.06] flex items-center px-3 gap-2 flex-shrink-0 z-40">
          {/* Collapse sidebar */}
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="flex-shrink-0 w-9 h-9 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft className="w-4.5 h-4.5 text-slate-300" />
          </button>

          {/* Back button */}
          {activeIndex !== 0 && pageHistory.length > 1 && (
            <button
              onClick={handleBack}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer"
              aria-label="Go back to previous page"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-slate-200" />
            </button>
          )}

          {/* Page title + breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold text-white tracking-tight truncate font-display">
              {pageTitles[activeIndex] || 'Dashboard'}
            </h1>
            <nav className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <span className="hover:text-white cursor-pointer transition-colors flex-shrink-0" onClick={() => handleNavigate(0)}>
                Home
              </span>
              <span className="flex-shrink-0">/</span>
              <span className="text-muted-foreground truncate">{pageTitles[activeIndex] || 'Dashboard'}</span>
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle theme={theme} onToggle={toggle} />
            <NotificationBell />
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Keyboard shortcuts"
              title="Keyboard Shortcuts (Ctrl+Shift+/)"
            >
              <Keyboard className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* User Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all duration-150 group cursor-pointer"
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br',
                  user?.role === 'admin' ? 'from-accent to-emerald-600' :
                  user?.role === 'sales' ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-orange-600'
                )}>
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-medium text-white leading-tight">{user?.displayName}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getRoleBadge())}>
                    {getRoleLabel()}
                  </span>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
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
          'flex-1 overflow-auto transition-colors duration-300',
          groupTints[NAV_ITEMS.find(i => i.index === activeIndex)?.group || 'overview']
        )}>
          <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
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

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
}