/**
 * Common Document Model (CDM) for Pharmacy Intelligent Document Processing
 * 
 * This module defines the unified data structures used throughout the
 * entire document understanding pipeline. Every stage produces and consumes
 * these structures, ensuring type safety and data consistency.
 * 
 * Pipeline stages:
 * 1. Image Input → RawDocument
 * 2. Image Quality Engine → RawDocument (with quality metadata)
 * 3. OCR / PDF Text Extraction → RawDocument (with text)
 * 4. Layout Detection → DocumentLayout
 * 5. Table Detection → TableStructure
 * 6. Row & Column Reconstruction → TableStructure (enhanced)
 * 7. Dynamic Header Detection & Field Mapping → MappedRow[]
 * 8. Validation Engine & Business Rules → ValidatedItem[]
 * 9. Medicine Master Validation → ValidatedItem[] (enhanced)
 * 10. Invoice Total Validation → ValidatedItem[] (validated)
 * 11. Confidence Scoring → ProcessingResult
 * 12. Human Review → ProcessingResult (operator-approved)
 * 13. Database Save → void
 */

// ── Pipeline Stage Types ─────────────────────────────────────────────

export enum PipelineStage {
  IMAGE_INPUT = 'image_input',
  IMAGE_QUALITY = 'image_quality',
  OCR_EXTRACTION = 'ocr_extraction',
  LAYOUT_DETECTION = 'layout_detection',
  TABLE_DETECTION = 'table_detection',
  ROW_RECONSTRUCTION = 'row_reconstruction',
  HEADER_MAPPING = 'header_mapping',
  FIELD_VALIDATION = 'field_validation',
  MEDICINE_VALIDATION = 'medicine_validation',
  INVOICE_VALIDATION = 'invoice_validation',
  CONFIDENCE_SCORING = 'confidence_scoring',
  HUMAN_REVIEW = 'human_review',
  DATABASE_SAVE = 'database_save',
}

// ── Pipeline Configuration ───────────────────────────────────────────

export interface PipelineConfig {
  // OCR settings
  ocrLanguage: string;
  ocrConfidenceThreshold: number;
  enableMultiOCR: boolean;
  secondaryOCREngine?: string;
  
  // Image quality settings
  minBlurScore: number;
  minResolution: number;
  minBrightness: number;
  maxBrightness: number;
  maxRotationAngle: number;
  
  // Validation settings
  enableBusinessRules: boolean;
  enableMedicineValidation: boolean;
  enableInvoiceTotalCheck: boolean;
  autoSaveThreshold: number;
  reviewThreshold: number;
  
  // Learning settings
  enableLearning: boolean;
  enableSupplierProfiles: boolean;
  
  // Processing settings
  maxRetries: number;
  enableParallelProcessing: boolean;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  ocrLanguage: 'eng',
  ocrConfidenceThreshold: 60,
  enableMultiOCR: true,
  secondaryOCREngine: 'tesseract_alt',
  
  minBlurScore: 20,
  minResolution: 800,
  minBrightness: 25,
  maxBrightness: 80,
  maxRotationAngle: 5,
  
  enableBusinessRules: true,
  enableMedicineValidation: true,
  enableInvoiceTotalCheck: true,
  autoSaveThreshold: 90,
  reviewThreshold: 70,
  
  enableLearning: true,
  enableSupplierProfiles: true,
  
  maxRetries: 2,
  enableParallelProcessing: true,
};

// ── Raw Document ─────────────────────────────────────────────────────

export interface RawDocument {
  id: string;
  sourceType: 'image' | 'pdf' | 'scanned_pdf';
  sourcePath?: string;
  
  // Image quality
  imageQuality?: ImageQualityResult;
  
  // Extracted text
  rawText: string;
  textConfidence: number;
  ocrEngine: string;
  
  // PDF specific
  pdfTextLayer?: string;
  pdfPageCount?: number;
  
