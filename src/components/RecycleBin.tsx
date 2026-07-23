/**
 * Recycle Bin — Deleted Stock Items
 * - View all deleted items
 * - Restore individual or bulk items back to main stock
 * - Permanently delete items (cannot be undone)
 * - Empty entire bin
 */
import { useEffect, useState, useMemo } from 'react';
import { useRecycleBinStore, DeletedMedicine } from '../stores/recycleBinStore';
import { useStockStore } from '../stores/stockStore';
import {
  Trash2, RotateCcw, AlertTriangle, Search, X, RefreshCw,
  Archive, Clock, Package, ChevronDown, ChevronUp, 
  Trash, ShieldAlert, CheckCircle, Info
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { cn, formatDate } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { Medicine } from '../lib/types';

export default function RecycleBin() {
  const { deletedItems, isLoading, error, loadDeletedItems, restoreFromBin, restoreManyFromBin, permanentDelete, permanentDeleteMany, emptyBin } = useRecycleBinStore();
  const { setMedicines } = useStockStore();
  const toast = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeletedMedicine | null>(null);
  const [expandItem, setExpandItem] = useState<number | null>(null);

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return deletedItems;
    const q = searchQuery.toLowerCase();
    return deletedItems.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.batch_number || '').toLowerCase().includes(q) ||
      (item.company || '').toLowerCase().includes(q)
    );
  }, [deletedItems, searchQuery]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleRestore = async (id: number) => {
    const ok = await restoreFromBin(id);
    if (ok) {
      toast.success('Restored', 'Item restored to stock successfully.');
      // Refresh stock in the store
      if (window.electronAPI) {
        const result = await window.electronAPI.listStock();
        if (result.success) setMedicines(result.medicines || []);
      }
    } else {
      toast.error('Restore Failed', 'Could not restore item.');
    }
  };

  const handleRestoreMany = async () => {
    const count = await restoreManyFromBin(Array.from(selectedIds));
    if (count > 0) {
      toast.success('Restored', `${count} item(s) restored to stock.`);
      setSelectedIds(new Set());
      // Refresh stock
      if (window.electronAPI) {
        const result = await window.electronAPI.listStock();
        if (result.success) setMedicines(result.medicines || []);
      }
    }
    setShowConfirmRestore(false);
  };

  const handleDelete = async (id: number) => {
    const ok = await permanentDelete(id);
    if (ok) {
      toast.success('Deleted', 'Item permanently deleted.');
    } else {
      toast.error('Delete Failed', 'Could not permanently delete item.');
    }
  };

  const handleDeleteMany = async () => {
    const count = await permanentDeleteMany(Array.from(selectedIds));
    if (count > 0) {
      toast.success('Deleted', `${count} item(s) permanently deleted.`);
      setSelectedIds(new Set());
    }
    setShowConfirmPermanent(false);
  };

  const handleEmptyBin = async () => {
    await emptyBin();
    toast.success('Bin Emptied', 'All deleted items have been permanently removed.');
    setShowConfirmEmpty(false);
  };

  if (isLoading && deletedItems.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading-display text-2xl font-bold text-slate-900">Recycle Bin</h2>
            <p className="text-sm text-slate-500 mt-1">Manage deleted stock items</p>
          </div>
        </div>
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Loading deleted items...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Trash2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="heading-display text-2xl font-bold text-slate-900">Recycle Bin</h2>
            <p className="text-sm text-slate-500 mt-1">
              {deletedItems.length === 0 
                ? 'No deleted items' 
                : `${deletedItems.length} item(s) in bin — restore or permanently delete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDeletedItems} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {deletedItems.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowConfirmEmpty(true)} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Empty Bin
            </Button>
          )}
        </div>
      </div>

      {/* Stats + Search */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-enterprise p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Deleted Items</p>
          <p className="text-2xl font-bold text-slate-900">{deletedItems.length}</p>
        </div>
        <div className="card-enterprise p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Restorable</p>
          <p className="text-2xl font-bold text-emerald-600">{deletedItems.length}</p>
        </div>
        <div className="card-enterprise p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Selected</p>
          <p className="text-2xl font-bold text-blue-600">{selectedIds.size}</p>
        </div>
        <div className="card-enterprise p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Storage</p>
          <p className="text-2xl font-bold text-orange-600">
            {deletedItems.reduce((s, i) => s + (i.quantity || 0), 0).toLocaleString()} units
          </p>
        </div>
      </div>

      {/* Search + Bulk Actions */}
      <Card variant="bordered">
        <CardContent className="p-4 space-y-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deleted items..."
              className="pl-10 h-11 rounded-xl"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Info className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">{selectedIds.size} item(s) selected</span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline-teal" size="sm" onClick={() => setShowConfirmRestore(true)} className="gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Restore All
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowConfirmPermanent(true)} className="gap-1.5">
                  <Trash2 className="w-4 h-4" /> Delete Forever
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  <X className="w-4 h-4" /> Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Banner */}
      {error && (
        <Card variant="bordered" className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={loadDeletedItems} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && !isLoading && (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Archive className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">Recycle bin is empty</p>
            <p className="text-gray-400 text-xs mt-1">Deleted items will appear here for restoration</p>
          </CardContent>
        </Card>
      )}

      {/* Deleted Items List */}
      {filteredItems.length > 0 && (
        <div className="space-y-2">
          {/* Select All Toggle */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredItems.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-500">
              {selectedIds.size === filteredItems.length ? 'Deselect all' : 'Select all'}
            </span>
          </div>

          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'card-enterprise transition-all duration-200',
                selectedIds.has(item.id) && 'border-emerald-300 ring-1 ring-emerald-200'
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-1"
                    />
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0" onClick={() => setExpandItem(expandItem === item.id ? null : item.id)}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <h3 className="font-semibold text-slate-900">{item.name}</h3>
                        <Badge variant="destructive" size="sm" className="text-[10px]">Deleted</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 ml-4">
                        <span className="font-mono text-slate-600">{item.batch_number}</span>
                        {item.company && <span>| {item.company}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.deleted_at || item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity + Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{item.quantity}</p>
                      <p className="text-[10px] text-slate-400 uppercase">units</p>
                    </div>
                    
                    {/* Restore Button */}
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                      title="Restore to stock"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Permanent Delete */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                      title="Permanently delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandItem(expandItem === item.id ? null : item.id)}
                      className="p-1 text-gray-400"
                    >
                      {expandItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandItem === item.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 ml-7">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-gray-400">MRP:</span> <span className="font-medium">₹{item.mrp?.toFixed(2) || '0.00'}</span></div>
                      <div><span className="text-gray-400">Purchase:</span> <span className="font-medium">₹{item.purchase_price?.toFixed(2) || '0.00'}</span></div>
                      <div><span className="text-gray-400">Selling:</span> <span className="font-medium">₹{item.selling_price?.toFixed(2) || '0.00'}</span></div>
                      <div><span className="text-gray-400">HSN:</span> <span className="font-mono">{item.hsn_code || '-'}</span></div>
                      <div><span className="text-gray-400">Expiry:</span> <span className="font-medium">{item.expiry_date || '-'}</span></div>
                      <div><span className="text-gray-400">Schedule:</span> <span className="font-medium">{item.schedule_type || 'General'}</span></div>
                      <div><span className="text-gray-400">Rack:</span> <span className="font-medium">{item.rack_location || '-'}</span></div>
                      <div><span className="text-gray-400">Barcode:</span> <span className="font-mono">{item.barcode || '-'}</span></div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 justify-end">
                      <button onClick={() => handleRestore(item.id)} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 text-xs font-medium transition-all flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Restore to Stock
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 text-xs font-medium transition-all flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Empty Bin Dialog */}
      <Dialog open={showConfirmEmpty} onOpenChange={setShowConfirmEmpty}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Empty Recycle Bin?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              This will permanently delete <strong>all {deletedItems.length} item(s)</strong> in the bin.
              This action <strong>cannot be undone</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmEmpty(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleEmptyBin}>
              <Trash2 className="w-4 h-4 mr-1" /> Empty Bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Permanent Delete Dialog */}
      <Dialog open={showConfirmPermanent} onOpenChange={setShowConfirmPermanent}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Permanently Delete?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Permanently delete <strong>{selectedIds.size} item(s)</strong>? 
              This action <strong>cannot be undone</strong> and these items cannot be restored.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmPermanent(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMany}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Dialog */}
      <Dialog open={showConfirmRestore} onOpenChange={setShowConfirmRestore}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-500" />
              Restore Items?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Restore <strong>{selectedIds.size} item(s)</strong> back to main stock?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmRestore(false)}>Cancel</Button>
            <Button variant="success" onClick={handleRestoreMany}>
              <RotateCcw className="w-4 h-4 mr-1" /> Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
