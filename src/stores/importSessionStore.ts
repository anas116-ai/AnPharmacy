/**
 * Data Import Studio — Import Session Store
 * 
 * This is the CENTRAL store for the entire import workflow.
 * Key principle: NOTHING is committed to the stock database until
 * the user explicitly clicks "Commit to Stock".
 * 
 * The store manages:
 * - File selection & parsing
 * - Column mapping & AI suggestions
 * - Validation results
 * - User edits (inline editing, row deletion, row addition)
 * - Preview generation
 * - Commit execution
 * - Import profile integration
 * - Auto-save drafts
 */

import { create } from 'zustand';
import { 
  ImportSession, SessionStatus, ParsedData, ParsedSheet,
  ColumnMapping, AIMappingSuggestion, UnknownColumnInfo,
  ValidationRecord, ValidationSummary, CommitSummary, CommitPreviewItem,
  ImportSource, GridColumn, GridState,
  CustomFieldDefinition,
  SUPPORTED_SOURCES, 
  normalizeColumnHeader,
} from '../lib/importer/types';
import { importFile as importFileLegacy, ImportedMedicineRow, FileImportResult } from '../lib/fileImporter';
import { columnMapper } from '../lib/importer/columnMapper';
import { validationEngine, ValidationContext } from '../lib/importer/validationEngine';
import { importProfileStore } from '../lib/importer/importProfileStore';
import { aiLearningEngine } from '../lib/importer/aiLearningEngine';
import { schemaManager } from '../lib/importer/schemaManager';
import { useStockStore } from './stockStore';
import { useRecycleBinStore } from './recycleBinStore';
import { useAuditTrailStore } from './auditTrailStore';

interface ImportSessionState {
  // Current session
  session: ImportSession | null;
  
  // Derived / computed data
  validationSummary: ValidationSummary | null;
  gridState: GridState;
  
  // UI state
  activeStep: ImportStep;
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;
  showProfileDialog: boolean;
  matchedProfileName: string | null;

  // Actions
  selectFile: (file: File) => Promise<void>;
  parseFile: (file: File) => Promise<void>;
  updateMapping: (sourceColumn: string, targetField: string | null) => void;
  updateAllMappings: (mappings: ColumnMapping[]) => void;
  applyAISuggestion: (sourceColumn: string) => void;
  applyUnknownColumnAction: (sourceColumn: string, action: UnknownColumnInfo['action'], customKey?: string) => void;
  runValidation: () => Promise<void>;
  editRow: (rowIndex: number, field: string, value: any) => void;
  deleteRows: (rowIndices: number[]) => void;
  undeleteRow: (rowIndex: number) => void;
  addRow: (row: Record<string, any>) => void;
  generatePreview: () => void;
  commitToStock: () => Promise<void>;
  resetSession: () => void;
  saveDraft: () => void;
  loadDraft: () => boolean;
  setActiveStep: (step: ImportStep) => void;
  setGridState: (state: Partial<GridState>) => void;
  
  // Profile management
  saveAsProfile: (name: string, supplierName?: string) => void;
  applyProfile: (profileId: string) => void;
  checkForProfileMatch: (fileName: string, supplierName?: string) => void;
}

export type ImportStep = 
  | 'select' 
  | 'parse' 
  | 'mapping' 
  | 'validation' 
  | 'review' 
  | 'preview' 
  | 'complete';

