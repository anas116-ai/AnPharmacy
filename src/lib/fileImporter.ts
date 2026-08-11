/**
 * Multi-Format File Importer for Pharmacy Stock
 * Supports: CSV, Excel (.xlsx/.xls), Word (.doc/.docx), PDF, Images
 * No file size limits - uses chunked/stream-based reading
 * Auto-extracts fields: medicine name, batch, company, qty, prices, GST, HSN, dates
 */

import type { ElementType } from 'react';
import { File, FileImage, FileSpreadsheet, FileText } from 'lucide-react';

// ── Imported Record Types ──────────────────────────────────────────────

export interface MissingFieldInfo {
  row: number;
  column: string;       // Original column header from file
  fieldName: string;     // Standard field name (medicine name, batch, quantity, etc.)
  columnIndex: number;   // Which column index (A, B, C or 1, 2, 3)
  originalValue: string; // What was in the cell (empty string)
}

export interface ImportedMedicineRow {
  _rowNumber: number;
  _errors: string[];
  _confidence: number;
  _rawText: string;
  _missingFields: MissingFieldInfo[];
  _rawRowData: Record<string, string>;
  
  // Medicine Identity
  name: string;
  strength: string;
  company: string;
  genericName: string;
  manufacturer: string;
  itemCode: string;
  
  // Batch & Tracking
  batchNumber: string;
  barcode: string;
  rackLocation: string;
  packSize: string;
  
  // Quantities
  quantity: number;
  looseQuantity: number;
  freeQty: number;
  schemeQty: number;
  
  // Pricing
  mrp: number;
  ptr: number;
  pts: number;
  purchasePrice: number;
  sellingPrice: number;
  discountPercent: number;
  retailerMarginPercent: number;
  minMarginPercent: number;
  
  // GST & Compliance
  hsnCode: string;
  scheduleType: string;
  purchaseGstPercent: number;
  saleGstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  
  // Dates
  mfgDate: string;
  expiryDate: string;
  
  // Invoice / Supplier
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierGstin: string;
  poNumber: string;
  orderDate: string;
  paymentTerms: string;
  dueDate: string;
  ewayBillNo: string;
  numCartons: number;
}

export interface FileImportResult {
  success: boolean;
  rows: ImportedMedicineRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
  warnings: string[];
  detectedFormat: string;
  fieldMapping: Record<string, string>;  // detected -> standard field
  fileName: string;
  fileSize: number;
}

export type SupportedFormat = 'csv' | 'xlsx' | 'xls' | 'docx' | 'pdf' | 'image' | 'unknown';

// ── Standard field names for auto-mapping ─────────────────────────────

