import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useStockStore } from '../stores/stockStore';
import { useAuthStore } from '../stores/authStore';
import {
  Pill, Package, AlertTriangle, AlertCircle,
  Clock, Filter, TrendingUp, Activity, Search, ArrowUpRight,
  BarChart3, RefreshCw, ShoppingCart, ArrowUp,
  TrendingDown, CalendarDays, ChevronLeft, ChevronRight,
  Receipt, PlusCircle, ScanLine, FileSpreadsheet, HardDrive, Wallet,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { Medicine } from '../lib/types';
import { useNotificationStore } from '../stores/notificationStore';
import { checkAndCreateExpiryAlerts } from '../lib/notifications';
import SalesTrendChart from './charts/SalesTrendChart';
import PharmacyVisualOverview from './PharmacyVisualOverview';

// ── Module-level constants ──
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function getMonthLabel(d: Date): string { return MONTHS[d.getMonth()]; }
function daysFromNow(d: Date): number { return Math.round((d.getTime() - Date.now()) / 86400000); }

interface DashboardProps {
  onNavigate?: (index: number) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { medicines, dashboardStats, setMedicines, setDashboardStats } = useStockStore();
  const { user } = useAuthStore();
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [animateCards, setAnimateCards] = useState(false);
  const [ganttMonthOffset, setGanttMonthOffset] = useState(0);
  const [expiryDisplayLimit, setExpiryDisplayLimit] = useState(50);
  const [salesTrendData, setSalesTrendData] = useState<{ date: string; sales: number; revenue: number }[]>([]);
  const EXPIRY_PAGE_SIZE = 50;

  const lastFetchRef = useRef<number>(0);

  const loadDashboardData = useCallback(async (force = false) => {
    const now = Date.now();
    // Throttle background refreshes: at most once every 60 seconds unless explicitly forced
    if (!force && lastFetchRef.current > 0 && now - lastFetchRef.current < 60000) {
      return;
    }
    lastFetchRef.current = now;

    // Only show full loading spinner on initial mount or manual force refresh
    if (force || lastFetchRef.current === now) {
      setIsLoading(true);
    }

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getDashboardStats();
        if (result.success) {
          setDashboardStats(result.stats);
          setMedicines(result.medicines || []);
          const u = useAuthStore.getState().user;
          if (u?.id) {
            useNotificationStore.getState().fetchNotifications(u.id);
            checkAndCreateExpiryAlerts(result.medicines || [], u.id,
              (notification) => useNotificationStore.getState().addNotification(notification));
          }
          // ponytail: real 12-month sales trend with safe aggregation
          try {
            const salesRes = await window.electronAPI.listSales();
            const sales = salesRes.success ? (salesRes.sales || []) : [];
            const months: { [key: string]: { date: string; sales: number; revenue: number } } = {};
            const currentDate = new Date();
            for (let i = 11; i >= 0; i--) {
              const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              months[key] = { date: d.toLocaleString('default', { month: 'short' }), sales: 0, revenue: 0 };
            }
            for (const s of sales) {
              const key = String(s.sale_date || '').slice(0, 7);
              if (months[key]) {
                months[key].sales += s.quantity || 0;
                months[key].revenue += s.total_amount || 0;
              }
            }
            setSalesTrendData(Object.values(months));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setDashboardStats, setMedicines]);

  useEffect(() => {
    loadDashboardData(true);
    const timer = setTimeout(() => setAnimateCards(true), 200);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadDashboardData]);

  const filterChips = [30, 60, 90, 120, 180, 240, 365];
  const filteredMedicines = filterDays
    ? medicines.filter(m => m.days_remaining !== null && m.days_remaining <= filterDays)
    : medicines;
  const displayedExpiryMeds = filteredMedicines.slice(0, expiryDisplayLimit);
  const hasMoreExpiry = filteredMedicines.length > expiryDisplayLimit;

  const stats = useMemo(() => dashboardStats || {
    totalMedicines: 0, totalStock: 0, totalValue: 0, expired: 0, critical: 0,
    todayRevenue: 0, todayItems: 0, yesterdayRevenue: 0, yesterdayItems: 0,
    todayTransactions: 0, recentSales: []
  }, [dashboardStats]);

  const expiryDistribution = useMemo(() => ({
    expired: medicines.filter(m => m.status === 'expired').length,
    critical: medicines.filter(m => m.status === 'critical').length,
    warning: medicines.filter(m => m.status === 'warning').length,
    safe: medicines.filter(m => m.status === 'safe').length,
  }), [medicines]);

  const totalWithExpiry = expiryDistribution.expired + expiryDistribution.critical + expiryDistribution.warning + expiryDistribution.safe;

  const stockMetrics = useMemo(() => ({
    totalMedicines: new Set(medicines.filter(m => m.name && m.name.trim()).map(m => m.name.trim().toLowerCase())).size,
    totalStock: medicines.reduce((s, m) => s + (m.quantity || 0), 0),
    totalValue: medicines.reduce((s, m) => s + ((m.quantity || 0) * (m.purchase_price || 0)), 0),
    expired: medicines.filter(m => m.status === 'expired').length,
    critical: medicines.filter(m => m.status === 'critical').length,
  }), [medicines]);

  const revenueChange = useMemo(() => {
    return stats.yesterdayRevenue > 0
      ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue * 100).toFixed(1)
      : stats.todayRevenue > 0 ? '+100' : '0';
  }, [stats.todayRevenue, stats.yesterdayRevenue]);

  const itemsChange = useMemo(() => {
    return stats.yesterdayItems > 0
      ? ((stats.todayItems - stats.yesterdayItems) / stats.yesterdayItems * 100).toFixed(1)
      : stats.todayItems > 0 ? '+100' : '0';
  }, [stats.todayItems, stats.yesterdayItems]);

  const lowStockItems = useMemo(() => {
    return medicines.filter(m =>
      m.status !== 'expired' &&
      m.low_stock_alert != null &&
      m.quantity > 0 &&
      m.quantity <= m.low_stock_alert &&
      (m.name || '').trim().length > 0
    ).sort((a, b) => {
      const aRatio = a.low_stock_alert! > 0 ? a.quantity / a.low_stock_alert! : 1;
      const bRatio = b.low_stock_alert! > 0 ? b.quantity / b.low_stock_alert! : 1;
      return aRatio - bRatio;
    });
  }, [medicines]);

  const QUICK_ACTIONS = [
    { index: 2, label: 'Add Stock', desc: 'New batch entry', shortcut: 'Ctrl+N', icon: PlusCircle, roles: ['admin', 'purchase_mgr'] },
    { index: 4, label: 'New Sale', desc: 'Billing & POS', shortcut: 'Ctrl+S', icon: Receipt, roles: ['admin', 'sales', 'pharmacist'], primary: true },
    { index: 6, label: 'Scan Invoice', desc: 'OCR purchase entry', shortcut: 'Ctrl+I', icon: ScanLine, roles: ['admin', 'purchase_mgr'] },
    { index: 5, label: 'Reports', desc: 'Sales, GST & profit', shortcut: 'Ctrl+R', icon: BarChart3, roles: ['admin', 'sales', 'purchase_mgr'] },
    { index: 27, label: 'Import Data', desc: 'Excel / CSV / PDF', shortcut: 'Ctrl+M', icon: FileSpreadsheet, roles: ['admin', 'purchase_mgr'] },
    { index: 8, label: 'Backup', desc: 'Encrypted export', shortcut: 'Ctrl+B', icon: ShieldCheck, roles: ['admin'] },
  ].filter(a => !a.roles || (user && a.roles.includes(user.role)));

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── LOADING STATE ──
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-8 w-64 rounded-lg" />
            <div className="skeleton h-4 w-72 rounded-lg" />
          </div>
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card-base p-5">
              <div className="skeleton h-3 w-24 mb-4 rounded-full" />
              <div className="skeleton h-8 w-20 rounded-lg" />
              <div className="skeleton h-2 w-14 mt-3 rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-base p-6">
            <div className="skeleton h-5 w-32 mb-6 rounded-lg" />
            <div className="skeleton h-64 w-full rounded-xl" />
          </div>
          <div className="card-base p-6 space-y-4">
            <div className="skeleton h-5 w-32 rounded-lg" />
            <div className="skeleton h-32 w-full rounded-xl" />
            <div className="skeleton h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════
         HEADER — greeting + context
         ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="heading-display text-2xl font-bold text-foreground">
              {greeting}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
            </h2>
            <Badge variant="outline-teal" size="sm" className="gap-1.5">
              <Activity className="w-3 h-3" />
              Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{todayLabel} · Here's what's happening in your pharmacy today</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={() => loadDashboardData(true)} className="gap-2" disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         PHARMACY SALES RESULTS & VISUAL OVERVIEW (from user reference)
         ══════════════════════════════════════════════════════════════ */}
      <PharmacyVisualOverview
        stats={stats}
        stockMetrics={stockMetrics}
        revenueChange={revenueChange}
      />

      {/* ══════════════════════════════════════════════════════════════
         QUICK ACTIONS — Executive action command deck
         ══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fast Operations</p>
          <span className="text-[11px] text-muted-foreground/70">Keyboard ready</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {QUICK_ACTIONS.map(({ index, label, desc, shortcut, icon: Icon, primary }) => (
            <button
              key={index}
              onClick={() => onNavigate?.(index)}
              disabled={!onNavigate}
              className={cn(
                "group relative p-3.5 text-left rounded-xl border transition-all duration-140 active:scale-[0.98] cursor-pointer disabled:opacity-60",
                primary
                  ? "bg-primary/5 hover:bg-primary/10 border-primary/30 shadow-xs"
                  : "bg-card hover:bg-muted/50 border-border/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-140",
                  primary ? "bg-primary text-white shadow-xs" : "bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                {shortcut && (
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted/70 text-muted-foreground border border-border/50">
                    {shortcut}
                  </kbd>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground tracking-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{desc}</p>
            </button>
          ))}
        </div>
      </div>



      {/* ══════════════════════════════════════════════════════════════
         SMART REORDER WIDGET
         ══════════════════════════════════════════════════════════════ */}
      {lowStockItems.length > 0 && (
        <Card variant="bordered" className="border-amber-500/25 bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Smart Reorder Suggestions</h3>
                <p className="text-xs text-muted-foreground">{lowStockItems.length} items below safety reorder threshold</p>
              </div>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              FEFO Priority
            </span>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {lowStockItems.slice(0, 8).map((item) => {
                const alertLevel = item.low_stock_alert || 20;
                const stockRatio = alertLevel > 0 ? item.quantity / alertLevel : 1;
                const suggestedReorder = alertLevel * 2 - item.quantity;
                const urgency = stockRatio <= 0.25 ? 'critical' : stockRatio <= 0.5 ? 'warning' : 'moderate';
                return (
                  <div key={item.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-2 h-2 rounded-full', urgency === 'critical' && 'bg-red-500 animate-pulse', urgency === 'warning' && 'bg-amber-500', urgency === 'moderate' && 'bg-amber-400')} />
                        <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium border', urgency === 'critical' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40', urgency === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40', urgency === 'moderate' && 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800')}>
                          {urgency === 'critical' ? 'Urgent' : urgency === 'warning' ? 'Low' : 'Moderate'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 ml-4">
                        <span className="text-xs text-muted-foreground">Batch: <span className="font-mono text-foreground/80">{item.batch_number}</span></span>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', urgency === 'critical' ? 'bg-red-500' : urgency === 'warning' ? 'bg-amber-500' : 'bg-amber-400')} style={{ width: `${Math.min(100, stockRatio * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 flex-shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground font-data tabular-nums">{item.quantity}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                      </div>
                      <div className="text-muted-foreground/30"><ArrowUp className="w-4 h-4" /></div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#0E5B55] dark:text-[#7AD1C5] font-data tabular-nums">{suggestedReorder > 0 ? suggestedReorder : alertLevel}</p>
                        <p className="text-[10px] text-[#0E5B55] dark:text-[#7AD1C5] uppercase">Suggested</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length > 8 && (
                <div className="px-6 py-2.5 text-center bg-muted/20">
                  <span className="text-xs text-muted-foreground font-medium">+{lowStockItems.length - 8} more items requiring restock</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════
         EXPIRY OVERVIEW
         ══════════════════════════════════════════════════════════════ */}
      <Card variant="bordered" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#17827A]/10 text-[#123F3D] dark:bg-[#17827A]/20 dark:text-[#2E9C90] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Expiry Overview & FEFO Radar</h3>
              <p className="text-xs text-muted-foreground">Prioritized by First-Expired, First-Out sequence</p>
            </div>
          </div>
          {totalWithExpiry > 0 && (
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              {medicines.length} batches tracked
            </span>
          )}
        </div>
        <CardContent className="p-6">
          {/* Distribution Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Batch Expiry Distribution
              </p>
              {totalWithExpiry > 0 && (
                <span className="text-xs text-muted-foreground font-data tabular-nums">{totalWithExpiry} active batches</span>
              )}
            </div>
            {totalWithExpiry > 0 ? (
              <>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="flex h-full rounded-full overflow-hidden">
                    {expiryDistribution.safe > 0 && <div className="bg-[#17827A] transition-all duration-500" style={{ width: `${(expiryDistribution.safe / totalWithExpiry) * 100}%` }} />}
                    {expiryDistribution.warning > 0 && <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(expiryDistribution.warning / totalWithExpiry) * 100}%` }} />}
                    {expiryDistribution.critical > 0 && <div className="bg-red-500 transition-all duration-500" style={{ width: `${(expiryDistribution.critical / totalWithExpiry) * 100}%` }} />}
                    {expiryDistribution.expired > 0 && <div className="bg-slate-400 transition-all duration-500" style={{ width: `${(expiryDistribution.expired / totalWithExpiry) * 100}%` }} />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {[
                    { label: 'Safe (>180d)', count: expiryDistribution.safe, color: 'bg-[#17827A]' },
                    { label: 'Warning (90-180d)', count: expiryDistribution.warning, color: 'bg-amber-500' },
                    { label: 'Critical (<90d)', count: expiryDistribution.critical, color: 'bg-red-500' },
                    { label: 'Expired', count: expiryDistribution.expired, color: 'bg-slate-400' },
                  ].filter(item => item.count > 0).map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/50 text-[11px]">
                      <div className={cn('w-2 h-2 rounded-full', item.color)} />
                      <span className="text-muted-foreground font-medium">{item.label}:</span>
                      <span className="font-bold text-foreground font-data tabular-nums">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-12 rounded-lg bg-muted/40 border border-border/50"><p className="text-sm text-muted-foreground">No expiry data available</p></div>
            )}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/50">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold uppercase tracking-wider mr-1">
              <Filter className="w-3 h-3" /> Filter Window:
            </span>
            {filterChips.map(days => (
              <button key={days} onClick={() => setFilterDays(filterDays === days ? null : days)}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-140 cursor-pointer active:scale-95',
                  filterDays === days ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
                )}>
                {days}d
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <Input type="number" placeholder="Custom days" value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-28 h-8 text-xs rounded-md"
                onKeyDown={(e) => { if ((e as any).key === 'Enter' && customDays) setFilterDays(parseInt(customDays)); }} />
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs"
                onClick={() => { if (customDays) setFilterDays(parseInt(customDays)); }}>
                <Search className="w-3 h-3 mr-1" /> Apply
              </Button>
            </div>
          </div>

          {/* Medicine List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {displayedExpiryMeds.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-foreground text-sm font-medium">All Clear</p>
                <p className="text-muted-foreground text-xs mt-0.5">No batches match the selected expiry window</p>
              </div>
            ) : (
              <>
                {displayedExpiryMeds.map((medicine: Medicine, idx) => (
                  <div key={medicine.id} className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 transition-all duration-140 hover:bg-muted/30 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer bg-card"
                    style={{ animationDelay: `${idx * 20}ms` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full',
                          medicine.status === 'expired' && 'bg-slate-400',
                          medicine.status === 'critical' && 'bg-red-500',
                          medicine.status === 'warning' && 'bg-amber-500',
                          medicine.status === 'safe' && 'bg-[#17827A]',
                        )} />
                        <span className="font-semibold text-sm text-foreground truncate">{medicine.name}</span>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-md font-medium border uppercase tracking-wider',
                          medicine.status === 'expired' && 'bg-muted text-muted-foreground border-border',
                          medicine.status === 'critical' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40',
                          medicine.status === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
                          medicine.status === 'safe' && 'bg-[#EAF6F3] text-[#0E5B55] border-[#C7EBE6] dark:bg-[#12302F] dark:text-[#7AD1C5] dark:border-[#1D4A47]',
                        )}>
                          {medicine.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        Batch: <span className="font-mono text-foreground/80 font-medium">{medicine.batch_number}</span>
                        {medicine.company && <span className="ml-2 text-muted-foreground">· {medicine.company}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-base font-bold text-foreground font-data tabular-nums">{medicine.quantity}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Units</p>
                      {medicine.expiry_date && (
                        <p className={cn('text-xs mt-0.5 font-medium font-data',
                          medicine.days_remaining !== null && medicine.days_remaining <= 0 && 'text-red-600 dark:text-red-400 font-semibold',
                          medicine.days_remaining !== null && medicine.days_remaining > 0 && medicine.days_remaining <= 90 && 'text-amber-600 dark:text-amber-400',
                          medicine.days_remaining !== null && medicine.days_remaining > 90 && 'text-muted-foreground',
                        )}>
                          {medicine.days_remaining !== null ? `${Math.round(medicine.days_remaining)}d remaining` : 'No date'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {hasMoreExpiry && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setExpiryDisplayLimit(prev => prev + EXPIRY_PAGE_SIZE)}
                      className="px-5 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-all duration-140 cursor-pointer active:scale-95"
                    >
                      Show {Math.min(EXPIRY_PAGE_SIZE, filteredMedicines.length - expiryDisplayLimit)} More
                      <span className="ml-1.5 opacity-70">({filteredMedicines.length - expiryDisplayLimit} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
         EXPIRY CALENDAR GANTT
         ══════════════════════════════════════════════════════════════ */}
      {(() => {
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth() + ganttMonthOffset, 1);
        const ganttMonths = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
          return { label: getMonthLabel(d), year: d.getFullYear(), days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
        });
        const ganttMeds = medicines
          .filter(m => m.expiry_date && m.quantity > 0)
          .map(m => ({ ...m, expiryDate: new Date(m.expiry_date!), daysRemaining: daysFromNow(new Date(m.expiry_date!)) }))
          .filter(m => m.daysRemaining >= -30 && m.daysRemaining <= 395)
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .slice(0, 30);
        const totalDays = ganttMonths.reduce((s, m) => s + m.days, 0);
        let cumulativeDay = 0;
        const monthOffsets = ganttMonths.map(m => { const offset = cumulativeDay; cumulativeDay += m.days; return { ...m, offset }; });
        const getGanttBar = (med: any) => {
          const startDays = Math.max(0, med.daysRemaining);
          const barLength = Math.max(3, Math.min(totalDays - startDays, 30));
          return { leftPct: (startDays / totalDays) * 100, widthPct: (barLength / totalDays) * 100 };
        };
        const severityColor = (med: any) => {
          const d = med.daysRemaining;
          if (d < 0) return 'bg-slate-400';
          if (d <= 30) return 'bg-red-500';
          if (d <= 90) return 'bg-amber-500';
          if (d <= 180) return 'bg-amber-300';
          return 'bg-[#3FA79B]';
        };
        if (ganttMeds.length === 0) return null;

        return (
          <Card variant="bordered" className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#17827A]/10 text-[#123F3D] dark:bg-[#17827A]/20 dark:text-[#7AD1C5] flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Expiry Calendar</h3>
                  <p className="text-xs text-muted-foreground">FEFO Gantt timeline — {ganttMeds.length} active batches</p>
                </div>
              </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setGanttMonthOffset(prev => Math.max(-12, prev - 3))} className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-xs font-medium text-muted-foreground min-w-[100px] text-center">
                    {ganttMonths[0].label} {ganttMonths[0].year} — {ganttMonths[11].label} {ganttMonths[11].year}
                  </span>
                  <button onClick={() => setGanttMonthOffset(prev => Math.min(12, prev + 3))} className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            <CardContent className="p-6">
              <div className="flex mb-2">
                <div className="w-[180px] flex-shrink-0" />
                <div className="flex-1 flex">
                  {ganttMonths.map((m, i) => (
                    <div key={i} className="flex-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider text-center truncate">{m.label}</div>
                  ))}
                </div>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {ganttMeds.map(med => {
                  const { leftPct, widthPct } = getGanttBar(med);
                  const statusLabel = med.daysRemaining < 0 ? 'Expired' : med.daysRemaining <= 30 ? 'Critical' : med.daysRemaining <= 90 ? 'Warning' : 'OK';
                  return (
                    <div key={med.id} className="flex items-center group hover:bg-muted rounded-lg px-1 py-1 transition-colors">
                      <div className="w-[180px] flex-shrink-0 flex items-center gap-2 pr-3">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', severityColor(med))} />
                        <span className="text-xs font-medium text-card-foreground truncate">{med.name}</span>
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', med.daysRemaining < 0 && 'bg-muted text-muted-foreground', med.daysRemaining >= 0 && med.daysRemaining <= 30 && 'bg-red-50 text-red-600', med.daysRemaining > 30 && med.daysRemaining <= 90 && 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', med.daysRemaining > 90 && 'bg-[#EAF6F3] text-[#0E5B55] dark:bg-[#12302F] dark:text-[#7AD1C5]')}>{statusLabel}</span>
                      </div>
                      <div className="flex-1 h-6 relative bg-muted rounded-full overflow-hidden">
                        {monthOffsets.map((m, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200/30" style={{ left: `${(m.offset / totalDays) * 100}%` }} />
                        ))}
                        <div className={cn('absolute top-1 bottom-1 rounded-full transition-all duration-500', severityColor(med))} style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, opacity: med.daysRemaining < 0 ? 0.4 : 0.85 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/70">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Legend:</span>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#3FA79B]" /><span className="text-[10px] text-muted-foreground">Safe (6-12mo)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="text-[10px] text-muted-foreground">Warning (3-6mo)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-[10px] text-muted-foreground">Soon (1-3mo)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[10px] text-muted-foreground">Critical (&lt;30d)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400" /><span className="text-[10px] text-muted-foreground">Expired</span></div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
