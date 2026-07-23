/**
 * VirtualDataGrid — Enterprise-grade virtualized data grid
 * 
 * Features:
 * - Virtual scrolling (only renders visible rows)
 * - Column drag-and-drop reordering
 * - Column resize with drag handles
 * - Column freeze/unfreeze
 * - Inline cell editing (double-click to edit)
 * - Right-click context menu (Edit, Delete, Copy, Paste, Freeze, Hide, Sort)
 * - Row selection with checkbox
 * - Sort by column
 * - Row delete/restore
 * - Keyboard navigation
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { 
  GripVertical, ChevronUp, ChevronDown, Trash2, RotateCcw, Lock, Unlock,
  Clipboard, ClipboardPaste, EyeOff, ArrowUpDown, Edit3, 
} from 'lucide-react';

// ── Types ──

export interface DataGridColumn {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  visible: boolean;
  frozen: boolean;
  resizable: boolean;
  draggable: boolean;
  editable: boolean;
  dataType: 'text' | 'number' | 'date' | 'currency';
  colorTag?: string;
}

export interface ContextMenuAction {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

export interface DataGridProps {
  columns: DataGridColumn[];
  rows: Record<string, any>[];
  totalRows: number;
  onColumnsChange: (columns: DataGridColumn[]) => void;
  onCellEdit?: (rowIndex: number, columnKey: string, value: string) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onRestoreRow?: (rowIndex: number) => void;
  onInsertRow?: (beforeIndex: number) => void;
  deletedRowIndices?: Set<number>;
  editedCells?: Record<number, Record<string, any>>;
  selectedRows?: Set<number>;
  onSelectRow?: (rowIndex: number) => void;
  onSelectAll?: () => void;
  maxHeight?: number;
  rowHeight?: number;
  visibleRowsBuffer?: number;
  extraContextMenuActions?: (rowIdx: number, colKey: string) => ContextMenuAction[];
}

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_BUFFER = 10;

export default function VirtualDataGrid({
  columns: initialColumns,
  rows,
  totalRows,
  onColumnsChange,
  onCellEdit,
  onDeleteRow,
  onRestoreRow,
  onInsertRow,
  deletedRowIndices = new Set(),
  editedCells = {},
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  maxHeight = 500,
  rowHeight = DEFAULT_ROW_HEIGHT,
  visibleRowsBuffer = DEFAULT_BUFFER,
  extraContextMenuActions,
}: DataGridProps) {
  const [columns, setColumns] = useState<DataGridColumn[]>(initialColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const draggingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const [dragReorderCol, setDragReorderCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // ── Context Menu State ──
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number;
    rowIdx: number; colKey: string;
    actions: ContextMenuAction[];
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [contextMenu]);

  // Sync columns prop
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);
  const frozenColumns = useMemo(() => visibleColumns.filter(c => c.frozen), [visibleColumns]);
  const scrollableColumns = useMemo(() => visibleColumns.filter(c => !c.frozen), [visibleColumns]);

  // Virtual Scroll Calculations
  const totalHeight = totalRows * rowHeight;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - visibleRowsBuffer);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + maxHeight) / rowHeight) + visibleRowsBuffer);
  const visibleRows = rows.slice(startRow, endRow);
  const offsetY = startRow * rowHeight;

  const frozenWidth = frozenColumns.reduce((s, c) => s + c.width, 0);
  const scrollableWidth = scrollableColumns.reduce((s, c) => s + c.width, 0);

  // ── Handlers ──

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleHorizontalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // Column resize
  const handleResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find(c => c.key === colKey);
    if (!col) return;
    draggingRef.current = { key: colKey, startX: e.clientX, startWidth: col.width };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const diff = ev.clientX - draggingRef.current.startX;
      const newWidth = Math.max(60, draggingRef.current.startWidth + diff);
      setColumns(prev => prev.map(c => c.key === draggingRef.current!.key ? { ...c, width: newWidth } : c));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (draggingRef.current) onColumnsChange(columns);
      draggingRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns, onColumnsChange]);

  // Column drag reorder
  const handleDragStart = useCallback((e: React.DragEvent, colKey: string) => {
    setDragReorderCol(colKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colKey);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/plain');
    if (!sourceKey || sourceKey === targetKey) return;
    setColumns(prev => {
      const cols = [...prev];
      const sourceIdx = cols.findIndex(c => c.key === sourceKey);
      const targetIdx = cols.findIndex(c => c.key === targetKey);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const [moved] = cols.splice(sourceIdx, 1);
      cols.splice(targetIdx, 0, moved);
      onColumnsChange(cols);
      return cols;
    });
    setDragReorderCol(null);
    setDragOverCol(null);
  }, [onColumnsChange]);

  // Sort
  const handleSort = useCallback((colKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === colKey) {
        return prev.dir === 'asc' ? { key: colKey, dir: 'desc' } : null;
      }
      return { key: colKey, dir: 'asc' };
    });
  }, []);

  // Cell editing
  const handleCellDoubleClick = useCallback((rowIdx: number, colKey: string, value: string) => {
    const col = columns.find(c => c.key === colKey);
    if (!col?.editable) return;
    setEditingCell({ rowIdx: rowIdx + startRow, colKey });
    setEditValue(value);
  }, [columns, startRow]);

  const handleCellEditSave = useCallback(() => {
    if (!editingCell || !onCellEdit) return;
    onCellEdit(editingCell.rowIdx, editingCell.colKey, editValue);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onCellEdit]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellEditSave();
    else if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
  }, [handleCellEditSave]);

  // ── Right-Click Context Menu ──
  const handleContextMenu = useCallback((e: React.MouseEvent, rowIdx: number, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const actualRowIdx = rowIdx + startRow;
    const isDeleted = deletedRowIndices.has(actualRowIdx);
    const gridRect = containerRef.current?.getBoundingClientRect();
    const x = e.clientX - (gridRect?.left || 0);
    const y = e.clientY - (gridRect?.top || 0);

    const actions: ContextMenuAction[] = [];

    // Edit Cell
    actions.push({
      label: 'Edit Cell',
      icon: <Edit3 className="w-3.5 h-3.5" />,
      shortcut: 'Double-click',
      action: () => {
        const col = columns.find(c => c.key === colKey);
        if (col?.editable && !isDeleted) {
          const value = rows[rowIdx]?.[colKey] ?? '';
          handleCellDoubleClick(rowIdx, colKey, String(value));
        }
      },
      disabled: !columns.find(c => c.key === colKey)?.editable || isDeleted,
    });

    // Copy Cell
    actions.push({
      label: 'Copy Cell',
      icon: <Clipboard className="w-3.5 h-3.5" />,
      shortcut: 'Ctrl+C',
      action: () => {
        const val = rows[rowIdx]?.[colKey] ?? '';
        navigator.clipboard.writeText(String(val));
      },
    });

    // Separator
    actions.push({ label: '', icon: undefined, action: () => {}, divider: true });

    // Sort
    actions.push({
      label: sortConfig?.key === colKey && sortConfig.dir === 'asc' ? 'Sort Descending' : 'Sort Ascending',
      icon: <ArrowUpDown className="w-3.5 h-3.5" />,
      action: () => handleSort(colKey),
    });

    // Freeze Column
    const col = columns.find(c => c.key === colKey);
    actions.push({
      label: col?.frozen ? 'Unfreeze Column' : 'Freeze Column',
      icon: col?.frozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />,
      action: () => {
        setColumns(prev => prev.map(c => c.key === colKey ? { ...c, frozen: !c.frozen } : c));
        onColumnsChange(columns.map(c => c.key === colKey ? { ...c, frozen: !c.frozen } : c));
      },
    });

    // Hide Column
    actions.push({
      label: 'Hide Column',
      icon: <EyeOff className="w-3.5 h-3.5" />,
      action: () => {
        setColumns(prev => prev.map(c => c.key === colKey ? { ...c, visible: false } : c));
        onColumnsChange(columns.map(c => c.key === colKey ? { ...c, visible: false } : c));
      },
    });

    // Separator
    actions.push({ label: '', icon: undefined, action: () => {}, divider: true });

    // Delete / Restore Row
    if (isDeleted) {
      actions.push({
        label: 'Restore Row',
        icon: <RotateCcw className="w-3.5 h-3.5" />,
        action: () => onRestoreRow?.(actualRowIdx),
      });
    } else {
      actions.push({
        label: 'Delete Row',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        action: () => onDeleteRow?.(actualRowIdx),
      });
    }

    // Insert Row Above
    if (onInsertRow) {
      actions.push({
        label: 'Insert Row Above',
        icon: <ClipboardPaste className="w-3.5 h-3.5" />,
        action: () => onInsertRow(actualRowIdx),
      });
    }

    // Extra custom actions from parent
    if (extraContextMenuActions) {
      const extra = extraContextMenuActions(actualRowIdx, colKey);
      if (extra.length > 0) {
        actions.push({ label: '', icon: undefined, action: () => {}, divider: true });
        actions.push(...extra);
      }
    }

    setContextMenu({ x, y, rowIdx: actualRowIdx, colKey, actions });
  }, [columns, startRow, rows, deletedRowIndices, sortConfig, onColumnsChange, onDeleteRow, onRestoreRow, onInsertRow, extraContextMenuActions, handleSort, handleCellDoubleClick]);

  // ── Sorted data ──
  const sortedRows = useMemo(() => {
    if (!sortConfig) return visibleRows;
    return [...visibleRows].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  }, [visibleRows, sortConfig]);

  // ── Render helpers ──
  const formatCellValue = (row: Record<string, any>, col: DataGridColumn): string => {
    const val = row[col.key];
    if (val === null || val === undefined) return '';
    if (col.dataType === 'currency' && typeof val === 'number') return `₹${val.toFixed(2)}`;
    return String(val);
  };

  const getCellValue = (row: Record<string, any>, colKey: string): string => {
    const val = row[colKey];
    if (val === null || val === undefined) return '';
    return String(val);
  };

  const renderHeaderCell = (col: DataGridColumn, isFrozen: boolean) => (
    <div
      key={col.key}
      className={cn(
        'relative group flex items-center gap-1 px-2 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/80 bg-slate-50/90 backdrop-blur-sm select-none',
        isFrozen && 'z-10 shadow-sm'
      )}
      style={{ width: col.width, minWidth: col.minWidth, cursor: col.draggable ? 'grab' : 'default' }}
      draggable={col.draggable}
      onDragStart={(e) => col.draggable && handleDragStart(e, col.key)}
      onDragOver={(e) => col.draggable && handleDragOver(e, col.key)}
      onDrop={(e) => col.draggable && handleDrop(e, col.key)}
      onDragEnd={() => { setDragReorderCol(null); setDragOverCol(null); }}
    >
      {col.draggable && (
        <GripVertical className={cn(
          'w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
          dragReorderCol === col.key && 'text-emerald-500 opacity-100'
        )} />
      )}
      <button onClick={() => handleSort(col.key)} className="flex-1 text-left truncate hover:text-emerald-600 transition-colors">
        {col.label}
        {sortConfig?.key === col.key && (
          sortConfig.dir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5 text-emerald-500" /> :
          <ChevronDown className="w-3 h-3 inline ml-0.5 text-emerald-500" />
        )}
      </button>
      <button
        onClick={() => {
          setColumns(prev => prev.map(c => c.key === col.key ? { ...c, frozen: !c.frozen } : c));
          onColumnsChange(columns.map(c => c.key === col.key ? { ...c, frozen: !c.frozen } : c));
        }}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-all shrink-0"
        title={col.frozen ? 'Unfreeze column' : 'Freeze column'}
      >
        {col.frozen ? <Lock className="w-2.5 h-2.5 text-emerald-500" /> : <Unlock className="w-2.5 h-2.5 text-slate-400" />}
      </button>
      {col.resizable && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-400/50 active:bg-emerald-500 transition-colors z-20"
          onMouseDown={(e) => handleResizeStart(e, col.key)}
        />
      )}
      {dragOverCol === col.key && dragReorderCol !== col.key && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 z-20" />
      )}
    </div>
  );

  const renderCell = (row: Record<string, any>, col: DataGridColumn, rowIdx: number, isFrozen: boolean) => {
    const actualRowIdx = rowIdx + startRow;
    const isDeleted = deletedRowIndices.has(actualRowIdx);
    const isEditing = editingCell?.rowIdx === actualRowIdx && editingCell?.colKey === col.key;
    const isEdited = editedCells[actualRowIdx]?.[col.key] !== undefined;
    const cellValue = isEdited ? editedCells[actualRowIdx][col.key] : getCellValue(row, col.key);

    return (
      <div
        key={col.key}
        className={cn(
          'flex items-center px-2 py-1.5 text-[13px] border-r border-b border-slate-100 transition-colors',
          isFrozen && 'z-10 shadow-sm bg-white',
          !isFrozen && 'bg-white',
          isDeleted && 'bg-red-50/50 line-through text-red-400',
          isEdited && 'bg-emerald-50/50',
          col.editable && !isDeleted && 'hover:bg-slate-50 cursor-pointer',
          isEditing && 'bg-emerald-50 p-0',
        )}
        style={{ width: col.width, minWidth: col.minWidth }}
        onDoubleClick={() => { if (!isDeleted && col.editable) handleCellDoubleClick(actualRowIdx, col.key, cellValue); }}
        onContextMenu={(e) => handleContextMenu(e, rowIdx, col.key)}
      >
        {isEditing ? (
          <input
            type={col.dataType === 'number' || col.dataType === 'currency' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellEditSave}
            onKeyDown={handleCellKeyDown}
            autoFocus
            className="w-full h-full px-1.5 py-1 text-xs border border-emerald-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-body"
          />
        ) : (
          <span className={cn(
            'truncate',
            col.dataType === 'number' && 'font-mono text-right',
            col.dataType === 'currency' && 'font-mono',
            isDeleted && 'text-red-400',
          )}>
            {formatCellValue(row, col) || <span className="text-slate-300">—</span>}
          </span>
        )}
        {isEdited && !isEditing && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative">
      {/* Grid container */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-white"
        style={{ maxHeight }}
        onScroll={(e) => { handleScroll(e); handleHorizontalScroll(e); }}
      >
        {/* Frozen columns */}
        {frozenColumns.length > 0 && (
          <div className="sticky left-0 z-20" style={{ width: frozenWidth }}>
            <div className="flex" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
              <div className="w-10 h-10 bg-slate-50 border-r border-b border-slate-200 flex items-center justify-center shrink-0">
                <input type="checkbox" checked={selectedRows.size === totalRows && totalRows > 0} onChange={onSelectAll} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              </div>
              {frozenColumns.map(col => renderHeaderCell(col, true))}
            </div>
            <div style={{ paddingTop: offsetY }}>
              {sortedRows.map((row, idx) => {
                const actualRowIdx = idx + startRow;
                return (
                  <div key={actualRowIdx} className={cn('flex', selectedRows.has(actualRowIdx) && 'bg-emerald-50/50')}>
                    <div className="w-10 h-9 border-r border-b border-slate-50 flex items-center justify-center bg-white shrink-0">
                      <input type="checkbox" checked={selectedRows.has(actualRowIdx)} onChange={() => onSelectRow?.(actualRowIdx)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    </div>
                    {frozenColumns.map(col => renderCell(row, col, idx, true))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable columns */}
        <div style={{ marginLeft: frozenWidth, minWidth: scrollableWidth }}>
          <div className="flex" style={{ position: 'sticky', top: 0, zIndex: 25 }}>
            {frozenColumns.length === 0 && (
              <div className="w-10 h-10 bg-slate-50 border-r border-b border-slate-200 flex items-center justify-center shrink-0">
                <input type="checkbox" checked={selectedRows.size === totalRows && totalRows > 0} onChange={onSelectAll} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              </div>
            )}
            {scrollableColumns.map(col => renderHeaderCell(col, false))}
            <div className="w-12 h-10 bg-slate-50 border-b border-slate-200 shrink-0" />
          </div>
          <div style={{ paddingTop: offsetY }}>
            {sortedRows.map((row, idx) => {
              const actualRowIdx = idx + startRow;
              return (
                <div key={actualRowIdx} className={cn('flex', selectedRows.has(actualRowIdx) && 'bg-emerald-50/50')}>
                  {frozenColumns.length === 0 && (
                    <div className="w-10 h-9 border-r border-b border-slate-50 flex items-center justify-center bg-white shrink-0">
                      <input type="checkbox" checked={selectedRows.has(actualRowIdx)} onChange={() => onSelectRow?.(actualRowIdx)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    </div>
                  )}
                  {scrollableColumns.map(col => renderCell(row, col, idx, false))}
                  <div className="w-12 h-9 border-b border-slate-50 flex items-center justify-center bg-white shrink-0">
                    {onDeleteRow && onRestoreRow && (
                      <button
                        onClick={() => deletedRowIndices.has(actualRowIdx) ? onRestoreRow(actualRowIdx) : onDeleteRow(actualRowIdx)}
                        className={cn('p-1 rounded transition-colors', deletedRowIndices.has(actualRowIdx) ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100')}
                        title={deletedRowIndices.has(actualRowIdx) ? 'Restore row' : 'Delete row'}
                      >
                        {deletedRowIndices.has(actualRowIdx) ? <RotateCcw className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {visibleRows.length === 0 && (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm" style={{ width: scrollableWidth + frozenWidth + 50 }}>
            <div className="text-center">
              <p className="font-medium">No data to display</p>
              <p className="text-xs mt-1">Import a file to see data here</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right-Click Context Menu ── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white rounded-xl border border-slate-200 shadow-xl py-1 min-w-[180px] animate-fade-in"
          style={{ left: contextMenu.x + (containerRef.current?.getBoundingClientRect().left || 0), top: contextMenu.y + (containerRef.current?.getBoundingClientRect().top || 0) }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.actions.map((action, i) => {
            if (action.divider) {
              return <div key={i} className="h-px bg-slate-100 my-1" />;
            }
            return (
              <button
                key={i}
                onClick={() => { action.action(); setContextMenu(null); }}
                disabled={action.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors',
                  action.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50',
                  action.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {action.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{action.icon}</span>}
                <span className="flex-1 text-left">{action.label}</span>
                {action.shortcut && <span className="text-[9px] text-slate-400">{action.shortcut}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>{totalRows} rows</span>
          <span>{visibleColumns.length} columns</span>
          {frozenColumns.length > 0 && <span>{frozenColumns.length} frozen</span>}
          {deletedRowIndices.size > 0 && <span className="text-red-500">{deletedRowIndices.size} deleted</span>}
          {Object.keys(editedCells).length > 0 && <span className="text-emerald-500">{Object.keys(editedCells).length} edited</span>}
        </div>
        <div className="flex items-center gap-3">
          <span>Right-click for menu</span>
          <span>•</span>
          <span>Double-click to edit</span>
          <span>•</span>
          <span>Drag columns to reorder</span>
        </div>
      </div>
    </div>
  );
}