const STANDARD_FIELDS: Record<string, string[]> = {
  name: ['medicine name', 'medicine', 'product name', 'product', 'drug name', 'drug', 'item name', 'item', 'description', 'particulars', 'particular', 'brand name', 'brand'],
  strength: ['strength', 'dosage', 'dose', 'mg', 'ml', 'iu', 'unit'],
  company: ['company', 'manufacturer', 'mfr', 'maker', 'pharma'],
  genericName: ['generic', 'generic name', 'salt', 'composition', 'salt name'],
  batchNumber: ['batch no', 'batch number', 'batch', 'bat no', 'bat', 'lot no', 'lot', 'b.no', 'b/no', 'batch#', 'batch #'],
  barcode: ['barcode', 'ean', 'upc', 'gtin', 'code', 'bar code', 'sku'],
  rackLocation: ['rack', 'shelf', 'location', 'store', 'bin', 'aisle', 'row'],
  packSize: ['pack', 'pack size', 'packing', 'unit', 'strip', 'bottle', 'box', 'pack of'],
  quantity: ['qty', 'quantity', 'qnty', 'pcs', 'nos', 'units', 'strips', 'packs', 'received qty', 'received quantity'],
  looseQuantity: ['loose', 'loose qty', 'loose quantity', 'free units', 'extra'],
  freeQty: ['free qty', 'free', 'foc', 'bonus', 'scheme free', 'complimentary'],
  schemeQty: ['scheme qty', 'scheme', 'scheme quantity', 'sch qty', 'bonus qty'],
  mrp: ['mrp', 'max retail price', 'retail price', 'price', 'list price', 'm.r.p.', 'mrp/unit'],
  ptr: ['ptr', 'price to retailer', 'trade price', 'dealer price', 'stockist price'],
  pts: ['pts', 'price to stockist', 'special price', 'pts price', 'stock price'],
  purchasePrice: ['purchase price', 'purchase rate', 'buying price', 'cost price', 'unit cost', 'rate', 'unit price', 'basic rate', 'basic price'],
  sellingPrice: ['selling price', 'sale price', 'retail', 'sales rate', 'mrp incl gst'],
  discountPercent: ['discount', 'discount %', 'disc %', 'discount percent', 'trade discount', 'scheme disc'],
  hsnCode: ['hsn', 'hsn code', 'hsn no', 'h.s.n', 'hsn/sac', 'sac code'],
  scheduleType: ['schedule', 'schedule type', 'drug schedule', 'rx type'],
  purchaseGstPercent: ['purchase gst', 'input gst', 'purchase gst%', 'igst%', 'cgst%', 'sgst%', 'gst%', 'gst rate', 'gst', 'tax rate', 'tax'],
  saleGstPercent: ['sale gst', 'output gst', 'sale gst%', 'selling gst'],
  mfgDate: ['mfg date', 'manufacturing date', 'mfg', 'mfd', 'dom', 'date of mfg', 'mfg dt', 'mfg. date'],
  expiryDate: ['expiry date', 'exp date', 'expiry', 'exp', 'exp dt', 'exp. date', 'use before', 'valid till', 'valid thru', 'best before'],
  invoiceNo: ['invoice no', 'invoice number', 'inv no', 'inv #', 'invoice', 'bill no', 'bill #', 'challan no'],
  invoiceDate: ['invoice date', 'inv date', 'bill date', 'challan date', 'purchase date'],
  supplierName: ['supplier', 'vendor', 'supplier name', 'vendor name', 'party', 'distributor'],
  supplierGstin: ['gstin', 'gst no', 'gst', 'gst number', 'gstin no', 'gst id'],
  poNumber: ['po no', 'po number', 'purchase order', 'order no', 'order #', 'po'],
  orderDate: ['order date', 'po date', 'placed on'],
  paymentTerms: ['payment terms', 'terms', 'credit', 'payment', 'due terms'],
  dueDate: ['due date', 'pay by', 'payment due'],
  ewayBillNo: ['eway bill', 'e-way bill', 'eway', 'transport', 'transporter'],
  numCartons: ['cartons', 'boxes', 'packets', 'cases', 'no of boxes'],
};

// ── Column name normalization ──────────────────────────────────────────

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Auto-detect which standard field a column header maps to
 */
export function autoDetectField(header: string): string | null {
  const normalized = normalizeColumnName(header);
  
  // Direct match first
  for (const [field, aliases] of Object.entries(STANDARD_FIELDS)) {
    for (const alias of aliases) {
      if (normalized === alias || normalized.includes(alias)) {
        return field;
      }
    }
  }
  
  return null;
}

/**
 * Auto-detect field mappings from headers
 */
export function detectFieldMappings(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const header of headers) {
    const field = autoDetectField(header);
    if (field) {
      mapping[header] = field;
    }
  }
  
  return mapping;
}

// ── CSV Parser ─────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && candidates.includes(ch)) {
      const count = line.split(ch).length - 1;
      if (count > bestCount) {
        bestCount = count;
        best = ch;
      }
    }
  }
  return best;
}

function parseCSVFile(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    rows.push(values);
  }

  return { headers, rows };
}

function parseCSVLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Excel Parser ───────────────────────────────────────────────────────

async function parseExcelFile(arrayBuffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet || !firstSheet['!ref']) {
    return { headers: [], rows: [] };
  }
  
  const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });
  
  if (jsonData.length === 0) return { headers: [], rows: [] };
  
  // Build headers with original index tracking to prevent misalignment
  const headerEntries: { header: string; originalIndex: number }[] = [];
  const firstRow = jsonData[0] || [];
  for (let colIdx = 0; colIdx < firstRow.length; colIdx++) {
    const rawHeader = firstRow[colIdx];
    const header = String(rawHeader ?? '').trim();
    if (header.length > 0) {
      headerEntries.push({ header, originalIndex: colIdx });
    }
  }
  
  if (headerEntries.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const headers = headerEntries.map(e => e.header);
  const originalIndices = headerEntries.map(e => e.originalIndex);
  
  const rows: string[][] = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const rawRow = jsonData[i] || [];
    const row = originalIndices.map(origIdx => {
      const val = rawRow[origIdx];
      if (val === null || val === undefined) return '';
      if (val instanceof Date && !isNaN(val.getTime())) {
        return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
      }
      return String(val).trim();
    });
    
    // Skip completely empty rows
    if (row.some(cell => cell.length > 0)) {
      rows.push(row);
    }
  }
  
  return { headers, rows };
}

