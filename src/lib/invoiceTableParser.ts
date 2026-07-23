/**
 * Invoice Table Parser - Extracts structured table data from OCR text
 * 
 * Handles the core challenge of invoice scanning: different manufacturers
 * use different column headers and layouts. This module detects the
 * invoice structure and maps it to our standard fields.
 * 
 * Pipeline:
 * 1. Detect header row patterns
 * 2. Identify column positions and boundaries
 * 3. Parse data rows with field mapping
 * 4. Validate and normalize extracted data
 */

import { ParsedItem, InvoiceHeader, DEFAULT_INVOICE_HEADER } from './ocrParser';
import { Medicine } from './types';

// ── Standard column mapping ──────────────────────────────────────────

export interface ColumnMapping {
  standardField: string;      // Our standard field name
  originalHeader?: string;    // Original header text from invoice
  confidence: number;         // How confident we are this mapping is correct
  required: boolean;          // Is this field required?
}

export interface DetectedTable {
  headers: ColumnMapping[];
  originalHeaderText: string;
  rows: TableRow[];
  confidence: number;
  tableType: 'standard' | 'compact' | 'extended' | 'unknown';
}

export interface TableRow {
  rawText: string;
  fields: Record<string, string>;
  confidence: number;
  lineIndex: number;
}

// ── Header detection patterns ────────────────────────────────────────

const HEADER_PATTERNS: Record<string, RegExp[]> = {
  serialNo: [
    /^(?:s\.?\s*no|sr\.?\s*no|sl\.?\s*no|#|serial|item\s*no|ref)\s*$/i,
    /^(?:sno|sn|no\.?)\s*$/i,
  ],
  description: [
    /^(?:description|item\s*name|product\s*name|medicine\s*name|drug\s*name|particulars|name\s*of\s*product|item\s*description)\s*$/i,
    /^(?:product|medicine|drug|item)\s*$/i,
  ],
  batchNo: [
    /^(?:batch\s*(?:no|number)?|bat\.?\s*no|lot\s*(?:no|number)?|b\.?\s*no)\s*$/i,
    /^(?:batch|lot|bat)\s*$/i,
  ],
  expiry: [
    /^(?:exp(?:iry)?(?:\s*date)?|exp\.?\s*dt|expiry\s*date|valid\s*(?:upto|thru)|use\s*before)\s*$/i,
    /^(?:exp|expiry)\s*$/i,
  ],
  mfg: [
    /^(?:mfg(?:\s*date)?|mfd(?:\s*date)?|manuf(?:acturing)?(?:\s*date)?|mfg\s*dt|dom)\s*$/i,
    /^(?:mfg|mfd|mfr)\s*$/i,
  ],
  qty: [
    /^(?:qty|quantity|qnty|pcs|nos|units?|packs?|strips?|boxes?|bottles?|vials?|nos\.?|pcs\.?)\s*$/i,
    /^(?:qty|qnty)\s*$/i,
  ],
  unitPrice: [
    /^(?:unit\s*price|rate|price|mrp|sales\s*price|basic\s*price|net\s*rate)\s*$/i,
    /^(?:rate|price)\s*$/i,
  ],
  total: [
    /^(?:total|amount|value|gross\s*(?:amt|amount)|net\s*(?:amt|amount)|sub\s*total)\s*$/i,
    /^(?:total|amt)\s*$/i,
  ],
  hsn: [
    /^(?:hsn|h\.?s\.?n|hsn\s*code)\s*$/i,
    /^(?:hsn)\s*$/i,
  ],
  gst: [
    /^(?:gst(?:\s*rate)?|tax(?:\s*rate)?|igst|cgst|sgst)\s*$/i,
    /^(?:gst|tax)\s*$/i,
  ],
  manufacturer: [
    /^(?:manufacturer|mfr(?:\s*name)?|company|brand|supplier|vendor|made\s*by)\s*$/i,
    /^(?:manufacturer|company)\s*$/i,
  ],
  freeQty: [
    /^(?:free(?:\s*qty)?|foc|bonus|scheme|extra)\s*$/i,
    /^(?:free|foc)\s*$/i,
  ],
  scheme: [
    /^(?:scheme(?:\s*qty)?|sch\s*qty|scheme\s*bonus)\s*$/i,
    /^(?:scheme)\s*$/i,
  ],
  discount: [
    /^(?:disc(?:ount)?(?:\s*%)?|discount(?:\s*rate)?|disc\s*%)\s*$/i,
    /^(?:disc|discount)\s*$/i,
  ],
  ptr: [
    /^(?:ptr|ptr\s*price|trade\s*price)\s*$/i,
    /^(?:ptr)\s*$/i,
  ],
  pts: [
    /^(?:pts|pts\s*price|special\s*price)\s*$/i,
    /^(?:pts)\s*$/i,
  ],
};

// ── Field value patterns ─────────────────────────────────────────────

const FIELD_PATTERNS: Record<string, RegExp> = {
  serialNo: /^(\d{1,3})$/,
  batchNo: /^([A-Z0-9\-]{3,15})$/i,
  expiry: /^(\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})$/,
  mfg: /^(\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})$/,
  qty: /^(\d{1,5})$/,
  unitPrice: /^(\d+\.\d{1,2}|\d+)$/,
  total: /^(\d+\.\d{1,2}|\d+)$/,
  hsn: /^(\d{4,8})$/,
  gst: /^(\d{1,2}(?:\.\d{1,2})?)\s*%?$/i,
  freeQty: /^(\d{1,5})$/,
  discount: /^(\d{1,2}(?:\.\d{1,2})?)\s*%?$/i,
  ptr: /^(\d+\.\d{1,2}|\d+)$/,
  pts: /^(\d+\.\d{1,2}|\d+)$/,
};

