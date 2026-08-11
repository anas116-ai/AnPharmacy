import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Medicine } from '../lib/types';
import { useStockStore } from '../stores/stockStore';
import { useRecycleBinStore } from '../stores/recycleBinStore';
import { useToast } from '../hooks/useToast';
import { formatCurrency, cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { Search, Plus, Trash2, Download, Upload, Columns, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Check, AlertTriangle, Save, Undo2, Redo2, EyeOff, Eye, PaintBucket, Grid3x3 } from 'lucide-react';
import ColumnManager from './ColumnManager';
import FilterPanel from './FilterPanel';
import { exportToCSV, parseCSV } from '../lib/csvParser';
import { ColumnDef, FilterDef } from '../lib/columnTypes';
import { schemaManager } from '../lib/importer/schemaManager';

// ── Helper: read a field from a Medicine, falling back to custom_fields ──
function getMedicineField(medicine: Medicine, colKey: string): any {
  // Special alias: GST % maps to purchase_gst_percent
  if (colKey === 'gst_percent') {
    return medicine.purchase_gst_percent ?? medicine.sale_gst_percent ?? null;
  }
  // Special alias: Supplier column shows supplier_name or falls back to company
  if (colKey === 'supplier_name') {
    const sn = (medicine as any)['supplier_name'];
    return sn ?? medicine.company ?? null;
  }
  // Try direct property first
  const directVal = medicine[colKey as keyof Medicine];
  if (directVal != null) return directVal;
  // Fall back to custom_fields for columns added via import
  if (medicine.custom_fields && medicine.custom_fields[colKey] !== undefined) {
    return medicine.custom_fields[colKey];
  }
  return null;
}

// ── Comprehensive column list matching pharmacy import files exactly ──
// Order matches the user's import file: Brand Name → Status
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Brand Name', type: 'text', width: 200, visible: true, editable: true },
  { key: 'generic_name', label: 'Generic Name', type: 'text', width: 150, visible: true, editable: true },
  { key: 'strength', label: 'Strength', type: 'text', width: 100, visible: true, editable: true },
  { key: 'dosage_form', label: 'Dosage Form', type: 'text', width: 120, visible: true, editable: true },
  { key: 'pack_size', label: 'Pack Size', type: 'text', width: 100, visible: true, editable: true },
  { key: 'company', label: 'Company', type: 'text', width: 140, visible: true, editable: true },
  { key: 'category', label: 'Category', type: 'text', width: 100, visible: true, editable: true },
  { key: 'hsn_code', label: 'HSN Code', type: 'text', width: 100, visible: true, editable: true },
  { key: 'gst_percent', label: 'GST %', type: 'number', width: 70, visible: true, editable: true },
  { key: 'barcode', label: 'Barcode', type: 'text', width: 120, visible: true, editable: true },
  { key: 'batch_number', label: 'Batch No', type: 'text', width: 120, visible: true, editable: true },
  { key: 'mfg_date', label: 'Mfg Date', type: 'date', width: 110, visible: true, editable: true },
  { key: 'expiry_date', label: 'Expiry Date', type: 'date', width: 110, visible: true, editable: true },
  { key: 'mrp', label: 'MRP', type: 'number', width: 90, visible: true, editable: true },
  { key: 'ptr', label: 'PTR', type: 'number', width: 90, visible: true, editable: true },
  { key: 'pts', label: 'PTS', type: 'number', width: 90, visible: true, editable: true },
  { key: 'purchase_price', label: 'Purchase Rate', type: 'number', width: 110, visible: true, editable: true },
  { key: 'selling_price', label: 'Sale Rate', type: 'number', width: 100, visible: true, editable: true },
  { key: 'quantity', label: 'Qty', type: 'number', width: 80, visible: true, editable: true },
  { key: 'free_qty', label: 'Free Qty', type: 'number', width: 80, visible: true, editable: true },
  { key: 'warehouse', label: 'Warehouse', type: 'text', width: 100, visible: true, editable: true },
  { key: 'rack_location', label: 'Rack', type: 'text', width: 80, visible: true, editable: true },
  { key: 'supplier_name', label: 'Supplier', type: 'text', width: 140, visible: true, editable: true },
  { key: 'supplier_gstin', label: 'Supplier GSTIN', type: 'text', width: 130, visible: true, editable: true },
  { key: 'invoice_no', label: 'Purchase Invoice', type: 'text', width: 130, visible: true, editable: true },
  { key: 'invoice_date', label: 'Purchase Date', type: 'date', width: 120, visible: true, editable: true },
  { key: 'scheme_qty', label: 'Scheme', type: 'number', width: 80, visible: true, editable: true },
  { key: 'discount_percent', label: 'Discount %', type: 'number', width: 80, visible: true, editable: true },
  { key: 'status', label: 'Status', type: 'select', width: 90, visible: true, editable: true, options: [
    { value: 'safe', label: 'Safe' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' },
    { value: 'expired', label: 'Expired' },
  ]},
  // Extra hidden columns (available via Column Manager)
  { key: 'schedule_type', label: 'Schedule', type: 'text', width: 80, visible: false, editable: true },
  { key: 'loose_quantity', label: 'Loose Qty', type: 'number', width: 80, visible: false, editable: true },
  { key: 'po_number', label: 'PO No', type: 'text', width: 100, visible: false, editable: true },
  { key: 'eway_bill_no', label: 'Eway Bill', type: 'text', width: 120, visible: false, editable: true },
  { key: 'num_cartons', label: 'Cartons', type: 'number', width: 70, visible: false, editable: true },
  { key: 'cold_chain', label: 'Cold Chain', type: 'number', width: 80, visible: false, editable: true },
  { key: 'manufacturer_name', label: 'Manufacturer', type: 'text', width: 130, visible: false, editable: true },
  { key: 'item_code', label: 'Item Code', type: 'text', width: 100, visible: false, editable: true },
  { key: 'payment_terms', label: 'Payment Terms', type: 'text', width: 120, visible: false, editable: true },
];

const STORAGE_KEY_COLUMNS = 'anpharm_stock_columns';
const STORAGE_KEY_FILTERS = 'anpharm_stock_filters';
const STORAGE_VERSION_KEY = 'anpharm_stock_version';
const CURRENT_STORAGE_VERSION = 2; // Bump when DEFAULT_COLUMNS changes significantly

// Excel-style highlight colors for column fills
const HIGHLIGHT_COLORS = [
  '#FFF2CC', '#FCE4D6', '#DDEBF7', '#E2EFDA',
  '#FFE699', '#F8CBAD', '#BDD7EE', '#A9D08E',
  '#FFD966', '#F4B183', '#9DC3E6', '#70AD47',
  '#FFE4E1', '#E1D5E7', '#D9D9D9', '#B4C6E7',
];

// Excel-style text (font) colors
const TEXT_COLORS = [
  '#000000', '#7F7F7F', '#595959', '#C00000',
  '#FF0000', '#ED7D31', '#FFC000', '#FFD966',
  '#7030A0', '#0070C0', '#2E75B6', '#00B0F0',
  '#548235', '#92D050', '#FFFF00', '#FFFFFF',
];

export default function StockEditor({ medicines: initialMedicines, onUpdate, externalSearchQuery = '' }: { medicines: Medicine[]; onUpdate: (medicines: Medicine[]) => void; externalSearchQuery?: string }) {
  const { medicines: storeMedicines, setMedicines, setDashboardStats } = useStockStore();
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local data state (for edits not yet saved to store)
  const [localMedicines, setLocalMedicines] = useState<Medicine[]>(initialMedicines);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [filters, setFilters] = useState<FilterDef[]>([]);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [editingCell, setEditingCell] = useState<{ rowId: number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const resizingColKey = useRef<string | null>(null);
  const [headerMenu, setHeaderMenu] = useState<{ colKey: string; x: number; y: number; submenu: 'color' | 'borders' | 'unhide' | null } | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [autoFilter, setAutoFilter] = useState<{ colKey: string; left: number; top: number } | null>(null);
  const autoFilterRef = useRef<HTMLDivElement>(null);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const lastSelectedCol = useRef<string | null>(null);

  // History state for undo/redo (snapshots both data rows and column formatting)
  const [history, setHistory] = useState<{ medicines: Medicine[]; columns: ColumnDef[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const initializedRef = useRef(false);

  // Sync with store — reinitialize only when initialMedicines reference changes
  // (i.e., when coming back from Recycle Bin restore or Dashboard import)
  useEffect(() => {
    if (!initializedRef.current) {
      setLocalMedicines(initialMedicines);
      if (initialMedicines.length > 0) {
        setHistory([{ medicines: [...initialMedicines], columns: DEFAULT_COLUMNS.map(c => ({ ...c })) }]);
        setHistoryIndex(0);
      }
      initializedRef.current = true;
    }
  }, []);
  
  // When initialMedicines data changes AND it's not the first render,
  // the data was likely updated from another tab (e.g., Recycle Bin restore, import commit)
  // Use JSON of IDs to catch any case where items change without length change
  const initialIds = useMemo(() => JSON.stringify(initialMedicines.map(m => m.id).sort()), [initialMedicines]);
  
  useEffect(() => {
    if (initializedRef.current && initialIds !== JSON.stringify(localMedicines.map(m => m.id).sort())) {
      setLocalMedicines(initialMedicines);
      pushHistory(initialMedicines);
    }
  }, [initialIds]);



  // Load column preferences from localStorage.
  // On version mismatch, WIPE old saved data and use fresh DEFAULT_COLUMNS.
  useEffect(() => {
    try {
      // Version check: if stored version is outdated, delete old column layout completely
      const storedVersion = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || '0', 10);
      if (storedVersion < CURRENT_STORAGE_VERSION) {
        localStorage.removeItem(STORAGE_KEY_COLUMNS);
        localStorage.removeItem('anpharm_column_layout');
        localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
      }

      // Always start with the fresh, comprehensive DEFAULT_COLUMNS
      let mergedColumns: ColumnDef[] = DEFAULT_COLUMNS.map(c => ({ ...c }));
      
      // Load any previously saved layout preferences (visibility, widths, renames)
      const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
      if (saved) {
        try {
          const parsed: ColumnDef[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const savedMap = new Map(parsed.map(c => [c.key, c]));
            const defaultKeys = new Set(DEFAULT_COLUMNS.map(c => c.key));
            
            // Start with defaults, overlay saved user preferences
            mergedColumns = DEFAULT_COLUMNS.map(def => ({
              ...def,
              ...(savedMap.get(def.key) || {}),
              key: def.key,
            }));
            
            // Add any user-created custom columns NOT in defaults
            for (const [key, savedCol] of savedMap) {
              if (!defaultKeys.has(key) && !DEFAULT_COLUMNS.some(d => d.key === key)) {
                mergedColumns.push(savedCol);
              }
            }
          }
        } catch {}
      }
      
      // Merge in any custom fields from schema manager
      const existingKeys = new Set(mergedColumns.map(c => c.key));
      const customFields = schemaManager.getCustomFields();
      for (const cf of customFields) {
        if (!existingKeys.has(cf.key)) {
          mergedColumns.push({
            key: cf.key,
            label: cf.label,
            type: cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text',
            width: 120,
            visible: true,
            editable: true,
          });
          existingKeys.add(cf.key);
        }
      }
      
      setColumns(mergedColumns);
      // Always persist to ensure fresh start
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(mergedColumns));
    } catch {}
  }, []);

  // Load filter preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFilters(parsed);
        }
      }
    } catch {}
  }, []);

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columns));
  }, [columns]);

  // Excel-style column width drag resize
  const startColumnResize = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColKey.current = colKey;
    const startX = e.clientX;
    const startWidth = columns.find(c => c.key === colKey)?.width || 120;
    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (ev.clientX - startX));
      setColumns(prev => prev.map(c => c.key === colKey ? { ...c, width: newWidth } : c));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      resizingColKey.current = null;
    };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [columns]);

  // Close the Excel-style header menu on outside click / Escape / scroll
  useEffect(() => {
    if (!headerMenu) return;
    const onDown = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setHeaderMenu(null); };
    const onWheel = (e: WheelEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenu(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('wheel', onWheel, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('wheel', onWheel, true);
    };
  }, [headerMenu]);

  // Close the autofilter dropdown on outside click / Escape
  useEffect(() => {
    if (!autoFilter) return;
    const onDown = (e: MouseEvent) => {
      if (autoFilterRef.current && !autoFilterRef.current.contains(e.target as Node)) {
        setAutoFilter(null);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAutoFilter(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [autoFilter]);

  // Open the Excel-style header context menu
  const openHeaderMenu = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHeaderMenu({ colKey, x: e.clientX, y: e.clientY, submenu: null });
  }, []);

  // Distinct values in a column, for the header autofilter dropdown
  const uniqueValues = useCallback((colKey: string): { value: string; count: number }[] => {
    const counts = new Map<string, number>();
    for (const m of localMedicines) {
      const v = String(getMedicineField(m, colKey) ?? '');
      if (v.trim() !== '') counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const arr = [...counts.entries()];
    arr.sort((a, b) => a[0].localeCompare(b[0]));
    return arr.map(([value, count]) => ({ value, count }));
  }, [localMedicines]);

  // Toggle an equals filter on a column (Excel: autofilter). Replaces the column's
  // existing equals filter, or clears it when the same value is picked again.
  const toggleAutoFilter = useCallback((colKey: string, value: string) => {
    setFilters(prev => {
      const active = prev.some(f => f.columnKey === colKey && f.value === value);
      const rest = prev.filter(f => f.columnKey !== colKey);
      if (active) return rest;
      return [...rest, { columnKey: colKey, condition: 'equals', value }];
    });
    setAutoFilter(null);
  }, []);

  const MAX_HISTORY = 50;

  const pushHistory = useCallback((newMedicines: Medicine[], newColumns?: ColumnDef[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ medicines: [...newMedicines], columns: newColumns ? newColumns.map(c => ({ ...c })) : columns.map(c => ({ ...c })) });
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex, columns]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setLocalMedicines(history[newIndex].medicines);
      setColumns(history[newIndex].columns);
      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setLocalMedicines(history[newIndex].medicines);
      setColumns(history[newIndex].columns);
      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const updateColumn = useCallback((colKey: string, patch: Partial<ColumnDef>) => {
    const next = columns.map(c => c.key === colKey ? { ...c, ...patch } : c);
    setColumns(next);
    pushHistory(localMedicines, next);
  }, [columns, localMedicines, pushHistory]);

  // Update multiple columns at once (Excel: apply formatting to a selection)
  const updateColumns = useCallback((colKeys: string[], patch: Partial<ColumnDef>) => {
    const keys = new Set(colKeys);
    const next = columns.map(c => keys.has(c.key) ? { ...c, ...patch } : c);
    setColumns(next);
    pushHistory(localMedicines, next);
  }, [columns, localMedicines, pushHistory]);

  // Resolve which columns an action should apply to: the current selection if the
  // right-clicked column is part of it, otherwise just that column.
  const targetColsForMenu = useCallback((colKey: string): string[] => {
    if (selectedCols.has(colKey) && selectedCols.size > 0) return [...selectedCols];
    return [colKey];
  }, [selectedCols]);

  // Excel-style column selection: plain click selects one, ctrl/cmd toggles,
  // shift selects a range from the last anchor.
  const handleHeaderSelect = useCallback((e: React.MouseEvent, colKey: string) => {
    e.stopPropagation();
    const visible = columns.filter(c => c.visible);
    const keys = visible.map(c => c.key);
    if (e.shiftKey && lastSelectedCol.current) {
      const from = keys.indexOf(lastSelectedCol.current);
      const to = keys.indexOf(colKey);
      if (from >= 0 && to >= 0) {
        const range = keys.slice(Math.min(from, to), Math.max(from, to) + 1);
        setSelectedCols(new Set(range));
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedCols(prev => {
        const next = new Set(prev);
        if (next.has(colKey)) next.delete(colKey);
        else next.add(colKey);
        return next;
      });
    } else {
      setSelectedCols(new Set([colKey]));
    }
    lastSelectedCol.current = colKey;
  }, [columns]);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
  }, [filters]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let data = [...localMedicines];

    // Apply search (includes custom_fields values). The Stock Management page's
    // own search box feeds in via externalSearchQuery so both boxes stay in sync.
    const rawQuery = (searchQuery || externalSearchQuery || '').trim();
    if (rawQuery) {
      const query = rawQuery.toLowerCase();
      data = data.filter(m => {
        // Search direct fields
        const directMatch = Object.values(m).some(val => 
          String(val).toLowerCase().includes(query)
        );
        if (directMatch) return true;
        // Search custom_fields
        if (m.custom_fields) {
          return Object.values(m.custom_fields).some(val =>
            String(val).toLowerCase().includes(query)
          );
        }
        return false;
      });
    }

    // Apply filters
    for (const filter of filters) {
      if (!filter.value.trim()) continue;
      
      data = data.filter(m => {
        const cellValue = String(getMedicineField(m, filter.columnKey) ?? '');
        const filterVal = filter.value.toLowerCase();
        
        switch (filter.condition) {
          case 'contains': return cellValue.toLowerCase().includes(filterVal);
          case 'equals': return cellValue.toLowerCase() === filterVal;
          case 'startsWith': return cellValue.toLowerCase().startsWith(filterVal);
          case 'endsWith': return cellValue.toLowerCase().endsWith(filterVal);
          case 'gt': return parseFloat(cellValue) > parseFloat(filter.value);
          case 'lt': return parseFloat(cellValue) < parseFloat(filter.value);
          case 'gte': return parseFloat(cellValue) >= parseFloat(filter.value);
          case 'lte': return parseFloat(cellValue) <= parseFloat(filter.value);
          default: return true;
        }
      });
    }

    // Apply sort
    if (sort) {
      data.sort((a, b) => {
        const aVal = getMedicineField(a, sort.key);
        const bVal = getMedicineField(b, sort.key);
        
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return data;
  }, [localMedicines, filters, sort, searchQuery, externalSearchQuery]);

  // Get cell value (supports both direct Medicine fields and custom_fields)
  const getCellValue = (medicine: Medicine, colKey: string): string => {
    const val = getMedicineField(medicine, colKey);
    if (val == null) return '';
    if (colKey === 'status') return String(val);
    if (typeof val === 'number') return String(val);
    return String(val);
  };

  // Handle cell edit start
  const handleCellEditStart = (rowId: number, colKey: string, currentValue: string) => {
    setEditingCell({ rowId, colKey });
    setEditValue(currentValue);
  };

  // Handle cell edit save (supports both direct Medicine fields and custom_fields)
  const handleCellEditSave = () => {
    if (!editingCell) return;
    
    const { rowId, colKey } = editingCell;
    const column = columns.find(c => c.key === colKey);
    
    const updatedMedicines = localMedicines.map(m => {
      if (m.id !== rowId) return m;
      
      let newValue: any = editValue;
      if (column?.type === 'number') {
        newValue = editValue === '' ? null : parseFloat(editValue);
        if (isNaN(newValue as number)) newValue = getMedicineField(m, colKey);
      }
      
      // Determine if this is a known Medicine field or a custom field
      const knownDirectFields = ['name','strength','batch_number','pack_size','company','generic_name',
        'manufacturer_id','manufacturer_name','quantity','loose_quantity','total_base_units',
        'mrp','purchase_price','ptr','pts','retailer_margin_percent','selling_price',
        'purchase_gst_percent','sale_gst_percent','gst_percent','hsn_code','schedule_type','barcode',
        'rack_location','low_stock_alert','max_stock_limit','min_margin_percent',
        'mfg_date','expiry_date','expiry_returnable','supplier_id','supplier_name','invoice_no',
        'invoice_date','po_number','order_date','payment_terms','due_date','warehouse',
        'dispatch_location','item_code','scheme_qty','free_qty','scheme_bonus_code',
        'discount_percent','taxable_amount','cgst_amount','sgst_amount','igst_amount',
        'eway_bill_no','num_cartons','cold_chain','status','days_remaining','added_by',
        'created_at','updated_at','manufacturer_name'];
      
      // Special handling: gst_percent sets both purchase and sale GST
      if (colKey === 'gst_percent') {
        const gstVal = newValue === null || newValue === '' ? 5 : parseFloat(String(newValue));
        return { ...m, purchase_gst_percent: isNaN(gstVal) ? 5 : gstVal, sale_gst_percent: isNaN(gstVal) ? 12 : gstVal };
      }
      
      // Special handling: supplier_name maps to company if company empty
      if (colKey === 'supplier_name') {
        return { ...m, supplier_name: newValue, company: m.company || newValue };
      }
      
      if (knownDirectFields.includes(colKey)) {
        return { ...m, [colKey]: newValue };
      }
      
      // For custom field columns, store in custom_fields
      const customFields = { ...(m.custom_fields || {}) };
      customFields[colKey] = newValue;
      return { ...m, custom_fields: customFields };
    });
    
    setLocalMedicines(updatedMedicines);
    pushHistory(updatedMedicines);
    setHasUnsavedChanges(true);
    setEditingCell(null);
    setEditValue('');
  };

  // Handle keyboard navigation
  const handleCellKeyDown = (e: React.KeyboardEvent, rowId: number, colKey: string) => {
    const visibleCols = columns.filter(c => c.visible);
    const currentColIndex = visibleCols.findIndex(c => c.key === colKey);
    const currentRowIndex = processedData.findIndex(m => m.id === rowId);

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (editingCell) {
          handleCellEditSave();
        } else {
          const currentValue = getCellValue(
            processedData.find(m => m.id === rowId)!, 
            colKey
          );
          handleCellEditStart(rowId, colKey, currentValue);
        }
        break;
      case 'Escape':
        setEditingCell(null);
        setEditValue('');
        break;
      case 'Tab':
        e.preventDefault();
        if (editingCell) handleCellEditSave();
        
        if (e.shiftKey && currentColIndex > 0) {
          // Move to previous cell
          const prevCol = visibleCols[currentColIndex - 1];
          if (prevCol.editable) {
            const prevRow = processedData[currentRowIndex];
            if (prevRow) {
              const val = getCellValue(prevRow, prevCol.key);
              handleCellEditStart(prevRow.id, prevCol.key, val);
            }
          }
        } else if (!e.shiftKey && currentColIndex < visibleCols.length - 1) {
          // Move to next cell
          const nextCol = visibleCols[currentColIndex + 1];
          if (nextCol.editable) {
            const nextRow = processedData[currentRowIndex];
            if (nextRow) {
              const val = getCellValue(nextRow, nextCol.key);
              handleCellEditStart(nextRow.id, nextCol.key, val);
            }
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentRowIndex > 0) {
          const prevRow = processedData[currentRowIndex - 1];
          const col = visibleCols[currentColIndex];
          if (col.editable && prevRow) {
            const val = getCellValue(prevRow, col.key);
            handleCellEditStart(prevRow.id, col.key, val);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentRowIndex < processedData.length - 1) {
          const nextRow = processedData[currentRowIndex + 1];
          const col = visibleCols[currentColIndex];
          if (col.editable && nextRow) {
            const val = getCellValue(nextRow, col.key);
            handleCellEditStart(nextRow.id, col.key, val);
          }
        }
        break;
      case 'Delete':
        if (!editingCell && selectedRows.size > 0) {
          setShowDeleteConfirm(true);
        }
        break;
    }
  };

  // Handle sort
  const handleSort = (colKey: string) => {
    setSort(prev => {
      if (prev?.key === colKey) {
        if (prev.direction === 'asc') {
          return { key: colKey, direction: 'desc' };
        }
        return null; // Remove sort
      }
      return { key: colKey, direction: 'asc' };
    });
  };

  // Add new row
  const handleAddRow = () => {
    const newRow: Medicine = {
      id: Date.now(),
      name: 'New Medicine',
      strength: null,
      batch_number: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      pack_size: null,
      company: null,
      generic_name: null,
      manufacturer_id: null,
      manufacturer_name: null,
      quantity: 0,
      loose_quantity: 0,
      total_base_units: 0,
      mrp: null,
      purchase_price: null,
      ptr: null,
      pts: null,
      retailer_margin_percent: null,
      selling_price: null,
      purchase_gst_percent: 5,
      sale_gst_percent: 12,
      hsn_code: '3004',
      schedule_type: 'General',
      barcode: null,
      rack_location: null,
      low_stock_alert: 20,
      max_stock_limit: null,
      min_margin_percent: 20,
      mfg_date: null,
      expiry_date: null,
      expiry_returnable: null,
      supplier_id: null,
      invoice_no: null,
      invoice_date: null,
      po_number: null,
      order_date: null,
      payment_terms: null,
      due_date: null,
      dispatch_location: null,
      item_code: null,
      scheme_qty: 0,
      free_qty: 0,
      scheme_bonus_code: null,
      discount_percent: 0,
      taxable_amount: null,
      cgst_amount: null,
      sgst_amount: null,
      igst_amount: null,
      eway_bill_no: null,
      num_cartons: 0,
      cold_chain: null,
      added_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'safe',
      days_remaining: null,
    };

    const updatedMedicines = [newRow, ...localMedicines];
    setLocalMedicines(updatedMedicines);
    pushHistory(updatedMedicines);
    setHasUnsavedChanges(true);
    toast.success('Row Added', 'New medicine row added. Edit the fields as needed.');
  };

  // Delete selected rows — Moves to Recycle Bin (not permanent deletion)
  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    
    const itemsToDelete = localMedicines.filter(m => selectedRows.has(m.id));
    
    // Move each item to the recycle bin via API
    let movedCount = 0;
    for (const item of itemsToDelete) {
      const ok = await useRecycleBinStore.getState().moveToBin(item);
      if (ok) movedCount++;
    }
    
    // Remove from local state (they're now in the bin)
    const updatedMedicines = localMedicines.filter(m => !selectedRows.has(m.id));
    setLocalMedicines(updatedMedicines);
    pushHistory(updatedMedicines);
    setSelectedRows(new Set());
    setShowDeleteConfirm(false);
    setHasUnsavedChanges(true);
    
    // Sync with global store (so Dashboard & Stock see the change)
    if (window.electronAPI) {
      const [stockResult, dashResult] = await Promise.all([
        window.electronAPI.listStock(),
        window.electronAPI.getDashboardStats(),
      ]);
      if (stockResult.success) {
        setMedicines(stockResult.medicines || []);
        onUpdate(stockResult.medicines || []);
      }
      if (dashResult.success) {
        setDashboardStats(dashResult.stats);
      }
    } else {
      setMedicines(updatedMedicines);
      onUpdate(updatedMedicines);
    }
    
    toast.success('Moved to Recycle Bin', 
      `${movedCount} item(s) moved to Recycle Bin. You can restore them from there.`
    );
  };

  // Save changes to store
  const handleSaveToStore = async () => {
    try {
      // Persist to DB (full-table replace) before updating the in-memory store,
      // otherwise edits disappear after reload.
      if (window.electronAPI) {
        const result = await window.electronAPI.saveAllStock({ medicines: localMedicines });
        if (!result.success) throw new Error(result.error || 'Save failed');
      }
      setMedicines(localMedicines);
      onUpdate(localMedicines);
      setHasUnsavedChanges(false);
      toast.success('Saved', 'All changes saved successfully.');
    } catch (err) {
      toast.error('Save Failed', 'Could not save changes. Please try again.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const visibleCols = columns.filter(c => c.visible);
    const dataToExport = processedData.map(m => {
      const row: Record<string, any> = {};
      visibleCols.forEach(col => {
        row[col.key] = getMedicineField(m, col.key);
      });
      return row;
    });

    const headerCols = visibleCols.map(c => ({ key: c.key, label: c.label }));
    exportToCSV(dataToExport, 'stock_export.csv', headerCols);
    toast.success('Exported', 'Stock data exported to CSV.');
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const visibleCols = columns.filter(c => c.visible);
        
        // Simple CSV parsing
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const newMedicines: Medicine[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          const medicine: Partial<Medicine> = {
            id: Date.now() + i,
            name: values[0] || 'Unknown',
            batch_number: values[1] || `BATCH-${Date.now().toString(36).toUpperCase()}`,
            company: values[2] || null,
            quantity: parseFloat(values[3]) || 0,
            mrp: values[4] ? parseFloat(values[4]) : null,
            purchase_price: values[5] ? parseFloat(values[5]) : null,
            selling_price: values[6] ? parseFloat(values[6]) : null,
            expiry_date: values[7] || null,
            status: 'safe',
            purchase_gst_percent: 5,
            sale_gst_percent: 12,
            hsn_code: '3004',
            schedule_type: 'General',
            low_stock_alert: 20,
            min_margin_percent: 20,
            loose_quantity: 0,
            total_base_units: 0,
            scheme_qty: 0,
            free_qty: 0,
            discount_percent: 0,
            added_by: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          newMedicines.push(medicine as Medicine);
        }

        const updatedMedicines = [...localMedicines, ...newMedicines];
        setLocalMedicines(updatedMedicines);
        pushHistory(updatedMedicines);
        setHasUnsavedChanges(true);
        toast.success('Imported', `${newMedicines.length} medicines imported from CSV.`);
      } catch (err) {
        toast.error('Import Failed', 'Could not parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Toggle row selection
  const toggleRowSelection = (rowId: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Toggle all rows selection
  const toggleAllRows = () => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(processedData.map(m => m.id)));
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'expired': return <Badge variant="expired">Expired</Badge>;
      case 'critical': return <Badge variant="critical">Critical</Badge>;
      case 'warning': return <Badge variant="warning">Warning</Badge>;
      case 'safe': return <Badge variant="success">Safe</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const visibleColumns = columns.filter(c => c.visible);
  const activeFiltersCount = filters.filter(f => f.value.trim() !== '').length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all columns..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <Button onClick={handleAddRow} size="sm" variant="success">
          <Plus className="w-4 h-4 mr-1" />
          Add Row
        </Button>

        <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
          <Upload className="w-4 h-4 mr-1" />
          Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
        />

        <Button onClick={handleExportCSV} size="sm" variant="outline">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>

        <Button onClick={undo} size="sm" variant="outline" disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4 mr-1" />
          Undo
        </Button>
        <Button onClick={redo} size="sm" variant="outline" disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4 mr-1" />
          Redo
        </Button>

        <Button 
          onClick={() => setShowColumnManager(true)} 
          size="sm" 
          variant={showColumnManager ? 'default' : 'outline'}
        >
          <Columns className="w-4 h-4 mr-1" />
          Columns
        </Button>

        <Button 
          onClick={() => setShowFilterPanel(true)} 
          size="sm" 
          variant={showFilterPanel ? 'default' : 'outline'}
          className="relative"
        >
          <Filter className="w-4 h-4 mr-1" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="success" className="ml-1.5 text-[10px] px-1.5 py-0">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {hasUnsavedChanges && (
          <Button onClick={handleSaveToStore} size="sm" variant="primary" className="animate-pulse">
            <Save className="w-4 h-4 mr-1" />
            Save All
          </Button>
        )}

        {selectedRows.size > 0 && (
          <Button 
            onClick={() => setShowDeleteConfirm(true)} 
            size="sm" 
            variant="destructive"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete ({selectedRows.size})
          </Button>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-4">
          <span>Total: {processedData.length} rows</span>
          {activeFiltersCount > 0 && (
            <span className="text-accent">
              {activeFiltersCount} filter(s) active
            </span>
          )}
          {sort && (
            <span className="text-navy-600 dark:text-navy-400">
              Sorted by {columns.find(c => c.key === sort.key)?.label} ({sort.direction})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {searchQuery && (
            <span>Search: "{searchQuery}"</span>
          )}
          <span className="text-muted-foreground">
            Double-click cell to edit · Tab to move · Enter to save · Esc to cancel
          </span>
        </div>
      </div>

      {/* Table */}
      <div 
        ref={tableRef}
        className="card-base rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full border-collapse" style={{ minWidth: `${visibleColumns.reduce((sum, c) => sum + (c.width || 120), 0)}px` }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/70 dark:bg-muted/40 backdrop-blur-sm">
                <th className="w-10 p-2 text-center border-b border-border">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={toggleAllRows}
                    className="rounded border-border text-accent focus:ring-accent/50"
                  />
                </th>
                <th className="w-9 p-0 text-center border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                  #
                </th>
                {visibleColumns.map(col => {
                  const isSelected = selectedCols.has(col.key);
                  return (
                  <th
                    key={col.key}
                    onClick={(e) => handleHeaderSelect(e, col.key)}
                    onContextMenu={(e) => openHeaderMenu(e, col.key)}
                    className={cn(
                      'relative p-2 text-left text-xs font-semibold uppercase tracking-wider border-b border-border select-none cursor-pointer',
                      col.borders === 'left' && 'border-l-2 border-l-slate-400/70',
                      col.borders === 'right' && 'border-r-2 border-r-slate-400/70',
                      col.borders === 'both' && 'border-l-2 border-r-2 border-l-slate-400/70 border-r-slate-400/70',
                      isSelected && 'bg-accent/15 ring-1 ring-inset ring-accent/50'
                    )}
                    style={{ width: col.width, minWidth: col.width, backgroundColor: col.highlight || undefined, color: col.color }}
                    title="Click to select column · Ctrl/Cmd+Click for multiple · Shift+Click for range · Right-click for options"
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}
                        className={cn(
                          'flex items-center gap-1 hover:text-accent transition-colors rounded px-1 py-0.5 -ml-1',
                          sort?.key === col.key && 'text-accent'
                        )}
                      >
                        <span className="truncate">{col.label}</span>
                        {sort?.key === col.key ? (
                          sort.direction === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                          )
                        ) : (
                          <div className="w-3.5 h-3.5 shrink-0 opacity-30">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (autoFilter?.colKey === col.key) { setAutoFilter(null); return; }
                          const th = (e.currentTarget.closest('th'));
                          const rect = th?.getBoundingClientRect();
                          setAutoFilter({ colKey: col.key, left: rect ? Math.max(12, Math.min(rect.left, window.innerWidth - 268)) : 12, top: rect ? rect.bottom + 4 : 32 });
                        }}
                        className={cn(
                          'p-0.5 rounded transition-colors shrink-0',
                          filters.some(f => f.columnKey === col.key && f.value) 
                            ? 'text-accent bg-accent/15' 
                            : 'text-muted-foreground/50 hover:text-accent'
                        )}
                        title="Filter this column"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                      {col.highlight && (
                        <span
                          className="w-2.5 h-2.5 rounded-sm ring-1 ring-black/10 shrink-0"
                          style={{ backgroundColor: col.highlight }}
                          title="Highlighted column (right-click to change)"
                        />
                      )}
                    </div>
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); startColumnResize(e, col.key); }}
                      className={cn(
                        'absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 active:bg-accent/60 transition-colors',
                        resizingColKey.current === col.key && 'bg-accent/60'
                      )}
                      title="Drag to resize column"
                    />
                  </th>
                  );
                })}
                <th className="w-12 p-2 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-12 h-12 opacity-20" />
                      <p>No medicines found</p>
                      <p className="text-xs">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedData.map((medicine, rowIndex) => (
                  <tr
                    key={medicine.id}
                    className={cn(
                      'group border-b border-border transition-colors',
                      'hover:bg-muted/40',
                      selectedRows.has(medicine.id) && 'bg-accent/10'
                    )}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(medicine.id)}
                        onChange={() => toggleRowSelection(medicine.id)}
                        className="rounded border-border text-accent focus:ring-accent/50"
                      />
                    </td>
                    <td className={cn(
                      'p-1 text-center text-[10px] font-mono border-b border-border select-none',
                      rowIndex % 2 === 1 ? 'text-muted-foreground bg-muted/20' : 'text-muted-foreground'
                    )}>
                      {rowIndex + 1}
                    </td>
                    {visibleColumns.map(col => {
                      const isEditing = editingCell?.rowId === medicine.id && editingCell?.colKey === col.key;
                      const cellValue = getCellValue(medicine, col.key);
                      
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'p-1 align-middle transition-colors',
                            col.editable && 'cursor-pointer hover:bg-muted/60',
                            isEditing && 'bg-accent/10',
                            col.borders === 'left' && 'border-l-2 border-l-slate-400/70',
                            col.borders === 'right' && 'border-r-2 border-r-slate-400/70',
                            col.borders === 'both' && 'border-l-2 border-r-2 border-l-slate-400/70 border-r-slate-400/70'
                          )}
                          style={{ backgroundColor: col.highlight, color: col.color }}
                          onDoubleClick={() => {
                            if (col.editable && !isEditing) {
                              handleCellEditStart(medicine.id, col.key, cellValue);
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, medicine.id, col.key)}
                          tabIndex={col.editable ? 0 : -1}
                        >
                          {isEditing ? (
                            <input
                              type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellEditSave}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation();
                                  handleCellEditSave();
                                } else if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setEditingCell(null);
                                  setEditValue('');
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-accent bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 font-body"
                            />
                          ) : (
                            <div className={cn('px-2 py-1.5 text-sm truncate font-body', !col.color && 'text-foreground/80')}>
                              {col.key === 'status' ? (
                                getStatusBadge(cellValue)
                              ) : col.type === 'number' && cellValue ? (
                                <span className={cn('font-mono', !col.color && 'text-foreground')}>
                                  {col.key.includes('price') || col.key.includes('mrp') ? formatCurrency(parseFloat(cellValue)) : cellValue}
                                </span>
                              ) : col.type === 'date' && cellValue ? (
                                <span className="font-mono">{cellValue}</span>
                              ) : (
                                cellValue || <span className="text-muted-foreground/60">—</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1">                        <button
                        onClick={async () => {
                          await useRecycleBinStore.getState().moveToBin(medicine);
                          const updatedMedicines = localMedicines.filter(m => m.id !== medicine.id);
                          setLocalMedicines(updatedMedicines);
                          pushHistory(updatedMedicines);
                          setHasUnsavedChanges(true);
                          // Sync with global store
                          if (window.electronAPI) {
                            const [stockResult, dashResult] = await Promise.all([
                              window.electronAPI.listStock(),
                              window.electronAPI.getDashboardStats(),
                            ]);
                            if (stockResult.success) {
                              setMedicines(stockResult.medicines || []);
                              onUpdate(stockResult.medicines || []);
                            }
                            if (dashResult.success) {
                              setDashboardStats(dashResult.stats);
                            }
                          } else {
                            setMedicines(updatedMedicines);
                            onUpdate(updatedMedicines);
                          }
                          toast.success('Moved to Recycle Bin', 'Item can be restored from Recycle Bin.');
                        }}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-100"
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel-style column header context menu */}
      {headerMenu && (() => {
        const targetCols = targetColsForMenu(headerMenu.colKey);
        const col = columns.find(c => c.key === headerMenu.colKey);
        const hiddenCols = columns.filter(c => !c.visible);
        const menuLeft = Math.max(12, Math.min(headerMenu.x, window.innerWidth - 330));
        const menuTop = Math.max(12, Math.min(headerMenu.y, window.innerHeight - 480));
        const applyPatch = (patch: Partial<ColumnDef>) => {
          updateColumns(targetCols, patch);
        };
        return (
          <div
            ref={headerMenuRef}
            className="fixed z-50 w-80 rounded-2xl border border-border bg-background shadow-2xl shadow-black/20 text-sm animate-fade-in"
            style={{ left: menuLeft, top: menuTop }}
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-foreground">
                {targetCols.length > 1 ? `${targetCols.length} columns selected` : col?.label || 'Column'}
              </p>
              <p className="text-[10px] text-muted-foreground">Column options</p>
            </div>

            <button
              onClick={() => { applyPatch({ visible: false }); setHeaderMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-foreground text-left"
            >
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              Hide {targetCols.length > 1 ? `${targetCols.length} columns` : 'column'}
            </button>

            <button
              onClick={() => {
                const allVisibleKeys = columns.filter(c => c.visible).map(c => c.key);
                setSelectedCols(new Set(allVisibleKeys));
                setHeaderMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-foreground text-left"
            >
              <Grid3x3 className="w-4 h-4 text-muted-foreground" />
              Select all columns
            </button>

            {targetCols.length > 1 && (
              <button
                onClick={() => { setSelectedCols(new Set()); setHeaderMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-foreground text-left"
              >
                <X className="w-4 h-4 text-muted-foreground" />
                Clear selection
              </button>
            )}

            {hiddenCols.length > 0 && (
              <div className="border-t border-border">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Unhide columns</div>
                {hiddenCols.map(h => (
                  <button
                    key={h.key}
                    onClick={() => updateColumn(h.key, { visible: true })}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-foreground text-left"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{h.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-border">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Highlight colour (fill)</div>
              <div className="grid grid-cols-8 gap-1 px-3 pb-2">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn(
                      'h-5 w-5 rounded border transition-transform hover:scale-110',
                      col?.highlight === color && 'border-accent ring-2 ring-accent/40'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => applyPatch({ highlight: color })}
                  />
                ))}
                <button
                  className={cn('h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted', !col?.highlight && 'ring-2 ring-accent/40')}
                  title="Clear highlight"
                  onClick={() => applyPatch({ highlight: undefined })}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="border-t border-border">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Text colour</div>
              <div className="grid grid-cols-8 gap-1 px-3 pb-2">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn(
                      'h-5 w-5 rounded border transition-transform hover:scale-110 flex items-center justify-center',
                      col?.color === color ? 'border-accent ring-2 ring-accent/40' : 'border-border'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => applyPatch({ color })}
                  >
                    <span className="text-[8px] font-bold text-white drop-shadow">A</span>
                  </button>
                ))}
                <button
                  className={cn('h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted', !col?.color && 'ring-2 ring-accent/40')}
                  title="Reset text colour"
                  onClick={() => applyPatch({ color: undefined })}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="border-t border-border">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Column borders</div>
              <div className="grid grid-cols-4 gap-1 px-3 pb-2">
                {([
                  ['Left', 'left'],
                  ['Right', 'right'],
                  ['Both', 'both'],
                  ['None', undefined],
                ] as const).map(([label, value]) => (
                  <button
                    key={label}
                    onClick={() => applyPatch({ borders: value })}
                    className={cn(
                      'px-1 py-1.5 rounded border text-[11px]',
                      col?.borders === value ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:bg-muted text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Excel-style header autofilter dropdown */}
      {autoFilter && (() => {
        const col = columns.find(c => c.key === autoFilter.colKey);
        const values = uniqueValues(autoFilter.colKey);
        const activeValue = filters.find(f => f.columnKey === autoFilter.colKey && f.value)?.value;
        return (
          <div
            ref={autoFilterRef}
            className="fixed z-50 w-64 rounded-2xl border border-border bg-background shadow-2xl shadow-black/20 text-sm animate-fade-in overflow-hidden"
            style={{ left: autoFilter.left, top: Math.min(autoFilter.top, window.innerHeight - 320) }}
          >
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground truncate">{col?.label || 'Column'}</p>
              <button
                onClick={() => setAutoFilter(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {values.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No values in this column</p>
              )}
              {values.map(({ value, count }) => (
                <button
                  key={value}
                  onClick={() => toggleAutoFilter(autoFilter.colKey, value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted transition-colors',
                    activeValue === value && 'bg-accent/10 text-accent'
                  )}
                >
                  <Check className={cn('w-3.5 h-3.5 shrink-0', activeValue === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate flex-1">{value}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{count}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleAutoFilter(autoFilter.colKey, '')}>
                Clear filter
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Column Manager Dialog */}
      <Dialog open={showColumnManager} onOpenChange={setShowColumnManager} className="max-w-4xl max-h-[90vh]">
        <DialogContent>
          <ColumnManager
            columns={columns}
            onColumnsChange={setColumns}
            onClose={() => setShowColumnManager(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Filter Panel Dialog */}
      <FilterPanel
        open={showFilterPanel}
        onOpenChange={setShowFilterPanel}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Move <strong>{selectedRows.size}</strong> selected item(s) to the <strong>Recycle Bin</strong>?
            Deleted items go to the bin and can be restored later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
