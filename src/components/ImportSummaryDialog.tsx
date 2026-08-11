/**
 * Import Summary Dialog — Final Review Before Stock Update
 * 
 * Shows a comprehensive summary of what will be imported:
 * - Total items and financial overview
 * - Duplicate detection with existing stock
 * - Expiry warnings
 * - Column usage summary
 * - Data quality score
 * - User must explicitly confirm to proceed
 */

import { useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, AlertCircle, Package, DollarSign,
  Calendar, Columns, BarChart3, Shield, TrendingUp, X,
  FileSpreadsheet, Layers, Hash, Percent
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { ImportedMedicineRow } from '../lib/fileImporter';

interface ImportSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rows: ImportedMedicineRow[];
  keptColumns: { key: string; label: string }[];
  existingMedicines: any[];
  onConfirm: () => Promise<void>;
  isImporting: boolean;
  fileName: string;
}

interface DuplicateInfo {
  rowIndex: number;
  medicineName: string;
  existingBatch: string;
  existingQty: number;
}

export default function ImportSummaryDialog({
  isOpen,
  onClose,
  rows,
  keptColumns,
  existingMedicines,
  onConfirm,
  isImporting,
  fileName,
}: ImportSummaryDialogProps) {
  // Detect duplicates
  const duplicates = useMemo(() => {
    const found: DuplicateInfo[] = [];
    const existingMap = new Map<string, any[]>();
    for (const med of existingMedicines) {
      const key = (med.name || '').toLowerCase().trim();
      if (!existingMap.has(key)) existingMap.set(key, []);
      existingMap.get(key)!.push(med);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || '').toLowerCase().trim();
      const existing = existingMap.get(name);
      if (existing && existing.length > 0) {
        const batchMatch = existing.find(e =>
          (e.batch_number || '').toLowerCase() === (row.batchNumber || '').toLowerCase()
        );
        if (batchMatch) {
          found.push({
            rowIndex: i,
            medicineName: row.name || '',
            existingBatch: batchMatch.batch_number || '',
            existingQty: batchMatch.quantity || 0,
          });
        }
      }
    }
    return found;
  }, [rows, existingMedicines]);

  // Expiry warnings
  const expiryWarnings = useMemo(() => {
    const soon: ImportedMedicineRow[] = [];
    const expired: ImportedMedicineRow[] = [];
    const now = new Date();
    const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    for (const row of rows) {
      if (!row.expiryDate) continue;
      const exp = new Date(row.expiryDate);
      if (exp < now) expired.push(row);
      else if (exp < sixMonths) soon.push(row);
    }
    return { soon, expired };
  }, [rows]);

  // Financial summary
  const financialSummary = useMemo(() => {
    let totalQty = 0;
    let totalMrp = 0;
    let totalCost = 0;
    let totalItems = 0;

    for (const row of rows) {
      totalItems++;
      totalQty += row.quantity || 0;
      totalMrp += (row.mrp || 0) * (row.quantity || 0);
      totalCost += (row.purchasePrice || 0) * (row.quantity || 0);
    }
    return { totalItems, totalQty, totalMrp, totalCost };
  }, [rows]);

  // Data quality score
  const qualityScore = useMemo(() => {
    if (rows.length === 0) return 100;
    let totalScore = 0;
    const requiredFields = ['name', 'batchNumber', 'quantity', 'expiryDate'];

    for (const row of rows) {
      let score = 100;
      for (const field of requiredFields) {
        const val = (row as any)[field];
        if (!val || val === 0 || val === '') score -= 25;
      }
      if (!row.purchasePrice && !row.mrp) score -= 15;
      totalScore += Math.max(0, score);
    }
    return Math.round(totalScore / rows.length);
  }, [rows]);

  // Stock level impact
  const stockImpact = useMemo(() => {
    const newItems = rows.filter(r => {
      const name = (r.name || '').toLowerCase().trim();
      return !existingMedicines.some(e =>
        (e.name || '').toLowerCase().trim() === name &&
        (e.batch_number || '').toLowerCase() === (r.batchNumber || '').toLowerCase()
      );
    });
    return {
      newItems: newItems.length,
      duplicates: duplicates.length,
      updates: rows.length - newItems.length - duplicates.length,
    };
  }, [rows, existingMedicines, duplicates]);

  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-success bg-success-light border-success/40';
    if (score >= 65) return 'text-warning bg-warning-light border-amber-200';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isImporting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span>Review & Confirm Import</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{fileName}</p>
              </div>
            </DialogTitle>
            <button onClick={onClose} disabled={isImporting} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground/60" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Quality Score Banner */}
          <div className={cn(
            'p-4 rounded-xl border flex items-center gap-3',
            qualityScore >= 85 ? 'bg-success-light border-success/40' :
            qualityScore >= 65 ? 'bg-warning-light border-amber-200' :
            'bg-destructive/10 border-destructive/20'
          )}>
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold',
              qualityScore >= 85 ? 'bg-success-light text-success' :
              qualityScore >= 65 ? 'bg-amber-100 text-warning' :
              'bg-red-100 text-destructive'
            )}>
              {qualityScore}%
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {qualityScore >= 85 ? 'High Quality Data' :
                 qualityScore >= 65 ? 'Needs Review' :
                 'Poor Quality Data'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {qualityScore >= 85 ? 'All required fields are filled. Ready for import.' :
                 qualityScore >= 65 ? 'Some fields are missing. Review highlighted items before importing.' :
                 'Many required fields are missing. Consider editing before import.'}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 bg-gradient-to-br from-accent to-success">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-white/80 uppercase">Total Items</p>
                  <Package className="w-4 h-4 text-white/60" />
                </div>
                <p className="text-2xl font-bold text-white mt-1">{financialSummary.totalItems}</p>
                <p className="text-[10px] text-white/60">{financialSummary.totalQty} total units</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-blue-500 to-indigo-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-white/80 uppercase">Total Cost</p>
                  <DollarSign className="w-4 h-4 text-white/60" />
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  ₹{(financialSummary.totalCost).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-white/60">Purchase value</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-accent to-accent/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-white/80 uppercase">MRP Value</p>
                  <TrendingUp className="w-4 h-4 text-white/60" />
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  ₹{(financialSummary.totalMrp).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-white/60">Retail value</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-white/80 uppercase">Profit Margin</p>
                  <Percent className="w-4 h-4 text-white/60" />
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  {financialSummary.totalCost > 0
                    ? `${Math.round(((financialSummary.totalMrp - financialSummary.totalCost) / financialSummary.totalCost) * 100)}%`
                    : 'N/A'}
                </p>
                <p className="text-[10px] text-white/60">
                  ₹{((financialSummary.totalMrp - financialSummary.totalCost)).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Impact */}
          <div className="p-4 bg-muted/50 border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground/80 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Stock Impact Summary
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-success">{stockImpact.newItems}</p>
                <p className="text-[10px] text-muted-foreground">New Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-info">{stockImpact.updates}</p>
                <p className="text-[10px] text-muted-foreground">Quantity Updates</p>
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  stockImpact.duplicates > 0 ? 'text-warning' : 'text-green-600'
                )}>
                  {stockImpact.duplicates}
                </p>
                <p className="text-[10px] text-muted-foreground">Duplicates</p>
              </div>
            </div>
          </div>

          {/* Duplicates Warning */}
          {duplicates.length > 0 && (
            <div className="p-4 bg-warning-light border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="text-xs font-semibold text-amber-800">
                  {duplicates.length} Duplicate{duplicates.length > 1 ? 's' : ''} Detected
                </p>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {duplicates.map((dup, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-warning bg-amber-100/50 rounded-lg px-3 py-1.5">
                    <span className="font-medium">{dup.medicineName}</span>
                    <span>Batch: {dup.existingBatch} (Existing: {dup.existingQty} units)</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-warning mt-2">
                Duplicates will increase existing stock quantity. Review before confirming.
              </p>
            </div>
          )}

          {/* Expiry Warnings */}
          {expiryWarnings.expired.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-xs font-semibold text-red-800">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  {expiryWarnings.expired.length} Item{expiryWarnings.expired.length > 1 ? 's' : ''} Already Expired
                </p>
              </div>
              <ul className="space-y-1 text-xs text-destructive ml-5 list-disc">
                {expiryWarnings.expired.slice(0, 5).map((row, i) => (
                  <li key={i}>{row.name} — Expired on {row.expiryDate}</li>
                ))}
              </ul>
            </div>
          )}

          {expiryWarnings.soon.length > 0 && (
            <div className="p-4 bg-warning-light border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-warning" />
                <p className="text-xs font-semibold text-amber-800">
                  {expiryWarnings.soon.length} Item{expiryWarnings.soon.length > 1 ? 's' : ''} Expiring Within 6 Months
                </p>
              </div>
              <ul className="space-y-1 text-xs text-warning ml-5 list-disc">
                {expiryWarnings.soon.slice(0, 5).map((row, i) => (
                  <li key={i}>{row.name} — Expires on {row.expiryDate}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Column Usage */}
          <div className="p-4 bg-muted/50 border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground/80 mb-2 flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5 text-accent" />
              Columns Being Imported ({keptColumns.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {keptColumns.map(col => (
                <Badge key={col.key} variant="outline-teal" size="sm">
                  {col.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Missing Fields Summary */}
          {(() => {
            const totalMissing = rows.reduce((s, r) => s + r._missingFields.length, 0);
            if (totalMissing === 0) return null;
            return (
              <div className="p-4 bg-warning-light border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {totalMissing} Empty Cell{totalMissing > 1 ? 's' : ''} — Will be left blank
                </p>
                <p className="text-[10px] text-warning mt-1">
                  Empty cells will be imported as blank. You can fill them later in Stock Management.
                </p>
              </div>
            );
          })()}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/50/80 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>Stock will update <b>only</b> after you click Confirm</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Back to Edit
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isImporting || rows.length === 0}
                size="lg"
                className={cn(
                  'gap-2 min-w-[200px]',
                  qualityScore < 65 && 'opacity-70'
                )}
              >
                {isImporting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Confirm Import ({rows.length} Items)</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