// ── Detect table headers from text ───────────────────────────────────

export function detectTableHeaders(text: string): { headers: string[]; lineIndex: number } | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    const tokens = tokenizeHeaderLine(line);
    
    if (tokens.length < 2) continue;
    
    const matchedHeaders: string[] = [];
    for (const token of tokens) {
      const normalizedToken = normalizeHeaderToken(token);
      const fieldName = matchHeaderToken(normalizedToken);
      if (fieldName && !matchedHeaders.includes(fieldName)) {
        matchedHeaders.push(fieldName);
      }
    }
    
    if (matchedHeaders.length >= 2) {
      return {
        headers: matchedHeaders,
        lineIndex: i,
      };
    }
  }
  
  return null;
}

// ── Tokenize a header line into individual column headers ─────────────

function tokenizeHeaderLine(line: string): string[] {
  const tokens: string[] = [];
  
  const spaceSplit = line.split(/\s{2,}/).map(t => t.trim()).filter(t => t.length > 0);
  if (spaceSplit.length >= 2) {
    tokens.push(...spaceSplit);
  }
  
  const tabSplit = line.split('\t').map(t => t.trim()).filter(t => t.length > 0);
  if (tabSplit.length >= 2 && tabSplit.length > tokens.length) {
    tokens.length = 0;
    tokens.push(...tabSplit);
  }
  
  const pipeSplit = line.split('|').map(t => t.trim()).filter(t => t.length > 0);
  if (pipeSplit.length >= 2 && pipeSplit.length > tokens.length) {
    tokens.length = 0;
    tokens.push(...pipeSplit);
  }
  
  if (tokens.length < 2) {
    const words = line.split(/\s+/).filter(w => w.length > 0);
    const groups: string[] = [];
    let current = '';
    for (const word of words) {
      if (word.length <= 3 && current) {
        current += ' ' + word;
      } else {
        if (current) groups.push(current);
        current = word;
      }
    }
    if (current) groups.push(current);
    if (groups.length >= 2) {
      tokens.length = 0;
      tokens.push(...groups);
    }
  }
  
  return tokens;
}

// ── Normalize a header token for matching ────────────────────────────

function normalizeHeaderToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[\.\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Match a normalized token to a standard field ─────────────────────

function matchHeaderToken(token: string): string | null {
  for (const [fieldName, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(token)) {
        return fieldName;
      }
    }
  }
  return null;
}

// ── Parse table rows from text after header detection ────────────────

