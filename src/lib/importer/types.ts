/**
 * Data Import Studio — Core Type Definitions
 * 
 * This module defines ALL types used across the import pipeline:
 * - File adapters & formats
 * - Import sessions (the centerpiece — never commits to DB until user confirms)
 * - Validation engine I/O
 * - Column mapping & AI suggestions
 * - Import profiles for reusable mappings
 * - Dynamic schema (unknown columns stored as JSON custom fields)
 */

// ═════════════════════════════════════════════════════════════════════
// IMPORT SOURCES & FILE TYPES
// ═════════════════════════════════════════════════════════════════════

export type ImportSource =
  | 'xlsx'
  | 'xls'
  | 'csv'
  | 'tsv'
  | 'pdf'
  | 'image'
  | 'barcode'
  | 'qr'
  | 'api'
  | 'supplier_erp';

export const SUPPORTED_SOURCES: ImportSource[] = [
  'xlsx', 'xls', 'csv', 'tsv', 'pdf', 'image',
];

export interface ImportSourceAdapter {
  readonly source: ImportSource;
  readonly label: string;
  readonly icon: string;
  readonly accept: string;
  readonly maxFileSize?: number; // bytes, undefined = no limit
  canHandle(file: File): boolean;
  parse(file: File): Promise<ParsedData>;
}

export interface ParsedData {
  sheets: ParsedSheet[];
  metadata: {
    fileName: string;
    fileSize: number;
    detectedFormat: ImportSource;
    parseTimeMs: number;
    warnings: string[];
  };
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalCols: number;
}

// ═════════════════════════════════════════════════════════════════════
// CORE STOCK SCHEMA — Protected Fields
// ═════════════════════════════════════════════════════════════════════

export interface StockSchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'currency' | 'boolean';
  required: boolean;
  protected: boolean; // Cannot be deleted
  unique: boolean;
  default: any;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export const PROTECTED_SCHEMA_FIELDS: StockSchemaField[] = [
  { key: 'name', label: 'Medicine Name', type: 'text', required: true, protected: true, unique: false, default: '' },
  { key: 'generic_name', label: 'Generic Name', type: 'text', required: false, protected: true, unique: false, default: '' },
  { key: 'strength', label: 'Strength', type: 'text', required: false, protected: true, unique: false, default: '' },
  { key: 'batch_number', label: 'Batch Number', type: 'text', required: true, protected: true, unique: false, default: '' },
  { key: 'mfg_date', label: 'Manufacturing Date', type: 'date', required: false, protected: true, unique: false, default: null },
  { key: 'expiry_date', label: 'Expiry Date', type: 'date', required: true, protected: true, unique: false, default: null },
  { key: 'hsn_code', label: 'HSN Code', type: 'text', required: true, protected: true, unique: false, default: '3004' },
  { key: 'gst_percent', label: 'GST %', type: 'number', required: true, protected: true, unique: false, default: 12 },
  { key: 'mrp', label: 'MRP', type: 'currency', required: true, protected: true, unique: false, default: 0 },
  { key: 'ptr', label: 'PTR', type: 'currency', required: false, protected: true, unique: false, default: 0 },
  { key: 'pts', label: 'PTS', type: 'currency', required: false, protected: true, unique: false, default: 0 },
  { key: 'purchase_price', label: 'Purchase Rate', type: 'currency', required: true, protected: true, unique: false, default: 0 },
  { key: 'selling_price', label: 'Sale Rate', type: 'currency', required: true, protected: true, unique: false, default: 0 },
  { key: 'quantity', label: 'Quantity', type: 'number', required: true, protected: true, unique: false, default: 0 },
  { key: 'free_qty', label: 'Free Quantity', type: 'number', required: false, protected: true, unique: false, default: 0 },
  { key: 'company', label: 'Supplier/Company', type: 'text', required: false, protected: true, unique: false, default: '' },
  { key: 'warehouse', label: 'Warehouse', type: 'text', required: false, protected: true, unique: false, default: '' },
  { key: 'rack_location', label: 'Rack', type: 'text', required: false, protected: true, unique: false, default: '' },
  { key: 'barcode', label: 'Barcode', type: 'text', required: false, protected: true, unique: true, default: '' },
  { key: 'schedule_type', label: 'Schedule', type: 'text', required: false, protected: true, unique: false, default: 'General' },
  { key: 'status', label: 'Status', type: 'select', required: false, protected: true, unique: false, default: 'safe', options: ['safe', 'warning', 'critical', 'expired'] },
];

