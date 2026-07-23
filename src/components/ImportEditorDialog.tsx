/**
 * Excel-like Import Editor
 * - Full editable grid (inline cell editing)
 * - Add / Delete / Rename / Hide columns
 * - Column selection (keep/discard before import)
 * - Column reordering via drag
 * - Undo/Redo support (Ctrl+Z / Ctrl+Y)
 * - Filters, sort, search within imported data
 * - Preview before final import
 */

import { useState, useMemo, useRef, useCallback, useEffect, type DragEvent } from 'react';
import {
  X, Plus, Trash2, Edit2, Eye, EyeOff, GripVertical, Search,
  ChevronUp, ChevronDown, Filter, Save, FileSpreadsheet,
  CheckCircle, AlertTriangle, Settings2, Columns, ArrowUpDown,
  Undo2, Redo2, CheckSquare, Square, Layers, Download,
  ChevronsUpDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { ImportedMedicineRow, FileImportResult } from '../lib/fileImporter';

interface ImportEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  importResult: FileImportResult | null;
  onImport: (rows: ImportedMedicineRow[]) => Promise<void>;
  existingMedicines?: any[];
}

type SortDir = 'asc' | 'desc' | null;
type FilterMode = 'all' | 'contains' | 'equals' | 'startsWith' | 'endsWith';

interface ColumnState {
  key: string;
  label: string;
  visible: boolean;
  keep: boolean; // Whether to include this column in the import
  width: number;
  order: number;
}

interface HistoryState {
  rows: ImportedMedicineRow[];
  columns: ColumnState[];
}

const MAX_HISTORY = 50;