export function parseTableRows(
  text: string,
  headerLineIndex: number,
  headers: string[]
): TableRow[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const dataLines = lines.slice(headerLineIndex + 1);
  
  const rows: TableRow[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    
    if (/^(?:total|sub.?total|grand\s*total|gst|tax|round\s*off|net\s*payable|amount\s*payable|thanks|regards|authorized|signature)/i.test(line)) {
      continue;
    }
    
    if (/^(?:page|date|time|ref|invoice|bill)\s*[:#]/i.test(line)) {
      continue;
    }
    
    const fields = parseRowFields(line, headers);
    
    const meaningfulFields = Object.entries(fields).filter(([_, v]) => v && v.trim().length > 0);
    if (meaningfulFields.length >= 2) {
      rows.push({
        rawText: line,
        fields,
        confidence: calculateRowConfidence(fields, headers),
        lineIndex: headerLineIndex + 1 + i,
      });
    }
  }
  
  return rows;
}

// ── Parse individual row fields ──────────────────────────────────────

function parseRowFields(line: string, expectedHeaders: string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  
  let tokens = line.split(/\s{2,}/).map(t => t.trim()).filter(t => t.length > 0);
  
  if (tokens.length < expectedHeaders.length) {
    tokens = line.split(/\s+/).filter(t => t.length > 0);
  }
  
  for (let i = 0; i < Math.min(tokens.length, expectedHeaders.length); i++) {
    fields[expectedHeaders[i]] = tokens[i];
  }
  
  if (tokens.length > expectedHeaders.length && expectedHeaders.includes('description')) {
    const descIndex = expectedHeaders.indexOf('description');
    const extraTokens = tokens.slice(descIndex + 1);
    if (extraTokens.length > 0) {
      fields['description'] = (fields['description'] || '') + ' ' + extraTokens.join(' ');
      fields['description'] = fields['description'].trim();
    }
  }
  
  if (!fields['description'] && tokens.length > 0) {
    const firstTextToken = tokens.find(t => /[a-zA-Z]/.test(t) && !/^\d+$/.test(t));
    if (firstTextToken) {
      fields['description'] = firstTextToken;
    }
  }
  
  return fields;
}

// ── Calculate confidence for a parsed row ────────────────────────────

function calculateRowConfidence(fields: Record<string, string>, headers: string[]): number {
  let confidence = 50;
  let fieldCount = 0;
  
  for (const header of headers) {
    const value = fields[header];
    if (!value || value.trim().length === 0) continue;
    
    fieldCount++;
    
    switch (header) {
      case 'serialNo':
        if (/^\d{1,3}$/.test(value)) confidence += 10;
        break;
      case 'batchNo':
        if (/^[A-Z0-9\-]{3,15}$/i.test(value)) confidence += 15;
        break;
      case 'expiry':
      case 'mfg':
        if (/\d{1,2}[\/\-\.]\d{2,4}/.test(value) || /\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/.test(value)) {
          confidence += 10;
        }
        break;
      case 'qty':
        if (/^\d{1,5}$/.test(value) && parseInt(value) > 0) confidence += 10;
        break;
      case 'unitPrice':
      case 'total':
        if (/^\d+\.\d{1,2}$/.test(value) && parseFloat(value) > 0) confidence += 10;
        break;
      case 'description':
        if (value.length >= 3 && /[a-zA-Z]/.test(value)) confidence += 10;
        break;
      case 'hsn':
        if (/^\d{4,8}$/.test(value)) confidence += 10;
        break;
      case 'gst':
        if (/^\d{1,2}(?:\.\d{1,2})?\s*%?$/i.test(value)) confidence += 10;
        break;
    }
  }
  
  confidence += fieldCount * 3;
  
  return Math.min(confidence, 100);
}

// ── Main table detection and parsing function ────────────────────────

export function detectAndParseTable(text: string): DetectedTable | null {
  const headerResult = detectTableHeaders(text);
  if (!headerResult) {
    return null;
  }
  
  const normalizedHeaders = headerResult.headers.map(h => {
    const mapping: Record<string, string> = {
      'serialNo': 'serialNo',
      'description': 'description',
      'batchNo': 'batchNo',
      'expiry': 'expiry',
      'mfg': 'mfg',
      'qty': 'qty',
      'unitPrice': 'unitPrice',
      'total': 'total',
      'hsn': 'hsn',
      'gst': 'gst',
      'manufacturer': 'manufacturer',
      'freeQty': 'freeQty',
      'discount': 'discount',
      'ptr': 'ptr',
      'pts': 'pts',
    };
    return mapping[h] || h;
  });
  
  const rows = parseTableRows(text, headerResult.lineIndex, normalizedHeaders);
  const tableType = determineTableType(normalizedHeaders);
  const confidence = rows.length > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length)
    : 0;
  
  return {
    headers: normalizedHeaders.map(h => ({
      standardField: h,
      confidence: 90,
      required: ['description', 'qty', 'batchNo', 'expiry'].includes(h),
    })),
    originalHeaderText: text.split('\n')[headerResult.lineIndex] || '',
    rows,
    confidence,
    tableType,
  };
}

// ── Determine table type based on headers ────────────────────────────

function determineTableType(headers: string[]): DetectedTable['tableType'] {
  if (headers.length >= 10) return 'extended';
  if (headers.length >= 7) return 'standard';
  if (headers.length >= 4) return 'compact';
  return 'unknown';
}

// ── Convert detected table to ParsedItem format ──────────────────────