// ═════════════════════════════════════════════════════════════════════
// IMPORT SESSION — The Heart of the Studio
// ═════════════════════════════════════════════════════════════════════

export interface ImportSession {
  id: string;
  status: SessionStatus;
  fileName: string;
  fileSize: number;
  source: ImportSource;
  createdAt: string;
  updatedAt: string;
  
  // Raw parsed data
  sheets: ParsedSheet[];
  activeSheetIndex: number;
  
  // Column mapping
  columnMappings: ColumnMapping[];
  unknownColumns: UnknownColumnInfo[];
  aiSuggestions: AIMappingSuggestion[];
  
  // Validation
  validationResults: ValidationRecord[];
  
  // User modifications (before commit)
  editedRows: Record<number, Record<string, any>>; // rowIndex -> field -> value
  deletedRowIndices: Set<number>;
  addedRows: Record<string, any>[]; // new rows added by user
  
  // Preview / Commit
  commitSummary: CommitSummary | null;
  committedAt: string | null;
  
  // Import profile reference
  profileId: string | null;
  
  // Draft auto-save
  draftSavedAt: string | null;
}

export type SessionStatus =
  | 'selecting_file'
  | 'parsing'
  | 'parse_error'
  | 'mapping'
  | 'validating'
  | 'reviewing'
  | 'previewing'
  | 'committing'
  | 'commit_error'
  | 'committed';

// ═════════════════════════════════════════════════════════════════════
// COLUMN MAPPING
// ═════════════════════════════════════════════════════════════════════

export interface ColumnMapping {
  sourceColumn: string;       // Original column header from file
  targetField: string | null; // Standard field key (null = unmapped)
  displayLabel: string;       // Custom display label (editable by user)
  dataType: DetectedDataType;
  sampleValues: string[];
  isMapped: boolean;
  isProtected: boolean;       // Part of core schema
  isHidden: boolean;
  width: number;
  order: number;
  
  // Mapping confidence
  confidence: number;         // 0-100
  suggestedBy: 'ai' | 'user' | 'profile' | 'none';
}

export interface AIMappingSuggestion {
  sourceColumn: string;
  suggestedField: string;
  confidence: number;
  reasoning: string;
  alternativeFields: { field: string; confidence: number }[];
}

export interface UnknownColumnInfo {
  sourceColumn: string;
  sampleValues: string[];
  detectedType: DetectedDataType;
  businessMeaning: string;
  possibleDuplicates: string[];
  
  // User decision
  action: 'add_to_schema' | 'import_once' | 'rename' | 'ignore' | 'merge' | 'create_custom';
  customFieldKey?: string;
  customFieldLabel?: string;
}

export type DetectedDataType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'percentage'
  | 'boolean'
  | 'phone'
  | 'email'
  | 'url'
  | 'barcode'
  | 'unknown';

// ═════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═════════════════════════════════════════════════════════════════════

export interface ValidationRecord {
  rowIndex: number;
  status: 'valid' | 'warning' | 'error';
  fieldErrors: FieldError[];
  globalErrors: string[];
  globalWarnings: string[];
  duplicateInfo: DuplicateInfo | null;
}

export interface FieldError {
  field: string;
  column: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  expectedValue?: string;
  actualValue?: string;
}

export interface DuplicateInfo {
  type: 'medicine' | 'batch' | 'barcode';
  existingIds: number[];
  existingValues: string[];
  suggestion: 'merge' | 'replace' | 'skip' | 'create_new_batch' | 'increase_qty';
  userDecision?: 'merge' | 'replace' | 'skip' | 'create_new_batch' | 'increase_qty';
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  totalErrors: number;
  totalWarnings: number;
  duplicateCount: number;
  missingRequiredCount: number;
  expiredCount: number;
  nearExpiryCount: number;
  negativeQtyCount: number;
  invalidDateCount: number;
}

