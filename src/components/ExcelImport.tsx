import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useStockStore } from '../stores/stockStore';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X, FileUp, Trash2, File, Database, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { parseCSV, downloadCSVTemplate, CSVColumn, ParsedCSVRow, validateMedicineRow } from '../lib/csvParser';
import { useToast } from '../hooks/useToast';

const MEDICINE_COLUMNS: CSVColumn[] = [
  { key: 'name', label: 'Medicine Name', required: true },
  { key: 'batchNumber', label: 'Batch Number', required: true },
  { key: 'company', label: 'Company / Manufacturer', required: false },
  { key: 'quantity', label: 'Quantity', required: true, transform: (v) => parseInt(v) || 0 },
  { key: 'purchasePrice', label: 'Purchase Price', required: false, transform: (v) => v ? parseFloat(v) : null },
  { key: 'sellingPrice', label: 'Selling Price', required: false, transform: (v) => v ? parseFloat(v) : null },
  { key: 'mfgDate', label: 'Manufacturing Date', required: false },
  { key: 'expiryDate', label: 'Expiry Date', required: false },
  { key: 'mrp', label: 'MRP', required: false, transform: (v) => v ? parseFloat(v) : null },
  { key: 'gstPercent', label: 'GST%', required: false, transform: (v) => v ? parseFloat(v) : null },
  { key: 'hsnCode', label: 'HSN Code', required: false },
  { key: 'scheduleType', label: 'Schedule Type', required: false },
  { key: 'rackLocation', label: 'Rack Location', required: false },
  { key: 'lowStockAlert', label: 'Low Stock Alert', required: false, transform: (v) => v ? parseInt(v) : null },
];

const HEADER_MAP: Record<string, string> = {
  'medicine name': 'name', 'medicine': 'name', 'drug name': 'name', 'item': 'name', 'product name': 'name',
  'batch number': 'batchNumber', 'batch': 'batchNumber', 'bat no': 'batchNumber', 'batch no': 'batchNumber', 'lot number': 'batchNumber',
  'company': 'company', 'manufacturer': 'company', 'mfr': 'company', 'brand': 'company', 'supplier': 'company',
  'quantity': 'quantity', 'qty': 'quantity', 'pack qty': 'quantity', 'pcs': 'quantity', 'nos': 'quantity', 'units': 'quantity',
  'purchase price': 'purchasePrice', 'cost price': 'purchasePrice', 'cost': 'purchasePrice', 'purchase rate': 'purchasePrice', 'unit cost': 'purchasePrice',
  'selling price': 'sellingPrice', 'sale price': 'sellingPrice', 'price': 'sellingPrice', 'rate': 'sellingPrice', 'sale rate': 'sellingPrice',
  'mrp': 'mrp', 'm.r.p': 'mrp', 'max retail price': 'mrp',
  'manufacturing date': 'mfgDate', 'mfg date': 'mfgDate', 'mfg': 'mfgDate', 'mfd': 'mfgDate', 'mfr date': 'mfgDate', 'manf date': 'mfgDate',
  'expiry date': 'expiryDate', 'exp date': 'expiryDate', 'expiry': 'expiryDate', 'exp': 'expiryDate', 'exp dt': 'expiryDate',
  'gst': 'gstPercent', 'gst%': 'gstPercent', 'gst %': 'gstPercent', 'gst rate': 'gstPercent', 'tax': 'gstPercent', 'tax%': 'gstPercent', 'tax rate': 'gstPercent',
  'hsn code': 'hsnCode', 'hsn': 'hsnCode', 'h.s.n': 'hsnCode', 'hsn/sac': 'hsnCode', 'sac code': 'hsnCode',
  'schedule': 'scheduleType', 'schedule type': 'scheduleType', 'drug schedule': 'scheduleType', 'sch type': 'scheduleType',
  'rack': 'rackLocation', 'rack location': 'rackLocation', 'shelf': 'rackLocation', 'location': 'rackLocation', 'rack no': 'rackLocation',
  'low stock': 'lowStockAlert', 'low stock alert': 'lowStockAlert', 'min stock': 'lowStockAlert', 'alert': 'lowStockAlert', 'reorder level': 'lowStockAlert',
};