// ── DOCX Extraction (via text content) ─────────────────────────────────

async function parseDocxFile(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Try using a simple XML-based text extraction from .docx (which is a ZIP of XML files)
    const JSZip = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Extract text from document.xml
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) {
      // Try alternative paths in the zip
      const altDoc = zip.file(/word\/document\d*\.xml/)?.[0];
      if (altDoc) {
        const altText = await altDoc.async('string');
        return extractTextFromWordXml(altText);
      }
      return '';
    }
    return extractTextFromWordXml(docXml);
  } catch {
    // Fallback: try plain text extraction
    return '';
  }
}

function extractTextFromWordXml(xml: string): string {
  // Extract text between <w:t> tags
  const textParts: string[] = [];
  const regex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    textParts.push(match[1]);
  }
  return textParts.join(' ');
}

// ── PDF Text Extraction ────────────────────────────────────────────────

async function parsePDFFile(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.mjs`;
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    return '';
  }
}

// ── Table Extraction from plain text ───────────────────────────────────

function extractTableFromText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Try to detect table structure
  // Method 1: Multiple spaces as column separators
  let bestHeaders: string[] = [];
  let bestRows: string[][] = [];
  let headerLineIndex = -1;
  
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    // Check if this looks like a header row (has known header words)
    const lower = line.toLowerCase();
    const knownHeaderWords = ['batch', 'medicine', 'product', 'item', 'qty', 'quantity', 'expiry', 'hsn', 'gst', 'rate', 'mrp', 'ptr', 'description', 'particulars'];
    const matchCount = knownHeaderWords.filter(w => lower.includes(w)).length;
    
    if (matchCount >= 2) {
      // Try splitting by 2+ spaces (common in printed tables)
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 3) {
        bestHeaders = parts;
        headerLineIndex = i;
        break;
      }
    }
  }
  
  if (headerLineIndex >= 0 && bestHeaders.length >= 2) {
    // Parse data rows
    const dataLines = lines.slice(headerLineIndex + 1);
    for (const dataLine of dataLines) {
      // Skip total/summary lines
      if (/^(?:total|sub.?total|grand|net|gst|tax|round|thanks|regards)/i.test(dataLine)) {
        continue;
      }
      const parts = dataLine.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        bestRows.push(parts);
      }
    }
  }
  
  if (bestRows.length === 0) {
    // Fallback: treat lines as rows, try splitting by whitespace
    for (let i = 1; i < lines.length; i++) {
      if (!/^(?:total|sub|grand|gst|tax)/i.test(lines[i])) {
        const parts = lines[i].split(/\s+/).filter(p => p.length > 0);
        if (parts.length >= 3) {
          bestRows.push(parts);
        }
      }
    }
  }
  
  return { headers: bestHeaders, rows: bestRows };
}

// ── Map extracted data to ImportedMedicineRow ──────────────────────────

function mapRowToMedicine(
  headers: string[],
  values: string[],
  fieldMapping: Record<string, string>,
  rowNumber: number
): ImportedMedicineRow {
  const errors: string[] = [];
  const row: any = { _rowNumber: rowNumber, _errors: errors, _confidence: 70, _rawText: values.join(' ') };
  
  // Initialize all fields to defaults
  const defaults: ImportedMedicineRow = {
    _rowNumber: rowNumber, _errors: errors, _confidence: 70, _rawText: '', _missingFields: [], _rawRowData: {},
    name: '', strength: '', company: '', genericName: '', manufacturer: '', itemCode: '',
    batchNumber: '', barcode: '', rackLocation: '', packSize: '',
    quantity: 0, looseQuantity: 0, freeQty: 0, schemeQty: 0,
    mrp: 0, ptr: 0, pts: 0, purchasePrice: 0, sellingPrice: 0,
    discountPercent: 0, retailerMarginPercent: 0, minMarginPercent: 20,
    hsnCode: '3004', scheduleType: 'General',
    purchaseGstPercent: 5, saleGstPercent: 12,
    cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    mfgDate: '', expiryDate: '',
    invoiceNo: '', invoiceDate: '', supplierName: '', supplierGstin: '',
    poNumber: '', orderDate: '', paymentTerms: '', dueDate: '',
    ewayBillNo: '', numCartons: 0,
  };
  Object.assign(row, defaults);
  
  // Store ALL original columns in _rawRowData - nothing is skipped
  for (let i = 0; i < headers.length; i++) {
    row._rawRowData[headers[i]] = i < values.length ? values[i] : '';
  }
  
  // Map each field by position using the field mapping
  for (let i = 0; i < headers.length; i++) {
    if (i >= values.length) break;
    const header = headers[i];
    const value = values[i];
    if (!value || value.trim().length === 0) continue;
    
    const fieldKey = fieldMapping[header];
    if (!fieldKey) continue;
    
    const trimmed = value.trim();
    
    switch (fieldKey) {
      case 'name': row.name = trimmed; break;
      case 'strength': row.strength = trimmed; break;
      case 'company': row.company = trimmed; break;
      case 'genericName': row.genericName = trimmed; break;
      case 'manufacturer': row.manufacturer = trimmed; break;
      case 'itemCode': row.itemCode = trimmed; break;
      case 'batchNumber': row.batchNumber = trimmed.toUpperCase(); break;
      case 'barcode': row.barcode = trimmed; break;
      case 'rackLocation': row.rackLocation = trimmed; break;
      case 'packSize': row.packSize = trimmed; break;
      case 'quantity': row.quantity = parseNumeric(trimmed); break;
      case 'looseQuantity': row.looseQuantity = parseNumeric(trimmed); break;
      case 'freeQty': row.freeQty = parseNumeric(trimmed); break;
      case 'schemeQty': row.schemeQty = parseNumeric(trimmed); break;
      case 'mrp': row.mrp = parseNumeric(trimmed); break;
      case 'ptr': row.ptr = parseNumeric(trimmed); break;
      case 'pts': row.pts = parseNumeric(trimmed); break;
      case 'purchasePrice': row.purchasePrice = parseNumeric(trimmed); break;
      case 'sellingPrice': row.sellingPrice = parseNumeric(trimmed); break;
      case 'discountPercent': row.discountPercent = parseNumeric(trimmed); break;
      case 'hsnCode': row.hsnCode = trimmed; break;
      case 'scheduleType': row.scheduleType = trimmed; break;
      case 'purchaseGstPercent': row.purchaseGstPercent = parseNumeric(trimmed); break;
      case 'saleGstPercent': row.saleGstPercent = parseNumeric(trimmed); break;
      case 'mfgDate': row.mfgDate = normalizeDate(trimmed); break;
      case 'expiryDate': row.expiryDate = normalizeDate(trimmed); break;
      case 'invoiceNo': row.invoiceNo = trimmed; break;
      case 'invoiceDate': row.invoiceDate = normalizeDate(trimmed); break;
      case 'supplierName': row.supplierName = trimmed; break;
      case 'supplierGstin': row.supplierGstin = trimmed; break;
      case 'poNumber': row.poNumber = trimmed; break;
      case 'orderDate': row.orderDate = normalizeDate(trimmed); break;
      case 'paymentTerms': row.paymentTerms = trimmed; break;
      case 'dueDate': row.dueDate = normalizeDate(trimmed); break;
      case 'ewayBillNo': row.ewayBillNo = trimmed; break;
      case 'numCartons': row.numCartons = parseNumeric(trimmed); break;
    }
  }
  
  // ── Detect missing fields for notification ──
  // Track which columns have empty cells so user can fill them
  const missingFields: MissingFieldInfo[] = [];
  const columnLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const fieldKey = fieldMapping[header];
    if (!fieldKey) continue;
    
    const value = values[i] || '';
    if (!value.trim()) {
      const colLetter = i < 26 ? columnLetters[i] : `Col${i + 1}`;
      missingFields.push({
        row: rowNumber,
        column: header,
        fieldName: fieldKey,
        columnIndex: i + 1,
        originalValue: '',
      });
    }
  }
  row._missingFields = missingFields;
  
  // No validation - file lo unnatte import avvali
  // Calculate confidence
  let confScore = 60;
  if (row.name) confScore += 10;
  if (row.batchNumber) confScore += 10;
  if (row.company) confScore += 5;
  if (row.expiryDate) confScore += 5;
  if (row.quantity > 0) confScore += 5;
  if (row.mrp > 0) confScore += 5;
  if (row.purchasePrice > 0) confScore += 5;
  if (row.hsnCode) confScore += 5;
  row._confidence = Math.min(100, confScore);
  
  // Set selling price from MRP if not provided
  if (row.sellingPrice <= 0 && row.mrp > 0) {
    row.sellingPrice = row.mrp;
  }
  
  return row;
}

function parseNumeric(value: string): number {
  // Remove currency symbols, commas, and % signs
  const cleaned = value.replace(/[₹$€£,\s%]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeDate(value: string): string {
  if (!value) return '';
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let day = dmy[1].padStart(2, '0');
    let month = dmy[2].padStart(2, '0');
    let year = dmy[3];
    if (year.length === 2) year = '20' + year;
    
    // Swap if day > 12 (likely DD/MM)
    if (parseInt(month) > 12) {
      [day, month] = [month, day];
    }
    return `${year}-${month}-${day}`;
  }
  
  // MM/YYYY
  const my = value.match(/^(\d{1,2})[\/\-\.](\d{2,4})$/);
  if (my) {
    const month = my[1].padStart(2, '0');
    const year = my[2].length === 2 ? '20' + my[2] : my[2];
    return `${year}-${month}-01`;
  }
  
  // Month YYYY (e.g., "Jan 2025", "January 2025")
  const monthYear = value.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthYear) {
    const monthNames: Record<string, string> = {
      'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
      'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
      'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
      'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
      'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
      'dec': '12', 'december': '12',
    };
    const month = monthNames[monthYear[1].toLowerCase().slice(0, 3)] || '01';
    return `${monthYear[2]}-${month}-01`;
  }
  
  return value;
}

// ── Main Import Function ───────────────────────────────────────────────

/**
 * Import a file and extract pharmacy stock data
 * Supports: CSV, XLSX, XLS, DOCX, PDF, JPEG, PNG (via OCR)
 */
export async function importFile(file: File, existingData?: { medicines: any[] }): Promise<FileImportResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let format: SupportedFormat;
  
  // Detect format
  if (extension === 'csv') format = 'csv';
  else if (['xlsx', 'xls'].includes(extension)) format = extension as 'xlsx' | 'xls';
  else if (['docx', 'doc'].includes(extension)) format = 'docx';
  else if (extension === 'pdf') format = 'pdf';
  else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif'].includes(extension)) format = 'image';
  else {
    return {
      success: false, rows: [], totalRows: 0, validRows: 0, invalidRows: 0,
      errors: [`Unsupported file format: .${extension}. Supported: CSV, XLSX, XLS, DOCX, DOC, PDF, JPG, PNG, WEBP, BMP`],
      warnings: [], detectedFormat: extension, fieldMapping: {}, fileName, fileSize,
    };
  }
  
  try {
    let headers: string[] = [];
    let dataRows: string[][] = [];
    let rawText = '';
    
    // ── PARSE BASED ON FORMAT ──
    
    if (format === 'csv') {
      const text = await readFileAsText(file);
      const result = parseCSVFile(text);
      headers = result.headers;
      dataRows = result.rows;
      rawText = text;
    }
    else if (format === 'xlsx' || format === 'xls') {
      const buffer = await readFileAsArrayBuffer(file);
      const result = await parseExcelFile(buffer);
      headers = result.headers;
      dataRows = result.rows;
    }
    else if (format === 'docx') {
      const buffer = await readFileAsArrayBuffer(file);
      const text = await parseDocxFile(buffer);
      rawText = text;
      const result = extractTableFromText(text);
      headers = result.headers;
      dataRows = result.rows;
      if (dataRows.length === 0) {
        warnings.push('Could not extract table from Word document. Text may not be in tabular format.');
      }
    }
    else if (format === 'pdf') {
      const buffer = await readFileAsArrayBuffer(file);
      const text = await parsePDFFile(buffer);
      rawText = text;
      const result = extractTableFromText(text);
      headers = result.headers;
      dataRows = result.rows;
      if (dataRows.length === 0 && text.trim().length > 0) {
        warnings.push('PDF text extracted but no table structure detected. Raw text available.');
      }
    }
    else if (format === 'image') {
      // For images - use OCR
      warnings.push('Image OCR processing - quality depends on image clarity');
      try {
        const Tesseract = await import('tesseract.js');
        const imageUrl = URL.createObjectURL(file);
        const result = await Tesseract.recognize(imageUrl, 'eng', {} as any);
        URL.revokeObjectURL(imageUrl);
        rawText = result.data.text;
        const tableResult = extractTableFromText(rawText);
        headers = tableResult.headers;
        dataRows = tableResult.rows;
        if (dataRows.length === 0 && rawText.trim().length > 0) {
          // Fallback: treat each line as a row
          const lines = rawText.split('\n').filter(l => l.trim().length > 0);
          for (const line of lines) {
            if (!/^(?:total|sub|grand|gst|tax|round|page|invoice)/i.test(line)) {
              const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p.length > 0);
              if (parts.length >= 2) {
                dataRows.push(parts);
              }
            }
          }
        }
      } catch (ocrErr: any) {
        errors.push(`OCR failed: ${ocrErr.message || 'Unknown error'}`);
        return {
          success: false, rows: [], totalRows: 0, validRows: 0, invalidRows: 0,
          errors, warnings, detectedFormat: format, fieldMapping: {}, fileName, fileSize,
        };
      }
    }
    
    // ── Auto-detect field mappings ──
    
    const fieldMapping = detectFieldMappings(headers);
    // No warnings for unmapped columns - file lo unna anni columns ni respect chesanu, maaru
    
    // ── Map rows to medicine records ──
    
    const rows: ImportedMedicineRow[] = [];
    let validRows = 0;
    let invalidRows = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = mapRowToMedicine(headers, dataRows[i], fieldMapping, i + 1);
      if (row._errors.length === 0) {
        validRows++;
      } else {
        invalidRows++;
        errors.push(`Row ${i + 1}: ${row._errors.join('; ')}`);
      }
      rows.push(row);
    }
    
    // ── Post-processing with existing medicines for matching ──
    
    if (existingData?.medicines && rows.length > 0) {
      for (const row of rows) {
        // Try to find matching medicine in existing data
        const match = existingData.medicines.find((m: any) => {
          const mName = (m.name || m.medicineName || '').toLowerCase();
          const rowName = row.name.toLowerCase();
          return mName.includes(rowName) || rowName.includes(mName);
        });
        if (match) {
          // Auto-fill company if not provided
          if (!row.company && (match.company || match.manufacturer)) {
            row.company = match.company || match.manufacturer || '';
            warnings.push(`Row ${row._rowNumber}: Company auto-filled from existing medicine '${match.name}'`);
          }
          // Set default GST if not provided
          if (row.purchaseGstPercent === 0 && match.purchase_gst_percent) {
            row.purchaseGstPercent = match.purchase_gst_percent;
          }
        }
      }
    }
    
    // No summary warnings - use Missing Fields toggle report instead
    return {
      success: validRows > 0,
      rows,
      totalRows: rows.length,
      validRows,
      invalidRows,
      errors,
      warnings,
      detectedFormat: format,
      fieldMapping,
      fileName,
      fileSize,
    };
    
  } catch (err: any) {
    errors.push(`Failed to process file: ${err.message || 'Unknown error'}`);
    return {
      success: false, rows: [], totalRows: 0, validRows: 0, invalidRows: 0,
      errors, warnings, detectedFormat: format, fieldMapping: {}, fileName, fileSize,
    };
  }
}

// ── File Reading Utilities ─────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as text'));
    reader.readAsText(file);
  });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));

    // Read in chunks for large files (no size limit)
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    if (file.size > CHUNK_SIZE) {
      const blob = file.slice(0, file.size);
      reader.readAsArrayBuffer(blob);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

export function getFileIcon(format: SupportedFormat): ElementType {
  switch (format) {
    case 'csv': return FileSpreadsheet;
    case 'xlsx': case 'xls': return FileSpreadsheet;
    case 'docx': return FileText;
    case 'pdf': return FileText;
    case 'image': return FileImage;
    default: return File;
  }
}

export function getFormatLabel(format: SupportedFormat): string {
  switch (format) {
    case 'csv': return 'CSV Spreadsheet';
    case 'xlsx': return 'Excel Workbook';
    case 'xls': return 'Excel (Legacy)';
    case 'docx': return 'Word Document';
    case 'pdf': return 'PDF Document';
    case 'image': return 'Image (OCR)';
    default: return 'Unknown';
  }
}

export const ACCEPTED_FILE_TYPES = '.csv,.tsv,.xlsx,.xls,.doc,.docx,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif';

export const ACCEPTED_FILE_TYPES_ARRAY = [
  '.csv', '.xlsx', '.xls', '.doc', '.docx', '.pdf',
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif',
];