// ═════════════════════════════════════════════════════════════════════
// COMMIT PREVIEW
// ═════════════════════════════════════════════════════════════════════

export interface CommitSummary {
  rowsAdded: number;
  rowsUpdated: number;
  rowsDeleted: number;
  rowsIgnored: number;
  rowsInvalid: number;
  
  columnsAdded: number;
  columnsRenamed: number;
  columnsIgnored: number;
  
  warnings: string[];
  errors: string[];
  
  inventoryValueChange: number;
  stockCountChange: number;
  batchCountChange: number;
  
  previewItems: CommitPreviewItem[];
}

export interface CommitPreviewItem {
  action: 'add' | 'update' | 'skip' | 'error';
  name: string;
  batch: string;
  quantity: number;
  mrp: number;
  reason?: string;
  company?: string;
  expiry?: string;
  selling_price?: number;
  purchase_price?: number;
}

// ═════════════════════════════════════════════════════════════════════
// IMPORT PROFILES
// ═════════════════════════════════════════════════════════════════════

export interface ImportProfile {
  id: string;
  name: string;
  description: string;
  source: ImportSource;
  supplierName?: string;
  columnMappings: ProfileColumnMapping[];
  ignoredColumns: string[];
  renamedColumns: Record<string, string>;
  defaultValues: Record<string, any>;
  validationRules?: {
    skipDuplicates?: boolean;
    defaultWarehouse?: string;
    defaultSupplier?: string;
  };
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

export interface ProfileColumnMapping {
  sourcePattern: string;      // Regex pattern or exact name
  targetField: string;
  confidence: number;
}

// ═════════════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═════════════════════════════════════════════════════════════════════

export interface ImportAuditEntry {
  id: string;
  userId: number;
  userName: string;
  timestamp: string;
  fileName: string;
  source: ImportSource;
  profileName: string | null;
  
  rowsAdded: number;
  rowsUpdated: number;
  rowsDeleted: number;
  rowsIgnored: number;
  columnsAdded: number;
  warnings: string[];
  errors: string[];
  
  previousVersionSnapshot: string | null; // JSON snapshot
  undoAvailable: boolean;
}

// ═════════════════════════════════════════════════════════════════════
// CUSTOM FIELDS (Dynamic Schema — Phase 1: JSON metadata)
// ═════════════════════════════════════════════════════════════════════

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: DetectedDataType;
  source: 'import' | 'user';
  importSource?: string;
  values: Record<number, any>; // medicineId -> value
  createdAt: string;
}

export interface CustomFieldGroup {
  sessionId: string;
  fields: CustomFieldDefinition[];
  committed: boolean;
}

// ═════════════════════════════════════════════════════════════════════
// DATA GRID CONFIGURATION
// ═════════════════════════════════════════════════════════════════════

export interface GridColumn {
  key: string;
  label: string;
  width: number;
  visible: boolean;
  frozen: boolean;
  pinned: boolean;
  dataType: DetectedDataType;
  editable: boolean;
  order: number;
  colorTag?: string;
  groupKey?: string;
}

export interface GridSort {
  columnKey: string;
  direction: 'asc' | 'desc';
}

export interface GridFilter {
  columnKey: string;
  operator: FilterOperator;
  value: string;
}

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'between'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty';

export interface GridSelection {
  type: 'row' | 'cell' | 'range';
  rowIndices: number[];
  cellKey?: string;
}

export interface GridState {
  columns: GridColumn[];
  sort: GridSort[];
  filters: GridFilter[];
  searchQuery: string;
  selectedRows: Set<number>;
  scrollTop: number;
  scrollLeft: number;
  expandedRows: Set<number>;
  frozenColumns: number; // number of frozen columns from left
}

// ═════════════════════════════════════════════════════════════════════
// REUSABLE FIELD SYNONYM DATABASE (for AI mapping)
// ═════════════════════════════════════════════════════════════════════

