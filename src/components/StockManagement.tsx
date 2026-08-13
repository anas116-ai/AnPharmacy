import { useEffect, useRef, useState, useMemo } from 'react';
import { useStockStore } from '../stores/stockStore';
import { Search, Package, Calendar, Building2, AlertCircle, X, ChevronRight, Filter, Box, Upload, MapPin, AlertTriangle, Table2, LayoutGrid, RefreshCw, Activity, SlidersHorizontal } from 'lucide-react';
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

const STOCK_FONTS: { label: string; value: string; stack: string }[] = [
  { label: 'Inter', value: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  { label: 'Manrope', value: 'Manrope', stack: "'Manrope', system-ui, sans-serif" },
  { label: 'Poppins', value: 'Poppins', stack: "'Poppins', system-ui, sans-serif" },
  { label: 'Space Grotesk', value: 'Space Grotesk', stack: "'Space Grotesk', system-ui, sans-serif" },
  { label: 'DM Sans', value: 'DM Sans', stack: "'DM Sans', system-ui, sans-serif" },
  { label: 'Sora', value: 'Sora', stack: "'Sora', system-ui, sans-serif" },
  { label: 'Roboto', value: 'Roboto', stack: "'Roboto', system-ui, sans-serif" },
  { label: 'Plus Jakarta', value: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans', system-ui, sans-serif" },
];

export default function StockManagement() {
  const { medicines, setMedicines } = useStockStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'near-expiry' | 'expired'>('all');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
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

  // Stock display customization (Settings for the data-dense stock screen)
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [stockFontScale, setStockFontScale] = useState(1);
  const [stockDensity, setStockDensity] = useState<'compact' | 'standard' | 'comfortable'>('standard');
  const [stockFontFamily, setStockFontFamily] = useState('Inter');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('anpharm_stock_display');
      if (saved) {
        const prefs = JSON.parse(saved);
        setStockFontScale(prefs.fontScale || 1);
        setStockDensity(prefs.density || 'standard');
        if (prefs.fontFamily) setStockFontFamily(prefs.fontFamily);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('anpharm_stock_display', JSON.stringify({ fontScale: stockFontScale, density: stockDensity, fontFamily: stockFontFamily }));
    } catch {}
  }, [stockFontScale, stockDensity, stockFontFamily]);

  const stockFontStack =
    STOCK_FONTS.find((f) => f.value === stockFontFamily)?.stack ?? "'Inter', system-ui, sans-serif";

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
      case 'expired': return 'bg-muted-foreground';
      case 'critical': return 'bg-destructive animate-pulse';
      case 'warning': return 'bg-warning';
      case 'safe': return 'bg-accent';
      default: return 'bg-muted-foreground/50';
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
            <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total</p>
              <p className="text-lg font-bold text-foreground">{medicines.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Critical</p>
              <p className="text-lg font-bold text-destructive">{medicines.filter(m => m.status === 'critical').length}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-light rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Warning</p>
              <p className="text-lg font-bold text-warning">{medicines.filter(m => m.status === 'warning').length}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
              <Box className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Expired</p>
              <p className="text-lg font-bold text-muted-foreground">{medicines.filter(m => m.status === 'expired').length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View Mode Toggle + Search + Import */}
      <Card variant="bordered">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines..."
                className="pl-10 h-11 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setViewMode('editor')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  viewMode === 'editor'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
            </div>

            {/* Display options — text size & row density for large inventories */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowDisplayMenu(v => !v)}
                className={cn(
                  'h-11 px-3 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5',
                  showDisplayMenu
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-background border-border text-muted-foreground hover:border-accent/40'
                )}
                title="Display options: text size & row density"
                aria-expanded={showDisplayMenu}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Display</span>
              </button>

              {showDisplayMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl dark:shadow-slate-900/50 z-30 p-4 space-y-4 animate-scale-in">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Text Size</p>
                    <div className="flex gap-1.5">
                      {([
                        { v: 1, label: 'S' },
                        { v: 1.1, label: 'M' },
                        { v: 1.2, label: 'L' },
                      ]).map(opt => (
                        <button
                          key={opt.v}
                          onClick={() => setStockFontScale(opt.v)}
                          className={cn(
                            'flex-1 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer',
                            stockFontScale === opt.v
                              ? 'border-accent/60 bg-accent/10 text-accent'
                              : 'border-border text-muted-foreground hover:border-accent/40'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Font Family</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {STOCK_FONTS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setStockFontFamily(opt.value)}
                          style={{ fontFamily: opt.stack }}
                          className={cn(
                            'py-2 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer',
                            stockFontFamily === opt.value
                              ? 'border-accent/60 bg-accent/10 text-accent'
                              : 'border-border text-muted-foreground hover:border-accent/40'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Row Density</p>
                    <div className="flex gap-1.5">
                      {([
                        { v: 'compact' as const, label: 'Compact' },
                        { v: 'standard' as const, label: 'Standard' },
                        { v: 'comfortable' as const, label: 'Comfortable' },
                      ]).map(opt => (
                        <button
                          key={opt.v}
                          onClick={() => setStockDensity(opt.v)}
                          className={cn(
                            'flex-1 py-2 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer',
                            stockDensity === opt.v
                              ? 'border-accent/60 bg-accent/10 text-accent'
                              : 'border-border text-muted-foreground hover:border-accent/40'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
                    Applied instantly and saved for next time — perfect for working through thousands of records.
                  </p>
                </div>
              )}
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
                    activeTab === tab
                      ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
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
                className="h-9 px-3 text-xs font-medium border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                <option value="default">Default Sort</option>
                <option value="stock_high">Stock: High to Low</option>
                <option value="stock_low">Stock: Low to High</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="expiry_soon">Expiry: Soonest</option>
                <option value="expiry_later">Expiry: Latest</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'h-9 px-3 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5',
                  showFilters
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-background border-border text-muted-foreground hover:border-accent/40'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {(manufacturerFilter !== 'all' || scheduleFilter !== 'all' || stockLevelFilter !== 'all' || priceMin !== '' || priceMax !== '') && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="stock-filter-manufacturer" className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Manufacturer</label>
                  <select
                    id="stock-filter-manufacturer"
                    value={manufacturerFilter}
                    onChange={(e) => setManufacturerFilter(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="all">All Manufacturers</option>
                    {[...new Set(medicines.map(m => m.company).filter(Boolean))].map(company => (
                      <option key={company} value={company!}>{company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stock-filter-schedule" className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Schedule Type</label>
                  <select
                    id="stock-filter-schedule"
                    value={scheduleFilter}
                    onChange={(e) => setScheduleFilter(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="all">All Types</option>
                    {[...new Set(medicines.map(m => m.schedule_type).filter(Boolean))].map(type => (
                      <option key={type} value={type!}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stock-filter-level" className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Stock Level</label>
                  <select
                    id="stock-filter-level"
                    value={stockLevelFilter}
                    onChange={(e) => setStockLevelFilter(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="all">All Levels</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="overstock">Overstock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="in_stock">In Stock</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="stock-filter-price-min" className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Price Range (Rs)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="stock-filter-price-min"
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Min"
                      className="w-full h-9 px-2.5 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                    />
                    <span className="text-muted-foreground text-xs">—</span>
                    <input
                      id="stock-filter-price-max"
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Max"
                      className="w-full h-9 px-2.5 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
              {(manufacturerFilter !== 'all' || scheduleFilter !== 'all' || stockLevelFilter !== 'all' || priceMin !== '' || priceMax !== '') && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Active:</span>
                  {manufacturerFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-lg text-[10px] font-medium">
                      {manufacturerFilter}
                      <button onClick={() => setManufacturerFilter('all')}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {scheduleFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info/10 text-info rounded-lg text-[10px] font-medium">
                      {scheduleFilter}
                      <button onClick={() => setScheduleFilter('all')}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {stockLevelFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-lg text-[10px] font-medium">
                      {stockLevelFilter}
                      <button onClick={() => setStockLevelFilter('all')}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {(priceMin || priceMax) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-lg text-[10px] font-medium">
                      Rs {priceMin || '0'} - Rs {priceMax || 'inf'}
                      <button onClick={() => { setPriceMin(''); setPriceMax(''); }}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  <button
                    onClick={() => { setManufacturerFilter('all'); setScheduleFilter('all'); setStockLevelFilter('all'); setPriceMin(''); setPriceMax(''); }}
                    className="text-[10px] text-destructive hover:text-destructive underline font-medium ml-1"
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
        <div style={{ zoom: stockFontScale, fontFamily: stockFontStack }}>
          <StockEditor medicines={medicines} onUpdate={handleStockEditorUpdate} externalSearchQuery={searchQuery} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredMedicines.length}</span>
              {' '}of <span className="font-semibold text-foreground">{medicines.length}</span> items
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
                className="text-[10px] text-destructive hover:text-destructive underline font-medium"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Stock List - Card View */}
          <div className="space-y-3" style={{ ...(stockFontScale !== 1 ? { zoom: stockFontScale } : {}), fontFamily: stockFontStack }}>
            {filteredMedicines.length === 0 ? (
              <Card variant="bordered" role="status">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm font-medium">No medicines found</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">Try adjusting your search or filter</p>
                </CardContent>
              </Card>
            ) : (
              filteredMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  onClick={() => setSelectedMedicine(medicine)}
                  className={cn(
                    'bg-card rounded-2xl border border-border shadow-sm cursor-pointer',
                    'hover:border-accent/40 hover:shadow-md transition-all duration-200',
                    'group',
                    stockDensity === 'compact' ? 'p-4' : stockDensity === 'comfortable' ? 'p-6' : 'p-5'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', getStatusDot(medicine.status))} />
                        <h3 className="font-semibold text-foreground">{medicine.name}</h3>
                        <Badge variant={medicine.status as any} size="sm">
                          {getStatusLabel(medicine.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground ml-5">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Batch: <span className="font-mono text-foreground/80">{medicine.batch_number}</span>
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
                            <span className="font-mono text-foreground/80">{medicine.rack_location}</span>
                          </span>
                        )}
                        {medicine.low_stock_alert != null && medicine.quantity > 0 && medicine.quantity <= medicine.low_stock_alert && medicine.status !== 'expired' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-warning/10 text-warning rounded text-[9px] font-semibold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Low Stock: {medicine.quantity}/{medicine.low_stock_alert}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xl font-bold text-foreground">{medicine.quantity}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">units</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border ml-5">
                    {medicine.expiry_date && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Expires: <span className="font-medium text-foreground/80">{formatDate(medicine.expiry_date)}</span>
                        {medicine.days_remaining !== null && (
                          <span className={cn(
                            'font-semibold',
                            medicine.days_remaining <= 0 && 'text-destructive',
                            medicine.days_remaining > 0 && medicine.days_remaining <= 90 && 'text-orange-500',
                            medicine.days_remaining > 90 && 'text-green-500 dark:text-green-400',
                          )}>
                            ({Math.round(medicine.days_remaining)}d)
                          </span>
                        )}
                      </span>
                    )}
                    {medicine.selling_price && (
                      <span className="text-xs text-muted-foreground">
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
                <Package className="w-5 h-5 text-accent" />
                Medicine Details
              </DialogTitle>
              <DialogClose onClick={() => setSelectedMedicine(null)} />
            </DialogHeader>
            <div className="space-y-5">
              <div className={cn(
                'rounded-2xl p-4 text-center',
                selectedMedicine.status === 'expired' && 'bg-muted',
                selectedMedicine.status === 'critical' && 'bg-destructive/10 border border-destructive/20',
                selectedMedicine.status === 'warning' && 'bg-warning/10 border border-warning/20',
                selectedMedicine.status === 'safe' && 'bg-accent/10 border border-accent/20',
              )}>
                <span className={cn(
                  'text-sm font-bold',
                  selectedMedicine.status === 'expired' && 'text-muted-foreground',
                  selectedMedicine.status === 'critical' && 'text-destructive',
                  selectedMedicine.status === 'warning' && 'text-warning',
                  selectedMedicine.status === 'safe' && 'text-accent',
                )}>
                  {getStatusLabel(selectedMedicine.status)}
                  {selectedMedicine.days_remaining !== null && (
                    <> · {Math.round(selectedMedicine.days_remaining)} days remaining</>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Medicine Name</label>
                  <p className="font-semibold text-foreground mt-1">{selectedMedicine.name}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Batch Number</label>
                  <p className="font-semibold text-foreground mt-1 font-mono">{selectedMedicine.batch_number}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Company</label>
                  <p className="font-semibold text-foreground mt-1">{selectedMedicine.company || 'N/A'}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Quantity</label>
                  <p className="font-semibold text-foreground mt-1">{selectedMedicine.quantity} units</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Purchase Price</label>
                  <p className="font-semibold text-foreground mt-1">{formatCurrency(selectedMedicine.purchase_price)}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Selling Price</label>
                  <p className="font-semibold text-foreground mt-1">{formatCurrency(selectedMedicine.selling_price)}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Mfg Date</label>
                  <p className="font-semibold text-foreground mt-1">{formatDate(selectedMedicine.mfg_date)}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Expiry Date</label>
                  <p className="font-semibold text-foreground mt-1">{formatDate(selectedMedicine.expiry_date)}</p>
                </div>
              </div>

              {selectedMedicine.days_remaining !== null && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Days until expiry</span>
                    <span className="font-semibold text-foreground">{Math.round(selectedMedicine.days_remaining)}d</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        selectedMedicine.days_remaining <= 0 && 'bg-muted-foreground',
                        selectedMedicine.days_remaining > 0 && selectedMedicine.days_remaining <= 90 && 'bg-destructive',
                        selectedMedicine.days_remaining > 90 && selectedMedicine.days_remaining <= 180 && 'bg-warning',
                        selectedMedicine.days_remaining > 180 && 'bg-accent',
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
    </div>
  );
}
