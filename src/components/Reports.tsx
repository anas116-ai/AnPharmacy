import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Package, AlertTriangle, DollarSign, IndianRupee, TrendingUp, FileSpreadsheet, Filter, Mail, Loader2, ArrowUpRight, ArrowDownRight, Minus, Gauge, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import StockBarChart from './charts/StockBarChart';
import ExpiryPieChart, { buildDefaultData } from './charts/ExpiryPieChart';
import SalesTrendChart, { MOCK_SALES_DATA } from './charts/SalesTrendChart';

function DifferenceBadge({ value, reverse = false, suffix = '' }: { value: number; reverse?: boolean; suffix?: string }) {
  const isPositive = reverse ? value < 0 : value > 0;
  const isNegative = reverse ? value > 0 : value < 0;
  const isZero = value === 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
      isPositive && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      isNegative && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      isZero && 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    )}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : isNegative ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {formatCurrency(Math.abs(value))}{suffix}
    </span>
  );
}

function ProgressBar({ value, max, color = 'teal' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorMap[color] || 'bg-teal-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('stock');
  const [stockReport, setStockReport] = useState<any>(null);
  const [expiryReport, setExpiryReport] = useState<any>(null);
  const [expiryTierReport, setExpiryTierReport] = useState<any>(null);
  const [profitReport, setProfitReport] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    try {
      if (window.electronAPI) {
        if (activeTab === 'stock') {
          const result = await window.electronAPI.getStockReport();
          if (result.success) setStockReport(result);
        } else if (activeTab === 'expiry') {
          const result = await window.electronAPI.getExpiryReport();
          if (result.success) setExpiryReport(result);
        } else if (activeTab === 'expirytiers') {
          const result = await window.electronAPI.getExpiryTierReport();
          if (result.success) setExpiryTierReport(result);
        } else if (activeTab === 'profit') {
          const result = await window.electronAPI.getProfitReport();
          if (result.success) setProfitReport(result);
        } else if (activeTab === 'sales') {
          const result = await window.electronAPI.getSalesReport();
          if (result.success) setSalesReport(result);
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let csv = '';
      let filename = '';

      if (activeTab === 'stock' && stockReport?.medicines) {
        filename = 'stock_report.csv';
        csv = 'Medicine,Batch,Company,Quantity,Purchase Price,Selling Price,Price Diff,Mfg Date,Expiry Date,Status,Days Remaining\n';
        stockReport.medicines.forEach((m: any) => {
          const priceDiff = (m.selling_price || 0) - (m.purchase_price || 0);
          csv += `"${m.name}","${m.batch_number}","${m.company || ''}",${m.quantity},${m.purchase_price || 0},${m.selling_price || 0},${priceDiff},"${m.mfg_date || ''}","${m.expiry_date || ''}","${m.status}","${m.days_remaining || ''}"\n`;
        });
      } else if (activeTab === 'expiry' && expiryReport?.categories) {
        filename = 'expiry_report.csv';
        csv = 'Category,Medicine,Batch,Company,Quantity,Expiry Date,Days Remaining\n';
        Object.entries(expiryReport.categories).forEach(([category, items]: [string, any]) => {
          items.forEach((m: any) => {
            csv += `"${category}","${m.name}","${m.batch_number}","${m.company || ''}",${m.quantity},"${m.expiry_date || ''}","${Math.round(m.days_remaining || 0)}"\n`;
          });
        });
      } else if (activeTab === 'profit' && profitReport?.rows) {
        filename = 'profit_report.csv';
        csv = 'Medicine,Batch,Quantity,Purchase,Sale,Input GST,Output GST,Net GST,Real Margin,Margin %\n';
        profitReport.rows.forEach((r: any) => {
          csv += `"${r.name}","${r.batch_number}",${r.quantity},${r.purchase_price},${r.selling_price},${r.input_gst},${r.output_gst},${r.output_gst - r.input_gst},${r.real_margin},${r.margin_percent.toFixed(1)}\n`;
        });
      } else if (activeTab === 'expirytiers' && expiryTierReport?.tiers) {
        filename = 'expiry_tiers_report.csv';
        csv = 'Tier,Medicine,Batch,Company,Quantity,Expiry Date,Days Remaining\n';
        Object.entries(expiryTierReport.tiers).forEach(([tier, items]: [string, any]) => {
          items.forEach((m: any) => {
            csv += `"${tier}","${m.name}","${m.batch_number}","${m.company || ''}",${m.quantity},"${m.expiry_date || ''}","${m.days_remaining || ''}"\n`;
          });
        });
      }

      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailReport = async () => {
    setIsEmailing(true);
    try {
      let subject = '';
      let body = '';

      if (activeTab === 'stock' && stockReport?.stats) {
        subject = `Stock Report - ${new Date().toLocaleDateString()}`;
        body = `Stock Report\n\nTotal Medicines: ${stockReport.stats.uniqueMedicines}\nTotal Batches: ${stockReport.stats.totalBatches}\nTotal Units: ${stockReport.stats.totalUnits}\nTotal Value: ${formatCurrency(stockReport.stats.totalValue)}\nAvg Price: ${formatCurrency(stockReport.stats.avgPricePerUnit)}\n\nGenerated from AnPharmacy`;
      } else if (activeTab === 'expiry' && expiryReport?.categories) {
        subject = `Expiry Report - ${new Date().toLocaleDateString()}`;
        const expired = (expiryReport.categories.expired || []).length;
        const critical = (expiryReport.categories.critical || []).length;
        const warning = (expiryReport.categories.warning || []).length;
        const safe = (expiryReport.categories.safe || []).length;
        const total = expired + critical + warning + safe;
        body = `Expiry Report\n\nExpired: ${expired} (${total > 0 ? Math.round(expired/total*100) : 0}%)\nCritical (≤90 days): ${critical} (${total > 0 ? Math.round(critical/total*100) : 0}%)\nWarning (91-180 days): ${warning} (${total > 0 ? Math.round(warning/total*100) : 0}%)\nSafe (>180 days): ${safe} (${total > 0 ? Math.round(safe/total*100) : 0}%)\n\nGenerated from AnPharmacy`;
      } else if (activeTab === 'sales' && salesReport?.stats) {
        subject = `Sales Report - ${new Date().toLocaleDateString()}`;
        body = `Sales Report\n\nTotal Revenue: ${formatCurrency(salesReport.stats.totalRevenue)}\nTotal Sales: ${salesReport.stats.totalSales}\nTotal Units: ${salesReport.stats.totalUnitsSold}\nAvg Sale Value: ${formatCurrency(salesReport.stats.avgSaleValue)}\n\nGenerated from AnPharmacy`;
      }

      if (subject && body && window.electronAPI?.openExternal) {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await window.electronAPI.openExternal(mailtoUrl);
      }
    } catch (err) {
      console.error('Email failed:', err);
    } finally {
      setIsEmailing(false);
    }
  };

  const renderKPICards = (items: { label: string; value: string; icon: React.ReactNode; gradient: string; diff?: { value: string; positive: boolean } }[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {items.map((item, i) => (
        <div key={i} className="card-elevated overflow-hidden">
          <div className={cn('h-1 w-full bg-gradient-to-r', item.gradient)} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{item.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{item.value}</p>
                {item.diff && (
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5',
                    item.diff.positive ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {item.diff.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {item.diff.value}
                  </span>
                )}
              </div>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', 
                i === 0 ? 'bg-emerald-50 text-emerald-600' : i === 1 ? 'bg-blue-50 text-blue-600' : i === 2 ? 'bg-teal-50 text-teal-600' : i === 3 ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-600'
              )}>
                {item.icon}
              </div>
            </div>
          </CardContent>
        </div>
      ))}
    </div>
  );

  const TABS = [
    { id: 'stock', label: t('reports.stock'), icon: Package },
    { id: 'expiry', label: t('reports.expiry'), icon: AlertTriangle },
    { id: 'expirytiers', label: 'Expiry Tiers', icon: AlertTriangle },
    { id: 'profit', label: 'Profit/GST', icon: IndianRupee },
    { id: 'sales', label: t('reports.sales'), icon: TrendingUp },
  ];

  // Filter logic
  const filterStockReport = (report: any) => {
    if (!report?.medicines) return report;
    let filtered = [...report.medicines];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((m: any) => 
        m.name?.toLowerCase().includes(searchLower) ||
        m.batch_number?.toLowerCase().includes(searchLower) ||
        m.company?.toLowerCase().includes(searchLower)
      );
    }
    
    return { ...report, medicines: filtered };
  };

  const filterExpiryReport = (report: any) => {
    if (!report?.categories) return report;
    const filteredCategories: any = {};
    
    Object.entries(report.categories).forEach(([category, items]: [string, any]) => {
      let filtered = items;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = items.filter((m: any) => 
          m.name?.toLowerCase().includes(searchLower) ||
          m.batch_number?.toLowerCase().includes(searchLower)
        );
      }
      
      filteredCategories[category] = filtered;
    });
    
    return { ...report, categories: filteredCategories };
  };

  const filterSalesReport = (report: any) => {
    if (!report?.sales) return report;
    let filtered = [...report.sales];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((s: any) => 
        s.customer_name?.toLowerCase().includes(searchLower) ||
        s.medicine_name?.toLowerCase().includes(searchLower) ||
        s.id?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter((s: any) => s.sale_date >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter((s: any) => s.sale_date <= filters.dateTo);
    }
    
    const totalRevenue = filtered.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
    const totalUnitsSold = filtered.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    
    return {
      ...report,
      sales: filtered,
      stats: {
        ...report.stats,
        totalSales: filtered.length,
        totalRevenue,
        totalUnitsSold,
        avgSaleValue: filtered.length > 0 ? Math.round((totalRevenue / filtered.length) * 100) / 100 : 0,
      }
    };
  };

  const getFilteredReport = () => {
    if (activeTab === 'stock') {
      return stockReport ? filterStockReport(stockReport) : null;
    } else if (activeTab === 'expiry') {
      return expiryReport ? filterExpiryReport(expiryReport) : null;
    } else if (activeTab === 'expirytiers') {
      return expiryTierReport;
    } else if (activeTab === 'profit') {
      return profitReport;
    } else if (activeTab === 'sales') {
      return salesReport ? filterSalesReport(salesReport) : null;
    }
    return null;
  };

  const filteredReport = getFilteredReport();

  return (
    <div className="space-y-5">
      {/* Header with Tabs and Export */}
      <Card variant="bordered">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2',
                      'hover:scale-105 active:scale-95',
                      isActive
                        ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-500/20'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleEmailReport}
                disabled={isEmailing}
                variant="outline-teal"
                size="sm"
                className="gap-2"
              >
                {isEmailing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Email
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="outline-teal"
                size="sm"
                className="gap-2"
              >
                {isExporting ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {t('reports.export')}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {activeTab === 'sales' && (
              <>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  placeholder="To"
                />
              </>
            )}
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Clear
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ===== STOCK REPORT TAB ===== */}
      {activeTab === 'stock' && filteredReport?.stats && (
        <div className="animate-fade-in-up space-y-5">
          {renderKPICards([
            { label: t('reports.uniqueMedicines'), value: String(filteredReport.stats.uniqueMedicines), icon: <Package className="w-4 h-4 text-white" />, gradient: 'from-teal-500 to-teal-600' },
            { label: t('reports.totalBatches'), value: String(filteredReport.stats.totalBatches), icon: <BarChart3 className="w-4 h-4 text-white" />, gradient: 'from-blue-500 to-blue-600' },
            { label: t('reports.totalUnits'), value: String(filteredReport.stats.totalUnits), icon: <TrendingUp className="w-4 h-4 text-white" />, gradient: 'from-emerald-500 to-emerald-600' },
            { label: t('reports.totalValue'), value: formatCurrency(filteredReport.stats.totalValue), icon: <IndianRupee className="w-4 h-4 text-white" />, gradient: 'from-orange-500 to-orange-600' },
            { label: t('reports.avgPrice'), value: formatCurrency(filteredReport.stats.avgPricePerUnit), icon: <DollarSign className="w-4 h-4 text-white" />, gradient: 'from-purple-500 to-purple-600' },
          ])}

          {/* Purchase vs Selling Price Comparison Card */}
          {(() => {
            const totalPurchase = filteredReport.medicines.reduce((s: number, m: any) => s + ((m.purchase_price || 0) * (m.quantity || 0)), 0);
            const totalSelling = filteredReport.medicines.reduce((s: number, m: any) => s + ((m.selling_price || 0) * (m.quantity || 0)), 0);
            const valueDiff = totalSelling - totalPurchase;
            const marginPct = totalPurchase > 0 ? ((valueDiff / totalPurchase) * 100) : 0;
            return (
              <Card variant="bordered" className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Purchase vs Selling — Value Difference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Purchase Value</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(totalPurchase)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Selling Value</p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(totalSelling)}</p>
                    </div>
                    <div className={cn('rounded-xl p-4', valueDiff >= 0 ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                      <div className="flex items-center justify-between">
                        <p className={cn('text-xs font-medium', valueDiff >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400')}>
                          Difference (Margin)
                        </p>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <p className={cn('text-xl font-bold', valueDiff >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-red-700 dark:text-red-300')}>
                          {formatCurrency(valueDiff)}
                        </p>
                        <span className={cn('text-xs font-semibold', marginPct >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400')}>
                          ({marginPct.toFixed(1)}%)
                        </span>
                      </div>
                      <ProgressBar value={valueDiff > 0 ? valueDiff : 0} max={Math.max(totalPurchase, totalSelling)} color={valueDiff >= 0 ? 'teal' : 'red'} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {filteredReport?.medicines && (
            <StockBarChart
              data={filteredReport.medicines.map((m: any) => ({
                name: m.name,
                quantity: m.quantity,
                status: m.status,
              }))}
              title="Stock Levels by Medicine"
              className="mb-5"
            />
          )}

          {filteredReport?.medicines && (
            <Card variant="bordered">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" /> Stock Details — Price Difference & Stock Level
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Purchase</th>
                        <th className="text-right">Selling</th>
                        <th className="text-right">Price Diff</th>
                        <th>Stock vs Alert</th>
                        <th>Expiry</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                      {filteredReport.medicines.map((m: any) => {
                        const priceDiff = (m.selling_price || 0) - (m.purchase_price || 0);
                        const alertLevel = m.low_stock_alert || 0;
                        const isBelowAlert = alertLevel > 0 && m.quantity <= alertLevel;
                        return (
                          <tr key={m.id} className="hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-colors">
                            <td className="font-medium text-gray-900 dark:text-gray-100">{m.name}</td>
                            <td className="text-gray-600 dark:text-gray-400 font-mono text-xs">{m.batch_number}</td>
                            <td className="text-right font-medium text-gray-900 dark:text-gray-100">{m.quantity}</td>
                            <td className="text-right text-gray-700 dark:text-gray-300">{formatCurrency(m.purchase_price)}</td>
                            <td className="text-right text-gray-700 dark:text-gray-300">{formatCurrency(m.selling_price)}</td>
                            <td className="text-right">
                              <DifferenceBadge value={priceDiff} />
                            </td>
                            <td className="min-w-[120px]">
                              {alertLevel > 0 ? (
                                <div className="flex items-center gap-2">
                                  <ProgressBar value={m.quantity} max={Math.max(m.quantity, alertLevel * 2)} color={isBelowAlert ? 'red' : 'teal'} />
                                  {isBelowAlert && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="text-gray-600 dark:text-gray-400 text-xs">{formatDate(m.expiry_date)}</td>
                            <td>
                              <Badge variant={m.status as any} size="sm">
                                {m.status === 'expired' ? 'Expired' : m.status === 'critical' ? 'Critical' : m.status === 'warning' ? 'Warning' : 'Safe'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== EXPIRY REPORT TAB ===== */}
      {activeTab === 'expiry' && filteredReport?.categories && (
        <div className="animate-fade-in-up space-y-5">
          {/* Expiry Category Cards with % Distribution */}
          {(() => {
            const expired = (filteredReport.categories.expired || []).length;
            const critical = (filteredReport.categories.critical || []).length;
            const warning = (filteredReport.categories.warning || []).length;
            const safe = (filteredReport.categories.safe || []).length;
            const total = expired + critical + warning + safe;
            const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { key: 'expired', label: 'Expired', count: expired, pct: pct(expired), gradient: 'from-gray-600 to-gray-500', textColor: 'text-white' },
                    { key: 'critical', label: 'Critical (≤90 days)', count: critical, pct: pct(critical), gradient: 'from-red-500 to-rose-400', textColor: 'text-white' },
                    { key: 'warning', label: 'Warning (91-180 days)', count: warning, pct: pct(warning), gradient: 'from-orange-500 to-amber-400', textColor: 'text-white' },
                    { key: 'safe', label: 'Safe (>180 days)', count: safe, pct: pct(safe), gradient: 'from-green-500 to-emerald-400', textColor: 'text-white' },
                  ].map(cat => (
                    <Card key={cat.key} className="overflow-hidden border-0">
                      <div className={cn('p-5 bg-gradient-to-br', cat.gradient)}>
                        <p className="text-sm font-medium text-white/80">{cat.label}</p>
                        <p className="text-3xl font-bold text-white mt-1">{cat.count}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-white/60">{cat.pct}% of total</p>
                          <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white/60 rounded-full" style={{ width: `${cat.pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {/* At-Risk Summary */}
                <Card className="mb-5 border-red-200 bg-red-50/50 dark:bg-red-900/10">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>{expired + critical}</strong> of <strong>{total}</strong> batches ({pct(expired + critical)}%) are at risk — expired or expiring within 90 days
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}

          <ExpiryPieChart
            data={buildDefaultData({
              expired: (filteredReport.categories.expired || []).length,
              critical: (filteredReport.categories.critical || []).length,
              warning: (filteredReport.categories.warning || []).length,
              safe: (filteredReport.categories.safe || []).length,
            })}
            title="Expiry Distribution"
            className="mb-5"
          />

          {['expired', 'critical', 'warning', 'safe'].map(category => {
            const items = filteredReport.categories[category] || [];
            if (items.length === 0) return null;
            return (
              <Card key={category} variant="bordered" className="mb-4">
                <CardHeader className={cn(
                  'pb-3 rounded-t-2xl',
                  category === 'expired' && 'bg-gray-50 dark:bg-slate-700/50',
                  category === 'critical' && 'bg-red-50 dark:bg-red-900/20',
                  category === 'warning' && 'bg-orange-50 dark:bg-orange-900/20',
                  category === 'safe' && 'bg-green-50 dark:bg-green-900/20',
                )}>
                  <CardTitle className={cn(
                    'text-sm flex items-center gap-2',
                    category === 'expired' && 'text-gray-700 dark:text-gray-200',
                    category === 'critical' && 'text-red-700 dark:text-red-300',
                    category === 'warning' && 'text-orange-700 dark:text-orange-300',
                    category === 'safe' && 'text-green-700 dark:text-green-300',
                  )}>
                    <AlertTriangle className="w-4 h-4" />
                    {category === 'expired' ? 'Expired Items' : category === 'critical' ? 'Critical Items (≤90 days)' : category === 'warning' ? 'Warning Items (91-180 days)' : 'Safe Items (>180 days)'}
                    <Badge variant={category === 'expired' ? 'expired' : category === 'critical' ? 'critical' : category === 'warning' ? 'warning' : 'safe'} size="sm" className="ml-1">
                      {items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Batch</th>
                          <th className="text-right">Qty</th>
                          <th>Expiry Date</th>
                          <th className="text-right">Days {category === 'expired' ? 'Overdue' : 'Left'}</th>
                          {category !== 'safe' && <th className="text-right">Value at Risk</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                        {items.map((m: any) => (
                          <tr key={m.id} className={cn(
                            'transition-colors',
                            category === 'expired' && 'hover:bg-red-50/50 dark:hover:bg-red-900/10',
                            category === 'critical' && 'hover:bg-red-50/30 dark:hover:bg-red-900/10',
                            category === 'warning' && 'hover:bg-orange-50/30 dark:hover:bg-orange-900/10',
                            category === 'safe' && 'hover:bg-green-50/30 dark:hover:bg-green-900/10',
                          )}>
                            <td className="font-medium text-gray-900 dark:text-gray-100">{m.name}</td>
                            <td className="text-gray-600 dark:text-gray-400 font-mono text-xs">{m.batch_number}</td>
                            <td className="text-right font-medium text-gray-900 dark:text-gray-100">{m.quantity}</td>
                            <td className="text-gray-600 dark:text-gray-400 text-xs">{formatDate(m.expiry_date)}</td>
                            <td className={cn(
                              'text-right font-semibold',
                              category === 'expired' && 'text-red-600 dark:text-red-400',
                              category === 'critical' && 'text-orange-600 dark:text-orange-400',
                              category === 'warning' && 'text-amber-600 dark:text-amber-400',
                              category === 'safe' && 'text-green-600 dark:text-green-400',
                            )}>
                              {category === 'expired' ? `${Math.abs(Math.round(m.days_remaining))}d over` : `${Math.round(m.days_remaining)}d`}
                            </td>
                            {category !== 'safe' && (
                              <td className="text-right text-red-600 dark:text-red-400 font-semibold">
                                {formatCurrency((m.purchase_price || 0) * (m.quantity || 0))}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== EXPIRY TIERS TAB ===== */}
      {activeTab === 'expirytiers' && expiryTierReport?.tiers && (
        <div className="animate-fade-in-up space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            {[
              { key: 'expired', label: 'Expired', count: (expiryTierReport.tiers.expired || []).length, gradient: 'from-gray-600 to-gray-500' },
              { key: 'd90', label: '≤ 90 days', count: (expiryTierReport.tiers.d90 || []).length, gradient: 'from-red-500 to-rose-400' },
              { key: 'd60', label: '≤ 60 days', count: (expiryTierReport.tiers.d60 || []).length, gradient: 'from-orange-500 to-amber-400' },
              { key: 'd30', label: '≤ 30 days', count: (expiryTierReport.tiers.d30 || []).length, gradient: 'from-orange-600 to-red-500' },
              { key: 'safe', label: 'Safe (>90)', count: (expiryTierReport.tiers.safe || []).length, gradient: 'from-green-500 to-emerald-400' },
            ].map(cat => (
              <Card key={cat.key} className="overflow-hidden border-0">
                <div className={cn('p-5 bg-gradient-to-br', cat.gradient)}>
                  <p className="text-sm font-medium text-white/80">{cat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{cat.count}</p>
                  <p className="text-xs text-white/60 mt-1">batches</p>
                </div>
              </Card>
            ))}
          </div>

          {expiryTierReport.stats?.atRiskValue != null && (
            <Card className="mb-5 border-red-200 bg-red-50 dark:bg-red-900/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  📊 Stock value at risk: <strong>{formatCurrency(expiryTierReport.stats.atRiskValue)}</strong> across {expiryTierReport.stats.expired + expiryTierReport.stats.d90 + expiryTierReport.stats.d60 + expiryTierReport.stats.d30} batches
                </p>
              </CardContent>
            </Card>
          )}

          {['d30', 'd60', 'd90', 'expired', 'safe'].map((tier: string) => {
            const items = expiryTierReport.tiers[tier] || [];
            if (items.length === 0) return null;
            const isUrgent = tier === 'd30' || tier === 'expired';
            return (
              <Card key={tier} variant="bordered" className="mb-4">
                <CardHeader className={cn('pb-3 rounded-t-2xl', 
                  tier === 'expired' ? 'bg-gray-50 dark:bg-slate-700/50' : 
                  tier === 'd30' ? 'bg-red-100 dark:bg-red-900/30' :
                  tier === 'safe' ? 'bg-green-50 dark:bg-green-900/20' :
                  'bg-red-50 dark:bg-red-900/20'
                )}>
                  <CardTitle className={cn('text-sm flex items-center gap-2', 
                    tier === 'expired' ? 'text-gray-700 dark:text-gray-200' : 
                    tier === 'safe' ? 'text-green-700 dark:text-green-300' :
                    'text-red-700 dark:text-red-300'
                  )}>
                    <AlertTriangle className="w-4 h-4" />
                    {tier === 'd90' ? 'Expiring in ≤ 90 days' : tier === 'd60' ? 'Expiring in ≤ 60 days' : tier === 'd30' ? '⛔ Expiring in ≤ 30 days — URGENT' : tier === 'expired' ? 'Expired Stock' : 'Safe Stock (>90 days)'}
                    <Badge variant={tier === 'expired' ? 'expired' : tier === 'safe' ? 'safe' : 'critical'} size="sm" className="ml-1">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                     <table className="table-premium">
                      <thead>
                        <tr>
                          <th>Medicine</th><th>Batch</th><th>Company</th>
                          <th className="text-right">Qty</th><th>Expiry</th>
                          <th className="text-right">Days Left</th>
                          {isUrgent && <th className="text-right">Value at Risk</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                        {items.map((m: any) => (
                          <tr key={m.id} className={cn(
                            'transition-colors',
                            isUrgent && 'hover:bg-red-50/60 dark:hover:bg-red-900/15'
                          )}>
                            <td className="font-medium text-gray-900 dark:text-gray-100">{m.name}</td>
                            <td className="text-gray-600 dark:text-gray-400 font-mono text-xs">{m.batch_number}</td>
                            <td className="text-gray-600 dark:text-gray-400 text-xs">{m.company || '—'}</td>
                            <td className="text-right font-medium text-gray-900 dark:text-gray-100">{m.quantity}</td>
                            <td className="text-gray-600 dark:text-gray-400 text-xs">{formatDate(m.expiry_date)}</td>
                            <td className={cn('text-right font-semibold', 
                              m.days_remaining < 0 ? 'text-red-600 dark:text-red-400' : 
                              tier === 'safe' ? 'text-green-600 dark:text-green-400' :
                              'text-orange-600 dark:text-orange-400'
                            )}>
                              {m.days_remaining < 0 ? `${-m.days_remaining}d over` : `${m.days_remaining}d`}
                            </td>
                            {isUrgent && (
                              <td className="text-right text-red-600 dark:text-red-400 font-semibold">
                                {formatCurrency((m.purchase_price || 0) * (m.quantity || 0))}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== PROFIT / GST TAB ===== */}
      {activeTab === 'profit' && profitReport?.stats && (
        <div className="animate-fade-in-up space-y-5">
          {/* Purchase vs Sale Comparison */}
          <Card variant="bordered" className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> Purchase vs Sale — Financial Difference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Purchase Value</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(profitReport.stats.totalPurchaseValue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowDownRight className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] text-blue-500">Cost of goods</span>
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Sale Value</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(profitReport.stats.totalSaleValue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-500">Revenue generated</span>
                  </div>
                </div>
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4">
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Real Profit (ex-GST)</p>
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-300 mt-1">{formatCurrency(profitReport.stats.totalRealProfit)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-teal-500" />
                    <span className="text-[10px] text-teal-500">{profitReport.stats.marginPercent.toFixed(1)}% margin</span>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Net GST (Output − Input)</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{formatCurrency(profitReport.stats.totalOutputGst - profitReport.stats.totalInputGst)}</p>
                  <DifferenceBadge value={profitReport.stats.totalOutputGst - profitReport.stats.totalInputGst} />
                </div>
              </div>
              {/* Margin Progress */}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Profit Margin</span>
                  </div>
                  <span className={cn(
                    'text-lg font-bold',
                    profitReport.stats.marginPercent >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {profitReport.stats.marginPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      profitReport.stats.marginPercent >= 30 ? 'bg-gradient-to-r from-teal-400 to-emerald-500' :
                      profitReport.stats.marginPercent >= 15 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                      profitReport.stats.marginPercent >= 0 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                      'bg-gradient-to-r from-red-600 to-rose-600'
                    )}
                    style={{ width: `${Math.min(Math.max(profitReport.stats.marginPercent, 0), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span>
                  <span>15%</span>
                  <span>30%</span>
                  <span>50%+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GST Breakup Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Input GST (paid to suppliers)', value: formatCurrency(profitReport.stats.totalInputGst), icon: '↘', gradient: 'from-indigo-500 to-indigo-600', desc: 'Tax paid on purchases' },
              { label: 'Output GST (collected from customers)', value: formatCurrency(profitReport.stats.totalOutputGst), icon: '↗', gradient: 'from-cyan-500 to-cyan-600', desc: 'Tax collected on sales' },
              { label: 'Net GST Payable (Output − Input)', value: formatCurrency(profitReport.stats.totalOutputGst - profitReport.stats.totalInputGst), icon: '∑', gradient: 'from-slate-500 to-slate-600', desc: 'Amount to remit to govt' },
            ].map(card => (
              <Card key={card.label} variant="bordered">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                    <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm', card.gradient)}>{card.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2">{card.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{card.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Batch-wise Profit Table with Differences */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Batch-wise Profit & GST Difference</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                   <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Medicine</th><th>Batch</th><th className="text-right">Qty</th>
                      <th className="text-right">Purchase</th><th className="text-right">Sale</th>
                      <th className="text-right">Price Diff</th>
                      <th className="text-right">In GST</th><th className="text-right">Out GST</th>
                      <th className="text-right">Net GST</th>
                      <th className="text-right">Real Margin</th><th className="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {profitReport.rows.map((r: any) => {
                      const priceDiff = r.selling_price - r.purchase_price;
                      const netGst = r.output_gst - r.input_gst;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                          <td className="text-gray-600 dark:text-gray-400 font-mono text-xs">{r.batch_number}</td>
                          <td className="text-right font-medium">{r.quantity}</td>
                          <td className="text-right text-gray-600 dark:text-gray-400">{formatCurrency(r.purchase_price)}</td>
                          <td className="text-right text-gray-600 dark:text-gray-400">{formatCurrency(r.selling_price)}</td>
                          <td className="text-right">
                            <DifferenceBadge value={priceDiff} />
                          </td>
                          <td className="text-right text-gray-500 dark:text-gray-500">{formatCurrency(r.input_gst)}</td>
                          <td className="text-right text-gray-500 dark:text-gray-500">{formatCurrency(r.output_gst)}</td>
                          <td className="text-right">
                            <DifferenceBadge value={netGst} />
                          </td>
                          <td className={cn('text-right font-semibold', r.real_margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>{formatCurrency(r.real_margin)}</td>
                          <td className={cn('text-right font-semibold', r.margin_percent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                            <span className="inline-flex items-center gap-0.5">
                              {r.margin_percent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {r.margin_percent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== SALES REPORT TAB ===== */}
      {activeTab === 'sales' && filteredReport?.stats && (
        <div className="animate-fade-in-up space-y-5">
          {renderKPICards([
            { label: t('reports.totalRevenue'), value: formatCurrency(filteredReport.stats.totalRevenue), icon: <IndianRupee className="w-4 h-4 text-white" />, gradient: 'from-emerald-500 to-emerald-600', diff: { value: `${filteredReport.stats.totalSales} transactions`, positive: true } },
            { label: 'Total Sales', value: String(filteredReport.stats.totalSales), icon: <BarChart3 className="w-4 h-4 text-white" />, gradient: 'from-blue-500 to-blue-600' },
            { label: t('reports.totalUnits'), value: String(filteredReport.stats.totalUnitsSold), icon: <Package className="w-4 h-4 text-white" />, gradient: 'from-teal-500 to-teal-600' },
            { label: t('reports.avgSaleValue'), value: formatCurrency(filteredReport.stats.avgSaleValue), icon: <TrendingUp className="w-4 h-4 text-white" />, gradient: 'from-purple-500 to-purple-600', diff: { value: `${filteredReport.stats.totalUnitsSold} units total`, positive: true } },
          ])}

          {/* Revenue Per Transaction Summary */}
          {filteredReport?.sales && filteredReport.sales.length > 0 && (
            <Card variant="bordered">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Sales Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4">
                    <p className="text-xs text-white/80">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(filteredReport.stats.totalRevenue)}</p>
                    <p className="text-[10px] text-white/60 mt-1">Across {filteredReport.stats.totalSales} sales</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4">
                    <p className="text-xs text-white/80">Avg. Per Sale</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(filteredReport.stats.avgSaleValue)}</p>
                    <p className="text-[10px] text-white/60 mt-1">Per transaction</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4">
                    <p className="text-xs text-white/80">Avg. Per Unit</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(filteredReport.stats.totalUnitsSold > 0 ? filteredReport.stats.totalRevenue / filteredReport.stats.totalUnitsSold : 0)}
                    </p>
                    <p className="text-[10px] text-white/60 mt-1">Per item sold</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4">
                    <p className="text-xs text-white/80">Items Per Sale</p>
                    <p className="text-2xl font-bold text-white">
                      {filteredReport.stats.totalSales > 0 ? (filteredReport.stats.totalUnitsSold / filteredReport.stats.totalSales).toFixed(1) : '0'}
                    </p>
                    <p className="text-[10px] text-white/60 mt-1">Average quantity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <SalesTrendChart data={MOCK_SALES_DATA} title="Sales Trend" className="mb-5" />
          {filteredReport?.sales && (
            <Card variant="bordered">
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Medicine</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Amount</th>
                        <th>Date</th>
                        <th className="text-right">Avg/Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                      {filteredReport.sales.map((s: any) => {
                        const avgUnit = s.quantity > 0 ? s.total_amount / s.quantity : 0;
                        return (
                          <tr key={s.id} className="hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-colors">
                            <td className="font-medium text-gray-900 dark:text-gray-100">{s.customer_name || 'Walk-in'}</td>
                            <td className="text-gray-600 dark:text-gray-400">{s.medicine_name}</td>
                            <td className="text-right font-medium text-gray-900 dark:text-gray-100">{s.quantity || '-'}</td>
                            <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.total_amount)}</td>
                            <td className="text-gray-500 dark:text-gray-400 text-xs">{formatDate(s.sale_date)}</td>
                            <td className="text-right text-gray-600 dark:text-gray-400 text-xs">{formatCurrency(avgUnit)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
