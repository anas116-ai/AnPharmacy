import { useEffect, useState, useMemo } from 'react';
import { useStockStore } from '../stores/stockStore';
import { useAuthStore } from '../stores/authStore';
import {
  Pill, Package, IndianRupee, AlertTriangle, AlertCircle,
  Clock, Filter, TrendingUp, Activity, Search, ArrowUpRight,
  BarChart3, RefreshCw, ShoppingCart, ArrowUp, Zap,
  TrendingDown, CalendarDays, ChevronLeft, ChevronRight,
  Receipt, DollarSign, PlusCircle, ScanLine, FileSpreadsheet, HardDrive, Wallet,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { formatCurrency, cn } from '../lib/utils';
import { Medicine } from '../lib/types';
import { useNotificationStore } from '../stores/notificationStore';
import { checkAndCreateExpiryAlerts } from '../lib/notifications';
import { computeProfitSummary } from '../lib/reporting';
import SalesTrendChart from './charts/SalesTrendChart';

// ── Module-level constants ──
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function getMonthLabel(d: Date): string { return MONTHS[d.getMonth()]; }
function daysFromNow(d: Date): number { return Math.round((d.getTime() - Date.now()) / 86400000); }

  const KPI_STYLES = {
    primary: { accent: 'from-accent to-emerald-600', iconBg: 'bg-accent-light text-accent dark:bg-accent/20 dark:text-emerald-300', border: 'border-accent/20' },
    warning: { accent: 'from-amber-500 to-amber-400', iconBg: 'bg-warning-light text-warning dark:bg-warning/20 dark:text-amber-300', border: 'border-warning/20' },
    danger: { accent: 'from-red-500 to-red-400', iconBg: 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-300', border: 'border-destructive/20' },
    muted: { accent: 'from-slate-400 to-slate-300', iconBg: 'bg-muted text-muted-foreground', border: 'border-border' },
  } as const;

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

  useEffect(() => {
    loadDashboardData();
    const timer = setTimeout(() => setAnimateCards(true), 200);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadDashboardData();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onFocus = () => loadDashboardData();
    window.addEventListener('focus', onFocus);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
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
          // ponytail: real 12-month sales trend instead of mock data
          try {
            const salesRes = await window.electronAPI.listSales();
            const sales = salesRes.success ? (salesRes.sales || []) : [];
            const months: { [key: string]: { date: string; sales: number; revenue: number } } = {};
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
  };

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
  const profitSummary = useMemo(() => computeProfitSummary(medicines), [medicines]);

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

  const KPI_CARDS = useMemo(() => [
    { label: 'Total Medicines', value: stockMetrics.totalMedicines.toLocaleString(), icon: Pill, style: 'primary' as keyof typeof KPI_STYLES, footer: 'unique medicines' },
    { label: 'Stock Units', value: stockMetrics.totalStock.toLocaleString(), icon: Package, style: 'primary' as keyof typeof KPI_STYLES, footer: 'across all batches' },
    { label: 'Stock Value', value: formatCurrency(stockMetrics.totalValue), icon: IndianRupee, style: 'warning' as keyof typeof KPI_STYLES, footer: 'at purchase cost' },
    { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), icon: Zap, style: 'primary' as keyof typeof KPI_STYLES, delta: `${revenueChange}%`, deltaUp: parseFloat(revenueChange) >= 0, footer: 'vs yesterday' },
    { label: 'Real Profit', value: formatCurrency(profitSummary.totalRealProfit), icon: DollarSign, style: 'primary' as keyof typeof KPI_STYLES, footer: `margin ${profitSummary.marginPercent.toFixed(1)}%` },
  ], [stockMetrics, stats.todayRevenue, revenueChange, profitSummary]);

  const QUICK_ACTIONS = [
    { index: 2, label: 'Add Stock', desc: 'New batch entry', icon: PlusCircle, tint: 'from-emerald-500 to-teal-600', roles: ['admin', 'purchase_mgr'] },
    { index: 4, label: 'New Sale', desc: 'Billing & checkout', icon: ShoppingCart, tint: 'from-sky-500 to-blue-600', roles: ['admin', 'sales', 'pharmacist'] },
    { index: 6, label: 'Scan Invoice', desc: 'AI purchase entry', icon: ScanLine, tint: 'from-violet-500 to-purple-600', roles: ['admin', 'purchase_mgr'] },
    { index: 5, label: 'Reports', desc: 'Sales, GST & profit', icon: BarChart3, tint: 'from-amber-500 to-orange-500', roles: ['admin', 'sales', 'purchase_mgr'] },
    { index: 27, label: 'Import Data', desc: 'Excel / CSV / PDF', icon: FileSpreadsheet, tint: 'from-teal-500 to-cyan-600', roles: ['admin', 'purchase_mgr'] },
    { index: 8, label: 'Backup', desc: 'Protect your data', icon: HardDrive, tint: 'from-slate-600 to-slate-700', roles: ['admin'] },
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
          <Button variant="default" size="sm" onClick={loadDashboardData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         KPI ROW — the five numbers that matter
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map((card, index) => {
          const Icon = card.icon;
          const styles = KPI_STYLES[card.style];
          return (
            <div
              key={index}
              className={cn(
                'card-elevated overflow-hidden group hover:-translate-y-0.5 transition-all duration-200 relative',
                animateCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className={cn('h-1 w-full bg-gradient-to-r', styles.accent)} />
              <div className="p-5 relative">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">{card.label}</span>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-md flex-shrink-0', styles.iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground font-data tabular-nums leading-none">{card.value}</p>
                <div className="flex items-center gap-1.5 mt-3">
                  {'delta' in card ? (
                    <>
                      <span className={cn(
                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold',
                        card.deltaUp ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400'
                      )}>
                        <ArrowUpRight className={cn('w-3 h-3', !card.deltaUp && 'rotate-90')} />
                        {card.delta}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{card.footer}</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{card.footer}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
         QUICK ACTIONS — one-tap shortcuts
         ══════════════════════════════════════════════════════════════ */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(({ index, label, desc, icon: Icon, tint }) => (
            <button
              key={index}
              onClick={() => onNavigate?.(index)}
              disabled={!onNavigate}
              className="group card-base p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-default"
            >
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200', tint)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         PERFORMANCE + TODAY'S PULSE
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend — spans 2 cols */}
        <Card variant="bordered" className="overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-border/70">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy-50 dark:bg-navy-800/50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-navy-700 dark:text-navy-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Performance</h3>
                <p className="text-xs text-muted-foreground">12-month sales & revenue trend</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <SalesTrendChart data={salesTrendData} className="w-full" height={300} />
          </CardContent>
        </Card>

        {/* Right rail — today's pulse + expiry mix */}
        <div className="space-y-6">
          <Card variant="bordered" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-foreground text-sm">Today's Pulse</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-accent-light/60 dark:bg-accent/10 p-3">
                  <p className="text-[10px] font-semibold text-accent uppercase tracking-wider">Revenue</p>
                  <p className="text-lg font-bold font-data text-foreground mt-1">{formatCurrency(stats.todayRevenue)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {parseFloat(revenueChange) >= 0 ? '+' : ''}{revenueChange}% vs yesterday
                  </p>
                </div>
                <div className="rounded-xl bg-warning-light/60 dark:bg-warning/10 p-3">
                  <p className="text-[10px] font-semibold text-warning uppercase tracking-wider">Items sold</p>
                  <p className="text-lg font-bold font-data text-foreground mt-1">{stats.todayItems}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {parseFloat(itemsChange) >= 0 ? '+' : ''}{itemsChange}% vs yesterday
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transactions</p>
                  <p className="text-xl font-bold font-data text-foreground mt-0.5">{stats.todayTransactions}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Yesterday</p>
                  <p className="text-xl font-bold font-data text-foreground mt-0.5">{formatCurrency(stats.yesterdayRevenue)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="bordered" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-foreground text-sm">Recent Sales</h3>
              {stats.recentSales && stats.recentSales.length > 0 && (
                <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Today
                </span>
              )}
            </div>
            <div className="p-2">
              {stats.recentSales && stats.recentSales.length > 0 ? (
                stats.recentSales.map((sale: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-accent-light dark:bg-accent/15 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{sale.customer}</p>
                        <p className="text-[11px] text-muted-foreground">{sale.qty} items</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground font-data tabular-nums">{formatCurrency(sale.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-muted-foreground py-8">No sales recorded today</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         SMART REORDER WIDGET
         ══════════════════════════════════════════════════════════════ */}
      {lowStockItems.length > 0 && (
        <Card variant="bordered" className="border-amber-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-warning">Smart Reorder Suggestions</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{lowStockItems.length} items below reorder threshold</p>
                </div>
              </div>
              <span className="text-[10px] text-warning font-medium bg-background/60 px-3 py-1 rounded-full">
                Auto-calculated
              </span>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-amber-50 dark:divide-amber-900/20">
              {lowStockItems.slice(0, 8).map((item) => {
                const alertLevel = item.low_stock_alert || 20;
                const stockRatio = alertLevel > 0 ? item.quantity / alertLevel : 1;
                const suggestedReorder = alertLevel * 2 - item.quantity;
                const urgency = stockRatio <= 0.25 ? 'critical' : stockRatio <= 0.5 ? 'warning' : 'moderate';
                return (
                  <div key={item.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-2 h-2 rounded-full', urgency === 'critical' && 'bg-red-500 animate-pulse', urgency === 'warning' && 'bg-orange-500', urgency === 'moderate' && 'bg-amber-400')} />
                        <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', urgency === 'critical' && 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400', urgency === 'warning' && 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400', urgency === 'moderate' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400')}>
                          {urgency === 'critical' ? 'Urgent' : urgency === 'warning' ? 'Low' : 'Moderate'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-4">
                        <span className="text-xs text-muted-foreground">Batch: <span className="font-mono text-muted-foreground">{item.batch_number}</span></span>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', urgency === 'critical' ? 'bg-red-400' : urgency === 'warning' ? 'bg-orange-400' : 'bg-amber-400')} style={{ width: `${Math.min(100, stockRatio * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{item.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">Current</p>
                      </div>
                      <div className="text-muted-foreground/40"><ArrowUp className="w-4 h-4" /></div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{suggestedReorder > 0 ? suggestedReorder : alertLevel}</p>
                        <p className="text-[10px] text-emerald-500">Reorder</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length > 8 && (
                <div className="px-6 py-3 text-center">
                  <span className="text-xs text-amber-600 font-medium">+{lowStockItems.length - 8} more items below threshold</span>
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
        <div className="px-6 py-4 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-800/50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-navy-600 dark:text-navy-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Expiry Overview</h3>
                <p className="text-xs text-muted-foreground">Real-time expiry tracking</p>
              </div>
            </div>
            {totalWithExpiry > 0 && (
              <span className="text-xs text-muted-foreground">{medicines.length} total batches</span>
            )}
          </div>
        </div>
        <CardContent className="p-6">
          {/* Distribution Bar */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>Expiry Distribution</span>
              {totalWithExpiry > 0 && <span className="font-normal text-muted-foreground">({totalWithExpiry} total)</span>}
            </p>
            {totalWithExpiry > 0 ? (
              <>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="flex h-full rounded-full overflow-hidden">
                    {expiryDistribution.safe > 0 && <div className="bg-emerald-400 transition-all duration-1000" style={{ width: `${(expiryDistribution.safe / totalWithExpiry) * 100}%` }} />}
                    {expiryDistribution.warning > 0 && <div className="bg-amber-400 transition-all duration-1000" style={{ width: `${(expiryDistribution.warning / totalWithExpiry) * 100}%` }} />}
                    {expiryDistribution.critical > 0 && <div className="bg-red-400 transition-all duration-1000" style={{ width: `${(expiryDistribution.critical / totalWithExpiry) * 100}%` }} />}
                    {expiryDistribution.expired > 0 && <div className="bg-slate-400 transition-all duration-1000" style={{ width: `${(expiryDistribution.expired / totalWithExpiry) * 100}%` }} />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { label: 'Safe', count: expiryDistribution.safe, color: 'bg-emerald-400' },
                    { label: 'Warning', count: expiryDistribution.warning, color: 'bg-amber-400' },
                    { label: 'Critical', count: expiryDistribution.critical, color: 'bg-red-400' },
                    { label: 'Expired', count: expiryDistribution.expired, color: 'bg-slate-400' },
                  ].filter(item => item.count > 0).map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted">
                      <div className={cn('w-2 h-2 rounded-full', item.color)} />
                      <span className="text-xs font-medium text-muted-foreground">{item.label} <span className="text-muted-foreground">({item.count})</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-12 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">No expiry data available</p></div>
            )}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium uppercase tracking-wider">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {filterChips.map(days => (
              <button key={days} onClick={() => setFilterDays(filterDays === days ? null : days)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
                  filterDays === days ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}>
                {days} days
              </button>
            ))}
            <div className="flex items-center gap-1 ml-1">
              <Input type="number" placeholder="Custom" value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-20 h-8 text-xs rounded-lg"
                onKeyDown={(e) => { if ((e as any).key === 'Enter' && customDays) setFilterDays(parseInt(customDays)); }} />
              <Button variant="ghost" size="icon-sm" className="h-8"
                onClick={() => { if (customDays) setFilterDays(parseInt(customDays)); }}>
                <Search className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Medicine List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {displayedExpiryMeds.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm font-medium">No data available</p>
                <p className="text-slate-300 text-xs mt-1">No medicines match the current filter</p>
              </div>
            ) : (
              <>
                {displayedExpiryMeds.map((medicine: Medicine, idx) => (
                  <div key={medicine.id} className="flex items-center justify-between p-4 rounded-xl border border-border/70 transition-all duration-200 hover:shadow-md hover:border-border cursor-pointer bg-card"
                    style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-2.5 h-2.5 rounded-full',
                          medicine.status === 'expired' && 'bg-slate-400',
                          medicine.status === 'critical' && 'bg-red-500',
                          medicine.status === 'warning' && 'bg-amber-500',
                          medicine.status === 'safe' && 'bg-emerald-500',
                        )} />
                        <span className="font-medium text-sm text-foreground truncate">{medicine.name}</span>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          medicine.status === 'expired' && 'bg-muted text-muted-foreground',
                          medicine.status === 'critical' && 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                          medicine.status === 'warning' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
                          medicine.status === 'safe' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                        )}>
                          {medicine.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-5">
                        Batch: <span className="font-mono text-muted-foreground">{medicine.batch_number}</span>
                        {medicine.company && <span className="ml-2 text-muted-foreground">| {medicine.company}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-lg font-bold text-foreground font-data">{medicine.quantity}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">units</p>
                      {medicine.expiry_date && (
                        <p className={cn('text-xs mt-0.5 font-medium',
                          medicine.days_remaining !== null && medicine.days_remaining <= 0 && 'text-red-500',
                          medicine.days_remaining !== null && medicine.days_remaining > 0 && medicine.days_remaining <= 90 && 'text-amber-600',
                          medicine.days_remaining !== null && medicine.days_remaining > 90 && 'text-muted-foreground',
                        )}>
                          {medicine.days_remaining !== null ? `${Math.round(medicine.days_remaining)}d left` : 'No expiry'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {hasMoreExpiry && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setExpiryDisplayLimit(prev => prev + EXPIRY_PAGE_SIZE)}
                      className="px-6 py-2.5 text-xs font-medium text-accent bg-accent-light hover:bg-accent/15 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      Show {Math.min(EXPIRY_PAGE_SIZE, filteredMedicines.length - expiryDisplayLimit)} More
                      <span className="ml-1.5 text-accent/60">({filteredMedicines.length - expiryDisplayLimit} remaining)</span>
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
          if (d <= 90) return 'bg-orange-400';
          if (d <= 180) return 'bg-amber-400';
          return 'bg-emerald-400';
        };
        if (ganttMeds.length === 0) return null;

        return (
          <Card variant="bordered" className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/20">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Expiry Calendar</h3>
                    <p className="text-xs text-muted-foreground">Gantt timeline — {ganttMeds.length} medicines expiring</p>
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
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', med.daysRemaining < 0 && 'bg-muted text-muted-foreground', med.daysRemaining >= 0 && med.daysRemaining <= 30 && 'bg-red-50 text-red-600', med.daysRemaining > 30 && med.daysRemaining <= 90 && 'bg-orange-50 text-orange-600', med.daysRemaining > 90 && 'bg-emerald-50 text-emerald-600')}>{statusLabel}</span>
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
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-muted-foreground">Safe (6-12mo)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[10px] text-muted-foreground">Warning (3-6mo)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span className="text-[10px] text-muted-foreground">Soon (1-3mo)</span></div>
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