  // Metadata
  extractedAt: Date;
  processingTimeMs: number;
}

export interface ImageQualityResult {
  passed: boolean;
  blurScore: number;           // 0-100 (100 = sharp)
  brightnessScore: number;     // 0-100 (50 = optimal)
  resolutionScore: number;     // Minimum dimension in pixels
  rotationAngle: number;       // Degrees
  hasShadow: boolean;
  hasGlare: boolean;
  issues: string[];
  enhancements: string[];
  overallScore: number;        // 0-100
}

// ── Document Layout ──────────────────────────────────────────────────

export interface DocumentLayout {
  id: string;
  rawDocumentId: string;
  
  // Detected sections
  sections: DocumentSection[];
  
  // Overall layout info
  pageCount: number;
  orientation: 'portrait' | 'landscape';
  hasHeader: boolean;
  hasFooter: boolean;
  hasMultipleTables: boolean;
  
  // Confidence
  confidence: number;
  detectionMethod: 'rule_based' | 'ml_based' | 'hybrid';
}

export interface DocumentSection {
  type: 'header' | 'supplier_info' | 'invoice_info' | 'table' | 'footer' | 'unknown';
  startLine: number;
  endLine: number;
  startPosition: number;
  endPosition: number;
  confidence: number;
  content: string;
  metadata?: Record<string, string>;
}

// ── Table Structure ──────────────────────────────────────────────────

export interface TableStructure {
  id: string;
  layoutId: string;
  
  // Table boundaries
  startLine: number;
  endLine: number;
  
  // Headers
  headers: TableHeader[];
  originalHeaderText: string;
  
  // Rows
  rows: TableRow[];
  rowCount: number;
  
  // Table characteristics
  tableType: 'standard' | 'compact' | 'extended' | 'multi_page' | 'unknown';
  hasMergedCells: boolean;
  hasWrappedRows: boolean;
  hasContinuationRows: boolean;
  
  // Confidence
  confidence: number;
  reconstructionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TableHeader {
  originalText: string;
  standardField: StandardField;
  columnIndex: number;
  startPosition: number;
  endPosition: number;
  confidence: number;
  alternatives?: string[];
}

export interface TableRow {
  rowIndex: number;
  originalText: string;
  startPosition: number;
  endPosition: number;
  
  // Cells
  cells: TableCell[];
  
  // Row characteristics
  isContinuation: boolean;
  isTotal: boolean;
  isEmpty: boolean;
  
  // Confidence
  confidence: number;
  issues: string[];
}

export interface TableCell {
  columnIndex: number;
  rowIndex: number;
  originalText: string;
  startPosition: number;
  endPosition: number;
  
  // Mapped value
  standardField?: StandardField;
  normalizedValue?: string;
  numericValue?: number;
  
  // Cell characteristics
  isMerged: boolean;
  isWrapped: boolean;
  isEmpty: boolean;
  
  // Confidence
  confidence: number;
}

// ── Standard Fields ──────────────────────────────────────────────────

export enum StandardField {
  SERIAL_NO = 'serial_no',
  DESCRIPTION = 'description',
  BATCH_NO = 'batch_no',
  EXPIRY_DATE = 'expiry_date',
  MFG_DATE = 'mfg_date',
  QUANTITY = 'quantity',
  FREE_QTY = 'free_qty',
  SCHEME_QTY = 'scheme_qty',
  UNIT_PRICE = 'unit_price',
  MRP = 'mrp',
  PTR = 'ptr',
  PTS = 'pts',
  TOTAL_AMOUNT = 'total_amount',
  DISCOUNT_PERCENT = 'discount_percent',
  TAXABLE_VALUE = 'taxable_value',
  GST_RATE = 'gst_rate',
  CGST_AMOUNT = 'cgst_amount',
  SGST_AMOUNT = 'sgst_amount',
  IGST_AMOUNT = 'igst_amount',
  HSN_CODE = 'hsn_code',
  MANUFACTURER = 'manufacturer',
  STRENGTH = 'strength',
  PACK_SIZE = 'pack_size',
  SCHEDULE_TYPE = 'schedule_type',
  BARCODE = 'barcode',
  RACK_LOCATION = 'rack_location',
  UNKNOWN = 'unknown',
}

// ── Mapped Row (after field mapping) ─────────────────────────────────

export interface MappedRow {
  rowId: string;
  tableId: string;
  rowIndex: number;
  originalText: string;
  