export function tableRowToParsedItem(
  row: TableRow,
  rowIndex: number,
  existingMedicines: Medicine[]
): ParsedItem | null {
  const fields = row.fields;
  
  let medicineName = fields.description || '';
  if (!medicineName || medicineName.trim().length < 2) {
    return null;
  }
  
  medicineName = cleanMedicineName(medicineName);
  
  const quantity = extractNumber(fields.qty) || 0;
  const unitPrice = extractNumber(fields.unitPrice) || extractNumber(fields.total) || 0;
  const totalAmount = extractNumber(fields.total) || (unitPrice * quantity);
  
  let confidence = row.confidence;
  
  const existingMatch = existingMedicines.find(m => 
    m.name.toLowerCase() === medicineName.toLowerCase()
  );
  if (existingMatch) {
    confidence = Math.min(confidence + 15, 100);
  }
  
  if (quantity <= 0 && !fields.qty) {
    confidence -= 10;
  }
  
  return {
    id: `tbl-${Date.now()}-${rowIndex}-${Math.random().toString(36).slice(2, 7)}`,
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
    freeQty: extractNumber(fields.freeQty) || 0,
    schemeQty: 0,
    mfgDate: fields.mfg || '',
    expiryDate: fields.expiry || '',
    mrp: 0,
    ptr: extractNumber(fields.ptr) || 0,
    pts: extractNumber(fields.pts) || 0,
    unitPrice,
    purchasePrice: unitPrice,
    totalAmount,
    taxableValue: 0,
    discountPercent: extractNumber(fields.discount) || 0,
    gstRate: extractNumber(fields.gst) || 12,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    rackLocation: '',
    confidence,
    rawText: row.rawText,
  };
}

// ── Helper: Clean medicine name ──────────────────────────────────────

