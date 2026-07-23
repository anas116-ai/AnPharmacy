import { useEffect, useRef, useState, useMemo } from 'react';
import { useStockStore } from '../stores/stockStore';
import { Search, Package, Calendar, Building2, AlertCircle, X, ChevronRight, Filter, Box, Upload, MapPin, AlertTriangle, Table2, LayoutGrid, RefreshCw, Activity } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { formatDate, formatCurrency, getStatusLabel, cn } from '../lib/utils';
import { Medicine } from '../lib/types';
import { useToast } from '../hooks/useToast';
import FileImportDialog from './FileImportDialog';
import { ImportedMedicineRow } from '../lib/fileImporter';
import StockEditor from './StockEditor';
import ColumnManager from './ColumnManager';
import { Settings2 } from 'lucide-react';

export default function StockManagement() {
  const { medicines, setMedicines } = useStockStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'near-expiry' | 'expired'>('all');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [stockLevelFilter, setStockLevelFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTestResult, setFilterTestResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'cards'>('editor');
  const [displayLimit, setDisplayLimit] = useState(50);
  const PAGE_SIZE = 50;

  // Use a ref to track first mount — prevents the save effect from firing on initial load
  // which could overwrite values just restored from localStorage
  const isFirstRender = useRef(true);

  // Load filter preferences from localStorage (only once on mount)
  useEffect(() => {
    const saved = localStorage.getItem('anpharm_stock_filters');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setSortBy(prefs.sortBy || 'default');
        setManufacturerFilter(prefs.manufacturerFilter || 'all');
        setScheduleFilter(prefs.scheduleFilter || 'all');
        setStockLevelFilter(prefs.stockLevelFilter || 'all');
        setPriceMin(prefs.priceMin || '');
        setPriceMax(prefs.priceMax || '');
        setActiveTab(prefs.activeTab || 'all');
        setSearchQuery(prefs.searchQuery || '');
      } catch {}
    }
  }, []);

  // Save filter preferences to localStorage with debounce (300ms) to avoid
  // writing on every keystroke/state change which blocks the main thread
  // Skip on first render to avoid overwriting freshly-loaded preferences
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const prefs = { sortBy, manufacturerFilter, scheduleFilter, stockLevelFilter, priceMin, priceMax, activeTab, searchQuery };
      try {
        localStorage.setItem('anpharm_stock_filters', JSON.stringify(prefs));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [sortBy, manufacturerFilter, scheduleFilter, stockLevelFilter, priceMin, priceMax, activeTab, searchQuery]);

  useEffect(() => {
    loadStock();
    
    // Auto-refresh when tab becomes visible again
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    // Auto-refresh on window focus
    const onFocus = () => loadStock();
    window.addEventListener('focus', onFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadStock = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listStock();
        if (result.success) {
          setMedicines(result.medicines || []);
        }
      }
    } catch (err) {
      console.error('Failed to load stock:', err);
    }
  };

  const handleFileImport = async (data: ImportedMedicineRow[]) => {
    if (!window.electronAPI) return;

    let addedCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const result = await window.electronAPI.addStock({
          medicine: {
            name: row.name + (row.strength ? ' ' + row.strength : ''),
            strength: row.strength || null,
            batchNumber: row.batchNumber,
            packSize: row.packSize || null,
            company: row.company || row.manufacturer || '',
            genericName: row.genericName || null,
            quantity: row.quantity || 0,
            looseQuantity: row.looseQuantity || 0,
            mrp: row.mrp > 0 ? row.mrp : null,
            purchasePrice: row.purchasePrice > 0 ? row.purchasePrice : null,
            ptr: row.ptr > 0 ? row.ptr : null,
            pts: row.pts > 0 ? row.pts : null,
            sellingPrice: row.sellingPrice > 0 ? row.sellingPrice : null,
            purchaseGstPercent: row.purchaseGstPercent || 5,
            saleGstPercent: row.saleGstPercent || 12,
            hsnCode: row.hsnCode || '3004',
            scheduleType: row.scheduleType || 'General',
            barcode: row.barcode || null,
            rackLocation: row.rackLocation || null,
            lowStockAlert: 20,
            minMarginPercent: row.minMarginPercent || 20,
            mfgDate: row.mfgDate || null,
            expiryDate: row.expiryDate || null,
            supplierId: null,
            invoiceNo: row.invoiceNo || null,
            invoiceDate: row.invoiceDate || null,
            poNumber: row.poNumber || null,
            orderDate: row.orderDate || null,
            paymentTerms: row.paymentTerms || null,
            dueDate: row.dueDate || null,
            dispatchLocation: null,
            schemeQty: row.schemeQty || 0,
            freeQty: row.freeQty || 0,
            discountPercent: row.discountPercent || 0,
            ewayBillNo: row.ewayBillNo || null,
            numCartons: row.numCartons || 0,
            coldChain: 0,
            prescriptionDoc: null,
          },
          userId: 1,
        });
        if (result.success) addedCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    // Log the import
    try {
      if (window.electronAPI) {
        await window.electronAPI.logImport({
          fileName: 'Stock Import',
          totalRows: data.length,
          validRows: addedCount,
          invalidRows: errorCount,
          errors: errorCount,
          importedBy: 'Admin',
        });
      }
    } catch {}

    await loadStock();
    if (addedCount > 0) {
      toast.success('Import Complete', `${addedCount} items imported successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    } else {
      toast.error('Import Failed', `No items could be imported. ${errorCount} error(s)`);
    }
  };

  // ── Filter logic for card view (memoized) ──
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter(m => {
        const matchesSearch = !searchQuery ||
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.company && m.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.generic_name && m.generic_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.hsn_code && m.hsn_code.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTab = activeTab === 'all' ? true :
          activeTab === 'near-expiry' ? m.status === 'critical' || m.status === 'warning' :
          activeTab === 'expired' ? m.status === 'expired' : true;

        const matchesManufacturer = manufacturerFilter === 'all' || m.company === manufacturerFilter;
        const matchesSchedule = scheduleFilter === 'all' || m.schedule_type === scheduleFilter;

        let matchesStockLevel = true;
        if (stockLevelFilter === 'low_stock') {
          matchesStockLevel = m.low_stock_alert != null && m.quantity > 0 && m.quantity <= m.low_stock_alert;
        } else if (stockLevelFilter === 'overstock') {
          matchesStockLevel = m.quantity >= 200;
        } else if (stockLevelFilter === 'out_of_stock') {
          matchesStockLevel = m.quantity === 0;
        } else if (stockLevelFilter === 'in_stock') {
          matchesStockLevel = m.quantity > 0;
        }

        const sellPrice = m.selling_price || 0;
        const matchesPriceMin = priceMin === '' || sellPrice >= parseFloat(priceMin || '0');
        const matchesPriceMax = priceMax === '' || sellPrice <= parseFloat(priceMax || '9999999');

        return matchesSearch && matchesTab && matchesManufacturer && matchesSchedule && matchesStockLevel && matchesPriceMin && matchesPriceMax;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'stock_high': return (b.quantity || 0) - (a.quantity || 0);
          case 'stock_low': return (a.quantity || 0) - (b.quantity || 0);
          case 'price_low': return (a.selling_price || 0) - (b.selling_price || 0);
          case 'price_high': return (b.selling_price || 0) - (a.selling_price || 0);
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'expiry_soon': return (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999);
          case 'expiry_later': return (b.days_remaining ?? -9999) - (a.days_remaining ?? -9999);
          default: return 0;
        }
      });
  }, [medicines, searchQuery, activeTab, manufacturerFilter, scheduleFilter, stockLevelFilter, priceMin, priceMax, sortBy]);

  // Paginate
  const displayedMedicines = useMemo(() => filteredMedicines.slice(0, displayLimit), [filteredMedicines, displayLimit]);
  const hasMore = filteredMedicines.length > displayLimit;

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-gray-500';
      case 'critical': return 'bg-red-500 animate-pulse';
      case 'warning': return 'bg-orange-500';
      case 'safe': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const handleStockEditorUpdate = (updatedMedicines: Medicine[]) => {
    setMedicines(updatedMedicines);
    // In a real app, you'd also persist to the database here
    if (window.electronAPI) {
      // Bulk update would go through electronAPI here
    }
    toast.success('Updated', 'Stock data updated successfully.');
  };

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{medicines.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Critical</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{medicines.filter(m => m.status === 'critical').length}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Warning</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{medicines.filter(m => m.status === 'warning').length}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              <Box className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Expired</p>
              <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{medicines.filter(m => m.status === 'expired').length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View Mode Toggle + Search + Import */}
      <Card variant="bordered">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines..."
                className="pl-10 h-11 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode('editor')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  viewMode === 'editor'
                    ? 'bg-white dark:bg-slate-600 text-navy-700 dark:text-navy-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                )}
              >
                <Table2 className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-600 text-navy-700 dark:text-navy-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
            </div>

            <Button
              variant="outline-teal"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="gap-2 h-11 px-4 flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnManagerOpen(true)}
              className="gap-2 h-11 px-4 flex-shrink-0"
              title="Manage Columns - Rename, Reorder, Hide, Add"
            >
              <Settings2 className="w-4 h-4" />
              Columns
            </Button>
          </div>

          {/* Tabs & Sort Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1" role="tablist">
              {(['all', 'near-expiry', 'expired'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    activeTab === tab
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  )}
                >
                  {tab === 'all' ? 'All' :
                   tab === 'near-expiry' ? 'Near Expiry' :
                   'Expired'}
                  <span className="ml-1.5 text-xs opacity-70" aria-hidden="true">
                    ({medicines.filter(m => tab === 'all' ? true : tab === 'near-expiry' ? m.status === 'critical' || m.status === 'warning' : m.status === 'expired').length})
                  </span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3 text-xs font-medium border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              >
                <option value="default">📌 Default</option>
                <option value="stock_high">📦 Stock: High → Low</option>
                <option value="stock_low">📦 Stock: Low → High</option>
                <option value="price_low">💰 Price: Low → High</option>
                <option value="price_high">💰 Price: High → Low</option>
                <option value="name_asc">🔤 Name: A → Z</option>
                <option value="name_desc">🔤 Name: Z → A</option>
                <option value="expiry_soon">⏳ Expiry: Soonest</option>
                <option value="expiry_later">⏳ Expiry: Latest</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'h-9 px-3 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5',
                  showFilters
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {(manufacturerFilter !== 'all' || scheduleFilter !== 'all' || stockLevelFilter !== 'all' || priceMin !== '' || priceMax !== '') && (
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-600 rounded-xl space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="stock-filter-manufacturer" className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Manufacturer</label>
                  <select
                    id="stock-filter-manufacturer"
                    value={manufacturerFilter}
                    onChange={(e) => setManufacturerFilter(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200"
                  >
                    <option value="all">All Manufacturers</option>
                    {[...new Set(medicines.map(m => m.company).filter(Boolean))].map(company => (
                      <option key={company} value={company!}>{company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stock-filter-schedule" className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Schedule Type</label>
                  <select
                    id="stock-filter-schedule"
                    value={scheduleFilter}
                    onChange={(e) => setScheduleFilter(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200"
                  >
                    <option value="all">All Types</option>
                    {[...new Set(medicines.map(m => m.schedule_type).filter(Boolean))].map(type => (
                      <option key={type} value={type!}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stock-filter-level" className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Stock Level</label>
                  <select
                    id="stock-filter-level"
                    value={stockLevelFilter}
                    onChange={(e) => setStockLevelFilter(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200"
                  >
                    <option value="all">All Levels</option>
                    <option value="low_stock">⚠️ Low Stock</option>
                    <option value="overstock">📦 Overstock</option>
                    <option value="out_of_stock">❌ Out of Stock</option>
                    <option value="in_stock">✅ In Stock</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="stock-filter-price-min" className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Price Range (₹)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="stock-filter-price-min"
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Min"
                      className="w-full h-9 px-2.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                    />
                    <span className="text-gray-400 text-xs">—</span>
                    <input
                      id="stock-filter-price-max"
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Max"
                      className="w-full h-9 px-2.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
              {(manufacturerFilter !== 'all' || scheduleFilter !== 'all' || stockLevelFilter !== 'all' || priceMin !== '' || priceMax !== '') && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-400 font-medium">Active:</span>
                  {manufacturerFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-[10px] font-medium">
                      {manufacturerFilter}
                      <button onClick={() => setManufacturerFilter('all')}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {scheduleFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-medium">
                      {scheduleFilter}
                      <button onClick={() => setScheduleFilter('all')}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {stockLevelFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-medium">
                      {stockLevelFilter}
                      <button onClick={() => setStockLevelFilter('all')}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {(priceMin || priceMax) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-medium">
                      ₹{priceMin || '0'} – ₹{priceMax || '∞'}
                      <button onClick={() => { setPriceMin(''); setPriceMax(''); }}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  <button
                    onClick={() => { setManufacturerFilter('all'); setScheduleFilter('all'); setStockLevelFilter('all'); setPriceMin(''); setPriceMax(''); }}
                    className="text-[10px] text-red-500 hover:text-red-700 underline font-medium ml-1"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {viewMode === 'editor' ? (
        <StockEditor medicines={medicines} onUpdate={handleStockEditorUpdate} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredMedicines.length}</span>
              {' '}of <span className="font-semibold text-gray-700 dark:text-gray-200">{medicines.length}</span> items
            </span>
            {(activeTab !== 'all' || sortBy !== 'default' || manufacturerFilter !== 'all' || scheduleFilter !== 'all' || stockLevelFilter !== 'all' || priceMin !== '' || priceMax !== '' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                  setSortBy('default');
                  setManufacturerFilter('all');
                  setScheduleFilter('all');
                  setStockLevelFilter('all');
                  setPriceMin('');
                  setPriceMax('');
                }}
                className="text-[10px] text-red-500 hover:text-red-700 underline font-medium"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Stock List - Card View */}
          <div className="space-y-3">
            {filteredMedicines.length === 0 ? (
              <Card variant="bordered" role="status">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-200 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No medicines found</p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filter</p>
                </CardContent>
              </Card>
            ) : (
              filteredMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  onClick={() => setSelectedMedicine(medicine)}
                  className={cn(
                    'bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-soft p-5 cursor-pointer',
                    'hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-medium transition-all duration-200',
                    'group'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', getStatusDot(medicine.status))} />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{medicine.name}</h3>
                        <Badge variant={medicine.status as any} size="sm">
                          {getStatusLabel(medicine.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400 ml-5">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Batch: <span className="font-mono text-gray-600 dark:text-gray-300">{medicine.batch_number}</span>
                        </span>
                        {medicine.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {medicine.company}
                          </span>
                        )}
                        {medicine.rack_location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="font-mono text-gray-600 dark:text-gray-300">{medicine.rack_location}</span>
                          </span>
                        )}
                        {medicine.low_stock_alert != null && medicine.quantity > 0 && medicine.quantity <= medicine.low_stock_alert && medicine.status !== 'expired' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[9px] font-semibold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Low Stock: {medicine.quantity}/{medicine.low_stock_alert}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{medicine.quantity}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">units</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-slate-700 ml-5">
                    {medicine.expiry_date && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Expires: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(medicine.expiry_date)}</span>
                        {medicine.days_remaining !== null && (
                          <span className={cn(
                            'font-semibold',
                            medicine.days_remaining <= 0 && 'text-red-500',
                            medicine.days_remaining > 0 && medicine.days_remaining <= 90 && 'text-orange-500',
                            medicine.days_remaining > 90 && 'text-green-500 dark:text-green-400',
                          )}>
                            ({Math.round(medicine.days_remaining)}d)
                          </span>
                        )}
                      </span>
                    )}
                    {medicine.selling_price && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ₹{medicine.selling_price}/unit
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedMedicine} onOpenChange={(open) => !open && setSelectedMedicine(null)}>
        {selectedMedicine && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Medicine Details
              </DialogTitle>
              <DialogClose onClick={() => setSelectedMedicine(null)} />
            </DialogHeader>
            <div className="space-y-5">
              <div className={cn(
                'rounded-2xl p-4 text-center',
                selectedMedicine.status === 'expired' && 'bg-gray-100 dark:bg-slate-700',
                selectedMedicine.status === 'critical' && 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800',
                selectedMedicine.status === 'warning' && 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800',
                selectedMedicine.status === 'safe' && 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800',
              )}>
                <span className={cn(
                  'text-sm font-bold',
                  selectedMedicine.status === 'expired' && 'text-gray-700 dark:text-gray-200',
                  selectedMedicine.status === 'critical' && 'text-red-700 dark:text-red-300',
                  selectedMedicine.status === 'warning' && 'text-orange-700 dark:text-orange-300',
                  selectedMedicine.status === 'safe' && 'text-green-700 dark:text-green-300',
                )}>
                  {getStatusLabel(selectedMedicine.status)}
                  {selectedMedicine.days_remaining !== null && (
                    <> · {Math.round(selectedMedicine.days_remaining)} days remaining</>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Medicine Name</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{selectedMedicine.name}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Batch Number</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1 font-mono">{selectedMedicine.batch_number}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Company</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{selectedMedicine.company || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Quantity</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{selectedMedicine.quantity} units</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Purchase Price</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(selectedMedicine.purchase_price)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Selling Price</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(selectedMedicine.selling_price)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Mfg Date</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{formatDate(selectedMedicine.mfg_date)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Expiry Date</label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{formatDate(selectedMedicine.expiry_date)}</p>
                </div>
              </div>

              {selectedMedicine.days_remaining !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>Days until expiry</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(selectedMedicine.days_remaining)}d</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        selectedMedicine.days_remaining <= 0 && 'bg-gray-500',
                        selectedMedicine.days_remaining > 0 && selectedMedicine.days_remaining <= 90 && 'bg-red-500',
                        selectedMedicine.days_remaining > 90 && selectedMedicine.days_remaining <= 180 && 'bg-orange-500',
                        selectedMedicine.days_remaining > 180 && 'bg-green-500',
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, (selectedMedicine.days_remaining / 365) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Import Dialog - Multi-Format */}
      <FileImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleFileImport}
        existingMedicines={medicines}
      />

      {/* Column Manager Dialog */}
      <Dialog open={isColumnManagerOpen} onOpenChange={setIsColumnManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-teal-600" />
              Manage Stock Columns
            </DialogTitle>
            <DialogClose onClick={() => setIsColumnManagerOpen(false)} />
          </DialogHeader>
          <ColumnManager onClose={() => setIsColumnManagerOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
