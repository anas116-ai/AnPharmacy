
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectItem } from './ui/select';
import { Badge } from './ui/badge';
import { X, Plus, Filter } from 'lucide-react';
import { FilterDef, ColumnDef } from '../lib/columnTypes';
import { cn } from '../lib/utils';

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  filters: FilterDef[];
  onFiltersChange: (filters: FilterDef[]) => void;
}

const CONDITIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lte', label: 'Less or equal' },
];

export default function FilterPanel({ open, onOpenChange, columns, filters, onFiltersChange }: FilterPanelProps) {
  const visibleColumns = columns.filter(c => c.visible);

  const handleAddFilter = () => {
    const defaultColumn = visibleColumns[0];
    if (!defaultColumn) return;
    
    onFiltersChange([...filters, {
      columnKey: defaultColumn.key,
      condition: 'contains',
      value: '',
    }]);
  };

  const handleUpdateFilter = (index: number, updates: Partial<FilterDef>) => {
    onFiltersChange(filters.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const handleRemoveFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    onFiltersChange([]);
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  const activeFiltersCount = filters.filter(f => f.value.trim() !== '').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-success" />
            Filter Conditions
            {activeFiltersCount > 0 && (
              <Badge variant="success" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
          {filters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/60 dark:text-muted-foreground">
              <Filter className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No filters applied</p>
              <p className="text-xs mt-1">Click "Add Filter" to create filter conditions</p>
            </div>
          ) : (
            filters.map((filter, index) => {
              const column = visibleColumns.find(c => c.key === filter.columnKey);
              return (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-3 rounded-xl bg-navy-50/50 dark:bg-navy-900/30 border border-navy-100 dark:border-navy-800/30 animate-fade-in-up"
                >
                  {/* Column selector */}
                  <Select
                    value={filter.columnKey}
                    onValueChange={(val) => handleUpdateFilter(index, { columnKey: val })}
                    className="w-36 shrink-0"
                  >
                    {visibleColumns.map(col => (
                      <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                    ))}
                  </Select>

                  {/* Condition selector */}
                  <Select
                    value={filter.condition}
                    onValueChange={(val) => handleUpdateFilter(index, { condition: val as FilterDef['condition'] })}
                    className="w-32 shrink-0"
                  >
                    {CONDITIONS.map(cond => (
                      <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                    ))}
                  </Select>

                  {/* Value input */}
                  <Input
                    value={filter.value}
                    onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                    placeholder={`Filter ${column?.label || 'value'}...`}
                    className="flex-1"
                  />

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveFilter(index)}
                    className="p-2 rounded-xl text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    title="Remove filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={handleClearAll}
              disabled={filters.length === 0}
              className="text-muted-foreground disabled:opacity-30"
            >
              Clear All
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleAddFilter} variant="outline-teal">
              <Plus className="w-4 h-4 mr-1" />
              Add Filter
            </Button>
            <Button onClick={handleApply} variant="primary">
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