function cleanMedicineName(name: string): string {
  return name
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9\s().%\/\[\]\-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Helper: Extract number from string ───────────────────────────────

function extractNumber(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+\.?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

// ── Parse full invoice with table detection ──────────────────────────

export function parseInvoiceWithTable(
  ocrText: string,
  existingMedicines: Medicine[] = []
): { items: ParsedItem[]; header: InvoiceHeader; confidence: number } {
  const table = detectAndParseTable(ocrText);
  
  if (table && table.rows.length > 0) {
    const items: ParsedItem[] = [];
    for (let i = 0; i < table.rows.length; i++) {
      const item = tableRowToParsedItem(table.rows[i], i, existingMedicines);
      if (item) {
        items.push(item);
      }
    }
    
    if (items.length > 0) {
      const header = scanInvoiceHeaders(ocrText);
      const confidence = Math.round(
        (table.confidence + items.reduce((sum, item) => sum + item.confidence, 0) / items.length) / 2
      );
      
      return { items, header, confidence };
    }
  }
  
  return {
    items: [],
    header: { ...DEFAULT_INVOICE_HEADER },
    confidence: 0,
  };
}

// ── Scan invoice headers (standalone) ────────────────────────────────

function scanInvoiceHeaders(text: string): InvoiceHeader {
  const h: InvoiceHeader = { ...DEFAULT_INVOICE_HEADER };
  const lines = text.split('\n');
  
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    
    const invMatch = line.match(/(?:invoice|bill|inv)\s*(?:no|#|number)\s*[:#]?\s*([A-Z0-9\/-]+)/i);
    if (invMatch && !h.invoiceNo) h.invoiceNo = invMatch[1];
    
    const dateMatch = line.match(/(?:date|dated)\s*[:#]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dateMatch && !h.invoiceDate) h.invoiceDate = dateMatch[1];
    
    const gstinMatch = line.match(/(?:gstin|gst no|gst)\s*[:#]?\s*([0-9A-Z]{15})/i);
    if (gstinMatch && !h.supplierGstin) h.supplierGstin = gstinMatch[1];
    
    if (!h.supplierName && /^[A-Za-z]/.test(line) && line.length > 5 && !/(?:invoice|bill|date|gst|phone|email|www\.)/i.test(line)) {
      h.supplierName = line.trim();
    }
  }
  
  return h;
}

// ── Table structure analysis ─────────────────────────────────────────

export interface TableStructureAnalysis {
  hasClearHeaders: boolean;
  columnCount: number;
  rowCount: number;
  detectedFields: string[];
  missingCriticalFields: string[];
  suggestions: string[];
}

export function analyzeTableStructure(text: string): TableStructureAnalysis {
  const detectedFields: string[] = [];
  const suggestions: string[] = [];
  let columnCount = 0;
  let rowCount = 0;
  
  const headerResult = detectTableHeaders(text);
  if (headerResult) {
    detectedFields.push(...headerResult.headers);
    columnCount = headerResult.headers.length;
  }
  
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const criticalFields = ['description', 'qty', 'batchNo', 'expiry'];
  const missingCriticalFields = criticalFields.filter(f => !detectedFields.includes(f));
  
  for (const line of lines) {
    if (/^\d+[\.\)]\s/.test(line) || /^[A-Z]/.test(line)) {
      rowCount++;
    }
  }
  
  if (missingCriticalFields.includes('description')) {
    suggestions.push('Invoice may not have clear medicine name column - check OCR quality');
  }
  if (missingCriticalFields.includes('batchNo')) {
    suggestions.push('Batch number column not detected - batch tracking may be incomplete');
  }
  if (missingCriticalFields.includes('expiry')) {
    suggestions.push('Expiry date column not detected - please verify expiry dates manually');
  }
  if (missingCriticalFields.includes('qty')) {
    suggestions.push('Quantity column not detected - please verify quantities manually');
  }
  if (columnCount < 3) {
    suggestions.push('Limited columns detected - invoice format may be non-standard');
  }
  
  return {
    hasClearHeaders: headerResult !== null,
    columnCount,
    rowCount,
    detectedFields,
    missingCriticalFields,
    suggestions,
  };
}

// ── Export utility functions ─────────────────────────────────────────

export function getStandardFieldLabels(): Record<string, string> {
  return {
    serialNo: 'S.No',
    description: 'Medicine Name / Description',
    batchNo: 'Batch No',
    expiry: 'Expiry Date',
    mfg: 'Mfg Date',
    qty: 'Quantity',
    unitPrice: 'Unit Price (₹)',
    total: 'Total Amount (₹)',
    hsn: 'HSN Code',
    gst: 'GST %',
    manufacturer: 'Manufacturer',
    freeQty: 'Free Qty',
    discount: 'Discount %',
    ptr: 'PTR (₹)',
    pts: 'PTS (₹)',
  };
}

export function normalizeFieldValue(field: string, value: string): string {
  if (!value) return '';
  
  switch (field) {
    case 'expiry':
    case 'mfg':
      return normalizeDate(value);
    case 'qty':
    case 'freeQty':
      const qty = parseInt(value);
      return isNaN(qty) ? '' : qty.toString();
    case 'unitPrice':
    case 'total':
    case 'ptr':
    case 'pts':
      const price = parseFloat(value);
      return isNaN(price) ? '' : price.toFixed(2);
    case 'batchNo':
      return value.toUpperCase().trim();
    case 'gst':
    case 'discount':
      const rate = parseFloat(value);
      return isNaN(rate) ? '' : rate.toString();
    default:
      return value.trim();
  }
}

function normalizeDate(value: string): string {
  const patterns = [
    /^(\d{1,2})[\/\-\.](\d{2,4})$/,           // MM/YYYY or MM/YY
    /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // YYYY-MM-DD
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/, // DD/MM/YYYY or MM/DD/YYYY
  ];
  
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      if (match.length === 3) {
        const month = match[1].padStart(2, '0');
        const year = match[2].length === 2 ? '20' + match[2] : match[2];
        return `${year}-${month}-01`;
      } else if (match.length === 4) {
        let year = match[1];
        let month = match[2];
        let day = match[3];
        
        if (year.length === 2) {
          year = parseInt(year) > 30 ? '19' + year : '20' + year;
        }
        
        if (parseInt(month) > 12) {
          [month, day] = [day, month];
        }
        
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return value;
}

// ── Merge multiple invoice tables ────────────────────────────────────

export function mergeInvoiceTables(
  tables: DetectedTable[]
): DetectedTable | null {
  if (tables.length === 0) return null;
  if (tables.length === 1) return tables[0];
  
  const baseTable = tables.reduce((best, table) => 
    table.confidence > best.confidence ? table : best
  );
  
  const allRows = [...baseTable.rows];
  for (const table of tables) {
    if (table !== baseTable) {
      for (const row of table.rows) {
        const isDuplicate = allRows.some(r => 
          r.rawText === row.rawText || 
          (r.fields.batchNo && row.fields.batchNo && r.fields.batchNo === row.fields.batchNo)
        );
        if (!isDuplicate) {
          allRows.push(row);
        }
      }
    }
  }
  
  return {
    ...baseTable,
    rows: allRows,
    confidence: Math.round(
      (baseTable.confidence + tables.reduce((sum, t) => sum + t.confidence, 0)) / (tables.length + 1)
    ),
  };
}
