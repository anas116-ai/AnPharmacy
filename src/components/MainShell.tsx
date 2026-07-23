import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { ArrowLeft, ChevronDown, LogOut, User, Settings as SettingsIcon, Keyboard, Loader2 } from 'lucide-react';
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
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const { user, logout, hasPermission } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageHistory, setPageHistory] = useState<number[]>([0]); // Start with Dashboard tracked
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      // Don't push if same page or already in history (prevents duplicates)
      if (prev[prev.length - 1] === index) return prev;
      // Limit history depth to 20 entries max
      const next = [...prev, index];
      if (next.length > 20) next.shift();
      return next;
    });
    setActiveIndex(index);
  }, []);

  const handleBack = useCallback(() => {
    setPageHistory(prev => {
      if (prev.length <= 1) return prev;
      const newHistory = [...prev];
      newHistory.pop();
      return newHistory;
    });
  }, []);

  useEffect(() => {
    if (pageHistory.length > 0) {
      const lastIndex = pageHistory[pageHistory.length - 1];
      setActiveIndex(lastIndex);
    }
  }, [pageHistory]);

  useGlobalShortcuts(handleNavigate);

  const handleLogout = () => {
    logout();
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'sales': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'purchase_mgr': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300';
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

  const renderContent = () => {
    switch (activeIndex) {
      case 0: return <Dashboard />;
      case 1: return <StockManagement />;
      case 2: return hasPermission('add_stock') ? <AddStock /> : <Dashboard />;
      case 3: return hasPermission('view_purchases') ? <Purchases /> : <Dashboard />;
      case 4: return hasPermission('make_sales') ? <Sales /> : <Dashboard />;
      case 5: return hasPermission('view_reports') ? <Reports /> : <Dashboard />;
      case 6: return hasPermission('scan_invoices') ? <ScanInvoice /> : <Dashboard />;
      case 7: return hasPermission('manage_users') ? <UserManagement /> : <Dashboard />;
      case 8: return <BackupRestore />;
      case 9: return <Settings />;
      case 10: return hasPermission('add_stock') ? <Suppliers /> : <Dashboard />;
      case 11: return hasPermission('add_stock') ? <Manufacturers /> : <Dashboard />;
      case 12: return hasPermission('add_stock') ? <GenericMedicines /> : <Dashboard />;
      case 13: return hasPermission('make_sales') ? <Customers /> : <Dashboard />;
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
      case 26: return hasPermission('view_sales') ? <SalesHistory /> : <Dashboard />;
      case 27: return hasPermission('add_stock') ? <DataImportStudio /> : <Dashboard />;
      case 28: return <SupplierProfileManager />;
      case 29: return <ImportHistoryLog />;
      case 30: return <RecycleBin />;
      default: return <Dashboard />;
    }
  };

  const pageTitles: Record<number, string> = {
    0: 'Dashboard',
    1: 'Stock Management',
    2: 'Add Stock',
    3: 'Purchases',
    4: 'Sales',
    5: 'Reports',
    6: 'Scan Invoice',
    7: 'User Management',
    8: 'Backup & Restore',
    9: 'Settings',
    10: 'Suppliers',
    11: 'Manufacturers',
    12: 'Generic Medicines',
    13: 'Customers',
    14: 'Purchase Returns',
    15: 'Sales Returns',
    16: 'Warehouses',
    17: 'Stock Transfers',
    18: 'Expenses',
    19: 'Pricing Rules',
    20: 'Discount Schemes',
    21: 'GST & HSN',
    22: 'AI Insights',
    23: 'Documents',
    24: 'Reminders',
    25: 'Notifications',
    26: 'Sales History',
    27: 'Data Import Studio',
    28: 'AI Learning & Profiles',
    29: 'Import History',
    30: 'Recycle Bin',
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <div className="flex-shrink-0 relative z-30">
        <Sidebar
          activeIndex={activeIndex}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-700/60 flex items-center px-6 gap-4 flex-shrink-0 sticky top-0 z-20">
          {/* Left Side - Title with Back Button */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Back Button - show on all pages except Dashboard */}
            {activeIndex !== 0 && pageHistory.length > 1 && (
              <button
                onClick={handleBack}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 active:scale-95 transition-all duration-150 shadow-sm"
                aria-label="Go back to previous page"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-navy-900 dark:bg-navy-800 flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
              </div>
              <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {pageTitles[activeIndex] || 'Dashboard'}
              </h1>
            </div>
            {/* Breadcrumb */}
            <nav className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 min-w-0">
              <span
                className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors flex-shrink-0"
                onClick={() => handleNavigate(0)}
              >
                Home
              </span>
              <span className="flex-shrink-0">/</span>
              <span className="text-slate-600 dark:text-slate-300 truncate">{pageTitles[activeIndex] || 'Dashboard'}</span>
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle theme={theme} onToggle={toggle} />

            <NotificationBell />

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
              aria-label="Keyboard shortcuts"
              title="Keyboard Shortcuts (Ctrl+Shift+/)"
            >
              <Keyboard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            {/* User Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all duration-150 group"
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br',
                  user?.role === 'admin' ? 'from-purple-500 to-purple-600' :
                  user?.role === 'sales' ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600'
                )}>
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-tight">{user?.displayName}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getRoleBadge())}>
                    {getRoleLabel()}
                  </span>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-slate-400 transition-transform duration-200',
                  showUserMenu && 'rotate-180'
                )} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-lg dark:shadow-slate-900/50 animate-scale-in overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{user?.username}</p>
                  </div>
                  {/* Menu Items */}
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowUserMenu(false); setActiveIndex(9); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="page-enter">
              <Suspense fallback={
                <div className="flex items-center justify-center py-32">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading {pageTitles[activeIndex] || 'page'}...</p>
                  </div>
                </div>
              }>
                {renderContent()}
              </Suspense>
            </div>
          </div>
        </main>

        {/* Keyboard Shortcuts Help Dialog */}
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
          shortcuts={shortcuts}
        />
      </div>
    </div>
  );
}
