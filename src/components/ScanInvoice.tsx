import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useStockStore } from '../stores/stockStore';
import { ScanLine, Camera, Image, FileText, Database, CheckCircle, AlertCircle, X, Edit3, Eye, RefreshCw, Package, Table, List, Columns, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { cn } from '../lib/utils';
import { parseOCRTextEnhanced, getConfidenceColor, getConfidenceLabel, ParsedItem as ParsedItemType, OCRResult } from '../lib/ocrParser';
import { analyzeTableStructure } from '../lib/invoiceTableParser';
import { validateParsedItem } from '../lib/invoiceFieldExtractor';
import { learningEngine } from '../lib/invoiceLearningEngine';
import { TableStructureAnalysis } from '../lib/invoiceTableParser';
import { ItemValidationResult } from '../lib/invoiceFieldExtractor';

interface ParsedItem extends ParsedItemType {}

// ── Extended ParsedItem with full invoice columns ───────────────────
interface InvoiceRow {
  id: string;
  selected: boolean;
  serialNo: string;
  description: string;       // Medicine full description
  batchNo: string;
  expiryDate: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  medicineName: string;      // Cleaned medicine name
  confidence: number;
  rawText: string;
}

// ── Detected headers from invoice ───────────────────────────────────
interface InvoiceHeaders {
  hasSerialNo: boolean;
  hasDescription: boolean;
  hasBatch: boolean;
  hasExpiry: boolean;
  hasQty: boolean;
  hasUnitPrice: boolean;
  hasTotal: boolean;
  hasMfg: boolean;
  originalHeaders: string[];
}

interface FieldValidation {
  field: string;
  originalValue: string;
  normalizedValue: string;
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

interface EnhancedInvoiceRow extends InvoiceRow {
  manufacturer: string;
  hsnCode: string;
  gstRate: number;
  freeQty: number;
  discountPercent: number;
  ptr: number;
  pts: number;
  fieldValidations: FieldValidation[];
  overallConfidence: number;
  isUsable: boolean;
  criticalIssues: string[];
  warnings: string[];
}

// ── Sample invoice with full columns ────────────────────────────────
const sampleInvoiceRows: InvoiceRow[] = [
  { id: 'inv-1', selected: true, serialNo: '1', description: 'Amoxicillin 500mg Capsules (Strip of 10)', batchNo: 'AMXT784', expiryDate: '2028-12-01', qty: 5, unitPrice: 120.00, totalAmount: 600.00, medicineName: 'Amoxicillin 500mg Capsules (Strip of 10)', confidence: 95, rawText: '1 Amoxicillin 500mg AMXT784 12/2028 5 120.00 600.00' },
  { id: 'inv-2', selected: true, serialNo: '2', description: 'Paracetamol 650mg Tablets (Strip of 15)', batchNo: 'PCM902', expiryDate: '2027-08-01', qty: 10, unitPrice: 45.00, totalAmount: 450.00, medicineName: 'Paracetamol 650mg Tablets (Strip of 15)', confidence: 95, rawText: '2 Paracetamol 650mg PCM902 08/2027 10 45.00 450.00' },
  { id: 'inv-3', selected: true, serialNo: '3', description: 'Cetirizine 10mg Tablets (Strip of 10)', batchNo: 'CET21', expiryDate: '2027-04-01', qty: 3, unitPrice: 30.00, totalAmount: 90.00, medicineName: 'Cetirizine 10mg Tablets (Strip of 10)', confidence: 92, rawText: '3 Cetirizine 10mg CET21 04/2027 3 30.00 90.00' },
  { id: 'inv-4', selected: true, serialNo: '4', description: 'Omeprazole 20mg Capsules (Strip of 10)', batchNo: 'OME455', expiryDate: '2028-11-01', qty: 4, unitPrice: 75.00, totalAmount: 300.00, medicineName: 'Omeprazole 20mg Capsules (Strip of 10)', confidence: 92, rawText: '4 Omeprazole 20mg OME455 11/2028 4 75.00 300.00' },
  { id: 'inv-5', selected: true, serialNo: '5', description: 'Ibuprofen 400mg Tablets (Strip of 10)', batchNo: 'IBU332', expiryDate: '2027-09-01', qty: 5, unitPrice: 55.00, totalAmount: 275.00, medicineName: 'Ibuprofen 400mg Tablets (Strip of 10)', confidence: 90, rawText: '5 Ibuprofen 400mg IBU332 09/2027 5 55.00 275.00' },
  { id: 'inv-6', selected: true, serialNo: '6', description: 'Vitamin C 500mg Chewable Tablets (Bot of 30)', batchNo: 'VIT678', expiryDate: '2028-06-01', qty: 2, unitPrice: 250.00, totalAmount: 500.00, medicineName: 'Vitamin C 500mg Chewable Tablets (Bot of 30)', confidence: 88, rawText: '6 Vitamin C 500mg VIT678 06/2028 2 250.00 500.00' },
  { id: 'inv-7', selected: true, serialNo: '7', description: 'Cough Syrup 100ml', batchNo: 'COU109', expiryDate: '2029-02-01', qty: 2, unitPrice: 110.00, totalAmount: 220.00, medicineName: 'Cough Syrup 100ml', confidence: 88, rawText: '7 Cough Syrup 100ml COU109 02/2029 2 110.00 220.00' },
  { id: 'inv-8', selected: true, serialNo: '8', description: 'Antacid Gel 200ml', batchNo: 'ANT881', expiryDate: '2029-01-01', qty: 1, unitPrice: 145.00, totalAmount: 145.00, medicineName: 'Antacid Gel 200ml', confidence: 88, rawText: '8 Antacid Gel 200ml ANT881 01/2029 1 145.00 145.00' },
];

// ── Detect invoice headers from raw text ────────────────────────────
function detectHeadersFromText(text: string): InvoiceHeaders {
  const lower = text.toLowerCase();
  const originalHeaders: string[] = [];
  
  // Check for header patterns in the first 10 lines
  const lines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 10);
  
  for (const line of lines) {
    const trimmed = line.trim();
    const headers = trimmed.split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h.length > 0);
    
    // Check if this line looks like a header row
    let headerCount = 0;
    const detected: string[] = [];
    
    for (const h of headers) {
      const hl = h.toLowerCase();
      if (/(?:s\.?no|#|sl\.?|serial|sr)/i.test(hl)) { detected.push('S.No'); headerCount++; }
      else if (/description|item|product|drug|medicine|particulars/i.test(hl)) { detected.push('Description'); headerCount++; }
      else if (/(?:batch|bat|lot|b\.?no)/i.test(hl)) { detected.push('Batch No'); headerCount++; }
      else if (/(?:expiry|exp|exp\.?date)/i.test(hl)) { detected.push('Expiry'); headerCount++; }
      else if (/(?:mfg|mfd|manufacturing)/i.test(hl)) { detected.push('Mfg Date'); headerCount++; }
      else if (/(?:qty|quantity|pcs|nos|pack)/i.test(hl)) { detected.push('Qty'); headerCount++; }
      else if (/(?:unit\s*price|rate|price|mrp)/i.test(hl)) { detected.push('Unit Price'); headerCount++; }
      else if (/(?:total|amount|value)/i.test(hl)) { detected.push('Total'); headerCount++; }
    }
    
    if (headerCount >= 3) {
      originalHeaders.push(...detected);
      break;
    }
  }
  
  return {
    hasSerialNo: originalHeaders.some(h => /s\.?no|serial/i.test(h)),
    hasDescription: originalHeaders.some(h => /description|item|product/i.test(h)),
    hasBatch: originalHeaders.some(h => /batch/i.test(h)),
    hasExpiry: originalHeaders.some(h => /expiry/i.test(h)),
    hasQty: originalHeaders.some(h => /qty|quantity/i.test(h)),
    hasUnitPrice: originalHeaders.some(h => /unit\s*price|rate|price/i.test(h)),
    hasTotal: originalHeaders.some(h => /total|amount/i.test(h)),
    hasMfg: originalHeaders.some(h => /mfg/i.test(h)),
    originalHeaders,
  };
}

// ── Convert ParsedItem to InvoiceRow ────────────────────────────────
function parsedToInvoiceRow(item: ParsedItem, idx: number): InvoiceRow {
  return {
    id: item.id,
    selected: item.selected,
    serialNo: String(idx + 1),
    description: item.name,
    batchNo: item.batchNumber,
    expiryDate: item.expiryDate,
    qty: item.quantity,
    unitPrice: 0,
    totalAmount: 0,
    medicineName: item.name,
    confidence: item.confidence,
    rawText: item.rawText || '',
  };
}

type SourceType = 'camera' | 'gallery' | 'pdf' | 'sample' | null;
type ScanStage = 'loading' | 'recognizing' | 'parsing' | 'done';

const SOURCES = [
  { type: 'camera' as SourceType, icon: Camera, label: 'Camera', desc: 'Capture invoice with camera', gradient: 'from-blue-500 to-blue-600' },
  { type: 'gallery' as SourceType, icon: Image, label: 'Gallery', desc: 'Select invoice from gallery', gradient: 'from-emerald-500 to-emerald-600' },
  { type: 'pdf' as SourceType, icon: FileText, label: 'PDF', desc: 'Load invoice PDF file', gradient: 'from-accent to-accent/80' },
  { type: 'sample' as SourceType, icon: Database, label: 'Sample Data', desc: 'Use pre-loaded sample for testing', gradient: 'from-amber-500 to-amber-600' },
];

export default function ScanInvoice() {
  const { user } = useAuthStore();
  const { setMedicines } = useStockStore();
  const [selectedSource, setSelectedSource] = useState<SourceType>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState<ScanStage>('loading');
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [invoiceHeaders, setInvoiceHeaders] = useState<InvoiceHeaders>({
    hasSerialNo: true, hasDescription: true, hasBatch: true, hasExpiry: true,
    hasQty: true, hasUnitPrice: true, hasTotal: true, hasMfg: false,
    originalHeaders: ['S.No', 'Description', 'Batch No', 'Expiry', 'Qty', 'Unit Price', 'Total'],
  });
  const [rawText, setRawText] = useState('');
  const [rawTextExpanded, setRawTextExpanded] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<InvoiceRow | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [tableAnalysis, setTableAnalysis] = useState<TableStructureAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fieldValidations, setFieldValidations] = useState<Map<string, ItemValidationResult>>(new Map());
  const [learningStats, setLearningStats] = useState(learningEngine.getStats());

  const resetScanState = useCallback(() => {
    setSelectedSource(null);
    setIsScanning(false);
    setScanProgress(0);
    setScanStage('loading');
    setInvoiceRows([]);
    setOcrResult(null);
    setRawText('');
    setRawTextExpanded(false);
    setSelectedFilePath(null);
    setError('');
    setSuccess('');
  }, []);

  const updateProgress = useCallback((progress: number, stage: ScanStage) => {
    setScanProgress(progress);
    setScanStage(stage);
  }, []);

  // ── Process OCR text ──────────────────────────────────────────────
  const processOCRText = useCallback(async (ocrText: string, ocrConfidence: number) => {
    updateProgress(85, 'parsing');
    
    // Analyze table structure
    const analysis = analyzeTableStructure(ocrText);
    setTableAnalysis(analysis);
    
    // Use enhanced parsing
    const result = parseOCRTextEnhanced(ocrText, []);
    
    // Validate all items
    const validationMap = new Map<string, ItemValidationResult>();
    const validatedRows: EnhancedInvoiceRow[] = result.items.map((item, idx) => {
      const validation = validateParsedItem(item, []);
      validationMap.set(item.id, validation);
      
      return {
        id: item.id,
        selected: validation.isUsable,
        serialNo: String(idx + 1),
        description: item.name,
        batchNo: item.batchNumber,
        expiryDate: item.expiryDate,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        medicineName: item.name,
        confidence: item.confidence,
        rawText: item.rawText || '',
        manufacturer: item.manufacturer,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        freeQty: item.freeQty,
        discountPercent: item.discountPercent,
        ptr: item.ptr,
        pts: item.pts,
        fieldValidations: validation.fields.map(f => ({
          field: f.field,
          originalValue: f.originalValue,
          normalizedValue: f.normalizedValue,
          isValid: f.isValid,
          confidence: f.confidence,
          issues: f.issues,
          suggestions: f.suggestions,
        })),
        overallConfidence: validation.overallConfidence,
        isUsable: validation.isUsable,
        criticalIssues: validation.criticalIssues,
        warnings: validation.warnings,
      };
    });
    
    setFieldValidations(validationMap);
    setRawText(ocrText);
    setSuggestions(result.suggestions);
    
    // Merge OCR confidence
    const finalRows = validatedRows.map(item => ({
      ...item,
      confidence: Math.round((item.confidence + ocrConfidence) / 2),
    }));
    
    updateProgress(100, 'done');
    setInvoiceRows(finalRows);
    setIsScanning(false);
    
    // Update learning stats
    setLearningStats(learningEngine.getStats());
  }, [updateProgress]);

  // ── Extract unit price and total from raw text ────────────────────
  function extractPricesFromRow(text: string): { unitPrice: number; totalAmount: number } {
    const prices = text.match(/\d+\.\d{2}/g);
    if (prices && prices.length >= 2) {
      return {
        unitPrice: parseFloat(prices[prices.length - 2]),
        totalAmount: parseFloat(prices[prices.length - 1]),
      };
    } else if (prices && prices.length === 1) {
      return { unitPrice: parseFloat(prices[0]), totalAmount: 0 };
    }
    return { unitPrice: 0, totalAmount: 0 };
  }

  // ── Run OCR on image ──────────────────────────────────────────────
  const runOCR = useCallback(async (imagePath: string) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStage('loading');
    setError('');
    setInvoiceRows([]);
    setOcrResult(null);

    try {
      const Tesseract = await import('tesseract.js');
      updateProgress(5, 'loading');

      const result = await Tesseract.recognize(
        imagePath, 'eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const pct = Math.round(m.progress * 100);
              updateProgress(10 + Math.round(pct * 0.7), 'recognizing');
            } else if (m.status === 'loading language traineddata') {
              updateProgress(5, 'loading');
            }
          },
        } as any
      );

      const ocrText = result.data.text;
      const confidence = result.data.confidence;
      await processOCRText(ocrText, confidence);
    } catch (err: any) {
      setIsScanning(false);
      setScanProgress(0);
      setError(err.message || 'Failed to process image. Please try again.');
    }
  }, [processOCRText, updateProgress]);

  // ── Run OCR on PDF ────────────────────────────────────────────────
  const runPDFOCR = useCallback(async (pdfPath: string) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStage('loading');
    setError('');
    setInvoiceRows([]);
    setOcrResult(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      }

      updateProgress(5, 'loading');
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
        updateProgress(5 + Math.round((i / pdf.numPages) * 40), 'loading');
      }

      updateProgress(50, 'recognizing');
      const Tesseract = await import('tesseract.js');
      let canvas: HTMLCanvasElement;

      try {
        const page1 = await pdf.getPage(1);
        const viewport = page1.getViewport({ scale: 2.0 });
        canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page1.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        await processOCRText(fullText, 70);
        return;
      }

      const result = await Tesseract.recognize(canvas, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            updateProgress(50 + Math.round(pct * 0.4), 'recognizing');
          }
        },
      } as any);

      const ocrText = result.data.text;
      const ocrConfidence = result.data.confidence;
      const combinedText = fullText + '\n\n--- OCR Extracted ---\n\n' + ocrText;
      setRawText(combinedText);
      await processOCRText(ocrText, ocrConfidence);
    } catch (err: any) {
      setIsScanning(false);
      setScanProgress(0);
      setError(err.message || 'Failed to process PDF. Please try again.');
    }
  }, [processOCRText, updateProgress]);

  // ── Handle source selection ───────────────────────────────────────
  const handleSourceSelect = async (source: SourceType) => {
    setSelectedSource(source);
    setError('');
    setSuccess('');

    if (source === 'sample') {
      setIsScanning(true);
      setScanProgress(30);
      setScanStage('loading');
      setTimeout(() => { setScanProgress(70); setScanStage('recognizing'); }, 400);
      setTimeout(() => {
        setScanProgress(100);
        setScanStage('done');
        setInvoiceHeaders({
          hasSerialNo: true, hasDescription: true, hasBatch: true, hasExpiry: true,
          hasQty: true, hasUnitPrice: true, hasTotal: true, hasMfg: false,
          originalHeaders: ['S.No', 'Description', 'Batch No', 'Expiry', 'Qty', 'Unit Price', 'Total'],
        });
        setInvoiceRows(sampleInvoiceRows.map(r => ({ ...r })));
        setRawText('Sample invoice with 8 medicine items loaded for testing.');
        setOcrResult({
          items: sampleInvoiceRows.map(r => ({
            id: r.id, selected: r.selected, name: r.medicineName,
            batchNumber: r.batchNo, quantity: r.qty, mfgDate: '',
            expiryDate: r.expiryDate, confidence: r.confidence, rawText: r.rawText,
            manufacturer: '', hsnCode: '3004', barcode: '', scheduleType: 'General',
            strength: '', packSize: '', unitPrice: r.unitPrice, purchasePrice: r.unitPrice,
            freeQty: 0, schemeQty: 0, ptr: 0, pts: 0, mrp: r.unitPrice,
            totalAmount: r.totalAmount, taxableValue: r.totalAmount,
            discountPercent: 0, gstRate: 12, cgstAmount: 0, sgstAmount: 0,
            igstAmount: 0, rackLocation: '',
          } as ParsedItem)),
          rawText: 'Sample invoice data loaded for testing purposes.',
          confidence: 95,
        });
        setIsScanning(false);
      }, 1000);
      return;
    }

    if (source === 'camera' || source === 'gallery') {
      try {
        const result = await window.electronAPI?.openImageDialog();
        if (result && !result.canceled && result.filePath) {
          setSelectedFilePath(result.filePath);
          await runOCR(result.filePath);
        } else { resetScanState(); }
      } catch (err: any) {
        setError(err.message || 'Failed to open image dialog');
        resetScanState();
      }
      return;
    }

    if (source === 'pdf') {
      try {
        const result = await window.electronAPI?.openPdfDialog();
        if (result && !result.canceled && result.filePath) {
          setSelectedFilePath(result.filePath);
          await runPDFOCR(result.filePath);
        } else { resetScanState(); }
      } catch (err: any) {
        setError(err.message || 'Failed to open PDF dialog');
        resetScanState();
      }
      return;
    }
  };

  const handleRescan = async () => {
    if (!selectedSource) return;
    if (selectedSource === 'sample') { handleSourceSelect('sample'); return; }
    if (selectedSource === 'pdf') {
      if (!selectedFilePath) {
        const result = await window.electronAPI?.openPdfDialog();
        if (result && !result.canceled && result.filePath) {
          setSelectedFilePath(result.filePath);
          await runPDFOCR(result.filePath);
        }
        return;
      }
      await runPDFOCR(selectedFilePath);
      return;
    }
    if (!selectedFilePath) {
      const result = await window.electronAPI?.openImageDialog();
      if (result && !result.canceled && result.filePath) {
        setSelectedFilePath(result.filePath);
        await runOCR(result.filePath);
      }
      return;
    }
    await runOCR(selectedFilePath);
  };

  const toggleItem = (id: string) => {
    setInvoiceRows(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleEditSave = () => {
    if (editingItem) {
      // Record correction in learning engine
      if (editingItem.medicineName !== editingItem.description) {
        learningEngine.recordCorrection(
          editingItem.medicineName,
          editingItem.description,
          'medicineName',
          { medicineName: editingItem.medicineName }
        );
      }
      
      if (editingItem.batchNo) {
        const originalBatch = editingItem.batchNo;
      }
      
      setInvoiceRows(prev => prev.map(item =>
        item.id === editingItem.id ? {
          ...editingItem,
          medicineName: editingItem.description,
        } : item
      ));
      setEditingItem(null);
      
      // Update learning stats
      setLearningStats(learningEngine.getStats());
    }
  };

  // ── Review Summary ────────────────────────────────────────────────
  const reviewSummary = useMemo(() => {
    const selected = invoiceRows.filter(i => i.selected);
    const totalQty = selected.reduce((s, i) => s + i.qty, 0);
    const totalAmount = selected.reduce((s, i) => s + i.totalAmount, 0);
    let missingBatch = 0, missingExpiry = 0, missingQty = 0, unusable = 0;
    let highConfidence = 0, mediumConfidence = 0, lowConfidence = 0;
    
    for (const item of selected) {
      const enhanced = item as EnhancedInvoiceRow;
      if (!item.batchNo || item.batchNo.startsWith('BATCH-')) missingBatch++;
      if (!item.expiryDate) missingExpiry++;
      if (item.qty <= 0) missingQty++;
      if (!enhanced.isUsable) unusable++;
      
      if (item.confidence > 85) highConfidence++;
      else if (item.confidence >= 65) mediumConfidence++;
      else lowConfidence++;
    }
    
    return {
      totalItems: selected.length,
      totalQty,
      totalAmount,
      missingBatch, missingExpiry, missingQty, unusable,
      highConfidence, mediumConfidence, lowConfidence,
      selected,
    };
  }, [invoiceRows]);

  const handleReview = () => {
    const selectedItems = invoiceRows.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('No items selected. Check the items you want to add.');
      return;
    }
    setShowReview(true);
    setError('');
  };

  // ── Confirm and save to stock (maps ALL EnhancedInvoiceRow fields) ──
  const handleConfirmAddToStock = async () => {
    const selectedItems = invoiceRows.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('No items selected. Check the items you want to add.');
      return;
    }

    setIsConfirming(true);
    setError('');
    let addedCount = 0;
    const now = new Date().toISOString().slice(0, 10);

    try {
      if (window.electronAPI && user) {
        for (const item of selectedItems) {
          const enhanced = item as EnhancedInvoiceRow;
          const result = await window.electronAPI.addStock({
            medicine: {
              name: item.medicineName,
              strength: '',
              batchNumber: item.batchNo || `BATCH-${Date.now().toString(36).toUpperCase().slice(-6)}`,
              packSize: null,
              company: enhanced.manufacturer || '',
              genericName: null,
              quantity: item.qty || 0,
              looseQuantity: 0,
              mrp: item.unitPrice || 0,
              purchasePrice: item.unitPrice || 0,
              ptr: enhanced.ptr || 0,
              pts: enhanced.pts || 0,
              retailerMarginPercent: null,
              sellingPrice: null,
              purchaseGstPercent: enhanced.gstRate || 5,
              saleGstPercent: enhanced.gstRate || 12,
              hsnCode: enhanced.hsnCode || '3004',
              scheduleType: 'General',
              barcode: null,
              rackLocation: null,
              lowStockAlert: 20,
              maxStockLimit: null,
              minMarginPercent: 20,
              mfgDate: null,
              expiryDate: item.expiryDate || null,
              expiryReturnable: false,
              supplierId: null,
              invoiceNo: null,
              invoiceDate: now,
              poNumber: null,
              orderDate: null,
              paymentTerms: null,
              dueDate: null,
              dispatchLocation: null,
              itemCode: null,
              schemeQty: 0,
              freeQty: enhanced.freeQty || 0,
              schemeBonusCode: null,
              discountPercent: enhanced.discountPercent || 0,
              taxableAmount: item.totalAmount || null,
              cgstAmount: null,
              sgstAmount: null,
              igstAmount: null,
              ewayBillNo: null,
              numCartons: 0,
              coldChain: 0,
              prescriptionDoc: null,
            },
            userId: user.id,
          });
          if (result.success) addedCount++;
        }
        await useStockStore.getState().refreshAll();

        setSuccess(`Successfully added ${addedCount} items to stock!`);
        setShowReview(false);
        setInvoiceRows([]);
        setSelectedSource(null);
        setOcrResult(null);
        setTimeout(() => setSuccess(''), 6000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add items');
    } finally {
      setIsConfirming(false);
    }
  };

  const getStageLabel = (): string => {
    switch (scanStage) {
      case 'loading': return 'Loading image...';
      case 'recognizing': return 'Recognizing text...';
      case 'parsing': return 'Analyzing table structure...';
      case 'done': return 'Complete';
      default: return 'Processing...';
    }
  };

  // ── RENDER: Invoice table columns based on detected headers ───────
  const renderTableHeaders = () => {
    const headers = [];
    
    headers.push(<th key="select" className="w-10 px-3 py-3"></th>);
    
    if (invoiceHeaders.hasSerialNo) {
      headers.push(<th key="sno" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-12">S.No</th>);
    }
    
    headers.push(
      <th key="desc" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {invoiceHeaders.hasDescription ? 'Description / Medicine Name' : 'Medicine Name'}
      </th>
    );
    
    if (invoiceHeaders.hasBatch) {
      headers.push(<th key="batch" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batch No</th>);
    }
    
    if (invoiceHeaders.hasExpiry) {
      headers.push(<th key="expiry" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expiry</th>);
    }
    
    if (invoiceHeaders.hasMfg) {
      headers.push(<th key="mfg" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mfg</th>);
    }
    
    if (invoiceHeaders.hasQty) {
      headers.push(<th key="qty" className="px-3 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Qty</th>);
    }
    
    if (invoiceHeaders.hasUnitPrice) {
      headers.push(<th key="price" className="px-3 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unit Price</th>);
    }
    
    if (invoiceHeaders.hasTotal) {
      headers.push(<th key="total" className="px-3 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</th>);
    }
    
    headers.push(<th key="hsn" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">HSN</th>);
    headers.push(<th key="gst" className="px-3 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">GST%</th>);
    headers.push(<th key="mfr" className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mfr</th>);
    
    headers.push(<th key="conf" className="px-3 py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conf</th>);
    headers.push(<th key="edit" className="w-10 px-3 py-3"></th>);
    
    return headers;
  };

  const renderTableRow = (item: InvoiceRow, idx: number) => {
    const enhanced = item as EnhancedInvoiceRow;
    const cells = [];
    
    cells.push(
      <td key="select" className="px-3 py-2.5">
        <input type="checkbox" checked={item.selected} onChange={() => toggleItem(item.id)}
          className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
      </td>
    );
    
    if (invoiceHeaders.hasSerialNo) {
      cells.push(<td key="sno" className="px-3 py-2.5 text-xs text-muted-foreground/60 font-mono">{item.serialNo}</td>);
    }
    
    cells.push(
      <td key="desc" className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug truncate">{item.description}</p>
            {item.description !== item.medicineName && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic truncate">→ {item.medicineName}</p>
            )}
          </div>
          {!enhanced.isUsable && (
            <span title="Has critical issues"><AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" /></span>
          )}
        </div>
      </td>
    );
    
    if (invoiceHeaders.hasBatch) {
      cells.push(<td key="batch" className="px-3 py-2.5 font-mono text-xs text-muted-foreground uppercase">{item.batchNo}</td>);
    }
    
    if (invoiceHeaders.hasExpiry) {
      cells.push(<td key="expiry" className="px-3 py-2.5 text-xs text-muted-foreground">{item.expiryDate || '-'}</td>);
    }
    
    if (invoiceHeaders.hasMfg) {
      cells.push(<td key="mfg" className="px-3 py-2.5 text-xs text-muted-foreground/60">-</td>);
    }
    
    if (invoiceHeaders.hasQty) {
      cells.push(<td key="qty" className="px-3 py-2.5 text-right font-bold text-foreground">{item.qty}</td>);
    }
    
    if (invoiceHeaders.hasUnitPrice) {
      cells.push(<td key="price" className="px-3 py-2.5 text-right text-sm text-foreground/80">{item.unitPrice > 0 ? `₹${item.unitPrice.toFixed(2)}` : '-'}</td>);
    }
    
    if (invoiceHeaders.hasTotal) {
      cells.push(<td key="total" className="px-3 py-2.5 text-right text-sm font-semibold text-foreground">{item.totalAmount > 0 ? `₹${item.totalAmount.toFixed(2)}` : '-'}</td>);
    }
    
    cells.push(<td key="hsn" className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{enhanced.hsnCode}</td>);
    cells.push(<td key="gst" className="px-3 py-2.5 text-right text-xs text-muted-foreground">{enhanced.gstRate > 0 ? `${enhanced.gstRate}%` : '-'}</td>);
    cells.push(<td key="mfr" className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">{enhanced.manufacturer || '-'}</td>);
    
    cells.push(
      <td key="conf" className="px-3 py-2.5 text-center">
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', getConfidenceColor(item.confidence))}>
          {item.confidence}%
        </span>
      </td>
    );
    
    cells.push(
      <td key="edit" className="px-3 py-2.5">
        <button onClick={() => setEditingItem({ ...item })}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <Edit3 className="w-3.5 h-3.5 text-muted-foreground/60" />
        </button>
      </td>
    );
    
    return cells;
  };

  // ═════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Source Selection ── */}
      {invoiceRows.length === 0 && !isScanning && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-white" />
              </div>
              Scan Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-5">Choose a source to scan invoice data from:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SOURCES.map(source => {
                const Icon = source.icon;
                return (
                  <button key={source.type} onClick={() => handleSourceSelect(source.type)} disabled={isScanning}
                    className="group relative p-5 bg-background border-2 border-border rounded-2xl hover:border-accent/40 hover:shadow-sm transition-all duration-200 disabled:opacity-50 text-left">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', source.gradient, 'group-hover:scale-110 transition-transform duration-200 shadow-sm')}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">{source.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{source.desc}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Success / Error ── */}
      {success && (
        <div className="flex items-center gap-3 bg-success-light border border-success/40 rounded-2xl px-5 py-4 animate-fade-in">
          <div className="w-10 h-10 bg-success-light rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <span className="text-success text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl px-5 py-4 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <span className="text-destructive text-sm">{error}</span>
        </div>
      )}

      {/* Learning Stats */}
      {learningStats.totalCorrections > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>AI Learning: {learningStats.totalCorrections} corrections, {learningStats.patternsLearned} patterns learned</span>
        </div>
      )}

      {/* ── Scanning Progress ── */}
      {isScanning && (
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <ScanLine className="w-5 h-5 text-accent animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Scanning Invoice</p>
                  <p className="text-xs text-muted-foreground">{selectedSource === 'sample' ? 'Sample Data' : selectedSource}</p>
                </div>
              </div>
              <Badge variant="outline-teal" size="sm">{getStageLabel()}</Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${scanProgress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">{scanProgress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* ── INVOICE PREVIEW TABLE ── */}
      {invoiceRows.length > 0 && !isScanning && (
        <>
          {/* Detected Headers Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline-teal" size="sm" className="gap-1">
              <Columns className="w-3 h-3" />
              Detected: {invoiceHeaders.originalHeaders.join(' · ') || 'Auto-detected columns'}
            </Badge>
            <Badge variant="outline" size="sm">
              {invoiceRows.length} items
            </Badge>
            <Badge variant="outline" size="sm">
              {invoiceRows.filter(i => i.selected).reduce((s, r) => s + r.qty, 0)} total units
            </Badge>
            {invoiceRows.filter(i => i.selected).reduce((s, r) => s + r.totalAmount, 0) > 0 && (
              <Badge variant="outline-teal" size="sm">
                ₹{invoiceRows.filter(i => i.selected).reduce((s, r) => s + r.totalAmount, 0).toFixed(2)}
              </Badge>
            )}
          </div>

          {/* Main Invoice Table */}
          <Card variant="bordered" className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-accent" />
                  Invoice Preview
                  <Badge variant="outline-teal" size="sm">
                    {invoiceRows.filter(i => i.selected).length} selected
                  </Badge>
                  {ocrResult && (
                    <Badge variant="outline" size="sm" className={cn('border', getConfidenceColor(ocrResult.confidence))}>
                      {getConfidenceLabel(ocrResult.confidence)} ({ocrResult.confidence}%)
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRescan}
                    className="text-accent hover:text-accent hover:bg-accent/10">
                    <RefreshCw className="w-4 h-4 mr-1" /> Rescan
                  </Button>
                  <Button variant="ghost" size="sm"
                    onClick={() => { setInvoiceRows([]); setSelectedSource(null); setOcrResult(null); setRawText(''); }}
                    className="text-muted-foreground/60 hover:text-destructive">
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>{renderTableHeaders()}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoiceRows.map((item, idx) => (
                      <tr key={item.id} className={cn('hover:bg-accent/10/30 transition-colors', !item.selected && 'opacity-50')}>
                        {renderTableRow(item, idx).map((cell, ci) => (
                          <span key={ci}>{cell}</span>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Raw OCR Text */}
          {rawText && (
            <Card variant="bordered">
              <button onClick={() => setRawTextExpanded(!rawTextExpanded)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                  <List className="w-4 h-4 text-muted-foreground/60" />
                  Raw OCR Text
                </span>
                <svg className={cn('w-4 h-4 text-muted-foreground/60 transition-transform', rawTextExpanded && 'rotate-180')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {rawTextExpanded && (
                <div className="px-4 pb-4">
                  <pre className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto font-mono">
                    {rawText}
                  </pre>
                </div>
              )}
            </Card>
          )}

          {/* Summary Card */}
          <Card variant="bordered" className="border-teal-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-foreground/80"><Package className="w-3.5 h-3.5 inline mr-1" />{reviewSummary.totalItems} items</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{reviewSummary.totalQty} total qty</span>
                {reviewSummary.totalAmount > 0 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-muted-foreground font-medium">₹{reviewSummary.totalAmount.toFixed(2)} total</span>
                  </>
                )}
                <span className="text-muted-foreground">|</span>
                {reviewSummary.highConfidence > 0 && <Badge variant="safe" size="sm">{reviewSummary.highConfidence} high</Badge>}
                {reviewSummary.mediumConfidence > 0 && <Badge variant="warning" size="sm">{reviewSummary.mediumConfidence} med</Badge>}
                {reviewSummary.lowConfidence > 0 && <Badge variant="expired" size="sm">{reviewSummary.lowConfidence} low</Badge>}
                {(reviewSummary.missingBatch > 0 || reviewSummary.missingExpiry > 0 || reviewSummary.missingQty > 0) && (
                  <Badge variant="critical" size="sm">
                    {reviewSummary.missingBatch + reviewSummary.missingExpiry + reviewSummary.missingQty} missing
                  </Badge>
                )}
              </div>
              {/* Missing Fields */}
              {(reviewSummary.missingBatch > 0 || reviewSummary.missingExpiry > 0 || reviewSummary.missingQty > 0) && (
                <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-5 gap-y-1 text-[10px]">
                  {reviewSummary.missingBatch > 0 && <span className="text-destructive"><AlertTriangle className="w-3 h-3 inline mr-1" />{reviewSummary.missingBatch} missing batch</span>}
                  {reviewSummary.missingExpiry > 0 && <span className="text-warning"><AlertTriangle className="w-3 h-3 inline mr-1" />{reviewSummary.missingExpiry} missing expiry</span>}
                  {reviewSummary.missingQty > 0 && <span className="text-destructive"><AlertTriangle className="w-3 h-3 inline mr-1" />{reviewSummary.missingQty} zero qty</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card variant="bordered" className="border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-warning">Suggestions</p>
                    <ul className="mt-1 text-xs text-warning space-y-0.5 ml-4 list-disc">
                      {suggestions.slice(0, 5).map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetScanState} size="lg">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleReview}
              disabled={invoiceRows.filter(i => i.selected).length === 0}
              size="xl" className="gap-2">
              <Eye className="w-5 h-5" />
              Review & Confirm ({invoiceRows.filter(i => i.selected).length} items)
            </Button>
          </div>
        </>
      )}

      {/* ── REVIEW DIALOG ── */}
      <Dialog open={showReview} onOpenChange={(o) => !o && setShowReview(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5 text-accent" />
              Review & Confirm Stock Update
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Please review all items below. Only after your confirmation will items be added to stock.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-3 border border-teal-100">
                <p className="text-[10px] font-semibold text-accent uppercase tracking-wider">Total Items</p>
                <p className="text-2xl font-bold text-accent mt-1">{reviewSummary.totalItems}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                <p className="text-[10px] font-semibold text-info uppercase tracking-wider">Total Qty</p>
                <p className="text-2xl font-bold text-info mt-1">{reviewSummary.totalQty}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-warning/20">
                <p className="text-[10px] font-semibold text-warning uppercase tracking-wider">Batches</p>
                <p className="text-2xl font-bold text-warning mt-1">{reviewSummary.selected.length}</p>
              </div>
              <div className="bg-gradient-to-br from-accent/10 to-success-light rounded-xl p-3 border border-accent/30">
                <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  {reviewSummary.totalItems > 0
                    ? Math.round(invoiceRows.filter(i => i.selected).reduce((s, i) => s + i.confidence, 0) / reviewSummary.totalItems) + '%'
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Medicine Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Batch</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Expiry</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Mfr</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Price</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">HSN</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">GST%</th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Conf.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoiceRows.filter(i => i.selected).map((item, idx) => {
                      const enhanced = item as EnhancedInvoiceRow;
                      return (
                      <tr key={item.id} className="hover:bg-accent/10/30">
                        <td className="px-3 py-2 text-muted-foreground/60 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground">
                          <div>
                            <p className="truncate">{item.medicineName}</p>
                            {item.description !== item.medicineName && (
                              <p className="text-[10px] text-muted-foreground/60 italic truncate">→ {item.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground uppercase">{item.batchNo}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.expiryDate || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{enhanced.manufacturer || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-foreground">{item.qty}</td>
                        <td className="px-3 py-2 text-right text-foreground/80">{item.unitPrice > 0 ? `₹${item.unitPrice.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{item.totalAmount > 0 ? `₹${item.totalAmount.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground font-mono">{enhanced.hsnCode}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{enhanced.gstRate > 0 ? `${enhanced.gstRate}%` : '—'}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                            item.confidence > 85 ? 'text-success bg-success-light border-success/40' :
                            item.confidence >= 65 ? 'text-warning bg-warning-light border-amber-200' :
                            'text-destructive bg-destructive/10 border-destructive/20'
                          }`}>{item.confidence}%</span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Missing Fields Warning */}
            {(reviewSummary.missingBatch > 0 || reviewSummary.missingExpiry > 0 || reviewSummary.missingQty > 0) && (
              <div className="p-3 bg-warning-light border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Missing fields detected — please check before confirming
                </p>
                <ul className="mt-1.5 text-xs text-warning space-y-0.5 ml-5 list-disc">
                  {reviewSummary.missingBatch > 0 && <li>{reviewSummary.missingBatch} item(s) have auto-generated batch numbers</li>}
                  {reviewSummary.missingExpiry > 0 && <li>{reviewSummary.missingExpiry} item(s) missing expiry date</li>}
                  {reviewSummary.missingQty > 0 && <li>{reviewSummary.missingQty} item(s) have zero quantity</li>}
                </ul>
              </div>
            )}

            {/* Confirmation Notice */}
            <div className="p-3 bg-info-light border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-info flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Stock will be updated only after you click "Approve & Add to Stock"
              </p>
              <p className="text-[10px] text-info mt-1 ml-5">
                No automatic database updates without your explicit approval.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowReview(false)} disabled={isConfirming}>
              Back to Edit
            </Button>
            <Button onClick={handleConfirmAddToStock} disabled={isConfirming}
              size="xl" className="gap-2 min-w-[220px]">
              {isConfirming ? (
                <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg> Updating Stock...</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Approve & Add to Stock</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        {editingItem && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-accent" />
                Edit Item
              </DialogTitle>
              <DialogClose onClick={() => setEditingItem(null)} />
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="scan-med-name" className="block text-xs font-medium text-muted-foreground mb-1">Medicine Name</label>
                <Input id="scan-med-name" value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value, medicineName: e.target.value })} />
              </div>
              <div>
                <label htmlFor="scan-batch" className="block text-xs font-medium text-muted-foreground mb-1">Batch Number</label>
                <Input id="scan-batch" value={editingItem.batchNo} onChange={(e) => setEditingItem({ ...editingItem, batchNo: e.target.value })} />
              </div>
              <div>
                <label htmlFor="scan-qty" className="block text-xs font-medium text-muted-foreground mb-1">Quantity</label>
                <Input id="scan-qty" type="number" value={editingItem.qty} onChange={(e) => setEditingItem({ ...editingItem, qty: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label htmlFor="scan-expiry" className="block text-xs font-medium text-muted-foreground mb-1">Expiry Date</label>
                <Input id="scan-expiry" type="date" value={editingItem.expiryDate} onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })} />
              </div>
              <div>
                <label htmlFor="scan-unit-price" className="block text-xs font-medium text-muted-foreground mb-1">Unit Price (₹)</label>
                <Input id="scan-unit-price" type="number" step="0.01" value={editingItem.unitPrice} onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label htmlFor="scan-hsn" className="block text-xs font-medium text-muted-foreground mb-1">HSN Code</label>
                <Input id="scan-hsn" value={(editingItem as EnhancedInvoiceRow).hsnCode || ''} onChange={(e) => setEditingItem({ ...(editingItem as EnhancedInvoiceRow), hsnCode: e.target.value } as EnhancedInvoiceRow as InvoiceRow)} />
              </div>
              <div>
                <label htmlFor="scan-gst" className="block text-xs font-medium text-muted-foreground mb-1">GST Rate (%)</label>
                <Input id="scan-gst" type="number" step="0.1" value={(editingItem as EnhancedInvoiceRow).gstRate || 0} onChange={(e) => setEditingItem({ ...(editingItem as EnhancedInvoiceRow), gstRate: parseFloat(e.target.value) || 0 } as EnhancedInvoiceRow as InvoiceRow)} />
              </div>
              <div>
                <label htmlFor="scan-manufacturer" className="block text-xs font-medium text-muted-foreground mb-1">Manufacturer</label>
                <Input id="scan-manufacturer" value={(editingItem as EnhancedInvoiceRow).manufacturer || ''} onChange={(e) => setEditingItem({ ...(editingItem as EnhancedInvoiceRow), manufacturer: e.target.value } as EnhancedInvoiceRow as InvoiceRow)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