  // Mapped fields
  fields: Map<StandardField, MappedField>;
  
  // Row-level metadata
  isSelected: boolean;
  isDuplicate: boolean;
  duplicateOf?: string;
  
  // Confidence
  overallConfidence: number;
  missingCriticalFields: StandardField[];
  lowConfidenceFields: StandardField[];
}

export interface MappedField {
  originalText: string;
  normalizedValue: string;
  numericValue?: number;
  confidence: number;
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  source: StandardField;
}

// ── Validated Item (after validation) ────────────────────────────────

export interface ValidatedItem {
  itemId: string;
  rowId: string;
  
  // Medicine identity
  medicineName: string;
  matchedMedicineId?: number;
  matchConfidence: number;
  matchType: 'exact' | 'fuzzy' | 'generic' | 'new';
  
  // Fields
  batchNumber: string;
  expiryDate: string;
  mfgDate: string;
  quantity: number;
  freeQty: number;
  schemeQty: number;
  unitPrice: number;
  mrp: number;
  ptr: number;
  pts: number;
  totalAmount: number;
  discountPercent: number;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  hsnCode: string;
  manufacturer: string;
  strength: string;
  packSize: string;
  scheduleType: string;
  
  // Validation results
  fieldValidations: FieldValidationResult[];
  overallConfidence: number;
  isUsable: boolean;
  criticalIssues: string[];
  warnings: string[];
  
  // Invoice-level validation
  invoiceTotalMatch: boolean;
  calculatedTotal: number;
  statedTotal: number;
  
  // Metadata
  rowIndex: number;
  sourceText: string;
  processingMetadata: ProcessingMetadata;
}

export interface FieldValidationResult {
  field: StandardField;
  originalValue: string;
  normalizedValue: string;
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
  action: 'auto_accept' | 'highlight' | 'review_required';
}

export interface ProcessingMetadata {
  ocrEngine: string;
  ocrConfidence: number;
  layoutConfidence: number;
  tableConfidence: number;
  headerMappingConfidence: number;
  medicineMatchConfidence: number;
  validationConfidence: number;
  supplierProfileUsed?: string;
  patternsApplied: string[];
  retryCount: number;
  processingTimeMs: number;
}

// ── Processing Result (final output) ─────────────────────────────────

export interface ProcessingResult {
  pipelineId: string;
  
  // Input
  inputDocument: RawDocument;
  config: PipelineConfig;
  
  // Pipeline stages
  layout?: DocumentLayout;
  table?: TableStructure;
  
  // Results
  items: ValidatedItem[];
  invoiceHeader: InvoiceHeaderInfo;
  
  // Overall metrics
  overallConfidence: number;
  autoSaveCount: number;
  reviewRequiredCount: number;
  
  // Suggestions for operator
  suggestions: string[];
  warnings: string[];
  errors: string[];
  
  // Processing info
  totalProcessingTimeMs: number;
  stagesCompleted: PipelineStage[];
  stageTimings: Record<PipelineStage, number>;
  
  // Status
  status: 'success' | 'partial_success' | 'failed' | 'needs_review';
  canAutoSave: boolean;
}

export interface InvoiceHeaderInfo {
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierAddress: string;
  supplierGstin: string;
  supplierDlNo: string;
  poNumber: string;
  paymentTerms: string;
  dueDate: string;
  dispatchLocation: string;
  ewayBillNo: string;
  transporterName: string;
  vehicleNumber: string;
  numCartons: number;
  coldChain: boolean;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  roundOff: number;
  confidence: number;
}

// ── Supplier Profile (for learning) ──────────────────────────────────

export interface SupplierProfile {
  supplierId: string;
  supplierName: string;
  invoiceCount: number;
  