export const FIELD_SYNONYMS: Record<string, string[]> = {
  'name': [
    'medicine name', 'medicine', 'product name', 'product', 'drug name', 'drug', 'item name', 'item', 'description', 'particulars', 'particular', 'medication', 'pharmaceutical',
    'tablet name', 'tablet', 'cap name', 'capsule name', 'inj name', 'injection name', 'syr name', 'syrup name', 'cream name', 'oint name',
    'brand name', 'brand', 'product desc', 'item desc', 'med name', 'med', 'product desc', 'desc', 'product/item', 'product item',
    'medicine description', 'product description', 'item description',
    'special name', 'formulation', 'prod name', 'prod desc', 'title', 'product title'
  ],
  'generic_name': [
    'generic name', 'generic', 'salt', 'composition', 'salt name', 'molecule', 'active ingredient', 'api', 'substance',
    'generic equivalent', 'molecule name', 'ingredient', 'composition name', 'generic salt', 'chemical name',
    'active moiety', 'generic composition', 'salt composition', 'generic drug name'
  ],
  'strength': [
    'strength', 'dosage', 'dose', 'mg', 'ml', 'iu', 'unit', 'concentration', 'potency', 'content',
    'dosage strength', 'strength mg', 'volume', 'size', 'capacity',
    'strength value', 'dose strength', 'active strength', 'content strength'
  ],
  'batch_number': [
    'batch no', 'batch number', 'batch', 'bat no', 'bat', 'lot no', 'lot', 'b.no', 'b/no', 'batch#', 'batch #', 'b#', 'bt no',
    'batch id', 'batch code', 'mfg batch', 'manufacturing batch', 'batch ref', 'batch details', 'lot number', 'lot id',
    'batch no.', 'batch no:', 'batch code', 'batch details', 'batch reference', 'btch', 'b_num'
  ],
  'mfg_date': [
    'mfg date', 'manufacturing date', 'mfg', 'mfd', 'dom', 'date of mfg', 'mfg dt', 'mfg. date', 'date of manufacture', 'manf date',
    'mfg.date', 'manufacturing', 'date mfg', 'mfg dt.', 'mfd date', 'dom date', 'prod date', 'production date',
    'date manufactured', 'made on', 'manufactured on', 'mfg on', 'mfd on'
  ],
  'expiry_date': [
    'expiry date', 'exp date', 'expiry', 'exp', 'exp dt', 'exp. date', 'use before', 'valid till', 'valid thru', 'best before', 'expires', 'expiration',
    'exp date', 'exp.', 'exp:', 'exp dt.', 'valid upto', 'valid up to', 'use by', 'shelf life', 'expiry month',
    'last date', 'last date of use', 'exp date mth', 'exp month', 'exp year', 'expiry dt'
  ],
  'hsn_code': [
    'hsn', 'hsn code', 'hsn no', 'h.s.n', 'hsn/sac', 'sac code', 'sac', 'statistical code', 'commodity code',
    'hsn number', 'hsn no.', 'hsn sac', 'hsn/sac code', 'hsn_code', 'hsncode',
    'customs code', 'tariff code', 'harmonized code'
  ],
  'gst_percent': [
    'gst', 'gst%', 'gst rate', 'gst %', 'tax', 'tax%', 'tax rate', 'igst', 'cgst', 'sgst', 'gst amount',
    'gst rate %', 'gst tax', 'tax rate %', 'gst percent', 'igst rate', 'cgst rate', 'sgst rate',
    'output tax', 'input tax', 'tax percent', 'gst slab', 'tax slab', 'gst @', 'tax @',
    'total gst', 'gst total', 'gst value', 'tax amt', 'tax amount'
  ],
  'mrp': [
    'mrp', 'm.r.p', 'max retail price', 'retail price', 'list price', 'mrp/unit', 'maximum retail price', 'price',
    'retail mrp', 'mrp incl gst', 'mrp exclusive', 'mrp inclusive', 'gst mrp', 'mrp rate',
    'selling mrp', 'display price', 'printed price', 'box mrp', 'strip mrp'
  ],
  'ptr': [
    'ptr', 'p.t.r', 'price to retailer', 'trade price', 'dealer price', 'stockist price', 'distributor price',
    'retailer price', 'trade rate', 'ptr rate', 'distributor rate', 'stockist rate', 'dealer rate',
    'price to retail', 'ptr price', 'ptr incl', 'ptr exclusive'
  ],
  'pts': [
    'pts', 'p.t.s', 'price to stockist', 'special price', 'wholesale price', 'stockist rate',
    'stockist price', 'special rate', 'wholesale rate', 'pts rate', 'special pricing',
    'bulk price', 'bulk rate', 'trade price pts', 'stockist special'
  ],
  'purchase_price': [
    'purchase price', 'purchase rate', 'buying price', 'cost price', 'unit cost', 'rate', 'unit price', 'basic rate', 'basic price', 'cost', 'purchase',
    'purchase cost', 'buying rate', 'cost rate', 'net rate', 'net price', 'landed cost', 'landed price',
    'invoice rate', 'invoice price', 'buy rate', 'basic cost', 'prime cost', 'procurement cost'
  ],
  'selling_price': [
    'selling price', 'sale price', 'retail', 'sales rate', 'selling rate', 'sale rate', 'our price',
    'sale rate', 'selling rate', 'customer price', 'final price', 'outlet price', 'shelf price',
    'selling rate w', 'our selling price', 'sale rate incl', 'sale rate exclusive'
  ],
  'quantity': [
    'qty', 'quantity', 'qnty', 'pcs', 'nos', 'units', 'strips', 'packs', 'received qty', 'received qty', 'order qty', 'supplied qty',
    'qty.', 'stock qty', 'available qty', 'order quantity', 'supplied quantity', 'delivered qty',
    'purchased qty', 'purchase qty', 'stock quantity', 'available quantity', 'in stock',
    'free strips', 'free pieces', 'bonus qty', 'extra qty', 'additional qty'
  ],
  'free_qty': [
    'free qty', 'free', 'foc', 'bonus', 'scheme free', 'complimentary', 'freebie', 'extra',
    'free quantity', 'free pieces', 'free strips', 'bonus quantity', 'scheme quantity free',
    'additional free', 'extra pieces', 'extra strips', 'bonus qty', 'free qty.',
    'complimentary qty', 'gift qty', 'scheme bonus'
  ],
  'company': [
    'company', 'manufacturer', 'brand', 'mfr', 'maker', 'supplier', 'vendor', 'pharma', 'manufactured by', 'marketed by',
    'company name', 'manufacturer name', 'brand name', 'supplier name', 'vendor name', 'maker name',
    'marketed by', 'manufactured by', 'made by', 'produced by', 'mfg company', 'product company',
    'pharma company', 'pharmaceutical company', 'supplier firm', 'distribution company'
  ],
  'warehouse': [
    'warehouse', 'godown', 'store', 'location', 'depot', 'branch',
    'storage location', 'warehouse name', 'godown name', 'store name', 'branch name',
    'stock location', 'store location', 'godown location', 'depot location'
  ],
  'rack_location': [
    'rack', 'rack location', 'shelf', 'shelf no', 'bin', 'aisle', 'row', 'storage',
    'rack no', 'rack number', 'shelf number', 'rack details', 'storage location',
    'rack name', 'bin no', 'bin number', 'shelf name', 'storage bin'
  ],
  'barcode': [
    'barcode', 'bar code', 'ean', 'upc', 'gtin', 'code', 'sku', 'product code', 'item code',
    'barcode no', 'barcode number', 'product barcode', 'item code', 'product code',
    'article number', 'article no', 'sku code', 'unique code', 'item no', 'product id',
    'barcode id', 'gtin code', 'ean code', 'upc code', 'product identifier'
  ],
  'schedule_type': [
    'schedule', 'schedule type', 'drug schedule', 'rx type', 'category', 'drug type', 'sch',
    'schedule h', 'schedule h1', 'schedule x', 'narcotic', 'controlled', 'prescription',
    'rx', 'otc', 'over the counter', 'drug category', 'medicine category', 'product category'
  ],
  'discount_percent': [
    'discount', 'discount%', 'disc %', 'discount percent', 'trade discount', 'scheme disc', 'less',
    'disc %', 'disc.', 'disc', 'discount rate', 'discount amt', 'disc amount', 'discount allowed',
    'trade disc', 'scheme discount', 'special discount', 'additional discount', 'overall discount'
  ],
  'scheme_qty': [
    'scheme', 'scheme qty', 'scheme quantity', 'bonus scheme', 'scheme_qty', 'schemeqty',
    'free scheme', 'scheme bonus', 'offer qty', 'promotion qty', 'deal qty'
  ],
  'pack_size': [
    'pack size', 'pack', 'packing', 'presentation', 'pkg', 'pack type', 'strip', 'bottle', 'box',
    'pack size', 'packing size', 'unit pack', 'sale pack', 'pack of', 'nos pack',
    'strip pack', 'bottle pack', 'box pack', 'packing type', 'pack form', 'package size'
  ],
  'invoice_no': [
    'invoice no', 'invoice number', 'inv no', 'invoice', 'bill no', 'bill', 'challan no',
    'invoice #', 'invoice num', 'bill #', 'bill number', 'challan', 'dc', 'delivery challan',
    'purchase invoice', 'sales invoice', 'supplier invoice', 'vendor invoice', 'invoice ref'
  ],
  'invoice_date': [
    'invoice date', 'inv date', 'bill date', 'purchase date', 'challan date',
    'date of invoice', 'invoice dt', 'inv dt', 'bill dt', 'invdate',
    'purchase dt', 'purchase invoice date'
  ],
  'supplier_name': [
    'supplier', 'vendor', 'supplier name', 'vendor name', 'party', 'distributor',
    'supplier firm', 'vendor firm', 'party name', 'distributor name', 'dealer name',
    'supplier company', 'vendor company', 'party firm', 'source party', 'supply partner'
  ],
  'eway_bill_no': [
    'eway bill', 'e-way bill', 'eway', 'transport', 'transporter', 'lr no',
    'eway bill no', 'e-way', 'gst eway', 'transport name', 'transporter name', 'lr number',
    'delivery note', 'dispatch details', 'shipping detail', 'transport detail'
  ],
  'dosage_form': [
    'dosage form', 'dosageform', 'form', 'dosage_form', 'drug form', 'medicine form',
    'dosage type', 'formulation', 'drug formulation', 'medicine formulation',
    'tablet type', 'capsule type', 'syrup type', 'injection type', 'cream type',
    'ointment type', 'dosage form type', 'form type'
  ],
  'category': [
    'category', 'med_category', 'product category', 'stock category', 'medication category',
    'drug category', 'medicine category', 'item category', 'class', 'classification',
    'therapeutic class', 'drug class', 'medication class', 'product class'
  ],
  'supplier_gstin': [
    'supplier gstin', 'supplier gst', 'vendor gstin', 'vendor gst', 'party gstin',
    'gstin of supplier', 'gst of supplier', 'supplier gst no', 'vendor gst no',
    'gstin', 'gst number', 'gst id', 'gst no', 'gstin of vendor',
    'supplier_gstin', 'supplier gstin no', 'party gst', 'distributor gstin'
  ],
};