export default function ExcelImport() {
  const { user } = useAuthStore();
  const { setMedicines } = useStockStore();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrors([]);
    setParsedData([]);
    setSuccess('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';

    try {
      let rows: ParsedCSVRow[] = [];
      let validationErrors: string[] = [];
      let totalRows = 0;

      if (isExcel) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
        totalRows = jsonData.length;
        const excelHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

        // Auto-detect column mapping
        const columnMap: Record<string, string> = {};
        for (const header of excelHeaders) {
          const key = String(header).trim().toLowerCase();
          for (const [pattern, mapped] of Object.entries(HEADER_MAP)) {
            if (key === pattern || key.includes(pattern) || pattern.includes(key) || key.replace(/\s/g, '') === pattern.replace(/\s/g, '')) {
              columnMap[header] = mapped;
              break;
            }
          }
        }

        for (let i = 0; i < jsonData.length; i++) {
          const excelRow = jsonData[i];
          const row: ParsedCSVRow = { _rowNumber: i + 1, _errors: [] };
          const rowErrors: string[] = [];

          for (const col of MEDICINE_COLUMNS) {
            let value: any = null;
            for (const [excelHeader, mappedKey] of Object.entries(columnMap)) {
              if (mappedKey === col.key) {
                value = excelRow[excelHeader];
                break;
              }
            }
            if (value === null || value === undefined) {
              const directMatch = excelHeaders.find(h => h.toLowerCase().replace(/\s/g, '') === col.key.toLowerCase());
              value = directMatch ? excelRow[directMatch] : '';
            }
            if (value instanceof Date && !isNaN(value.getTime())) {
              value = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
            }
            const strValue = String(value ?? '');
            const transformedValue = col.transform ? col.transform(strValue) : strValue;
            row[col.key] = transformedValue;

            if (col.required && (!row[col.key] || row[col.key] === '' || row[col.key] === 0)) {
              rowErrors.push(`${col.label} is required`);
            }
          }

          row._errors = rowErrors;
          if (rowErrors.length > 0) validationErrors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
          rows.push(row);
        }
        setFileFormat('xlsx');
      } else {
        const text = await file.text();
        const result = parseCSV(text, MEDICINE_COLUMNS);
        rows = result.data || [];
        validationErrors = result.errors;
        totalRows = result.totalRows;
        setFileFormat('csv');
      }

      // Additional validation
      const finalRows: ParsedCSVRow[] = [];
      const finalErrors: string[] = [...validationErrors];
      for (const row of rows) {
        const rowErrors = validateMedicineRow(row);
        if (rowErrors.length > 0) finalErrors.push(`Row ${row._rowNumber}: ${rowErrors.join(', ')}`);
        finalRows.push({ ...row, _errors: [...row._errors, ...rowErrors] });
      }

      setParsedData(finalRows);
      setErrors(finalErrors);
      setImportStats({ total: totalRows, valid: totalRows - finalErrors.length, invalid: finalErrors.length });
      setShowPreview(true);

      if (finalErrors.length === 0) {
        toast.success('File Parsed Successfully!', `${totalRows} valid rows ready to import`);
      } else {
        toast.warning('Validation Complete', `${finalErrors.length} row(s) have errors that need review`);
      }
    } catch (err) {
      setErrors([`Failed to read ${isExcel ? 'Excel' : 'CSV'} file. Ensure it's a valid format.`]);
      toast.error('File Read Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleImport = async () => {
    const validData = parsedData.filter(row => row._errors.length === 0);
    if (validData.length === 0) {
      toast.error('No Valid Items', 'All rows have validation errors. Fix them before importing.');
      return;
    }

    setIsImporting(true);
    let addedCount = 0;

    try {
      if (window.electronAPI && user) {
        for (const row of validData) {
          const result = await window.electronAPI.addStock({
            medicine: {
              name: row.name || '',
              batchNumber: row.batchNumber || `BATCH-${Date.now().toString(36).toUpperCase().slice(-6)}`,
              company: row.company || '',
              strength: null,
              packSize: null,
              quantity: parseInt(row.quantity) || 0,
              mrp: row.mrp || (row.purchasePrice || null),
              purchasePrice: row.purchasePrice || null,
              ptr: null,
              sellingPrice: row.sellingPrice || null,
              purchaseGstPercent: row.gstPercent || 5,
              saleGstPercent: row.gstPercent || 12,
              hsnCode: row.hsnCode || '3004',
              scheduleType: row.scheduleType || 'General',
              barcode: null,
              rackLocation: row.rackLocation || null,
              lowStockAlert: row.lowStockAlert || 20,
              minMarginPercent: 20,
              mfgDate: row.mfgDate || null,
              expiryDate: row.expiryDate || null,
              expiryReturnable: false,
              supplierId: null,
              invoiceNo: null,
              invoiceDate: null,
              schemeQty: 0,
              freeQty: 0,
              prescriptionDoc: null,
            },
            userId: user.id,
          });
          if (result.success) addedCount++;
        }

        await useStockStore.getState().refreshAll();
        
        setSuccess(`Successfully imported ${addedCount} of ${validData.length} items!`);
        toast.success('Import Complete!', `Added ${addedCount} medicines to stock`);
        
        // Clear state after success
        setTimeout(() => {
          setShowPreview(false);
          setParsedData([]);
          setFileName('');
        }, 2000);
      }
    } catch (err: any) {
      toast.error('Import Failed', err.message || 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
    setFileFormat(null);
    setImportStats({ total: 0, valid: 0, invalid: 0 });
    setShowPreview(false);
    setSuccess('');
    setSearchQuery('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeRow = (rowNumber: number) => {
    setParsedData(prev => prev.filter(row => row._rowNumber !== rowNumber));
    setImportStats(prev => ({ ...prev, valid: prev.valid - 1, total: prev.total - 1 }));
  };

  const filteredData = searchQuery
    ? parsedData.filter(row => 
        String(row.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(row.batchNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(row.company || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : parsedData;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground dark:text-foreground">Excel Stock Migration</h2>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Import complete stock data from Excel (.xlsx) or CSV files</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-success-light border border-success/40 rounded-2xl px-5 py-4 animate-fade-in">
          <div className="w-10 h-10 bg-success-light rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <span className="text-success text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Upload Section */}
      {!showPreview && !isProcessing && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-5 h-5 text-accent" />
              Upload Stock File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border dark:border-border rounded-2xl p-10 text-center cursor-pointer hover:border-accent dark:hover:border-accent hover:bg-accent/10 dark:hover:bg-accent/10 transition-all duration-200"
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              <div className="w-20 h-20 bg-accent/10 dark:bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileUp className="w-10 h-10 text-accent dark:text-accent" />
              </div>
              <p className="text-lg font-semibold text-foreground dark:text-foreground mb-2">Click to upload your stock file</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mb-4">Supports Excel (.xlsx, .xls) and CSV files</p>
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-info-light dark:bg-blue-900/30 rounded-lg text-xs text-info dark:text-blue-400 font-semibold">XLSX</span>
                <span className="px-3 py-1 bg-success-light dark:bg-success-light rounded-lg text-xs text-success dark:text-success font-semibold">XLS</span>
                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-xs text-purple-600 dark:text-purple-400 font-semibold">CSV</span>
              </div>
            </div>

            {/* Template */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Need a template?</p>
                  <p className="text-xs text-muted-foreground">Download our CSV template with all supported columns</p>
                </div>
              </div>
              <Button onClick={downloadCSVTemplate} variant="outline-teal" size="sm" className="gap-2">
                <Download className="w-4 h-4" /> Template
              </Button>
            </div>

            {/* Column Info */}
            <Card variant="bordered">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground/80 mb-3">Supported Columns — Auto-detected from file headers</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {MEDICINE_COLUMNS.map(col => (
                    <div key={col.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {col.required ? (
                        <Badge variant="critical" size="sm">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                      {col.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Processing */}
      {isProcessing && (
        <Card variant="bordered">
          <CardContent className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium text-foreground/80">Processing file...</p>
            <p className="text-xs text-muted-foreground mt-1">Parsing data and validating fields</p>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {showPreview && !isProcessing && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-accent to-success">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-white/80 uppercase">Total Items</p>
                <p className="text-2xl font-bold text-white mt-1">{importStats.total}</p>
                <p className="text-[10px] text-white/60 mt-1">from {fileName || 'file'}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-indigo-600">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-white/80 uppercase">Valid</p>
                <p className="text-2xl font-bold text-white mt-1">{importStats.valid}</p>
                <p className="text-[10px] text-white/60 mt-1">Ready to import</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-600">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-white/80 uppercase">Invalid</p>
                <p className="text-2xl font-bold text-white mt-1">{importStats.invalid}</p>
                <p className="text-[10px] text-white/60 mt-1">Needs review</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-accent to-accent/80">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-white/80 uppercase">Format</p>
                <p className="text-2xl font-bold text-white mt-1">{fileFormat?.toUpperCase()}</p>
                <p className="text-[10px] text-white/60 mt-1">{fileFormat === 'xlsx' ? 'Excel file' : 'CSV file'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Validation Errors ({errors.length})
              </p>
              <ul className="space-y-0.5">
                {errors.slice(0, 10).map((err, i) => (
                  <li key={i} className="text-xs text-destructive">{err}</li>
                ))}
                {errors.length > 10 && <li className="text-xs text-destructive font-medium">...and {errors.length - 10} more</li>}
              </ul>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in imported data..."
              className="w-full pl-10 pr-4 h-11 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {/* Data Table */}
          <Card variant="bordered" className="overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">Medicine</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">Batch</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">Company</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-muted-foreground">Qty</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-muted-foreground">Purchase</th>
                    <th className="px-2 py-2.5 text-right font-semibold text-muted-foreground">Sale</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">Expiry</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">GST</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">HSN</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">Status</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.map((row) => {
                    const hasErrors = row._errors.length > 0;
                    return (
                      <tr key={row._rowNumber} className={cn('hover:bg-muted/50 transition-colors', hasErrors && 'bg-destructive/10/40')}>
                        <td className="px-2 py-2 text-muted-foreground/60 font-mono">{row._rowNumber}</td>
                        <td className="px-2 py-2 font-medium text-foreground">{row.name || <span className="text-destructive/80">[Missing]</span>}</td>
                        <td className="px-2 py-2 font-mono text-muted-foreground text-xs">{row.batchNumber || '—'}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.company || '—'}</td>
                        <td className="px-2 py-2 text-right font-bold text-foreground">{row.quantity || 0}</td>
                        <td className="px-2 py-2 text-right text-foreground/80">{row.purchasePrice ? `₹${row.purchasePrice}` : '—'}</td>
                        <td className="px-2 py-2 text-right text-foreground/80">{row.sellingPrice ? `₹${row.sellingPrice}` : '—'}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">{row.expiryDate || '—'}</td>
                        <td className="px-2 py-2 text-center text-indigo-600">{row.gstPercent ? `${row.gstPercent}%` : '—'}</td>
                        <td className="px-2 py-2 text-center text-muted-foreground font-mono text-[10px]">{row.hsnCode || '—'}</td>
                        <td className="px-2 py-2 text-center">
                          {hasErrors ? (
                            <Badge variant="expired" size="sm">Invalid</Badge>
                          ) : (
                            <Badge variant="safe" size="sm">Valid</Badge>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeRow(row._rowNumber)}
                            className="p-1 rounded hover:bg-red-100 text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {importStats.valid} valid items ready · {importStats.invalid} need review
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} size="lg">
                <X className="w-4 h-4 mr-2" /> Clear & Restart
              </Button>
              <Button onClick={handleImport} disabled={isImporting || importStats.valid === 0}
                size="xl" className="gap-2 min-w-[200px] shadow-lg shadow-accent/20">
                {isImporting ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Migrating Stock...</>
                ) : (
                  <><Database className="w-5 h-5" /> Migrate {importStats.valid} Items</>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