export default function ImportEditorDialog({
  isOpen,
  onClose,
  importResult,
  onImport,
  existingMedicines = [],
}: ImportEditorDialogProps) {
  const [rows, setRows] = useState<ImportedMedicineRow[]>([]);
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<string, { mode: FilterMode; value: string }>>({});
  const [showColManager, setShowColManager] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [addColName, setAddColName] = useState('');
  const [batchField, setBatchField] = useState<string | null>(null);
  const [batchValue, setBatchValue] = useState('');
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showDuplicateFilter, setShowDuplicateFilter] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── Premium: Duplicate Detection ────────────────────────────────
  const duplicateMap = useMemo(() => {
    const map = new Map<number, { existingBatch: string; existingQty: number }>();
    const meds = existingMedicines || [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || '').toLowerCase().trim();
      const batch = (row.batchNumber || '').toLowerCase().trim();
      
      const match = meds.find((m: any) =>
        (m.name || '').toLowerCase().trim() === name &&
        (m.batch_number || '').toLowerCase().trim() === batch
      );
      
      if (match) {
        map.set(i, {
          existingBatch: match.batch_number || '',
          existingQty: match.quantity || 0,
        });
      }
    }
    return map;
  }, [rows, existingMedicines]);

  // ── Premium: Data Quality Score ─────────────────────────────────
  const qualityStats = useMemo(() => {
    if (rows.length === 0) return { avgScore: 100, good: 0, needsReview: 0, poor: 0 };
    let good = 0, needsReview = 0, poor = 0;
    for (const row of rows) {
      let score = 100;
      if (!row.name || row.name.trim().length < 2) score -= 30;
      if (!row.batchNumber || row.batchNumber.trim().length < 2) score -= 20;
      if (!row.quantity || row.quantity <= 0) score -= 25;
      if (!row.expiryDate) score -= 15;
      if (!row.company && !row.manufacturer) score -= 10;
      if (score >= 70) good++;
      else if (score >= 40) needsReview++;
      else poor++;
    }
    const avgScore = Math.round((good * 85 + needsReview * 55 + poor * 20) / Math.max(1, rows.length));
    return { avgScore, good, needsReview, poor };
  }, [rows]);

  const pushHistory = useCallback((newRows: ImportedMedicineRow[], newColumns: ColumnState[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ rows: newRows, columns: newColumns });
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // ── Premium: Batch Field Update (after pushHistory is defined) ──
  const applyBatchFieldUpdate = useCallback((fieldKey: string, value: string) => {
    const newRows = rows.map(row => {
      const newRow = { ...row, _rawRowData: { ...row._rawRowData } };
      newRow._rawRowData[fieldKey] = value;
      if (fieldKey in newRow && !fieldKey.startsWith('_')) {
        if (['quantity', 'mrp', 'ptr', 'pts', 'purchasePrice', 'sellingPrice', 'freeQty', 'schemeQty', 'discountPercent'].includes(fieldKey)) {
          (newRow as any)[fieldKey] = parseFloat(value) || 0;
        } else {
          (newRow as any)[fieldKey] = value;
        }
      }
      return newRow;
    });
    setRows(newRows);
    pushHistory(newRows, columns);
    setShowBatchDialog(false);
    setBatchField(null);
    setBatchValue('');
  }, [rows, columns, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setRows(state.rows);
      setColumns(state.columns);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setRows(state.rows);
      setColumns(state.columns);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Initialize columns and rows when importResult changes
  useEffect(() => {
    if (!importResult) return;
    const initialRows = [...importResult.rows];

    const allKeys = new Set<string>();
    importResult.rows.forEach(r => {
      Object.keys(r._rawRowData).forEach(k => allKeys.add(k));
      Object.keys(r).filter(k => !k.startsWith('_')).forEach(k => allKeys.add(k));
    });

    const cols: ColumnState[] = Array.from(allKeys).map((key, idx) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
      visible: true,
      keep: true, // By default, keep all columns
      width: 140,
      order: idx,
    }));

    setRows(initialRows);
    setColumns(cols);
    setSearchQuery('');
    setSortCol(null);
    setSortDir(null);
    setFilters({});
    setHistory([{ rows: initialRows, columns: cols }]);
    setHistoryIndex(0);
  }, [importResult]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const visibleColumns = useMemo(
    () => columns.filter(c => c.visible && c.keep).sort((a, b) => a.order - b.order),
    [columns]
  );

  const displayRows = useMemo(() => {
    let result = [...rows];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        Object.values(r._rawRowData).some(v => v.toLowerCase().includes(q)) ||
        Object.values(r).some((v: any) => String(v).toLowerCase().includes(q))
      );
    }

    // Filter
    for (const [colKey, filter] of Object.entries(filters)) {
      if (!filter.value) continue;
      const val = filter.value.toLowerCase();
      result = result.filter(r => {
        const cellVal = String(r._rawRowData[colKey] || '').toLowerCase();
        switch (filter.mode) {
          case 'equals': return cellVal === val;
          case 'startsWith': return cellVal.startsWith(val);
          case 'endsWith': return cellVal.endsWith(val);
          default: return cellVal.includes(val);
        }
      });
    }

    // Sort
    if (sortCol && sortDir) {
      result.sort((a, b) => {
        const aVal = String(a._rawRowData[sortCol] || a[sortCol as keyof ImportedMedicineRow] || '').toLowerCase();
        const bVal = String(b._rawRowData[sortCol] || b[sortCol as keyof ImportedMedicineRow] || '').toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rows, searchQuery, filters, sortCol, sortDir]);

  const getCellValue = (row: ImportedMedicineRow, colKey: string): string => {
    if (colKey.startsWith('_')) {
      const key = colKey.replace(/^_/, '');
      const map: Record<string, any> = {
        rowNumber: row._rowNumber,
        confidence: row._confidence,
        missingFields: row._missingFields.length,
      };
      return String(map[key] ?? '');
    }
    return row._rawRowData[colKey] ?? String((row as any)[colKey] ?? '');
  };

  const setCellValue = (rowIndex: number, colKey: string, value: string) => {
    const newRows = [...rows];
    const row = { ...newRows[rowIndex], _rawRowData: { ...newRows[rowIndex]._rawRowData } };
    row._rawRowData[colKey] = value;
    if (colKey in row && !colKey.startsWith('_')) {
      (row as any)[colKey] = value;
    }
    newRows[rowIndex] = row;
    setRows(newRows);
    pushHistory(newRows, columns);
  };

  const startEdit = (rowIndex: number, colKey: string, currentValue: string) => {
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (editingCell) {
      setCellValue(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const deleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    pushHistory(newRows, columns);
  };

  const addRow = () => {
    const newRow: ImportedMedicineRow = {
      _rowNumber: rows.length + 1,
      _errors: [],
      _confidence: 0,
      _rawText: '',
      _missingFields: [],
      _rawRowData: {},
      name: '',
      strength: '',
      company: '',
      genericName: '',
      manufacturer: '',
      itemCode: '',
      batchNumber: '',
      barcode: '',
      rackLocation: '',
      packSize: '',
      quantity: 0,
      looseQuantity: 0,
      freeQty: 0,
      schemeQty: 0,
      mrp: 0,
      ptr: 0,
      pts: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      discountPercent: 0,
      retailerMarginPercent: 0,
      minMarginPercent: 20,
      hsnCode: '3004',
      scheduleType: 'General',
      purchaseGstPercent: 5,
      saleGstPercent: 12,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      mfgDate: '',
      expiryDate: '',
      invoiceNo: '',
      invoiceDate: '',
      supplierName: '',
      supplierGstin: '',
      poNumber: '',
      orderDate: '',
      paymentTerms: '',
      dueDate: '',
      ewayBillNo: '',
      numCartons: 0,
    };
    const newRows = [...rows, newRow];
    setRows(newRows);
    pushHistory(newRows, columns);
  };

  const deleteColumn = (colKey: string) => {
    const newColumns = columns.filter(c => c.key !== colKey);
    setColumns(newColumns);
    setFilters(prev => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
    pushHistory(rows, newColumns);
  };

  const toggleColumnKeep = (colKey: string) => {
    const newColumns = columns.map(c => c.key === colKey ? { ...c, keep: !c.keep } : c);
    setColumns(newColumns);
    pushHistory(rows, newColumns);
  };

  const renameColumn = (oldKey: string, newLabel: string) => {
    const newColumns = columns.map(c => c.key === oldKey ? { ...c, label: newLabel } : c);
    setColumns(newColumns);
    pushHistory(rows, newColumns);
  };

  const toggleColumnVisibility = (colKey: string) => {
    const newColumns = columns.map(c => c.key === colKey ? { ...c, visible: !c.visible } : c);
    setColumns(newColumns);
    pushHistory(rows, newColumns);
  };

  const addColumn = () => {
    if (!addColName.trim()) return;
    const key = addColName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (columns.find(c => c.key === key)) return;
    const newColumns = [...columns, {
      key,
      label: addColName.trim(),
      visible: true,
      keep: true,
      width: 140,
      order: columns.length,
    }];
    setColumns(newColumns);
    setAddColName('');
    pushHistory(rows, newColumns);
  };

  // ── Drag-and-Drop Column Reordering ───────────────────────────
  const handleDragStart = (e: DragEvent, colKey: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colKey);
    setDragColKey(colKey);
  };

  const handleDragOver = (e: DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent, targetColKey: string) => {
    e.preventDefault();
    const sourceColKey = e.dataTransfer.getData('text/plain');
    if (!sourceColKey || sourceColKey === targetColKey) {
      setDragColKey(null);
      return;
    }
    
    const newColumns = [...columns];
    const sourceIdx = newColumns.findIndex(c => c.key === sourceColKey);
    const targetIdx = newColumns.findIndex(c => c.key === targetColKey);
    if (sourceIdx === -1 || targetIdx === -1) { setDragColKey(null); return; }
    
    const [movedCol] = newColumns.splice(sourceIdx, 1);
    // When moving right, remove of source shifts target index left by 1
    const insertAt = targetIdx > sourceIdx ? targetIdx - 1 : targetIdx;
    newColumns.splice(insertAt, 0, movedCol);
    
    // Re-assign order values
    const reordered = newColumns.map((c, i) => ({ ...c, order: i }));
    setColumns(reordered);
    pushHistory(rows, reordered);
    setDragColKey(null);
  };

  const handleDragEnd = () => {
    setDragColKey(null);
  };

  // ── Column Order Change Button ─────────────────────────────────
  const [reorderCols, setReorderCols] = useState<ColumnState[]>([]);
  const openReorderDialog = () => {
    setReorderCols([...columns].sort((a, b) => a.order - b.order));
    setShowReorderDialog(true);
  };

  const moveColumnUp = (idx: number) => {
    if (idx <= 0) return;
    const newReorder = [...reorderCols];
    [newReorder[idx - 1], newReorder[idx]] = [newReorder[idx], newReorder[idx - 1]];
    setReorderCols(newReorder);
  };

  const moveColumnDown = (idx: number) => {
    if (idx >= reorderCols.length - 1) return;
    const newReorder = [...reorderCols];
    [newReorder[idx], newReorder[idx + 1]] = [newReorder[idx + 1], newReorder[idx]];
    setReorderCols(newReorder);
  };

  const applyReorder = () => {
    const reordered = reorderCols.map((c, i) => ({ ...c, order: i }));
    setColumns(reordered);
    pushHistory(rows, reordered);
    setShowReorderDialog(false);
  };

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDir === 'asc') setSortCol(null);
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // ── Premium: Export edited data to CSV ────────────────────────
  const handleExportCSV = () => {
    const fileName = importResult?.fileName?.replace(/\.[^/.]+$/, '') || 'imported_data';
    const keptColumns = columns.filter(c => c.keep && c.visible);
    
    const csvHeaders = keptColumns.map(c => c.label);
    const csvRows = rows.map(row => {
      return keptColumns.map(col => {
        const value = row._rawRowData[col.key] !== undefined ? row._rawRowData[col.key] : (row as any)[col.key];
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
    });

    const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_edited.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchImport = async () => {
    setIsImporting(true);
    try {
      // Only import rows and columns that are marked as "keep"
      const keptColumns = columns.filter(c => c.keep);
      const filteredRows = rows.map(row => {
        const newRawRowData: Record<string, string> = {};
        keptColumns.forEach(col => {
          newRawRowData[col.key] = row._rawRowData[col.key] || '';
        });
        return { ...row, _rawRowData: newRawRowData };
      });
      await onImport(filteredRows);
      handleClose();
    } catch {
      // error handled by parent
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setColumns([]);
    setEditingCell(null);
    setFilters({});
    setSearchQuery('');
    setHistory([]);
    setHistoryIndex(-1);
    onClose();
  };

  if (!importResult) return null;

  const activeFilterCount = Object.values(filters).filter(f => f.value).length;
  const keptColumnsCount = columns.filter(c => c.keep).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              Import Editor — {importResult.fileName}
              <span className="text-sm font-normal text-gray-500">
                ({displayRows.length} rows × {keptColumnsCount} cols)
              </span>
            </DialogTitle>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gray-50/80 flex-shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all cells..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Undo/Redo */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={undo} 
            disabled={historyIndex <= 0}
            className="gap-1.5 h-8"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={redo} 
            disabled={historyIndex >= history.length - 1}
            className="gap-1.5 h-8"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>

          {/* Premium: Change Column Order */}
          <Button variant="outline" size="sm" onClick={openReorderDialog} className="gap-1.5 h-8">
            <ChevronsUpDown className="w-3.5 h-3.5" />
            Change Order
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowColManager(!showColManager)} className="gap-1.5 h-8">
            <Columns className="w-3.5 h-3.5" />
            Columns
            {columns.filter(c => !c.visible).length > 0 && (
              <Badge variant="outline" size="sm">{columns.filter(c => !c.visible).length} hidden</Badge>
            )}
            {columns.filter(c => !c.keep).length > 0 && (
              <Badge variant="destructive" size="sm">{columns.filter(c => !c.keep).length} discarding</Badge>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </Button>

          {/* Premium: Export Edited Data */}
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-8">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>

          {/* Premium: Batch Update */}
          <Button variant="outline" size="sm" onClick={() => setShowBatchDialog(true)} className="gap-1.5 h-8">
            <Layers className="w-3.5 h-3.5" /> Batch Edit
          </Button>

          {/* Premium: Toggle Duplicates */}
          {duplicateMap.size > 0 && (
            <Button 
              variant={showDuplicateFilter ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setShowDuplicateFilter(!showDuplicateFilter)}
              className="gap-1.5 h-8 relative"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Duplicates
              <Badge variant="warning" size="sm" className="ml-0.5">{duplicateMap.size}</Badge>
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-500">
            {/* Premium: Data Quality Score */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border" style={{
              borderColor: qualityStats.avgScore >= 70 ? '#10b981' : qualityStats.avgScore >= 40 ? '#f59e0b' : '#ef4444',
              backgroundColor: qualityStats.avgScore >= 70 ? '#ecfdf5' : qualityStats.avgScore >= 40 ? '#fffbeb' : '#fef2f2',
            }}>
              <span className={cn('text-[10px] font-bold',
                qualityStats.avgScore >= 70 ? 'text-emerald-700' : qualityStats.avgScore >= 40 ? 'text-amber-700' : 'text-red-700'
              )}>
                Quality: {qualityStats.avgScore}%
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-emerald-600 font-medium">{qualityStats.good}</span>
              {qualityStats.needsReview > 0 && <span className="text-amber-600 font-medium">/{qualityStats.needsReview}</span>}
              {qualityStats.poor > 0 && <span className="text-red-600 font-medium">/{qualityStats.poor}</span>}
            </div>
            <span>Kept: <b className="text-teal-600">{keptColumnsCount}</b> / {columns.length}</span>
            {activeFilterCount > 0 && (
              <Badge variant="warning" size="sm">{activeFilterCount} filters</Badge>
            )}
            <span className="text-gray-400">
              History: {historyIndex + 1}/{history.length}
            </span>
          </div>
        </div>

        {/* Column Manager Panel */}
        {showColManager && (
          <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" /> Column Manager
                <span className="text-[10px] text-gray-500 font-normal">
                  (Toggle "Keep" to select columns for import)
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                <Input
                  value={addColName}
                  onChange={(e) => setAddColName(e.target.value)}
                  placeholder="New column name..."
                  className="h-7 text-xs w-40"
                  onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                />
                <Button variant="outline-teal" size="sm" onClick={addColumn} className="h-7 text-xs">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...columns].sort((a, b) => a.order - b.order).map(col => (
                <div
                  key={col.key}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs',
                    col.keep ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200 opacity-70'
                  )}
                >
                  <GripVertical className="w-3 h-3 text-gray-300 cursor-grab" />
                  <button
                    onClick={() => toggleColumnKeep(col.key)}
                    className="p-0.5 hover:bg-gray-100 rounded"
                    title={col.keep ? 'Mark for deletion' : 'Keep this column'}
                  >
                    {col.keep ? (
                      <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </button>
                  <Input
                    value={col.label}
                    onChange={(e) => renameColumn(col.key, e.target.value)}
                    className="h-5 text-[10px] w-24 border-none bg-transparent p-0 focus:ring-0"
                  />
                  <button onClick={() => toggleColumnVisibility(col.key)} className="p-0.5 hover:bg-gray-100 rounded">
                    {col.visible ? <Eye className="w-3 h-3 text-teal-600" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
                  </button>
                  <button onClick={() => deleteColumn(col.key)} className="p-0.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-2 border-b border-amber-100 bg-amber-50/30 flex flex-wrap items-center gap-2 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            {Object.entries(filters).filter(([_, f]) => f.value).map(([colKey, f]) => {
              const col = columns.find(c => c.key === colKey);
              return (
                <div key={colKey} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 rounded-lg">
                  <span className="text-[10px] font-medium text-gray-600">{col?.label || colKey}</span>
                  <select
                    value={f.mode}
                    onChange={(e) => setFilters(prev => ({ ...prev, [colKey]: { ...f, mode: e.target.value as FilterMode } }))}
                    className="text-[9px] border-none bg-transparent"
                  >
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                    <option value="startsWith">starts</option>
                    <option value="endsWith">ends</option>
                  </select>
                  <Input
                    value={f.value}
                    onChange={(e) => setFilters(prev => ({ ...prev, [colKey]: { ...f, value: e.target.value } }))}
                    className="h-5 text-[10px] w-20 border-none"
                    placeholder="filter..."
                  />
                  <button onClick={() => setFilters(prev => ({ ...prev, [colKey]: { mode: 'all', value: '' } }))} className="text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => setFilters({})}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Spreadsheet Grid */}
        <div className="flex-1 overflow-auto bg-white" ref={tableRef}>
          <table className="w-full border-collapse text-xs" style={{ minWidth: visibleColumns.length * 140 }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                <th className="w-10 px-1 py-2 border-r border-b border-gray-200 bg-gray-100 text-center text-[10px] text-gray-500 font-medium">
                  #
                </th>
                {visibleColumns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-2 py-2 border-r border-b border-gray-200 text-left font-semibold text-gray-700 select-none group relative",
                      !col.keep && "bg-red-50 text-red-400",
                      dragColKey === col.key && 'bg-teal-50 border-t-2 border-t-teal-400',
                      dragColKey && dragColKey !== col.key && 'opacity-60'
                    )}
                    style={{ width: col.width }}
                    draggable
                    onDragStart={(e) => handleDragStart(e as any, col.key)}
                    onDragOver={(e) => handleDragOver(e as any, col.key)}
                    onDrop={(e) => handleDrop(e as any, col.key)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab hover:text-teal-500 flex-shrink-0 transition-colors" 
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex-1 text-left truncate hover:text-teal-600 flex items-center gap-1"
                        onDoubleClick={() => {
                          const newName = prompt('Column name:', col.label);
                          if (newName) renameColumn(col.key, newName);
                        }}
                        title="Click to sort, double-click to rename"
                      >
                        {col.label}
                        {sortCol === col.key && sortDir === 'asc' && <ChevronUp className="w-3 h-3 flex-shrink-0" />}
                        {sortCol === col.key && sortDir === 'desc' && <ChevronDown className="w-3 h-3 flex-shrink-0" />}
                        {sortCol !== col.key && <ArrowUpDown className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                      </button>
                      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            const val = prompt('Filter value:', '');
                            if (val !== null) setFilters(prev => ({ ...prev, [col.key]: { mode: 'contains', value: val } }));
                          }}
                          className="p-0.5 hover:bg-teal-100 rounded"
                          title="Filter"
                        >
                          <Filter className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={() => toggleColumnVisibility(col.key)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                          title="Hide"
                        >
                          <EyeOff className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="w-10 px-1 py-2 border-r border-b border-gray-200 bg-gray-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="px-4 py-12 text-center text-gray-400">
                    No data to display
                  </td>
                </tr>
              ) : (
                displayRows.map((row, rowIndex) => {
                  const originalIndex = rows.indexOf(row);
                  const isEditing = editingCell?.row === originalIndex;
                  return (
                    <tr
                      key={originalIndex}
                      className={cn(
                        'hover:bg-teal-50/20 transition-colors group',
                        isEditing && 'bg-teal-50/40'
                      )}
                    >
                      <td className="w-10 px-1 py-1.5 border-r border-b border-gray-100 text-center text-[10px] text-gray-400 relative">
                        <span>{originalIndex + 1}</span>
                        <button
                          onClick={() => deleteRow(originalIndex)}
                          className="absolute inset-0 flex items-center justify-center bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </td>
                      {visibleColumns.map(col => {
                        const isCellEditing = editingCell?.row === originalIndex && editingCell?.col === col.key;
                        return (
                          <td
                            key={col.key}
                            className="px-1 py-1 border-r border-b border-gray-100 min-w-[100px]"
                            onDoubleClick={() => startEdit(originalIndex, col.key, getCellValue(row, col.key))}
                          >
                            {isCellEditing ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleKeyDown}
                                className="h-7 text-xs border-teal-300 focus:ring-teal-500"
                                autoFocus
                              />
                            ) : (
                              <div className="px-2 py-1 rounded cursor-text hover:bg-white hover:shadow-sm transition-all truncate text-gray-800 min-h-[28px] flex items-center">
                                {col.key === 'quantity' && Number(getCellValue(row, col.key)) === 0 ? (
                                  <span className="text-amber-500">0</span>
                                ) : col.key === '_confidence' ? (
                                  <span className={cn(
                                    'text-[10px] font-medium',
                                    Number(getCellValue(row, col.key)) >= 85 ? 'text-green-600' :
                                    Number(getCellValue(row, col.key)) >= 65 ? 'text-amber-600' : 'text-red-500'
                                  )}>
                                    {getCellValue(row, col.key)}%
                                  </span>
                                ) : (
                                  getCellValue(row, col.key) || <span className="text-gray-300 italic">empty</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="w-10 px-1 py-1.5 border-r border-b border-gray-100"></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between text-[10px] text-gray-500 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>Rows: <b className="text-gray-700">{displayRows.length}</b> / {rows.length}</span>
            <span>Columns: <b className="text-gray-700">{keptColumnsCount}</b> / {columns.length}</span>
            {activeFilterCount > 0 && <span>Filters: <b className="text-amber-600">{activeFilterCount}</b></span>}
            {searchQuery && <span>Search: "<b className="text-teal-600">{searchQuery}</b>"</span>}
            <span className="text-gray-400">
              Ctrl+Z Undo • Ctrl+Y Redo • Double-click to edit
            </span>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-gray-500">
              <b className="text-teal-600">{keptColumnsCount}</b> columns selected for import. 
              {columns.filter(c => !c.keep).length > 0 && (
                <span className="text-red-500 ml-1">
                  ({columns.filter(c => !c.keep).length} columns will be discarded)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleBatchImport}
                disabled={rows.length === 0 || isImporting}
                size="lg"
                className="gap-2 min-w-[180px]"
              >
                {isImporting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Import {keptColumnsCount} Items</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* ── Column Reorder Dialog ── */}
      <Dialog open={showReorderDialog} onOpenChange={(open) => !open && setShowReorderDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChevronsUpDown className="w-5 h-5 text-teal-600" />
              Change Column Order
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-1">
              Drag column headers or use buttons to reorder. Click "Apply" to save changes.
            </p>
          </DialogHeader>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto py-2">
            {reorderCols.map((col, idx) => (
              <div
                key={col.key}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200"
              >
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}</span>
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                  {col.label}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveColumnUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveColumnDown(idx)}
                    disabled={idx >= reorderCols.length - 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Badge variant={col.keep ? 'outline-teal' : 'destructive'} size="sm">
                  {col.keep ? 'Keep' : 'Skip'}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReorderDialog(false)}>Cancel</Button>
            <Button onClick={applyReorder} className="gap-1.5">
              <CheckCircle className="w-4 h-4" /> Apply Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