// ── Helper: normalize column name for matching ──
export function normalizeColumnHeader(header: string): string {
  if (!header || typeof header !== 'string') return '';
  return header
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Helper: detect data type from sample values ──
export function detectDataType(samples: string[]): DetectedDataType {
  const nonEmpty = samples.filter(s => s && s.trim().length > 0);
  if (nonEmpty.length === 0) return 'unknown';

  // Check if all are numbers
  if (nonEmpty.every(s => /^-?\d+(\.\d+)?$/.test(s.trim()))) return 'number';

  // Check if all are currency (start with ₹, $, €, £)
  if (nonEmpty.every(s => /^[₹$€£]/.test(s.trim()))) return 'currency';

  // Check if all are dates
  if (nonEmpty.every(s => {
    const d = new Date(s);
    return !isNaN(d.getTime()) || /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(s);
  })) return 'date';

  // Check if all are percentages
  if (nonEmpty.every(s => s.trim().endsWith('%'))) return 'percentage';

  // Check if all are booleans
  if (nonEmpty.every(s => /^(yes|no|true|false|y|n|0|1)$/i.test(s.trim()))) return 'boolean';

  // Check if all are phone numbers
  if (nonEmpty.every(s => /^[\+\d\s\-\(\)]{7,15}$/.test(s.trim()))) return 'phone';

  // Check if all are emails
  if (nonEmpty.every(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()))) return 'email';

  // Check if barcode-like
  if (nonEmpty.every(s => /^\d{8,14}$/.test(s.trim()))) return 'barcode';

  return 'text';
}
