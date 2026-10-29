/**
 * ImportHistoryView — Enhanced import history with rollback capability
 * 
 * Features:
 * - Full import history with detailed per-import information
 * - Rollback: restore stock to pre-import state (one-click)
 * - Version comparison: see changes from each import
 * - Audit trail with user, time, file, and impact details
 * - 90-day retention with auto-cleanup
 */

import { useEffect, useState } from 'react';
import { useAuditTrailStore, AuditEntry, AuditSummary } from '../../stores/auditTrailStore';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
  Clock, FileUp, Trash2, Download, AlertCircle, CheckCircle, X,
  FileSpreadsheet, FileText, FileImage, Search, RefreshCw, RotateCcw,
  ArrowLeft, ArrowRight, History, Undo2, BarChart3, Info, Shield,
  Package, TrendingUp, Layers
} from 'lucide-react';

export default function ImportHistoryView() {
  const { entries, isLoading, loadEntries, rollback, deleteEntry, clearAll, getSummary } = useAuditTrailStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState<string | null>(null);
  const [rollbackInProgress, setRollbackInProgress] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  useEffect(() => { loadEntries(); }, []);

  const summary = getSummary();

  const filtered = search
    ? entries.filter(e =>
        e.fileName.toLowerCase().includes(search.toLowerCase()) ||
        e.userName.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const getFileIcon = (entry: AuditEntry) => {
    const ext = entry.fileName.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-4 h-4 text-[#14292E]" />;
    if (['pdf'].includes(ext || '')) return <FileText className="w-4 h-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext || '')) return <FileImage className="w-4 h-4 text-[#123F3D]" />;
    return <FileUp className="w-4 h-4 text-slate-500" />;
  };

  const handleRollback = async (entryId: string) => {
    setRollbackInProgress(true);
    setShowRollbackConfirm(null);
    
    const success = await rollback(entryId);
    setRollbackInProgress(false);
    
    if (success) {
      toast.success('Rollback Complete', 'Stock has been restored to pre-import state.');
      loadEntries();
    } else {
      toast.error('Rollback Failed', 'Could not rollback this import. It may have already been rolled back.');
    }
  };

  const handleDelete = async (id: string) => {
    deleteEntry(id);
    setShowDeleteConfirm(null);
    toast.success('Entry Deleted', 'Import history entry removed.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Import History</h2>
          <p className="text-sm text-slate-500 mt-1">
            Audit trail with rollback — {entries.length} imports tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadEntries} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          {entries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card variant="bordered" className="p-3 bg-gradient-to-br from-[#EDF5F6] to-[#2E9C90]/25 border-[#14292E]/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#2E9C90]/40 flex items-center justify-center">
                <History className="w-4 h-4 text-[#14292E]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#14292E]">{summary.totalImports}</p>
                <p className="text-[10px] text-slate-500">Total Imports</p>
              </div>
            </div>
          </Card>
          <Card variant="bordered" className="p-3 bg-gradient-to-br from-[#EDF5F6] to-[#2E9C90]/25 border-[#14292E]/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#2E9C90]/40 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#14292E]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#14292E]">{summary.totalRowsAdded.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Rows Added</p>
              </div>
            </div>
          </Card>
          <Card variant="bordered" className="p-3 bg-gradient-to-br from-[#EDF5F6] to-[#D7EDE7]/30 border-[#14292E]/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D7EDE7]/60 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#14292E]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#14292E]">{formatCurrency(summary.totalStockValueChange)}</p>
                <p className="text-[10px] text-slate-500">Value Change</p>
              </div>
            </div>
          </Card>
          <Card variant="bordered" className="p-3 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Undo2 className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">{summary.rollbacksPerformed}</p>
                <p className="text-[10px] text-amber-600">Rollbacks</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search */}
      {entries.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name or user..."
            className="pl-9 h-10"
          />
        </div>
      )}

      {/* Entry list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-[#14292E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading import history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileUp className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-base font-medium text-slate-500">No imports yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Import history will appear here after you commit files through the Data Import Studio
            </p>
          </div>
        ) : (
          <>
            {/* Group imports by month */}
            {groupByMonth(filtered).map(([month, monthEntries]) => (
              <div key={month}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {month}
                </h3>
                <div className="space-y-2">
                  {monthEntries.map(entry => (
                    <Card
                      key={entry.id}
                      variant="bordered"
                      className={cn(
                        'overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 group cursor-pointer',
                        entry.rolledBack && 'opacity-70 border-amber-200'
                      )}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getFileIcon(entry)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-slate-800 truncate">{entry.fileName}</span>
                                {entry.rolledBack && (
                                  <Badge variant="warning" size="sm" className="gap-1">
                                    <Undo2 className="w-2.5 h-2.5" /> Rolled Back
                                  </Badge>
                                )}
                                {entry.errors.length === 0 && !entry.rolledBack && (
                                  <Badge variant="safe" size="sm">Clean</Badge>
                                )}
                                {entry.errors.length > 0 && (
                                  <Badge variant="destructive" size="sm">{entry.errors.length} errors</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                                <span>·</span>
                                <span>by {entry.userName}</span>
                                <span>·</span>
                                <span className="text-emerald-600 font-medium">+{entry.rowsAdded} rows</span>
                                {entry.rowsUpdated > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="text-amber-600 font-medium">{entry.rowsUpdated} updated</span>
                                  </>
                                )}
                                <span>·</span>
                                <span className="font-mono text-slate-400">{formatCurrency(entry.stockValueChange)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!entry.rolledBack && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowRollbackConfirm(entry.id); }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 opacity-0 group-hover:opacity-100 transition-all"
                                title="Rollback this import"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(entry.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick stats bar */}
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-50">
                          <span className="text-[10px] text-slate-400">
                            <Package className="w-3 h-3 inline mr-1" />
                            +{entry.rowsAdded} / ~{entry.rowsUpdated} / ×{entry.rowsDeleted}
                          </span>
                          {entry.columnsAdded > 0 && (
                            <span className="text-[10px] text-slate-500">
                              +{entry.columnsAdded} columns
                            </span>
                          )}
                          {entry.profileName && (
                            <Badge variant="outline-teal" size="sm" className="text-[8px]">
                              {entry.profileName}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        {selectedEntry && (
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#14292E]" />
                Import Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">File</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{selectedEntry.fileName}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">User</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedEntry.userName}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Source</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 uppercase">{selectedEntry.source}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Impact</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Added', value: selectedEntry.rowsAdded, color: 'text-[#14292E] bg-[#EDF5F6]' },
                    { label: 'Updated', value: selectedEntry.rowsUpdated, color: 'text-[#14292E] bg-[#EDF5F6]' },
                    { label: 'Skipped', value: selectedEntry.rowsIgnored, color: 'text-slate-500 bg-slate-100' },
                    { label: 'Columns', value: selectedEntry.columnsAdded, color: 'text-[#14292E] bg-[#EDF5F6]' },
                  ].map(item => (
                    <div key={item.label} className={cn('p-2 rounded-lg text-center', item.color.split(' ')[1])}>
                      <p className={cn('text-sm font-bold', item.color.split(' ')[0])}>{item.value}</p>
                      <p className="text-[9px] text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-[#EDF5F6] to-[#2E9C90]/25 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Stock Value Change</p>
                  <p className={cn('text-base font-bold font-data',
                    selectedEntry.stockValueChange >= 0 ? 'text-emerald-700' : 'text-red-700'
                  )}>
                    {selectedEntry.stockValueChange >= 0 ? '+' : ''}{formatCurrency(selectedEntry.stockValueChange)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-[#EDF5F6] to-[#2E9C90]/25 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Duration</p>
                  <p className="text-base font-bold font-data text-[#14292E]">
                    {(selectedEntry.duration / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>

              {selectedEntry.warnings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Warnings</h4>
                  {selectedEntry.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}

              {selectedEntry.rolledBack && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Undo2 className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-800">
                      This import was rolled back on {selectedEntry.rolledBackAt ? new Date(selectedEntry.rolledBackAt).toLocaleString() : 'Unknown date'}
                    </span>
                  </div>
                </div>
              )}

              {selectedEntry.profileName && (
                <div className="bg-[#EDF5F6] border border-[#14292E]/10 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#14292E]" />
                    <span className="text-xs text-[#14292E]">Profile: <strong>{selectedEntry.profileName}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Rollback Confirm */}
      <Dialog open={!!showRollbackConfirm} onOpenChange={() => setShowRollbackConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Undo2 className="w-5 h-5 text-amber-500" />
              Rollback Import?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              This will restore stock to its state BEFORE this import. All medicines added by this import will be removed, and any updated medicines will be reverted.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Rows added: will be removed</li>
              <li>• Rows updated: will be reverted to original values</li>
              <li>• This action can be undone by re-importing the file</li>
            </ul>
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
              <strong>Note:</strong> If you made manual changes to imported stock after the import, those changes will be lost.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRollbackConfirm(null)} disabled={rollbackInProgress}>
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={() => showRollbackConfirm && handleRollback(showRollbackConfirm)}
              disabled={rollbackInProgress}
              className="gap-2"
            >
              {rollbackInProgress ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Rolling back...</>
              ) : (
                <><Undo2 className="w-4 h-4" /> Rollback</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirm */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Clear All Import History?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently delete all {entries.length} import history entries and their rollback snapshots. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { clearAll(); setShowClearConfirm(false); }} className="gap-2">
              <Trash2 className="w-4 h-4" /> Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete Entry?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently delete this import history entry and its rollback snapshot. Rollback will no longer be available for this import.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper: group entries by month-year ──
function groupByMonth(entries: AuditEntry[]): [string, AuditEntry[]][] {
  const groups: Record<string, AuditEntry[]> = {};
  
  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  
  return Object.entries(groups);
}
