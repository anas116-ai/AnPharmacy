/**
 * OCR Parser v5 - MEDICINE-FOCUSED Enterprise Invoice Parser
 * FIXED: MRP != Unit Price | Mfg Date != Expiry Date | Free Qty scanned
 *        Batch false positives fixed | New field scanners added
 */

import { Medicine } from './types';
import { parseInvoiceWithTable, detectAndParseTable, analyzeTableStructure } from './invoiceTableParser';
import { learningEngine } from './invoiceLearningEngine';
import { validateParsedItem } from './invoiceFieldExtractor';

export { analyzeTableStructure } from './invoiceTableParser';
export { validateParsedItem } from './invoiceFieldExtractor';

/** Complete invoice item with ALL possible pharmacy invoice fields */
export interface ParsedItem {
  id: string;
  selected: boolean;
  // Medicine identity
  name: string;
  manufacturer: string;
  batchNumber: string;
  hsnCode: string;
  barcode: string;
  scheduleType: string;
  // Pack details
  strength: string;
  packSize: string;
  // Quantities
  quantity: number;
  freeQty: number;
  schemeQty: number;
  // Dates
  mfgDate: string;
  expiryDate: string;
  // Pricing (per unit)
  mrp: number;
  ptr: number;
  pts: number;
  unitPrice: number;
  purchasePrice: number;
  // Amounts
  totalAmount: number;
  taxableValue: number;
  discountPercent: number;
  // GST
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  // Storage
  rackLocation: string;
  // Parsing
  confidence: number;
  rawText?: string;
}

/** Invoice header information */
export interface InvoiceHeader {
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierAddress: string;
  supplierGstin: string;
  supplierDlNo: string;
  poNumber: string;
  paymentTerms: string;
  dueDate: string;
  transportMode: string;
  vehicleNo: string;
  ewayBillNo: string;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  roundOff: number;
  numItems: number;
  totalQty: number;
}

/** Default invoice header values */
export const DEFAULT_INVOICE_HEADER: InvoiceHeader = {
  invoiceNo: '',
  invoiceDate: '',
  supplierName: '',
  supplierAddress: '',
  supplierGstin: '',
  supplierDlNo: '',
  poNumber: '',
  paymentTerms: '',
  dueDate: '',
  transportMode: '',
  vehicleNo: '',
  ewayBillNo: '',
  subtotal: 0,
  gstTotal: 0,
  grandTotal: 0,
  roundOff: 0,
  numItems: 0,
  totalQty: 0,
};

/** OCR result type */
export interface OCRResult {
  items: ParsedItem[];
  rawText: string;
  confidence: number;
  suggestions?: string[];
}

/**
 * Get confidence color classes for UI display
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (confidence >= 75) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (confidence >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

/**
 * Get confidence label text
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'High Confidence';
  if (confidence >= 75) return 'Good Confidence';
  if (confidence >= 60) return 'Medium Confidence';
  if (confidence >= 40) return 'Low Confidence';
  return 'Poor Confidence';
}

/**
 * Enhanced OCR text parser that extracts structured items from raw OCR text
 */