  // Layout patterns
  commonHeaders: Map<string, string>;  // original -> standard field
  commonTableType: TableStructure['tableType'];
  typicalColumnOrder: StandardField[];
  
  // Accuracy metrics
  averageConfidence: number;
  fieldAccuracies: Map<StandardField, number>;
  
  // Common issues
  frequentErrors: Map<string, number>;
  
  // Learning data
  lastInvoiceDate?: Date;
  firstInvoiceDate?: Date;
  patterns: LearnedPattern[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface LearnedPattern {
  id: string;
  supplierId: string;
  patternType: 'header_mapping' | 'field_correction' | 'medicine_name' | 'batch_format' | 'date_format';
  pattern: string;
  replacement: string;
  context?: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
}

// ── Pipeline Event Types (for progress tracking) ─────────────────────

export interface PipelineEvent {
  stage: PipelineStage;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  timestamp: Date;
  durationMs: number;
  message?: string;
  data?: any;
}

export type PipelineEventCallback = (event: PipelineEvent) => void;

// ── Processing Context (passed through pipeline) ─────────────────────

export interface ProcessingContext {
  pipelineId: string;
  config: PipelineConfig;
  existingMedicines: any[]; // Medicine[] from database
  supplierProfile?: SupplierProfile;
  events: PipelineEvent[];
  eventCallback?: PipelineEventCallback;
  abortSignal?: AbortSignal;
}

// ── Helper Types ─────────────────────────────────────────────────────

export type FieldValue = string | number | boolean | null;
export type FieldValues = Record<StandardField, FieldValue>;

export interface ConfidenceBreakdown {
  field: StandardField;
  confidence: number;
  action: 'auto_accept' | 'highlight' | 'review_required';
  reason?: string;
}

export interface ValidationSummary {
  totalFields: number;
  validFields: number;
  invalidFields: number;
  autoAcceptCount: number;
  highlightCount: number;
  reviewRequiredCount: number;
  overallConfidence: number;
  canAutoSave: boolean;
}

// ── Export utility functions ─────────────────────────────────────────

export function createEmptyInvoiceHeader(): InvoiceHeaderInfo {
  return {
    invoiceNo: '',
    invoiceDate: '',
    supplierName: '',
    supplierAddress: '',
    supplierGstin: '',
    supplierDlNo: '',
    poNumber: '',
    paymentTerms: '',
    dueDate: '',
    dispatchLocation: '',
    ewayBillNo: '',
    transporterName: '',
    vehicleNumber: '',
    numCartons: 0,
    coldChain: false,
    subtotal: 0,
    totalGst: 0,
    grandTotal: 0,
    roundOff: 0,
    confidence: 0,
  };
}

export function createEmptyProcessingResult(pipelineId: string, config: PipelineConfig): ProcessingResult {
  return {
    pipelineId,
    inputDocument: {
      id: pipelineId,
      sourceType: 'image',
      rawText: '',
      textConfidence: 0,
      ocrEngine: '',
      extractedAt: new Date(),
      processingTimeMs: 0,
    },
    config,
    items: [],
    invoiceHeader: createEmptyInvoiceHeader(),
    overallConfidence: 0,
    autoSaveCount: 0,
    reviewRequiredCount: 0,
    suggestions: [],
    warnings: [],
    errors: [],
    totalProcessingTimeMs: 0,
    stagesCompleted: [],
    stageTimings: {
      [PipelineStage.IMAGE_INPUT]: 0,
      [PipelineStage.IMAGE_QUALITY]: 0,
      [PipelineStage.OCR_EXTRACTION]: 0,
      [PipelineStage.LAYOUT_DETECTION]: 0,
      [PipelineStage.TABLE_DETECTION]: 0,
      [PipelineStage.ROW_RECONSTRUCTION]: 0,
      [PipelineStage.HEADER_MAPPING]: 0,
      [PipelineStage.FIELD_VALIDATION]: 0,
      [PipelineStage.MEDICINE_VALIDATION]: 0,
      [PipelineStage.INVOICE_VALIDATION]: 0,
      [PipelineStage.CONFIDENCE_SCORING]: 0,
      [PipelineStage.HUMAN_REVIEW]: 0,
      [PipelineStage.DATABASE_SAVE]: 0,
    },
    status: 'failed',
    canAutoSave: false,
  };
}

export function getStandardFieldLabel(field: StandardField): string {
  const labels: Record<StandardField, string> = {
    [StandardField.SERIAL_NO]: 'S.No',
    [StandardField.DESCRIPTION]: 'Medicine Name',
    [StandardField.BATCH_NO]: 'Batch No',
    [StandardField.EXPIRY_DATE]: 'Expiry Date',
    [StandardField.MFG_DATE]: 'Mfg Date',
    [StandardField.QUANTITY]: 'Quantity',
    [StandardField.FREE_QTY]: 'Free Qty',
    [StandardField.SCHEME_QTY]: 'Scheme Qty',
    [StandardField.UNIT_PRICE]: 'Unit Price',
    [StandardField.MRP]: 'MRP',
    [StandardField.PTR]: 'PTR',
    [StandardField.PTS]: 'PTS',
    [StandardField.TOTAL_AMOUNT]: 'Total Amount',
    [StandardField.DISCOUNT_PERCENT]: 'Discount %',
    [StandardField.TAXABLE_VALUE]: 'Taxable Value',
    [StandardField.GST_RATE]: 'GST Rate',
    [StandardField.CGST_AMOUNT]: 'CGST',
    [StandardField.SGST_AMOUNT]: 'SGST',
    [StandardField.IGST_AMOUNT]: 'IGST',
    [StandardField.HSN_CODE]: 'HSN Code',
    [StandardField.MANUFACTURER]: 'Manufacturer',
    [StandardField.STRENGTH]: 'Strength',
    [StandardField.PACK_SIZE]: 'Pack Size',
    [StandardField.SCHEDULE_TYPE]: 'Schedule Type',
    [StandardField.BARCODE]: 'Barcode',
    [StandardField.RACK_LOCATION]: 'Rack Location',
    [StandardField.UNKNOWN]: 'Unknown',
  };
  return labels[field] || field;
}

export function isCriticalField(field: StandardField): boolean {
  const criticalFields = [
    StandardField.DESCRIPTION,
    StandardField.BATCH_NO,
    StandardField.EXPIRY_DATE,
    StandardField.QUANTITY,
  ];
  return criticalFields.includes(field);
}

export function isRequiredField(field: StandardField): boolean {
  const requiredFields = [
    StandardField.DESCRIPTION,
    StandardField.BATCH_NO,
    StandardField.QUANTITY,
    StandardField.UNIT_PRICE,
  ];
  return requiredFields.includes(field);
}

export function isNumericField(field: StandardField): boolean {
  const numericFields = [
    StandardField.QUANTITY,
    StandardField.FREE_QTY,
    StandardField.SCHEME_QTY,
    StandardField.UNIT_PRICE,
    StandardField.MRP,
    StandardField.PTR,
    StandardField.PTS,
    StandardField.TOTAL_AMOUNT,
    StandardField.DISCOUNT_PERCENT,
    StandardField.TAXABLE_VALUE,
    StandardField.GST_RATE,
    StandardField.CGST_AMOUNT,
    StandardField.SGST_AMOUNT,
    StandardField.IGST_AMOUNT,
  ];
  return numericFields.includes(field);
}

export function isDateField(field: StandardField): boolean {
  return field === StandardField.EXPIRY_DATE || field === StandardField.MFG_DATE;
}