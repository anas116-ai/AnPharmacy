import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X, FileUp, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { parseCSV, downloadCSVTemplate, CSVColumn, ParsedCSVRow, validateMedicineRow } from '../lib/csvParser';
import { useToast } from '../hooks/useToast';

interface DataImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ParsedCSVRow[]) => Promise<void>;
  title?: string;
  description?: string;
}

export default function DataImportDialog({
  isOpen,
  onClose,
  onImport,
  title = 'Import Data',
  description = 'Upload a CSV file to import multiple items at once',
}: DataImportDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, invalid: 0 });

  const MEDICINE_COLUMNS: CSVColumn[] = [
    { key: 'name', label: 'Medicine Name', required: true },
    { key: 'batchNumber', label: 'Batch Number', required: true },
    { key: 'company', label: 'Company', required: false },
    { key: 'quantity', label: 'Quantity', required: true, transform: (v) => parseInt(v) || 0 },
    { key: 'purchasePrice', label: 'Purchase Price', required: false, transform: (v) => v ? parseFloat(v) : null },
    { key: 'sellingPrice', label: 'Selling Price', required: false, transform: (v) => v ? parseFloat(v) : null },
    { key: 'mfgDate', label: 'Manufacturing Date', required: false },
    { key: 'expiryDate', label: 'Expiry Date', required: false },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrors([]);
    setParsedData([]);

    try {
      const text = await file.text();
      const result = parseCSV(text, MEDICINE_COLUMNS);

      if (!result.success || !result.data) {
        setErrors(result.errors);
        toast.error('Import Failed', `Found ${result.errors.length} error(s)`);
        setIsProcessing(false);
        return;
      }

      // Validate each row
      const validatedRows: ParsedCSVRow[] = [];
      const validationErrors: string[] = [];

      result.data.forEach((row) => {
        const rowErrors = validateMedicineRow(row);
        if (rowErrors.length > 0) {
          validationErrors.push(`Row ${row._rowNumber}: ${rowErrors.join(', ')}`);
        }
        validatedRows.push(row);
      });

      setParsedData(validatedRows);
      setErrors(validationErrors);
      setImportStats({
        total: result.totalRows,
        valid: result.validRows,
        invalid: result.invalidRows,
      });

      if (validationErrors.length === 0) {
        toast.success('CSV Parsed Successfully', `${result.validRows} valid rows ready to import`);
      } else {
        toast.warning('Validation Issues', `${validationErrors.length} row(s) have errors`);
      }
    } catch (err) {
      setErrors(['Failed to read file. Please ensure it is a valid CSV.']);
      toast.error('File Read Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    try {
      await onImport(parsedData);
      toast.success('Import Complete', `Successfully imported ${importStats.valid} items`);
      handleClose();
    } catch (err) {
      toast.error('Import Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
    setImportStats({ total: 0, valid: 0, invalid: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
    toast.info('Template Downloaded', 'medicines_import_template.csv');
  };

  const removeRow = (rowNumber: number) => {
    setParsedData(prev => {
      const rowToRemove = prev.find(row => row._rowNumber === rowNumber);
      const wasInvalid = rowToRemove ? rowToRemove._errors.length > 0 : false;

      setImportStats(prev => ({
        ...prev,
        total: prev.total - 1,
        valid: wasInvalid ? prev.valid : prev.valid - 1,
        invalid: wasInvalid ? prev.invalid - 1 : prev.invalid,
      }));

      return prev.filter(row => row._rowNumber !== rowNumber);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border dark:border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              {title}
            </DialogTitle>
            <DialogClose onClick={handleClose} />
          </div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mt-2">
            {description}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 py-4">
          {/* Upload Section */}
          {parsedData.length === 0 && (
            <div className="space-y-4">
              {/* Template Download */}
              <div className="flex items-center justify-between p-4 bg-accent/10 dark:bg-accent/10 border border-teal-200 dark:border-teal-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 dark:bg-accent/10 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-accent dark:text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground dark:text-foreground">
                      Need a template?
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                      Download our CSV template to get started
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline-teal"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Template
                </Button>
              </div>

              {/* File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border dark:border-border rounded-2xl p-8 text-center cursor-pointer hover:border-accent dark:hover:border-accent hover:bg-accent/10/50 dark:hover:bg-accent/10 transition-all duration-200"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-accent/10 dark:bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8 text-accent dark:text-accent" />
                </div>
                <p className="text-base font-medium text-foreground dark:text-foreground mb-1">
                  Upload CSV File
                </p>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mb-3">
                  Click to browse or drag and drop your CSV file here
                </p>
                <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
                  Supports .csv files up to 10MB
                </p>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/40">
                Processing file...
              </p>
            </div>
          )}

          {/* Preview Section */}
          {parsedData.length > 0 && !isProcessing && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-info-light dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-xs text-info dark:text-blue-400 font-medium">Total Rows</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{importStats.total}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Valid</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">{importStats.valid}</p>
                </div>
                <div className="p-3 bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-red-800 rounded-xl">
                  <p className="text-xs text-destructive dark:text-destructive/80 font-medium">Invalid</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-100">{importStats.invalid}</p>
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-4 bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-red-800 rounded-xl max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive dark:text-destructive/80" />
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Validation Errors ({errors.length})
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {errors.slice(0, 10).map((error, idx) => (
                      <li key={idx} className="text-xs text-destructive dark:text-destructive/80">
                        {error}
                      </li>
                    ))}
                    {errors.length > 10 && (
                      <li className="text-xs text-destructive dark:text-destructive/80 font-medium">
                        ...and {errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Data Preview */}
              {parsedData.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/40 mb-2">
                    Preview ({parsedData.length} items)
                  </p>
                  <div className="border border-border dark:border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 dark:bg-muted/60 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Medicine</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Batch</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Company</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Expiry</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {parsedData.map((row) => (
                          <tr key={row._rowNumber} className="hover:bg-muted/50 dark:hover:bg-slate-700/50">
                            <td className="px-3 py-2 text-foreground dark:text-foreground">{row.name}</td>
                            <td className="px-3 py-2 text-muted-foreground dark:text-muted-foreground/60 font-mono text-xs">{row.batchNumber}</td>
                            <td className="px-3 py-2 text-muted-foreground dark:text-muted-foreground/60">{row.company || '-'}</td>
                            <td className="px-3 py-2 text-right text-foreground dark:text-foreground">{row.quantity}</td>
                            <td className="px-3 py-2 text-right text-foreground/80 dark:text-muted-foreground/40">
                              {row.purchasePrice ? `₹${row.purchasePrice}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground dark:text-muted-foreground/60">{row.expiryDate || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => removeRow(row._rowNumber)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-destructive dark:text-destructive/80 transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Global Errors */}
          {errors.length > 0 && parsedData.length === 0 && (
            <div className="p-4 bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive dark:text-destructive/80 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Import Failed
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((error, idx) => (
                      <li key={idx} className="text-xs text-destructive dark:text-destructive/80">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedData.length > 0 && (
          <DialogFooter className="px-6 py-4 border-t border-border dark:border-border bg-muted/50 dark:bg-muted/40/50">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-foreground/80 dark:text-muted-foreground/40">
                  {importStats.valid} {importStats.valid === 1 ? 'item' : 'items'} ready to import
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isProcessing || importStats.valid === 0}
                  size="sm"
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {importStats.valid} Items
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}