export function parseOCRTextEnhanced(ocrText: string, existingMedicines: Medicine[]): {
  items: ParsedItem[];
  suggestions: string[];
  confidence: number;
} {
  const suggestions: string[] = [];
  
  // Try table-based parsing first
  const tableResult = detectAndParseTable(ocrText);
  
  if (tableResult && tableResult.rows.length > 0) {
    // Map table rows to parsed items
    const items: ParsedItem[] = [];
    
    for (let i = 0; i < tableResult.rows.length; i++) {
      const fields = tableResult.rows[i].fields;
      
      // Skip summary/total rows
      const rawText = tableResult.rows[i].rawText || '';
      if (/^(?:total|sub.?total|grand|net|gst|tax|round|thanks|regards)/i.test(rawText)) {
        continue;
      }
      
      // Build medicine name from description field
      let medicineName = fields.description || '';
      
      // Try to extract medicine name from raw text if description is empty
      if (!medicineName && rawText) {
        const words = rawText.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
        medicineName = words.slice(0, 3).join(' ') || '';
      }
      
      medicineName = cleanMedicineName(medicineName);
      if (!medicineName || medicineName.length < 2) continue;
      
      const quantity = parseNumericValue(fields.qty) || 0;
      const unitPrice = parseNumericValue(fields.unitPrice) || 0;
      const totalAmount = parseNumericValue(fields.total) || 0;
      const gstRate = parseNumericValue(fields.gst) || 0;
      const freeQty = parseNumericValue(fields.freeQty) || 0;
      
      // Calculate confidence based on field completeness
      let confidence = 70;
      let fieldCount = 0;
      if (medicineName.length > 3) { confidence += 5; fieldCount++; }
      if (fields.batchNo) { confidence += 10; fieldCount++; }
      if (fields.expiry) { confidence += 5; fieldCount++; }
      if (quantity > 0) { confidence += 5; fieldCount++; }
      if (unitPrice > 0) { confidence += 5; fieldCount++; }
      if (fields.hsn) { confidence += 5; fieldCount++; }
      if (gstRate > 0) { confidence += 5; fieldCount++; }
      confidence = Math.min(100, confidence + fieldCount * 2);
      
      items.push({
        id: `ocr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        selected: true,
        name: medicineName,
        manufacturer: fields.manufacturer || '',
        batchNumber: fields.batchNo || '',
        hsnCode: fields.hsn || '3004',
        barcode: '',
        scheduleType: 'General',
        strength: '',
        packSize: '',
        quantity,
        freeQty,
        schemeQty: 0,
        mfgDate: fields.mfg || '',
        expiryDate: fields.expiry || '',
        mrp: 0,
        ptr: parseNumericValue(fields.ptr) || 0,
        pts: parseNumericValue(fields.pts) || 0,
        unitPrice,
        purchasePrice: unitPrice,
        totalAmount,
        taxableValue: 0,
        discountPercent: parseNumericValue(fields.discount) || 0,
        gstRate,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        rackLocation: '',
        confidence,
        rawText,
      });
    }
    
    if (items.length > 0) {
      // Generate suggestions for missing fields
      const missingBatch = items.filter(i => !i.batchNumber).length;
      const missingExpiry = items.filter(i => !i.expiryDate).length;
      const missingQty = items.filter(i => i.quantity <= 0).length;
      
      if (missingBatch > 0) suggestions.push(`${missingBatch} item(s) missing batch numbers`);
      if (missingExpiry > 0) suggestions.push(`${missingExpiry} item(s) missing expiry dates`);
      if (missingQty > 0) suggestions.push(`${missingQty} item(s) missing quantities`);
      
      const avgConfidence = Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length);
      
      return { items, suggestions, confidence: avgConfidence };
    }
  }
  
  // Fallback: line-by-line parsing
  const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
  const items: ParsedItem[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip non-data lines
    if (/^(?:invoice|bill|date|gst|page|total|sub|grand|net|round|thanks|regards|authorized|signature|phone|email)/i.test(line)) {
      continue;
    }
    
    // Try to extract medicine data from the line
    const item = parseLineToItem(line, i);
    if (item) items.push(item);
  }
  
  if (items.length === 0) {
    suggestions.push('No structured data could be extracted. Try manual entry.');
  }
  
  return { items, suggestions, confidence: 40 };
}

/**
 * Clean medicine name from OCR artifacts
 */
function cleanMedicineName(name: string): string {
  return name
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9\s().%\/\[\]\-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse numeric value from string
 */
export function parseNumericValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, '').match(/(\d+\.?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * Parse a single text line into a parsed item
 */
function parseLineToItem(line: string, lineIndex: number): ParsedItem | null {
  // Pattern: start with optional serial number, then medicine name containing letters,
  // then batch (alphanumeric), optional expiry date, quantity, prices
  
  // Enhanced pattern to capture more invoice formats
  const patterns = [
    // Format: S.No Description BatchNo Expiry Qty Rate Total
    /^(?:\d+[\.\)]?\s+)?([A-Za-z][A-Za-z0-9\s().%/]+?)(?:\s{2,}|\t)([A-Z0-9][A-Z0-9\-]{2,14})(?:\s{2,}|\t)(\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})(?:\s{2,}|\t)(\d+)(?:\s{2,}|\t)(\d+\.?\d*)(?:\s{2,}|\t)(\d+\.?\d*)/i,
    // Format: Description BatchNo Expiry Qty Price
    /^([A-Za-z][A-Za-z0-9\s().%/]+?)(?:\s{2,}|\t)([A-Z0-9][A-Z0-9\-]{2,14})(?:\s{2,}|\t)(\d{1,2}[\/\-\.]\d{2,4})(?:\s{2,}|\t)(\d+)(?:\s{2,}|\t)(\d+\.?\d*)/i,
    // Format: Qty Description BatchNo Expiry 
    /^(\d+)(?:\s{2,}|\t)([A-Za-z][A-Za-z0-9\s().%/]+?)(?:\s{2,}|\t)([A-Z0-9][A-Z0-9\-]{2,14})(?:\s{2,}|\t)(\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      // Determine which groups matched based on pattern
      if (pattern === patterns[0]) {
        // S.No Description Batch Expiry Qty Rate Total
        const name = match[1].trim();
        const batch = match[2].trim();
        const expiry = normalizeDate(match[3]);
        const qty = parseInt(match[4]) || 0;
        const rate = parseFloat(match[5]) || 0;
        const total = parseFloat(match[6]) || 0;
        
        if (name.length >= 3 && /[a-zA-Z]/.test(name)) {
          return createParsedItem(name, batch, expiry, qty, rate, total, 0, '', line, 75);
        }
      } else if (pattern === patterns[1]) {
        // Description Batch Expiry Qty Price
        const name = match[1].trim();
        const batch = match[2].trim();
        const expiry = normalizeDate(match[3]);
        const qty = parseInt(match[4]) || 0;
        const rate = parseFloat(match[5]) || 0;
        
        if (name.length >= 3 && /[a-zA-Z]/.test(name)) {
          return createParsedItem(name, batch, expiry, qty, rate, rate * qty, 0, '', line, 70);
        }
      } else if (pattern === patterns[2]) {
        // Qty Description Batch Expiry
        const qty = parseInt(match[1]) || 0;
        const name = match[2].trim();
        const batch = match[3].trim();
        const expiry = normalizeDate(match[4]);
        
        if (name.length >= 3 && /[a-zA-Z]/.test(name)) {
          return createParsedItem(name, batch, expiry, qty, 0, 0, 0, '', line, 65);
        }
      }
    }
  }
  
  return null;
}

/**
 * Create a parsed item from extracted values
 */
function createParsedItem(
  name: string,
  batch: string,
  expiry: string,
  qty: number,
  rate: number,
  total: number,
  gst: number,
  hsn: string,
  rawText: string,
  confidence: number
): ParsedItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    selected: true,
    name: cleanMedicineName(name),
    manufacturer: '',
    batchNumber: batch.toUpperCase(),
    hsnCode: hsn || '3004',
    barcode: '',
    scheduleType: 'General',
    strength: '',
    packSize: '',
    quantity: qty,
    freeQty: 0,
    schemeQty: 0,
    mfgDate: '',
    expiryDate: expiry,
    mrp: 0,
    ptr: 0,
    pts: 0,
    unitPrice: rate,
    purchasePrice: rate,
    totalAmount: total,
    taxableValue: 0,
    discountPercent: 0,
    gstRate: gst || 12,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    rackLocation: '',
    confidence,
    rawText,
  };
}

/**
 * Normalize date to YYYY-MM-DD format
 */
export function normalizeDate(value: string): string {
  if (!value) return '';
  
  const patterns = [
    /^(\d{1,2})[\/\-\.](\d{2,4})$/,           // MM/YYYY or MM/YY
    /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // YYYY-MM-DD
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{1,2})\s*\/\s*(\d{2,4})$/,            // MM / YYYY
    /^([A-Za-z]{3,9})\s+(\d{4})$/,             // Month YYYY
  ];
  
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      if (pattern === patterns[4]) {
        // Month name + year
        const monthNames: Record<string, string> = {
          'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
          'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
          'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
          'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
          'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
          'dec': '12', 'december': '12',
        };
        const month = monthNames[match[1].toLowerCase().slice(0, 3)] || '01';
        const year = match[2].length === 2 ? '20' + match[2] : match[2];
        return `${year}-${month}-01`;
      }
      
      if (match.length === 3) {
        // MM/YYYY or MM/YY
        const month = match[1].padStart(2, '0');
        const year = match[2].length === 2 ? '20' + match[2] : match[2];
        return `${year}-${month}-01`;
      } else if (match.length === 4) {
        // YYYY-MM-DD or DD/MM/YYYY or MM/DD/YYYY
        let year = match[1];
        let month = match[2];
        let day = match[3];
        
        // Detect YYYY-MM-DD format
        if (year.length === 4 && parseInt(year) > 1900) {
          // Already YYYY-MM-DD
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try to detect DD/MM vs MM/DD
        if (year.length === 2) {
          const intYear = parseInt(year);
          year = intYear > 30 ? '19' + year : '20' + year;
        }
        
        if (parseInt(month) > 12) {
          // DD/MM format - swap month and day
          [month, day] = [day, month];
        }
        
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return value;
}

/**
 * Scan invoice-level headers from text
 */
export function scanInvoiceHeaders(text: string): InvoiceHeader {
  const header: InvoiceHeader = { ...DEFAULT_INVOICE_HEADER };
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    
    // Invoice number
    const invMatch = trimmed.match(/(?:invoice|bill|inv)\s*(?:no|#|number|\.)\s*[:#]?\s*([A-Z0-9\/-]+)/i);
    if (invMatch && !header.invoiceNo) header.invoiceNo = invMatch[1];
    
    // Date
    const dateMatch = trimmed.match(/(?:date|dated)\s*[:#]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dateMatch && !header.invoiceDate) header.invoiceDate = dateMatch[1];
    
    // GSTIN
    const gstinMatch = trimmed.match(/(?:gstin|gst\s*no|gst)\s*[:#]?\s*([0-9A-Z]{15})/i);
    if (gstinMatch && !header.supplierGstin) header.supplierGstin = gstinMatch[1];
    
    // Supplier name (first line that looks like a company name)
    if (!header.supplierName && /^[A-Za-z\s]+$/.test(trimmed) && trimmed.length > 5) {
      if (!/(?:invoice|bill|date|gst|phone|email|www|page|ref)/i.test(trimmed)) {
        header.supplierName = trimmed;
      }
    }
    
    // E-way bill
    const ewayMatch = trimmed.match(/(?:eway|e-way)\s*(?:bill)?\s*[:#]?\s*([A-Z0-9]+)/i);
    if (ewayMatch && !header.ewayBillNo) header.ewayBillNo = ewayMatch[1];
    
    // Grand total
    const totalMatch = trimmed.match(/(?:grand\s*total|net\s*amount|total\s*amount)\s*[:#]?\s*(?:rs\.?|inr)?\s*([0-9,]+\.\d{2})/i);
    if (totalMatch && !header.grandTotal) {
      header.grandTotal = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
    }
  }
  
  return header;
}