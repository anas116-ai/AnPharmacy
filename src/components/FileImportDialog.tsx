/**
 * Multi-Format File Import Dialog
 * Supports: CSV, Excel (.xlsx/.xls), Word (.doc/.docx), PDF, Images (JPG, PNG, WEBP, BMP)
 * No file size limit
 * Auto-detects headers and maps to pharmacy fields
 * Batch imports directly to stock
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, FileUp, Trash2, FileText, FileSpreadsheet, FileImage, File, Eye, UploadCloud, AlertTriangle, Settings2, Shield, Edit3, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { importFile, ImportedMedicineRow, FileImportResult, getFileIcon, getFormatLabel, ACCEPTED_FILE_TYPES, MissingFieldInfo } from '../lib/fileImporter';
import { downloadCSVTemplate } from '../lib/csvParser';
import ImportEditorDialog from './ImportEditorDialog';
import ImportSummaryDialog from './ImportSummaryDialog';

// ── Helper: Convert field name to readable label ──────────────────────
function fieldNameToLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    name: 'Medicine Name',
    strength: 'Strength',
    company: 'Company',
    genericName: 'Generic Name',
    manufacturer: 'Manufacturer',
    itemCode: 'Item Code',
    batchNumber: 'Batch No',
    barcode: 'Barcode',
    rackLocation: 'Rack Location',
    packSize: 'Pack Size',
    quantity: 'Quantity',
    looseQuantity: 'Loose Qty',
    freeQty: 'Free Qty',
    schemeQty: 'Scheme Qty',
    mrp: 'MRP',
    ptr: 'PTR',
    pts: 'PTS',
    purchasePrice: 'Purchase Price',
    sellingPrice: 'Selling Price',
    discountPercent: 'Discount %',
    hsnCode: 'HSN Code',
    scheduleType: 'Schedule',
    purchaseGstPercent: 'Purchase GST%',
    saleGstPercent: 'Sale GST%',
    mfgDate: 'Mfg Date',
    expiryDate: 'Expiry Date',
    invoiceNo: 'Invoice No',
    invoiceDate: 'Invoice Date',
    supplierName: 'Supplier',
    supplierGstin: 'GSTIN',
    poNumber: 'PO No',
    orderDate: 'Order Date',
    paymentTerms: 'Payment Terms',
    dueDate: 'Due Date',
    ewayBillNo: 'E-Way Bill',
    numCartons: 'Cartons',
  };
  return labels[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

// ── Helper: Get column letter from index (1-based) ────────────────────
function getColumnLetter(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index <= 26) return letters[index - 1];
  return letters[Math.floor((index - 1) / 26) - 1] + letters[(index - 1) % 26];
}

interface FileImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: ImportedMedicineRow[]) => Promise<void>;
  existingMedicines?: any[];
}

export default function FileImportDialog({
  isOpen,
  onClose,
  onImport,
  existingMedicines = [],
}: FileImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<FileImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editedRows, setEditedRows] = useState<ImportedMedicineRow[] | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setImportResult(null);

    try {
      const result = await importFile(file, { medicines: existingMedicines });
      setImportResult(result);
      // Select ALL rows by default - no validation conditions
      setSelectedRows(new Set(
        result.rows.map(r => r._rowNumber)
      ));
    } catch (err: any) {
      setImportResult({
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [err.message || 'Failed to process file'],
        warnings: [],
        detectedFormat: 'unknown',
        fieldMapping: {},
        fileName: file.name,
        fileSize: file.size,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [existingMedicines]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input for re-upload
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const toggleRow = (rowNum: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const selectAllValid = () => {
    if (!importResult) return;
    setSelectedRows(new Set(
      importResult.rows
        .filter(r => r._errors.length === 0)
        .map(r => r._rowNumber)
    ));
  };

  const handleBatchImport = async () => {
    if (!importResult) return;
    const rowsToImport = importResult.rows.filter(r => selectedRows.has(r._rowNumber));
    if (rowsToImport.length === 0) return;

    setIsConfirming(true);
    try {
      await onImport(rowsToImport);
      handleClose();
    } catch (err: any) {
      // Error handled by parent
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    setSelectedRows(new Set());
    setIsProcessing(false);
    setIsConfirming(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return <Badge variant="safe" size="sm">{confidence}%</Badge>;
    if (confidence >= 65) return <Badge variant="warning" size="sm">{confidence}%</Badge>;
    return <Badge variant="critical" size="sm">{confidence}%</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-white" />
              </div>
              Import Stock from File
            </DialogTitle>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Import pharmacy stock data from any file format — CSV, Excel, Word, PDF, or Image (OCR)
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── File Upload Area ── */}
          {!importResult && !isProcessing && (
            <div className="space-y-4">
              {/* Supported formats */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" size="sm">📊 CSV</Badge>
                <Badge variant="outline" size="sm">📗 Excel (.xlsx/.xls)</Badge>
                <Badge variant="outline" size="sm">📘 Word (.doc/.docx)</Badge>
                <Badge variant="outline" size="sm">📕 PDF</Badge>
                <Badge variant="outline" size="sm">🖼️ Images (OCR)</Badge>
                <Badge variant="outline-teal" size="sm">♾️ No size limit</Badge>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
                  dragOver
                    ? 'border-teal-400 bg-teal-50 scale-[1.01]'
                    : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50/50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-10 h-10 text-teal-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {dragOver ? 'Drop to Import' : 'Upload or Drop File'}
                </p>
                <p className="text-sm text-gray-500 mb-3 max-w-md mx-auto">
                  Drag & drop your invoice, stock list, or purchase order file here
                </p>
                <div className="flex items-center gap-2 justify-center mt-4">
                  <Button variant="outline-teal" size="lg" className="gap-2">
                    <Upload className="w-5 h-5" />
                    Browse Files
                  </Button>
                  <Button variant="outline" size="lg" onClick={(e) => { e.stopPropagation(); downloadCSVTemplate(); }} className="gap-2">
                    <FileDown className="w-5 h-5" />
                    Download Template
                  </Button>
                </div>
              </div>

              {/* Field auto-mapping info */}
              <Card variant="bordered">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Auto-Detected Fields</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-xs text-gray-600">
                    <span>✅ Medicine Name</span>
                    <span>✅ Batch Number</span>
                    <span>✅ Company/Manufacturer</span>
                    <span>✅ Quantity</span>
                    <span>✅ MRP / Price</span>
                    <span>✅ Expiry Date</span>
                    <span>✅ HSN Code</span>
                    <span>✅ GST %</span>
                    <span>✅ Free Qty / Scheme</span>
                    <span>✅ Strength / Pack Size</span>
                    <span>✅ Invoice / PO Details</span>
                    <span>✅ Barcode / Rack</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    The system automatically detects column headers using a synonym database with 100+ recognized header patterns.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Processing Indicator ── */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-base font-semibold text-gray-700">Processing File...</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedFile && `${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
              </p>
              <div className="mt-6 w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {importResult && !isProcessing && (
            <div className="space-y-4">
              {/* File Info & Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                    {getFileIcon(importResult.detectedFormat as any)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{importResult.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {getFormatLabel(importResult.detectedFormat as any)} · {formatFileSize(importResult.fileSize)}
                    </p>
                  </div>
                </div>
                <Badge variant={importResult.success ? 'safe' : 'critical'} size="sm">
                  {importResult.success ? `${importResult.validRows} Valid` : 'Failed'}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
                  <p className="text-[10px] font-semibold text-teal-600 uppercase">Total Rows</p>
                  <p className="text-2xl font-bold text-teal-700">{importResult.totalRows}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <p className="text-[10px] font-semibold text-green-600 uppercase">Valid</p>
                  <p className="text-2xl font-bold text-green-700">{importResult.validRows}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100">
                  <p className="text-[10px] font-semibold text-red-600 uppercase">Invalid</p>
                  <p className="text-2xl font-bold text-red-700">{importResult.invalidRows}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                  onClick={selectAllValid}>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase">Selected</p>
                  <p className="text-2xl font-bold text-blue-700 cursor-pointer">{selectedRows.size}</p>
                </div>
              </div>

              {/* Field Mapping Info */}
              {Object.keys(importResult.fieldMapping).length > 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Auto-Mapped Columns ({Object.keys(importResult.fieldMapping).length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(importResult.fieldMapping).map(([header, field]) => (
                      <Badge key={header} variant="outline" size="sm" className="text-[10px]">
                        <span className="text-gray-500">{header}</span>
                        <span className="text-teal-600 mx-1">→</span>
                        <span className="text-gray-700 font-medium">{field}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700">Warnings</p>
                  </div>
                  <ul className="space-y-0.5 ml-6 list-disc">
                    {importResult.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-600">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl max-h-32 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-xs font-semibold text-red-700">Errors ({importResult.errors.length})</p>
                  </div>
                  <ul className="space-y-0.5 ml-6 list-disc">
                    {importResult.errors.slice(0, 20).map((e, i) => (
                      <li key={i} className="text-xs text-red-600">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview Table */}
              {importResult.rows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Preview ({importResult.rows.length} items)
                    </p>
                    <Button variant="ghost" size="sm" onClick={selectAllValid} className="text-teal-600">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Select All Valid
                    </Button>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="w-8 px-2 py-2"></th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-600">#</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-600">Medicine Name</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-600">Batch</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-600">Company</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-600">Qty</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-600">MRP</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-600">Price</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-600">GST%</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-600">Expiry</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-600">Conf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {importResult.rows.map((row) => {
                          const isSelected = selectedRows.has(row._rowNumber);
                          const hasErrors = row._errors.length > 0;
                          return (
                            <tr
                              key={row._rowNumber}
                              className={cn(
                                'hover:bg-teal-50/30 transition-colors cursor-pointer',
                                !isSelected && 'opacity-50',
                                hasErrors && 'bg-red-50/30'
                              )}
                              onClick={() => !hasErrors && toggleRow(row._rowNumber)}
                            >
                              <td className="px-2 py-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={hasErrors}
                                  onChange={() => !hasErrors && toggleRow(row._rowNumber)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                              </td>
                              <td className="px-2 py-2 text-gray-400 font-mono">{row._rowNumber}</td>
                              <td className="px-2 py-2 font-medium text-gray-800 max-w-[180px] truncate">
                                <div className="flex items-center gap-1">
                                  <span className="truncate">{row.name || <span className="text-red-400 italic">Missing</span>}</span>
                                  {row.strength && <span className="text-gray-400 flex-shrink-0">({row.strength})</span>}
                                </div>
                              </td>
                              <td className="px-2 py-2 font-mono text-gray-600 uppercase">{row.batchNumber || <span className="text-red-400 italic">-</span>}</td>
                              <td className="px-2 py-2 text-gray-600 max-w-[100px] truncate">{row.company || <span className="text-gray-300">-</span>}</td>
                              <td className="px-2 py-2 text-right font-bold text-gray-800">{row.quantity > 0 ? row.quantity : <span className="text-red-400">0</span>}</td>
                              <td className="px-2 py-2 text-right text-gray-700">{row.mrp > 0 ? `₹${row.mrp.toFixed(2)}` : '-'}</td>
                              <td className="px-2 py-2 text-right text-gray-700">{row.purchasePrice > 0 ? `₹${row.purchasePrice.toFixed(2)}` : '-'}</td>
                              <td className="px-2 py-2 text-center text-gray-600">{row.purchaseGstPercent > 0 ? `${row.purchaseGstPercent}%` : '-'}</td>
                              <td className="px-2 py-2 text-gray-500 text-[10px]">{row.expiryDate || <span className="text-amber-400">-</span>}</td>
                              <td className="px-2 py-2 text-center">{getConfidenceBadge(row._confidence)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmapped columns warning */}
              {importResult.fieldMapping && Object.keys(importResult.fieldMapping).length === 0 && importResult.rows.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Column mapping could not be auto-detected
                  </p>
                  <p className="text-[10px] text-amber-600 mt-1">
                    Ensure your file has recognizable headers like "Medicine Name", "Batch No", "Quantity", etc.
                  </p>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════
                 MISSING FIELDS REPORT - Toggle Notification
                 Shows exactly which cells are empty per row & column
                 ════════════════════════════════════════════════════════ */}
              {(() => {
                const allMissing = importResult.rows.flatMap(r => r._missingFields);
                if (allMissing.length === 0) return null;
                
                // Group by field name for summary
                const byField: Record<string, number> = {};
                for (const mf of allMissing) {
                  byField[mf.fieldName] = (byField[mf.fieldName] || 0) + 1;
                }
                
                return (
                  <details className="group">
                    <summary className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100/50 transition-colors list-none">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-800">
                            ⚠️ {allMissing.length} Empty Cells Detected
                          </p>
                          <p className="text-[10px] text-amber-600">
                            Click to see exact row & column locations — fill these manually after import
                          </p>
                        </div>
                      </div>
                      <span className="text-amber-500 text-xs group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-2 bg-white border border-amber-200 rounded-xl overflow-hidden">
                      {/* Summary by field */}
                      <div className="p-3 border-b border-amber-100 bg-amber-50/50">
                        <p className="text-[10px] font-semibold text-amber-700 uppercase mb-1.5">Missing Fields Summary</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(byField).map(([field, count]) => (
                            <Badge key={field} variant="warning" size="sm">
                              {fieldNameToLabel(field)}: {count} cell{count > 1 ? 's' : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {/* Detail table */}
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-500">#</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Row</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Column</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Field Type</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Cell</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {allMissing.slice(0, 50).map((mf, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/30">
                                <td className="px-2 py-1 text-gray-400">{idx + 1}</td>
                                <td className="px-2 py-1 font-mono text-gray-700 font-medium">Row {mf.row}</td>
                                <td className="px-2 py-1">
                                  <Badge variant="outline" size="sm" className="font-mono text-[9px]">
                                    {getColumnLetter(mf.columnIndex)}
                                  </Badge>
                                  <span className="ml-1 text-gray-600">{mf.column}</span>
                                </td>
                                <td className="px-2 py-1">
                                  <Badge variant="warning" size="sm" className="text-[9px]">
                                    {fieldNameToLabel(mf.fieldName)}
                                  </Badge>
                                </td>
                                <td className="px-2 py-1">
                                  <code className="text-red-400 bg-red-50 px-1 py-0.5 rounded text-[9px]">[empty]</code>
                                </td>
                              </tr>
                            ))}
                            {allMissing.length > 50 && (
                              <tr>
                                <td colSpan={5} className="px-2 py-2 text-center text-gray-400 text-[9px]">
                                  ...and {allMissing.length - 50} more empty cells
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-2 bg-gray-50 border-t border-amber-100 text-center">
                        <p className="text-[9px] text-gray-500">
                          ℹ️ These cells were empty in the file. After import, go to Stock Management to fill missing data.
                        </p>
                      </div>
                    </div>
                  </details>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {importResult && !isProcessing && (
          <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {selectedRows.size > 0 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">{selectedRows.size} items</span>
                    <span className="text-gray-400">selected for import</span>
                  </>
                ) : (
                  <span className="text-amber-600">No valid items selected</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setImportResult(null); setSelectedFile(null); }}>
                  <Upload className="w-4 h-4 mr-1" /> New File
                </Button>
                <Button variant="outline" onClick={() => setShowEditor(true)} className="gap-2">
                  <Edit3 className="w-4 h-4 mr-1" /> Edit & Review
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Route through editor first, then to summary
                    if (importResult && importResult.rows.length > 0) {
                      setEditedRows(importResult.rows);
                      // If rows are already selected and valid, go directly to summary
                      if (selectedRows.size > 0) {
                        setShowSummary(true);
                      } else {
                        // Open editor to review
                        setShowEditor(true);
                      }
                    }
                  }}
                  disabled={selectedRows.size === 0 || isConfirming}
                  size="lg"
                  className="gap-2 min-w-[200px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
                >
                  <Shield className="w-5 h-5" />
                  {isConfirming ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <>Review & Confirm ({selectedRows.size} Items)</>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}

        {/* Import Editor - Full Edit Mode */}
        <ImportEditorDialog
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            // After editor closes, show the summary dialog
            if (importResult && importResult.rows.length > 0) {
              setShowSummary(true);
            }
          }}
          importResult={importResult}
          existingMedicines={existingMedicines}
          onImport={async (editedRows) => {
            setEditedRows(editedRows);
            const finalRows = editedRows;
            setImportResult(prev => prev ? {
              ...prev,
              rows: finalRows,
              validRows: finalRows.filter(r => r._errors.length === 0).length,
            } : null);
            setSelectedRows(new Set(finalRows.map(r => r._rowNumber)));
            setShowEditor(false);
          }}
        />

        {/* ✅ FINAL IMPORT SUMMARY — Stock updates ONLY after user confirms here */}
        <ImportSummaryDialog
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          rows={editedRows || importResult?.rows || []}
          keptColumns={importResult ? Object.entries(importResult.fieldMapping).map(([header, field]) => ({ key: field, label: header })) : []}
          existingMedicines={existingMedicines}
          fileName={importResult?.fileName || ''}
          isImporting={isConfirming}
          onConfirm={async () => {
            const rowsToImport = editedRows || importResult?.rows || [];
            const validRows = rowsToImport.filter(r => r._errors.length === 0);
            if (validRows.length === 0) return;

            setIsConfirming(true);
            try {
              await onImport(validRows);
              handleClose();
            } catch (err) {
              // Error handled by parent
            } finally {
              setIsConfirming(false);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}