function generateSessionId(): string {
  return 'imp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

const DRAFT_KEY = 'anpharm_import_draft';

export const useImportSessionStore = create<ImportSessionState>((set, get) => ({
  session: null,
  validationSummary: null,
  gridState: {
    columns: [],
    sort: [],
    filters: [],
    searchQuery: '',
    selectedRows: new Set(),
    scrollTop: 0,
    scrollLeft: 0,
    expandedRows: new Set(),
    frozenColumns: 0,
  },
  activeStep: 'select',
  isProcessing: false,
  processingMessage: '',
  error: null,
  showProfileDialog: false,
  matchedProfileName: null,

  // ═════════════════════════════════════════════════════════════════
  // SELECT FILE
  // ═════════════════════════════════════════════════════════════════
  selectFile: async (file: File) => {
    set({ isProcessing: true, processingMessage: 'Reading file...', error: null, activeStep: 'parse' });
    
    // Create initial session
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let source: ImportSource = 'csv';
    if (['xlsx', 'xls'].includes(ext)) source = ext as ImportSource;
    else if (ext === 'tsv') source = 'tsv';
    else if (ext === 'pdf') source = 'pdf';
    else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'].includes(ext)) source = 'image';

    const session: ImportSession = {
      id: generateSessionId(),
      status: 'parsing',
      fileName: file.name,
      fileSize: file.size,
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sheets: [],
      activeSheetIndex: 0,
      columnMappings: [],
      unknownColumns: [],
      aiSuggestions: [],
      validationResults: [],
      editedRows: {},
      deletedRowIndices: new Set(),
      addedRows: [],
      commitSummary: null,
      committedAt: null,
      profileId: null,
      draftSavedAt: null,
    };

    set({ session, isProcessing: true, processingMessage: 'Parsing file...' });
    
    // Parse the file
    await get().parseFile(file);
  },

  // ═════════════════════════════════════════════════════════════════
  // PARSE FILE
  // ═════════════════════════════════════════════════════════════════
  parseFile: async (file: File) => {
    try {
      // Use existing file importer for parsing
      const result: FileImportResult = await importFileLegacy(file);
      
      if (!result.success && result.rows.length === 0) {
        set({ 
          error: result.errors.join('; ') || 'Failed to parse file',
          isProcessing: false, 
          activeStep: 'select',
          session: null,
        });
        return;
      }

      // Build sheets from parsed data
      // Use ONLY the detected headers from the file - do not use _rawRowData keys as headers
      // because they may include internal/private fields or be in wrong order
      // ALWAYS use ALL original column headers from _rawRowData — never filter through
      // fieldMapping (which only contains auto-detected fields and drops unmapped columns
      // like "Dosage Form", "Category", "Supplier GSTIN", etc.)
      const detectedHeaders = result.rows.length > 0 
        ? Object.keys(result.rows[0]._rawRowData || {}).filter(k => k && typeof k === 'string' && k.trim().length > 0 && !k.startsWith('_'))
        : [];
      
      // Sort headers to match original file column order (preserve file's _rawRowData key order)
      // Object.keys may not preserve insertion order in all cases, so we rely on the fact that
      // mapRowToMedicine iterates headers in order when building _rawRowData

      const headers = detectedHeaders;

      const sheet: ParsedSheet = {
        name: 'Sheet 1',
        headers,
        rows: result.rows.map(r => {
          // Build row strictly by header order from the file, not from object keys
          return headers.map(h => {
            const rawVal = (r._rawRowData || {})[h];
            return rawVal === undefined || rawVal === null ? '' : String(rawVal).trim();
          });
        }),
        totalRows: result.rows.filter(r => {
          // Count non-empty rows for total
          return Object.values(r._rawRowData || {}).some(v => String(v).trim().length > 0);
        }).length,
        totalCols: headers.length,
      };

      // Update session with parsed data
      const session = get().session;
      if (!session) return;

      // Check for matching import profile
      const matchedProfile = importProfileStore.findMatch(file.name);
      
      // Run column mapping
      const sampleRows = sheet.rows;
      const mappingResult = columnMapper.mapHeaders(
        headers, 
        sampleRows,
        matchedProfile
      );

      const updatedSession: ImportSession = {
        ...session,
        status: 'mapping',
        sheets: [sheet],
        columnMappings: mappingResult.mappings,
        aiSuggestions: mappingResult.aiSuggestions,
        unknownColumns: mappingResult.unknownColumns,
        profileId: matchedProfile?.id || null,
        updatedAt: new Date().toISOString(),
      };

      // Build grid columns from mappings
      const gridColumns: GridColumn[] = mappingResult.mappings.map((m, i) => ({
        key: m.sourceColumn,
        label: m.displayLabel,
        width: m.width,
        visible: true,
        frozen: false,
        pinned: false,
        dataType: m.dataType,
        editable: true,
        order: i,
      }));

      set({
        session: updatedSession,
        isProcessing: false,
        activeStep: 'mapping',
        gridState: { ...get().gridState, columns: gridColumns },
        matchedProfileName: matchedProfile?.name || null,
        showProfileDialog: matchedProfile !== null,
      });

    } catch (err: any) {
      set({
        error: `Failed to parse file: ${err.message || 'Unknown error'}`,
        isProcessing: false,
        activeStep: 'select',
      });
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // COLUMN MAPPING
  // ═════════════════════════════════════════════════════════════════
  updateMapping: (sourceColumn: string, targetField: string | null) => {
    const session = get().session;
    if (!session) return;

    const newMappings = session.columnMappings.map(m => 
      m.sourceColumn === sourceColumn 
        ? { ...m, targetField, isMapped: targetField !== null, suggestedBy: 'user' as const, confidence: targetField ? 100 : 0 }
        : m
    );

    set({ session: { ...session, columnMappings: newMappings, updatedAt: new Date().toISOString() } });
  },

  updateAllMappings: (mappings: ColumnMapping[]) => {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, columnMappings: mappings, updatedAt: new Date().toISOString() } });
  },

  applyAISuggestion: (sourceColumn: string) => {
    const session = get().session;
    if (!session) return;

    const suggestion = session.aiSuggestions.find(s => s.sourceColumn === sourceColumn);
    if (!suggestion) return;

    get().updateMapping(sourceColumn, suggestion.suggestedField);
  },

  applyUnknownColumnAction: (sourceColumn: string, action: UnknownColumnInfo['action'], customKey?: string) => {
    const session = get().session;
    if (!session) return;

    const newUnknown = session.unknownColumns.map(u => 
      u.sourceColumn === sourceColumn ? { ...u, action, customFieldKey: customKey || u.sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '_') } : u
    );

    set({ session: { ...session, unknownColumns: newUnknown, updatedAt: new Date().toISOString() } });
  },

  // ═════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═════════════════════════════════════════════════════════════════
  runValidation: async () => {
    const session = get().session;
    if (!session || session.sheets.length === 0) return;

    set({ isProcessing: true, processingMessage: 'Validating data...', activeStep: 'validation' });

    try {
      // Build rows for validation
      const activeSheet = session.sheets[session.activeSheetIndex];
      const rows: Record<string, any>[] = activeSheet.rows.map((row, idx) => {
        const obj: Record<string, any> = {};
        activeSheet.headers.forEach((h, i) => {
          obj[h] = row[i] || '';
        });
        // Apply user edits
        if (session.editedRows[idx]) {
          Object.assign(obj, session.editedRows[idx]);
        }
        return obj;
      });

      // Get existing medicines from stock store for duplicate detection
      const existingMedicines = useStockStore.getState().medicines;

      const context: ValidationContext = {
        rows,
        columnMappings: session.columnMappings,
        existingMedicines,
      };

      const results = validationEngine.validateAll(context);
      const summary = validationEngine.getSummary(results);

      set({
        session: { ...session, validationResults: results, status: 'reviewing', updatedAt: new Date().toISOString() },
        validationSummary: summary,
        isProcessing: false,
        activeStep: 'review',
      });
    } catch (err: any) {
      set({
        error: `Validation failed: ${err.message}`,
        isProcessing: false,
      });
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // ROW EDITING
  // ═════════════════════════════════════════════════════════════════
  editRow: (rowIndex: number, field: string, value: any) => {
    const session = get().session;
    if (!session) return;

    const editedRows = { ...session.editedRows };
    if (!editedRows[rowIndex]) editedRows[rowIndex] = {};
    editedRows[rowIndex] = { ...editedRows[rowIndex], [field]: value };

    set({ session: { ...session, editedRows, updatedAt: new Date().toISOString() } });
  },

  deleteRows: (rowIndices: number[]) => {
    const session = get().session;
    if (!session) return;

    const deleted = new Set(session.deletedRowIndices);
    rowIndices.forEach(i => deleted.add(i));

    set({ session: { ...session, deletedRowIndices: deleted, updatedAt: new Date().toISOString() } });
  },

  undeleteRow: (rowIndex: number) => {
    const session = get().session;
    if (!session) return;

    const deleted = new Set(session.deletedRowIndices);
    deleted.delete(rowIndex);

    set({ session: { ...session, deletedRowIndices: deleted, updatedAt: new Date().toISOString() } });
  },

  addRow: (row: Record<string, any>) => {
    const session = get().session;
    if (!session) return;

    set({ session: { ...session, addedRows: [...session.addedRows, row], updatedAt: new Date().toISOString() } });
  },

  // ═════════════════════════════════════════════════════════════════
  // PREVIEW
  // ═════════════════════════════════════════════════════════════════
  generatePreview: () => {
    const session = get().session;
    if (!session || session.sheets.length === 0) return;

    set({ activeStep: 'preview' });

    const activeSheet = session.sheets[session.activeSheetIndex];
    let rowsAdded = 0;
    let rowsUpdated = 0;
    let rowsIgnored = 0;
    let totalQtyChange = 0;
    let totalValueChange = 0;
    const previewItems: CommitPreviewItem[] = [];

    for (let i = 0; i < activeSheet.rows.length; i++) {
      if (session.deletedRowIndices.has(i)) {
        rowsIgnored++;
        continue;
      }

      const row = { ...activeSheet.rows[i] };
      // Apply edits
      if (session.editedRows[i]) {
        Object.assign(row, session.editedRows[i]);
      }

      // Helper: get mapped value from row by targetField
      const getMappedValue = (targetField: string, fallback: string = '') => {
        const mapping = session.columnMappings.find(m => m.targetField === targetField);
        if (mapping) {
          const idx = activeSheet.headers.indexOf(mapping.sourceColumn);
          return idx >= 0 ? String(row[idx] || fallback) : fallback;
        }
        return fallback;
      };
      const getMappedNumber = (targetField: string, fallback: number = 0) => {
        const val = parseFloat(getMappedValue(targetField));
        return isNaN(val) ? fallback : val;
      };

      const name = getMappedValue('name', 'Unknown');
      const batch = getMappedValue('batch_number');
      const qty = getMappedNumber('quantity');
      const mrp = getMappedNumber('mrp');
      const company = getMappedValue('company');
      const expiry = getMappedValue('expiry_date');
      const sellingPrice = getMappedNumber('selling_price');
      const purchasePrice = getMappedNumber('purchase_price');

      // Check for duplicate
      const valResult = session.validationResults[i];
      const isDuplicate = valResult?.duplicateInfo !== null;
      const hasErrors = valResult?.status === 'error';

      if (hasErrors && !session.editedRows[i]) {
        previewItems.push({ action: 'error', name, batch, quantity: qty, mrp, reason: 'Has validation errors', company, expiry, selling_price: sellingPrice, purchase_price: purchasePrice });
        rowsIgnored++;
      } else if (isDuplicate && valResult?.duplicateInfo?.userDecision === 'skip') {
        previewItems.push({ action: 'skip', name, batch, quantity: qty, mrp, reason: 'Duplicate', company, expiry, selling_price: sellingPrice, purchase_price: purchasePrice });
        rowsIgnored++;
      } else if (isDuplicate) {
        previewItems.push({ action: 'update', name, batch, quantity: qty, mrp, reason: `Will ${valResult?.duplicateInfo?.suggestion || 'merge'}`, company, expiry, selling_price: sellingPrice, purchase_price: purchasePrice });
        rowsUpdated++;
      } else {
        previewItems.push({ action: 'add', name, batch, quantity: qty, mrp, company, expiry, selling_price: sellingPrice, purchase_price: purchasePrice });
        rowsAdded++;
      }

      totalQtyChange += qty;
      totalValueChange += qty * mrp;
    }

    // Count new columns from unknown columns that are being added
    const columnsAdded = session.unknownColumns.filter(u => u.action === 'add_to_schema' || u.action === 'import_once').length;

    const commitSummary: CommitSummary = {
      rowsAdded,
      rowsUpdated,
      rowsDeleted: 0,
      rowsIgnored,
      rowsInvalid: previewItems.filter(i => i.action === 'error').length,
      columnsAdded,
      columnsRenamed: session.columnMappings.filter(m => m.suggestedBy === 'user' && m.isMapped).length,
      columnsIgnored: session.unknownColumns.filter(u => u.action === 'ignore').length,
      warnings: [],
      errors: [],
      inventoryValueChange: totalValueChange,
      stockCountChange: totalQtyChange,
      batchCountChange: rowsAdded - rowsIgnored,
      previewItems,
    };

    set({
      session: { ...session, commitSummary, status: 'previewing', updatedAt: new Date().toISOString() },
    });
  },

  // ═════════════════════════════════════════════════════════════════
  // COMMIT TO STOCK
  // ═════════════════════════════════════════════════════════════════
  commitToStock: async () => {
    const session = get().session;
    if (!session || !session.commitSummary) return;

    set({ isProcessing: true, processingMessage: 'Committing to stock...' });

    try {
      const activeSheet = session.sheets[session.activeSheetIndex];
      const { setMedicines } = useStockStore.getState();
      const existingMedicines = [...useStockStore.getState().medicines];
      const newMedicines: any[] = [];
      let addedCount = 0;
      let updatedCount = 0;

      // Small helper for safe integer parsing
      const safeInt = (v: string, fallback: number | null = null): number | null => {
        const n = parseInt(v);
        return isNaN(n) ? fallback : n;
      };

      for (let i = 0; i < activeSheet.rows.length; i++) {
        if (session.deletedRowIndices.has(i)) continue;

        // Build row object from sheet data + user edits
        const rowObj: Record<string, string> = {};
        activeSheet.headers.forEach((h, idx) => rowObj[h] = String(activeSheet.rows[i][idx] || ''));
        if (session.editedRows[i]) {
          Object.assign(rowObj, session.editedRows[i]);
        }

        const medicine: any = {
          id: Date.now() + i + Math.random(),
          name: '',
          batch_number: '',
          quantity: 0,
          mrp: 0,
          purchase_price: 0,
          selling_price: 0,
          expiry_date: '',
          hsn_code: '3004',
          status: 'safe',
          company: '',
          custom_fields: {}, // Store non-mapped / unknown columns here
        };

        // Map fields from column mappings
        for (const mapping of session.columnMappings) {
          if (!mapping.targetField) continue;
          const value = rowObj[mapping.sourceColumn];
          if (value === undefined || value === null || value === '') continue;

          const fieldKey = mapping.targetField;
          const strVal = String(value).trim();

          switch (fieldKey) {
            case 'name': medicine.name = strVal; break;
            case 'generic_name': medicine.generic_name = strVal; break;
            case 'strength': medicine.strength = strVal; break;
            case 'batch_number': medicine.batch_number = strVal.toUpperCase(); break;
            case 'mfg_date': medicine.mfg_date = strVal; break;
            case 'expiry_date': medicine.expiry_date = strVal; break;
            case 'hsn_code': medicine.hsn_code = strVal; break;
            case 'mrp': medicine.mrp = parseFloat(strVal) || 0; break;
            case 'ptr': medicine.ptr = parseFloat(strVal) || 0; break;
            case 'pts': medicine.pts = parseFloat(strVal) || 0; break;
            case 'purchase_price': medicine.purchase_price = parseFloat(strVal) || 0; break;
            case 'selling_price': medicine.selling_price = parseFloat(strVal) || 0; break;
            case 'quantity': medicine.quantity = parseFloat(strVal) || 0; break;
            case 'free_qty': medicine.free_qty = parseFloat(strVal) || 0; break;
            case 'company': medicine.company = strVal; break;
            case 'manufacturer_name': medicine.manufacturer_name = strVal; break;
            case 'manufacturer_id': medicine.manufacturer_id = safeInt(strVal); break;
            case 'supplier_id': medicine.supplier_id = safeInt(strVal); break;
            case 'supplier_name': medicine.company = medicine.company || strVal; break;
            case 'dosage_form': medicine.dosage_form = strVal; break;
            case 'category': medicine.category = strVal; break;
            case 'supplier_gstin': medicine.supplier_gstin = strVal; break;
            case 'warehouse': medicine.warehouse = strVal; break;
            case 'rack_location': medicine.rack_location = strVal; break;
            case 'barcode': medicine.barcode = strVal; break;
            case 'schedule_type': medicine.schedule_type = strVal; break;
            case 'gst_percent': 
              medicine.purchase_gst_percent = parseFloat(strVal) || 5;
              medicine.sale_gst_percent = parseFloat(strVal) || 12;
              break;
            case 'purchase_gst_percent': medicine.purchase_gst_percent = parseFloat(strVal) || 5; break;
            case 'sale_gst_percent': medicine.sale_gst_percent = parseFloat(strVal) || 12; break;
            case 'discount_percent': medicine.discount_percent = parseFloat(strVal) || 0; break;
            case 'pack_size': medicine.pack_size = strVal; break;
            case 'invoice_no': medicine.invoice_no = strVal; break;
            case 'invoice_date': medicine.invoice_date = strVal; break;
            case 'eway_bill_no': medicine.eway_bill_no = strVal; break;
            case 'po_number': medicine.po_number = strVal; break;
            case 'order_date': medicine.order_date = strVal; break;
            case 'payment_terms': medicine.payment_terms = strVal; break;
            case 'due_date': medicine.due_date = strVal; break;
            case 'dispatch_location': medicine.dispatch_location = strVal; break;
            case 'item_code': medicine.item_code = strVal; break;
            case 'loose_quantity': medicine.loose_quantity = parseFloat(strVal) || 0; break;
            case 'total_base_units': medicine.total_base_units = parseFloat(strVal) || 0; break;
            case 'scheme_qty': medicine.scheme_qty = parseFloat(strVal) || 0; break;
            case 'scheme_bonus_code': medicine.scheme_bonus_code = strVal; break;
            case 'retailer_margin_percent': medicine.retailer_margin_percent = parseFloat(strVal) || 0; break;
            case 'min_margin_percent': medicine.min_margin_percent = parseFloat(strVal) || 0; break;
            case 'low_stock_alert': medicine.low_stock_alert = safeInt(strVal, 20)!; break;
            case 'max_stock_limit': medicine.max_stock_limit = safeInt(strVal); break;
            case 'expiry_returnable': medicine.expiry_returnable = safeInt(strVal); break;
            case 'taxable_amount': medicine.taxable_amount = parseFloat(strVal) || 0; break;
            case 'cgst_amount': medicine.cgst_amount = parseFloat(strVal) || 0; break;
            case 'sgst_amount': medicine.sgst_amount = parseFloat(strVal) || 0; break;
            case 'igst_amount': medicine.igst_amount = parseFloat(strVal) || 0; break;
            case 'num_cartons': medicine.num_cartons = safeInt(strVal, 0)!; break;
            case 'cold_chain': medicine.cold_chain = safeInt(strVal, 0)!; break;
          }
        }

        // Set default values (only for fields not already mapped from import)
        medicine.added_by = 1;
        medicine.created_at = new Date().toISOString();
        medicine.updated_at = new Date().toISOString();
        if (medicine.low_stock_alert == null || medicine.low_stock_alert === 0) medicine.low_stock_alert = 20;
        if (medicine.min_margin_percent == null) medicine.min_margin_percent = 20;
        if (medicine.loose_quantity == null) medicine.loose_quantity = 0;
        if (medicine.total_base_units == null) medicine.total_base_units = 0;
        if (medicine.scheme_qty == null) medicine.scheme_qty = 0;
        if (medicine.discount_percent == null) medicine.discount_percent = 0;
        if (medicine.purchase_gst_percent == null) medicine.purchase_gst_percent = 5;
        if (medicine.sale_gst_percent == null) medicine.sale_gst_percent = 12;
        if (medicine.hsn_code == null || medicine.hsn_code === '') medicine.hsn_code = '3004';
        if (medicine.schedule_type == null || medicine.schedule_type === '') medicine.schedule_type = 'General';
        if (medicine.quantity == null) medicine.quantity = 0;

        // ── Store unknown columns as custom_fields ──
        for (const unknown of session.unknownColumns) {
          if (unknown.action === 'ignore') continue; // Skip ignored columns
          const val = rowObj[unknown.sourceColumn];
          if (val === undefined || val === null || val === '') continue;
          const customKey = unknown.customFieldKey || unknown.sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          // Store in custom_fields object on the medicine
          if (!medicine.custom_fields) medicine.custom_fields = {};
          
          // Convert to appropriate type
          if (unknown.detectedType === 'number' || unknown.detectedType === 'currency') {
            medicine.custom_fields[customKey] = parseFloat(String(val)) || 0;
          } else if (unknown.detectedType === 'date') {
            medicine.custom_fields[customKey] = String(val).trim();
          } else {
            medicine.custom_fields[customKey] = String(val).trim();
          }
        }

        // Calculate status
        if (medicine.expiry_date) {
          const daysRemaining = (new Date(medicine.expiry_date).getTime() - Date.now()) / 86400000;
          medicine.status = daysRemaining < 0 ? 'expired' : daysRemaining <= 90 ? 'critical' : daysRemaining <= 180 ? 'warning' : 'safe';
          medicine.days_remaining = Math.round(daysRemaining);
        }

        // Handle duplicates based on user decision
        const valResult = session.validationResults[i];
        const duplicateInfo = valResult?.duplicateInfo;
        
        if (duplicateInfo && duplicateInfo.userDecision === 'skip') {
          continue; // Skip this row
        }

        if (duplicateInfo && duplicateInfo.userDecision === 'increase_qty') {
          // Increase quantity of existing batch
          const existingIdx = existingMedicines.findIndex(m => m.id === duplicateInfo.existingIds[0]);
          if (existingIdx !== -1) {
            existingMedicines[existingIdx] = {
              ...existingMedicines[existingIdx],
              quantity: (existingMedicines[existingIdx].quantity || 0) + medicine.quantity,
              updated_at: new Date().toISOString(),
            };
          }
          updatedCount++;
          continue;
        }

        if (duplicateInfo && (duplicateInfo.userDecision === 'replace')) {
          // Replace existing
          const existingIdx = existingMedicines.findIndex(m => m.id === duplicateInfo.existingIds[0]);
          if (existingIdx !== -1) {
            existingMedicines[existingIdx] = { ...medicine, id: existingMedicines[existingIdx].id };
          }
          updatedCount++;
          continue;
        }

        // Add as new
        newMedicines.push(medicine);
        addedCount++;
      }

      // Merge new medicines with existing
      const updatedStock = [...existingMedicines, ...newMedicines];

      // Persist via bulk API call (handles both browser localStorage and Electron)
      if (window.electronAPI) {
        try {
          await window.electronAPI.saveAllStock({ medicines: updatedStock });
        } catch (e) {
          // Fallback: save directly to localStorage
          try { localStorage.setItem('anpharm_medicines', JSON.stringify(updatedStock)); } catch {}
        }
        // Refresh dashboard stats
        try {
          const dashResult = await window.electronAPI.getDashboardStats();
          if (dashResult.success) {
            useStockStore.getState().setDashboardStats(dashResult.stats);
          }
        } catch {}
      } else {
        // No API available — save directly to localStorage as fallback
        try { localStorage.setItem('anpharm_medicines', JSON.stringify(updatedStock)); } catch {}
      }

      // Update the in-memory store
      setMedicines(updatedStock);

      // Record AI Learning Engine mappings
      for (const mapping of session.columnMappings) {
        if (mapping.isMapped && mapping.targetField) {
          aiLearningEngine.recordMapping(
            mapping.sourceColumn,
            mapping.targetField,
            session.source,
            mapping.suggestedBy === 'ai',
            mapping.suggestedBy === 'ai', // Accepted if it was AI-suggested and kept
            mapping.suggestedBy === 'user' // Corrected if user manually set it
          );
        }
      }

      // ── Register new custom fields in schema & sync StockEditor columns ──
      const newCustomFieldKeys: string[] = [];
      for (const unknown of session.unknownColumns) {
        if (unknown.action === 'ignore') continue;
        
        const customKey = unknown.customFieldKey || unknown.sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Add to schema if marked as add_to_schema or create_custom
        if (unknown.action === 'add_to_schema' || unknown.action === 'create_custom') {
          const existingField = schemaManager.getField(customKey);
          if (!existingField) {
            schemaManager.addCustomField(
              unknown.sourceColumn,  // Use original column name as label
              unknown.detectedType,
              'import',
              session.source,
              customKey
            );
            newCustomFieldKeys.push(customKey);
          }
        }
        
        // For 'import_once': just store values but don't add to permanent schema
        // Values are already stored in medicine.custom_fields above
      }

      // ── Sync column definitions to StockEditor ──
      // Only sync NEW unknown/custom field columns — never re-add already-known fields
      // that the user may have intentionally removed from the stock view.
      try {
        const STORAGE_KEY_COLUMNS = 'anpharm_stock_columns';
        const existingColumnsRaw = localStorage.getItem(STORAGE_KEY_COLUMNS);
        let existingColumns: any[] = [];
        if (existingColumnsRaw) {
          try { existingColumns = JSON.parse(existingColumnsRaw); } catch {}
        }
        
        if (Array.isArray(existingColumns)) {
          const existingKeys = new Set(existingColumns.map((c: any) => c.key));
          let changed = false;
          
          // Only add columns for unknown/custom field columns that don't exist yet
          for (const unknown of session.unknownColumns) {
            if (unknown.action === 'ignore') continue;
            const colKey = unknown.customFieldKey || unknown.sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (!existingKeys.has(colKey)) {
              existingColumns.push({
                key: colKey,
                label: unknown.sourceColumn,
                type: unknown.detectedType === 'currency' ? 'number' : unknown.detectedType === 'date' ? 'date' : 'text',
                width: 120,
                visible: true,
                editable: true,
              });
              existingKeys.add(colKey);
              changed = true;
            }
          }
          
          if (changed) {
            localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(existingColumns));
          }
        }
      } catch (e) {
        // Silently fail — column sync is non-critical
      }

      // Create Audit Trail entry
      try {
        useAuditTrailStore.getState().addEntry({
          id: generateSessionId(),
          userId: 1,
          userName: 'Admin',
          timestamp: new Date().toISOString(),
          fileName: session.fileName,
          source: session.source,
          profileName: session.profileId ? importProfileStore.get(session.profileId)?.name || null : null,
          rowsAdded: addedCount,
          rowsUpdated: updatedCount,
          rowsDeleted: 0,
          rowsIgnored: session.commitSummary.rowsIgnored,
          columnsAdded: session.commitSummary.columnsAdded,
          columnsRenamed: session.commitSummary.columnsRenamed,
          stockValueChange: session.commitSummary.inventoryValueChange,
          stockCountChange: session.commitSummary.stockCountChange,
          previousStockSnapshot: JSON.stringify(existingMedicines),
          importedIds: newMedicines.map(m => m.id),
          updatedIds: [],
          warnings: session.commitSummary.warnings,
          errors: session.commitSummary.errors,
          duration: Date.now() - new Date(session.updatedAt).getTime(),
          rolledBack: false,
          rolledBackAt: null,
        });
      } catch {}

      // Record profile usage
      if (session.profileId) {
        importProfileStore.recordUsage(session.profileId);
      }

      // Mark session as committed
      set({
        session: { ...session, status: 'committed', committedAt: new Date().toISOString() },
        isProcessing: false,
        activeStep: 'complete',
      });

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);

    } catch (err: any) {
      set({
        error: `Commit failed: ${err.message}`,
        isProcessing: false,
        session: session ? { ...session, status: 'commit_error' } : null,
      });
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════
  resetSession: () => {
    set({
      session: null,
      validationSummary: null,
      gridState: {
        columns: [],
        sort: [],
        filters: [],
        searchQuery: '',
        selectedRows: new Set(),
        scrollTop: 0,
        scrollLeft: 0,
        expandedRows: new Set(),
        frozenColumns: 0,
      },
      activeStep: 'select',
      isProcessing: false,
      processingMessage: '',
      error: null,
      showProfileDialog: false,
      matchedProfileName: null,
    });
  },

  saveDraft: () => {
    const session = get().session;
    if (!session) return;
    try {
      const draft = {
        session: {
          ...session,
          // Convert Sets to arrays for JSON serialization
          deletedRowIndices: Array.from(session.deletedRowIndices),
        },
        activeStep: get().activeStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      set({ session: { ...session, draftSavedAt: new Date().toISOString() } });
    } catch {}
  },

  loadDraft: () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (draft.session) {
        // Convert arrays back to Sets
        draft.session.deletedRowIndices = new Set(draft.session.deletedRowIndices || []);
        set({
          session: draft.session,
          activeStep: draft.activeStep || 'mapping',
        });
        return true;
      }
    } catch {}
    return false;
  },

  setActiveStep: (step: ImportStep) => set({ activeStep: step }),
  setGridState: (state: Partial<GridState>) => set({ gridState: { ...get().gridState, ...state } }),

  // ═════════════════════════════════════════════════════════════════
  // IMPORT PROFILES
  // ═════════════════════════════════════════════════════════════════
  saveAsProfile: (name: string, supplierName?: string) => {
    const session = get().session;
    if (!session) return;

    const profileMappings = importProfileStore.buildProfileMappings(
      session.columnMappings.filter(m => m.isMapped)
    );
    const ignoredColumns = session.unknownColumns
      .filter(u => u.action === 'ignore')
      .map(u => u.sourceColumn);

    importProfileStore.create({
      name,
      description: `Auto-saved import profile for ${session.fileName}`,
      source: session.source,
      supplierName,
      columnMappings: profileMappings,
      ignoredColumns,
      renamedColumns: {},
      defaultValues: {},
    });
  },

  applyProfile: (profileId: string) => {
    const profile = importProfileStore.get(profileId);
    if (!profile) return;

    const session = get().session;
    if (!session) return;

    // Apply profile mappings to current session
    const newMappings = session.columnMappings.map(m => {
      const profileMatch = profile.columnMappings.find(pc => 
        m.sourceColumn.toLowerCase().includes(pc.sourcePattern.toLowerCase()) ||
        pc.sourcePattern.toLowerCase().includes(m.sourceColumn.toLowerCase())
      );
      if (profileMatch) {
        return { ...m, targetField: profileMatch.targetField, isMapped: true, suggestedBy: 'profile' as const, confidence: profileMatch.confidence };
      }
      return m;
    });

    // Re-run AI suggestions for still-unmapped columns
    const unmapped = newMappings.filter(m => !m.isMapped);
    const newAiSuggestions: AIMappingSuggestion[] = [];
    for (const col of unmapped) {
      const match = columnMapper.findBestSynonymMatch(col.sourceColumn);
      if (match) {
        newAiSuggestions.push({
          sourceColumn: col.sourceColumn,
          suggestedField: match.field,
          confidence: match.confidence,
          reasoning: match.reasoning,
          alternativeFields: columnMapper.findAlternatives(col.sourceColumn, match.field).slice(0, 3),
        });
      }
    }

    set({
      session: {
        ...session,
        columnMappings: newMappings,
        aiSuggestions: newAiSuggestions,
        profileId,
        updatedAt: new Date().toISOString(),
      },
      showProfileDialog: false,
    });

    importProfileStore.recordUsage(profileId);
  },

  checkForProfileMatch: (fileName: string, supplierName?: string) => {
    const profile = importProfileStore.findMatch(fileName, supplierName);
    if (profile) {
      set({
        showProfileDialog: true,
        matchedProfileName: profile.name,
      });
    }
  },
}));
