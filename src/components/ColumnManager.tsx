/**
 * Column Manager - User can customize stock columns
 * 
 * Features:
 * - Rename default columns
 * - Reorder by drag-drop
 * - Hide/Show columns
 * - Add custom columns
 * - Reset to defaults
 * - Save layout
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { PROTECTED_SCHEMA_FIELDS, CustomFieldDefinition } from '../lib/importer/types';
import { schemaManager } from '../lib/importer/schemaManager';
import {
  GripVertical, Eye, EyeOff, Edit3, Trash2, RotateCcw, Save,
  Plus, X, Check, AlertTriangle
} from 'lucide-react';

interface ColumnManagerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  columns?: any[];
  onColumnsChange?: (columns: any[]) => void;
}

export default function ColumnManager({ open, onOpenChange, onClose, columns: externalColumns, onColumnsChange }: ColumnManagerProps) {
  const toast = useToast();
  const [columns, setColumns] = useState(() => {
    // If external columns provided, use them
    if (externalColumns && externalColumns.length > 0) {
      return externalColumns;
    }
    // Initialize from schema manager
    const customFields = schemaManager.getCustomFields();
    return [
      ...PROTECTED_SCHEMA_FIELDS.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type as any,
        isDefault: true,
        isVisible: true,
        isProtected: true,
        order: PROTECTED_SCHEMA_FIELDS.indexOf(f),
      })),
      ...customFields.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        isDefault: false,
        isVisible: true,
        isProtected: false,
        order: PROTECTED_SCHEMA_FIELDS.length + customFields.indexOf(f),
      })),
    ].sort((a, b) => a.order - b.order);
  });

  // Sync external columns when they change
  useEffect(() => {
    if (externalColumns && externalColumns.length > 0 && externalColumns !== columns) {
      setColumns(externalColumns);
    }
  }, [externalColumns]);

  // Sync to external state when columns change
  const syncToExternal = (newCols: any[]) => {
    setColumns(newCols);
    if (onColumnsChange) {
      onColumnsChange(newCols);
    }
  };

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<CustomFieldDefinition['type']>('text');

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newColumns = [...columns];
    const [moved] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dragOverIndex, 0, moved);

    // Update order
    newColumns.forEach((col, idx) => {
      col.order = idx;
    });

    setColumns(newColumns);
    setDragIndex(null);
    setDragOverIndex(null);
    toast.success('Column Reordered', 'Column order updated successfully');
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const toggleVisibility = (key: string) => {
    setColumns(columns.map(col =>
      col.key === key ? { ...col, isVisible: !col.isVisible } : col
    ));
  };

  const startEdit = (key: string, currentLabel: string) => {
    setEditingKey(key);
    setEditLabel(currentLabel);
  };

  const saveEdit = () => {
    if (!editLabel.trim() || !editingKey) return;

    setColumns(columns.map(col =>
      col.key === editingKey ? { ...col, label: editLabel.trim() } : col
    ));

    // If it's a custom field, also update in schema manager
    const col = columns.find(c => c.key === editingKey);
    if (col && !col.isDefault) {
      schemaManager.renameCustomField(editingKey, editLabel.trim());
    }

    setEditingKey(null);
    setEditLabel('');
    toast.success('Column Renamed', 'Display name updated successfully');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditLabel('');
  };

  const deleteCustomColumn = (key: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.isDefault) {
      toast.error('Cannot Delete', 'Default columns cannot be deleted');
      return;
    }

    if (confirm('Are you sure you want to delete this column? All data in this column will be lost.')) {
      schemaManager.deleteCustomField(key);
      setColumns(columns.filter(c => c.key !== key));
      toast.success('Column Deleted', 'Custom column removed successfully');
    }
  };

  const addCustomColumn = () => {
    if (!newColumnName.trim()) {
      toast.error('Invalid Name', 'Please enter a column name');
      return;
    }

    const key = schemaManager.generateKey(newColumnName.trim());
    
    // Check if already exists
    if (columns.some(c => c.key === key)) {
      toast.error('Already Exists', 'A column with this name already exists');
      return;
    }

    const newField = schemaManager.addCustomField(newColumnName.trim(), newColumnType, 'user');
    if (newField) {
      setColumns([...columns, {
        key: newField.key,
        label: newField.label,
        type: newField.type,
        isDefault: false,
        isVisible: true,
        isProtected: false,
        order: columns.length,
      }].sort((a, b) => a.order - b.order));

      setNewColumnName('');
      setNewColumnType('text');
      setShowAddForm(false);
      toast.success('Column Added', `"${newColumnName}" added successfully`);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Reset all columns to default? Your custom columns and layout changes will be lost.')) {
      schemaManager.reset();
      const customFields = schemaManager.getCustomFields();
      const resetColumns = PROTECTED_SCHEMA_FIELDS.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type as any,
        isDefault: true,
        isVisible: true,
        isProtected: true,
        order: PROTECTED_SCHEMA_FIELDS.indexOf(f),
      }));
      setColumns(resetColumns);
      toast.success('Reset Complete', 'All columns restored to default');
    }
  };

  const saveLayout = () => {
    try {
      const layout = columns.map(col => ({
        key: col.key,
        label: col.label,
        isVisible: col.isVisible,
        order: col.order,
      }));
      localStorage.setItem('anpharm_column_layout', JSON.stringify(layout));
      toast.success('Layout Saved', 'Your column layout has been saved');
    } catch {
      toast.error('Save Failed', 'Could not save layout');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Column Manager</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize your stock columns. Default columns cannot be deleted, but can be renamed/hidden.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
          <Button size="sm" variant="primary" onClick={saveLayout}>
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Layout
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span>Default columns (cannot delete)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-info" />
          <span>Custom columns (can delete)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-success" />
          <span>Visible in stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          <span>Hidden</span>
        </div>
      </div>

      {/* Column List */}
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
        {columns.map((col, index) => (
          <div
            key={col.key}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
              'bg-background hover:border-slate-300 hover:shadow-sm',
              dragIndex === index && 'opacity-50',
              dragOverIndex === index && 'border-t-2 border-t-emerald-500'
            )}
          >
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-slate-300" />
            </div>

            {/* Visibility Toggle */}
            <button
              onClick={() => toggleVisibility(col.key)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                col.isVisible ? 'text-success bg-success-light' : 'text-slate-400 bg-slate-100'
              )}
              title={col.isVisible ? 'Hide column' : 'Show column'}
            >
              {col.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Column Info */}
            <div className="flex-1 min-w-0">
              {editingKey === col.key ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    className="h-8 text-xs"
                  />
                  <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                    <Check className="w-3.5 h-3.5 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{col.label}</span>
                  {col.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-warning font-medium">
                      Default
                    </span>
                  )}
                  {!col.isVisible && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Hidden
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">{col.key}</span>
                <span className="text-[10px] text-slate-400">•</span>
                <span className="text-[10px] text-slate-400">{col.type}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => startEdit(col.key, col.label)}
                className="h-8 w-8"
                title="Rename"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              </Button>
              {!col.isDefault && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteCustomColumn(col.key)}
                  className="h-8 w-8"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Column */}
      {showAddForm ? (
        <Card variant="bordered" className="p-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Add Custom Column</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Column Name *</label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., Cold Storage, Doctor Scheme"
                onKeyDown={(e) => e.key === 'Enter' && addCustomColumn()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Type</label>
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="currency">Currency</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={addCustomColumn}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Column
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Custom Column
        </Button>
      )}

      {/* Info */}
      <div className="text-xs text-slate-500 bg-[#EDF5F6] p-3 rounded-lg border border-[#14292E]/10">
        <strong>Tip:</strong> Drag columns to reorder. Click eye icon to show/hide. 
        Click edit icon to rename. Default columns (like Medicine Name, Batch, Quantity) cannot be deleted, 
        but you can rename them or hide them. Add custom columns for extra data like Cold Storage, Doctor Scheme, etc.
      </div>
    </div>
  );
}

// Import Input at top
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';