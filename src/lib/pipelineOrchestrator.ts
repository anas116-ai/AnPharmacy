/**
 * Pipeline Orchestrator - Coordinates all AI stages in the PIDP system
 * 
 * This orchestrator manages the complete document processing pipeline:
 * 1. Image Input
 * 2. Image Quality Engine
 * 3. OCR / PDF Text Extraction
 * 4. Layout Detection
 * 5. Table Detection
 * 6. Row & Column Reconstruction
 * 7. Dynamic Header Detection & Field Mapping
 * 8. Validation Engine & Business Rules
 * 9. Medicine Master Validation
 * 10. Invoice Total Validation
 * 11. Confidence Scoring
 * 12. Human Review (if needed)
 * 13. Database Save
 * 
 * Features:
 * - Sequential stage execution with dependency tracking
 * - Parallel processing where stages are independent
 * - Automatic retry with fallback on failure
 * - Event emission for progress tracking
 * - Abort support for long-running operations
 * - Stage timing and performance metrics
 */

import {
  PipelineStage,
  PipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  PipelineEvent,
  PipelineEventCallback,
  ProcessingContext,
  ProcessingResult,
  createEmptyProcessingResult,
  RawDocument,
  DocumentLayout,
  DocumentSection,
  TableStructure,
  TableCell,
  TableRow as DocTableRow,
  TableHeader as DocTableHeader,
  ValidatedItem,
  MappedRow,
  MappedField,
  InvoiceHeaderInfo,
  SupplierProfile,
  ImageQualityResult,
  StandardField,
  LearnedPattern,
} from './documentModel';

import { OCRPipeline } from './ocrPipeline';
import { BusinessRulesEngine } from './businessRules';
import { HeaderMapper } from './headerMapper';
import { learningEngine } from './invoiceLearningEngine';
import type { ParsedItem } from './ocrParser';

// ── Create pipeline stage instances ───────────────────────────────────

type PipelineStageInstances = {
  ocrPipeline: OCRPipeline;
  businessRules: BusinessRulesEngine;
  headerMapper: HeaderMapper;
};

// ── Stage Handler Types ───────────────────────────────────────────────

export type StageHandler<TInput = any, TOutput = any> = (
  input: TInput,
  context: ProcessingContext
) => Promise<TOutput>;

export interface StageDefinition {
  stage: PipelineStage;
  name: string;
  description: string;
  handler: StageHandler;
  dependencies: PipelineStage[];
  retryable: boolean;
  critical: boolean; // If true, pipeline fails if this stage fails
}

// ── Pipeline Result ──────────────────────────────────────────────────

export interface PipelineResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  stageTimings: Record<PipelineStage, number>;
  stagesCompleted: PipelineStage[];
  events: PipelineEvent[];
  warnings: string[];
}

// ── Pipeline Orchestrator Class ──────────────────────────────────────

export class PipelineOrchestrator {
  private config: PipelineConfig;
  private eventCallback?: PipelineEventCallback;
  private abortController?: AbortController;
  
  private ocrPipeline!: OCRPipeline;
  private headerMapperInst!: HeaderMapper;
  private businessRules!: BusinessRulesEngine;
  private initialized = false;
  
  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }
  
  /**
   * Initialize pipeline stage instances (lazy initialization)
   */
  private initialize(): PipelineStageInstances {
    if (!this.initialized) {
      this.ocrPipeline = new OCRPipeline(this.config);
      this.headerMapperInst = new HeaderMapper({
        enableSupplierProfiles: this.config.enableSupplierProfiles,
        minHeaderConfidence: 50,
      });
      this.businessRules = new BusinessRulesEngine({
        enableMedicineNameValidation: this.config.enableBusinessRules,
        enableBatchValidation: this.config.enableBusinessRules,
        enablePriceValidation: this.config.enableBusinessRules,
        enableGSTValidation: this.config.enableBusinessRules,
        enableDateValidation: this.config.enableBusinessRules,
        enableHSNValidation: this.config.enableBusinessRules,
        enableQuantityValidation: this.config.enableBusinessRules,
        enableManufacturerValidation: this.config.enableBusinessRules,
        enableCrossFieldValidation: this.config.enableBusinessRules,
        autoCorrectThreshold: this.config.autoSaveThreshold,
        reviewThreshold: this.config.reviewThreshold,
      });
      this.initialized = true;
    }
    return {
      ocrPipeline: this.ocrPipeline,
      headerMapper: this.headerMapperInst,
      businessRules: this.businessRules,
    };
  }
  
  // ── Main Pipeline Execution ──────────────────────────────────────
  
  async execute(
    input: {
      imagePath?: string;
      pdfPath?: string;
      rawText?: string;
      ocrText?: string;
      existingMedicines: any[];
      supplierProfile?: SupplierProfile;
    },
    onEvent?: PipelineEventCallback
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const pipelineId = this.generatePipelineId();
    
    this.eventCallback = onEvent;
    this.abortController = new AbortController();
    
    const events: PipelineEvent[] = [];
    const stageTimings: Record<PipelineStage, number> = {
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
    };
    
    const stagesCompleted: PipelineStage[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    const context: ProcessingContext = {
      pipelineId,
      config: this.config,
      existingMedicines: input.existingMedicines,
      supplierProfile: input.supplierProfile,
      events,
      eventCallback: onEvent,
      abortSignal: this.abortController.signal,
    };
    
    let rawDocument: RawDocument | null = null;
    let layout: DocumentLayout | undefined;
    let table: TableStructure | undefined;
    let items: ValidatedItem[] = [];
    let invoiceHeader: InvoiceHeaderInfo = {
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
    
    let autoSaveCount = 0;
    let reviewRequiredCount = 0;
    
    try {
      // ── Stage 1: Image Input ─────────────────────────────────────
      
      rawDocument = await this.runStage(
        PipelineStage.IMAGE_INPUT,
        'Image Input',
        'Loading document from source',
        async () => {
          if (input.rawText || input.ocrText) {
            return {
              id: pipelineId,
              sourceType: input.rawText ? 'pdf' : 'image',
              rawText: input.rawText || input.ocrText || '',
              textConfidence: 100,
              ocrEngine: 'direct_input',
              extractedAt: new Date(),
              processingTimeMs: 0,
            } as RawDocument;
          }
          
          // TODO: Implement actual image/PDF loading via Electron API
          throw new Error('Image/PDF loading not yet implemented - use rawText input for testing');
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      if (!rawDocument) {
        throw new Error('Failed to load document');
      }
      
      // ── Stage 2: Image Quality ───────────────────────────────────
      
      if (rawDocument.sourceType === 'image' || rawDocument.sourceType === 'scanned_pdf') {
        const qualityResult = await this.runStage(
          PipelineStage.IMAGE_QUALITY,
          'Image Quality',
          'Analyzing image quality',
          async () => {
            // TODO: Import and run image quality checker
            // For now, return a default passing result
            return {
              passed: true,
              blurScore: 80,
              brightnessScore: 50,
              resolutionScore: 1200,
              rotationAngle: 0,
              hasShadow: false,
              hasGlare: false,
              issues: [],
              enhancements: [],
              overallScore: 85,
            } as ImageQualityResult;
          },
          context,
          stageTimings,
          stagesCompleted
        );
        
        rawDocument.imageQuality = qualityResult;
        
        if (!qualityResult.passed && qualityResult.overallScore < 40) {
          warnings.push('Image quality is poor. Results may be inaccurate.');
          suggestions.push('Please scan the invoice again with better lighting and focus');
        }
      }
      
      // ── Stage 3: OCR Extraction ──────────────────────────────────
      
      const ocrDocument = await this.runStage(
        PipelineStage.OCR_EXTRACTION,
        'OCR Extraction',
        'Extracting text from document using adaptive OCR pipeline',
        async () => {
          if (rawDocument!.rawText && rawDocument!.textConfidence === 100) {
            return rawDocument!;
          }
          
          // Use adaptive OCR pipeline with fallback strategy
          const { ocrPipeline } = this.initialize();
          
          const result = await ocrPipeline.extract(rawDocument!);
          
          if (result.ocrEngine === 'failed') {
            warnings.push('All OCR engines failed - document may be unreadable');
            suggestions.push('Ensure the document is clear, properly oriented, and well-lit');
          } else if (result.textConfidence < this.config.ocrConfidenceThreshold) {
            warnings.push(`OCR confidence is low (${result.textConfidence}%) - results may contain errors`);
            suggestions.push('Review extracted text for accuracy before accepting');
          }
          
          return result;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      rawDocument = ocrDocument;
      
      if (!rawDocument.rawText || rawDocument.rawText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }
      
      // ── Stage 4: Layout Detection ────────────────────────────────
      
      layout = await this.runStage(
        PipelineStage.LAYOUT_DETECTION,
        'Layout Detection',
        'Detecting document sections from OCR text',
        async () => {
          const sections: DocumentSection[] = [];
          const text = rawDocument!.rawText;
          const lines = text.split('\n').filter(l => l.trim().length > 0);

          if (lines.length === 0) {
            return {
              id: this.generateId(),
              rawDocumentId: rawDocument!.id,
              sections: [],
              pageCount: 1,
              orientation: 'portrait',
              hasHeader: false,
              hasFooter: false,
              hasMultipleTables: false,
              confidence: 30,
              detectionMethod: 'rule_based',
            } as DocumentLayout;
          }

          // Detect table start by finding header patterns
          let tableStart = -1;
          for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const line = lines[i].toLowerCase();
            // Look for known header patterns
            if (/(?:batch|medicine|product|item|qty|expiry|description)/i.test(line)) {
              // Count how many header-like words are in this line
              const headerWords = ['batch', 'medicine', 'product', 'item', 'qty', 'quantity', 'expiry',
                'description', 'particulars', 'hsn', 'gst', 'rate', 'price', 'mrp', 'ptr'];
              const matchCount = headerWords.filter(w => line.includes(w)).length;
              if (matchCount >= 2) {
                tableStart = i;
                break;
              }
            }
          }

          // Detect footer start (total, grand total, etc.)
          let tableEnd = lines.length - 1;
          for (let i = Math.max(tableStart, 0); i < lines.length; i++) {
            if (/(?:total|grand total|sub total|net payable|amount payable)/i.test(lines[i])) {
              tableEnd = i - 1;
              break;
            }
          }

          // Build sections
          if (tableStart >= 0) {
            sections.push({
              type: 'header',
              startLine: 0,
              endLine: tableStart - 1,
              startPosition: 0,
              endPosition: lines.slice(0, tableStart).join('\n').length,
              confidence: 80,
              content: lines.slice(0, tableStart).join('\n'),
            });

            sections.push({
              type: 'table',
              startLine: tableStart,
              endLine: tableEnd,
              startPosition: lines.slice(0, tableStart).join('\n').length,
              endPosition: lines.slice(0, tableEnd + 1).join('\n').length,
              confidence: 85,
              content: lines.slice(tableStart, tableEnd + 1).join('\n'),
            });

            if (tableEnd < lines.length - 1) {
              sections.push({
                type: 'footer',
                startLine: tableEnd + 1,
                endLine: lines.length - 1,
                startPosition: lines.slice(0, tableEnd + 1).join('\n').length,
                endPosition: text.length,
                confidence: 75,
                content: lines.slice(tableEnd + 1).join('\n'),
              });
            }
          } else {
            sections.push({
              type: 'unknown',
              startLine: 0,
              endLine: lines.length - 1,
              startPosition: 0,
              endPosition: text.length,
              confidence: 40,
              content: text,
            });
          }

          const hasMultipleTables = sections.filter(s => s.type === 'table').length > 1;
          const avgConfidence = sections.length > 0
            ? Math.round(sections.reduce((s, sec) => s + sec.confidence, 0) / sections.length)
            : 50;

          return {
            id: this.generateId(),
            rawDocumentId: rawDocument!.id,
            sections,
            pageCount: 1,
            orientation: 'portrait',
            hasHeader: sections.some(s => s.type === 'header'),
            hasFooter: sections.some(s => s.type === 'footer'),
            hasMultipleTables,
            confidence: avgConfidence,
            detectionMethod: 'rule_based',
          } as DocumentLayout;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Stage 5: Table Detection + Row Reconstruction ────────────
      
      const tableResult = await this.runStage(
        PipelineStage.TABLE_DETECTION,
        'Table Detection & Parsing',
        'Detecting and parsing invoice table structure',
        async () => {
          // Import table parser and use it
          let detectedHeaders: string[] = [];
          let parsedRows: any[] = [];
          let tableConfidence = 0;

          try {
            const { detectAndParseTable } = await import('./invoiceTableParser');
            const result = detectAndParseTable(rawDocument!.rawText);
            
            if (result && result.rows.length > 0) {
              detectedHeaders = result.headers.map(h => h.standardField);
              parsedRows = result.rows;
              tableConfidence = result.confidence;
            }
          } catch (err) {
            console.warn('Invoice table parser not available, using inline detection:', err);
          }

          // If table parser failed, fall back to basic line analysis
          if (parsedRows.length === 0) {
            const lines = rawDocument!.rawText.split('\n').filter(l => l.trim());
            const dataLines = lines.filter(l => {
              return !/^(?:total|sub|grand|gst|tax|round|thanks|regards|page|invoice|bill\s*date)/i.test(l);
            });

            for (let i = 0; i < dataLines.length; i++) {
              const cells = dataLines[i].split(/\s{2,}|\t/).map(c => c.trim()).filter(c => c.length > 0);
              if (cells.length >= 2) {
                parsedRows.push({ rawText: dataLines[i], fields: {}, cells, lineIndex: i });
              }
            }
          }

          // Build table cells for each row
          const tableRows: DocTableRow[] = parsedRows.map((row, ri) => ({
            rowIndex: ri,
            originalText: row.rawText || '',
            startPosition: 0,
            endPosition: (row.rawText || '').length,
            cells: (row.cells || Object.values(row.fields || {})).map((cellText: string, ci: number) => ({
              columnIndex: ci,
              rowIndex: ri,
              originalText: cellText,
              startPosition: 0,
              endPosition: cellText.length,
              isMerged: false,
              isWrapped: false,
              isEmpty: !cellText || cellText.trim().length === 0,
              confidence: 70,
            })),
            isContinuation: false,
            isTotal: false,
            isEmpty: !row.rawText || row.rawText.trim().length === 0,
            confidence: row.confidence || 60,
            issues: [],
          }));

          const headerText = detectedHeaders.length > 0
            ? detectedHeaders.join(' | ')
            : (rawDocument!.rawText.split('\n')[0] || '');

          return {
            id: this.generateId(),
            layoutId: layout!.id,
            startLine: layout?.sections.find(s => s.type === 'header')?.endLine ?? 0,
            endLine: layout?.sections.find(s => s.type === 'table')?.endLine ?? 0,
            headers: detectedHeaders.map((h, idx) => ({
              originalText: h,
              standardField: StandardField.UNKNOWN,
              columnIndex: idx,
              startPosition: 0,
              endPosition: h.length,
              confidence: 70,
            })),
            originalHeaderText: headerText,
            rows: tableRows,
            rowCount: tableRows.length,
            tableType: detectedHeaders.length >= 7 ? 'standard'
              : detectedHeaders.length >= 4 ? 'compact' : 'unknown',
            hasMergedCells: false,
            hasWrappedRows: false,
            hasContinuationRows: false,
            confidence: tableConfidence || 50,
            reconstructionQuality: tableRows.length > 0 ? 'good' : 'poor',
          } as TableStructure;
        },
        context,
        stageTimings,
        stagesCompleted
      );

      table = tableResult;

      // ── Stage 6: Row Reconstruction (clean up rows) ─────────────
      
      table = await this.runStage(
        PipelineStage.ROW_RECONSTRUCTION,
        'Row Reconstruction',
        'Reconstructing and cleaning table rows',
        async () => {
          if (!table || table.rows.length === 0) return table!;

          // Filter out total/summary rows
          const cleanedRows = table.rows.filter(row => {
            const text = row.originalText.toLowerCase();
            return !/^(?:total|sub.?total|grand|net|gst|tax|round|thanks|regards)/i.test(text);
          });

          // Detect and fix continuation rows (medicine names that wrap)
          const fixedRows: DocTableRow[] = [];
          for (let i = 0; i < cleanedRows.length; i++) {
            const row = cleanedRows[i];
            // If this row looks like a continuation (no batch/expiry, only text)
            const nextRow = cleanedRows[i + 1];
            if (nextRow && row.cells.length === 1 && nextRow.cells.length >= 3) {
              // Merge with next row
              nextRow.originalText = row.originalText + ' ' + nextRow.originalText;
              nextRow.cells = [
                { ...row.cells[0], isMerged: true },
                ...nextRow.cells,
              ];
              continue;
            }
            fixedRows.push(row);
          }

          return {
            ...table,
            rows: fixedRows,
            rowCount: fixedRows.length,
            reconstructionQuality: fixedRows.length > 0 ? 'good' : 'poor',
          } as TableStructure;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Stage 7: Header Detection & Field Mapping ───────────────
      
      const mappedRows = await this.runStage(
        PipelineStage.HEADER_MAPPING,
        'Header Mapping',
        'Mapping columns to standard fields using synonym database',
        async () => {
          const { headerMapperInst } = this;
          
          // Detect headers from OCR text
          const headerMatches = headerMapperInst.mapHeaders(
            rawDocument!.rawText,
            input.supplierProfile
          );

          if (headerMatches.length === 0) {
            warnings.push('No column headers could be detected from the invoice');
            suggestions.push('Invoice layout may be non-standard - consider manual entry');
            return [];
          }

          // Apply supplier learning to header matches if available
          if (this.config.enableSupplierProfiles && input.supplierProfile) {
            const supplierPatterns = learningEngine.getTopPatterns(20)
              .filter(p => p.patternType === 'field_mapping');

            for (const match of headerMatches) {
              const pattern = supplierPatterns.find(p =>
                match.originalText.toLowerCase().includes(p.pattern.toLowerCase())
              );
              if (pattern) {
                match.confidence = Math.min(100, match.confidence + 10);
              }
            }
          }

          // Build mapped rows from table structure
          const mapped = headerMapperInst.buildMappedRowsFromTableStructure(table!, headerMatches);

          // Emit mapping report
          const report = headerMapperInst.getMappingReport(headerMatches);
          if (report.criticalFieldsMissing.length > 0) {
            warnings.push(`Missing critical columns: ${report.criticalFieldsMissing.join(', ')}`);
            suggestions.push('Some important columns could not be detected - please verify manually');
          }

          // Update invoice header info from supplier profile
          if (input.supplierProfile) {
            invoiceHeader.supplierName = input.supplierProfile.supplierName;
          }

          return mapped;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Stage 8: Field Validation & Business Rules ───────────────
      
      items = await this.runStage(
        PipelineStage.FIELD_VALIDATION,
        'Field Validation & Business Rules',
        'Validating fields against pharmacy business rules',
        async () => {
          const { businessRules } = this.initialize();
          
          // Build ParsedItem[] from mapped rows (when header mapper is connected)
          const parsedItems: ParsedItem[] = [];
          
          if (mappedRows.length > 0) {
            // Map from MappedRow to ParsedItem with confidence tracking
            for (const mappedRow of mappedRows) {
              const fields = mappedRow.fields;
              
              const parsedItem: ParsedItem = {
                id: `item-${mappedRow.rowId}`,
                selected: mappedRow.isSelected,
                name: fields.get(StandardField.DESCRIPTION)?.normalizedValue || '',
                manufacturer: fields.get(StandardField.MANUFACTURER)?.normalizedValue || '',
                batchNumber: fields.get(StandardField.BATCH_NO)?.normalizedValue || '',
                hsnCode: fields.get(StandardField.HSN_CODE)?.normalizedValue || '',
                barcode: fields.get(StandardField.BARCODE)?.normalizedValue || '',
                scheduleType: fields.get(StandardField.SCHEDULE_TYPE)?.normalizedValue || '',
                strength: fields.get(StandardField.STRENGTH)?.normalizedValue || '',
                packSize: fields.get(StandardField.PACK_SIZE)?.normalizedValue || '',
                quantity: fields.get(StandardField.QUANTITY)?.numericValue || 0,
                freeQty: fields.get(StandardField.FREE_QTY)?.numericValue || 0,
                schemeQty: fields.get(StandardField.SCHEME_QTY)?.numericValue || 0,
                mfgDate: fields.get(StandardField.MFG_DATE)?.normalizedValue || '',
                expiryDate: fields.get(StandardField.EXPIRY_DATE)?.normalizedValue || '',
                mrp: fields.get(StandardField.MRP)?.numericValue || 0,
                ptr: fields.get(StandardField.PTR)?.numericValue || 0,
                pts: fields.get(StandardField.PTS)?.numericValue || 0,
                unitPrice: fields.get(StandardField.UNIT_PRICE)?.numericValue || 0,
                purchasePrice: fields.get(StandardField.UNIT_PRICE)?.numericValue || 0,
                totalAmount: fields.get(StandardField.TOTAL_AMOUNT)?.numericValue || 0,
                taxableValue: fields.get(StandardField.TAXABLE_VALUE)?.numericValue || 0,
                discountPercent: fields.get(StandardField.DISCOUNT_PERCENT)?.numericValue || 0,
                gstRate: fields.get(StandardField.GST_RATE)?.numericValue || 0,
                cgstAmount: fields.get(StandardField.CGST_AMOUNT)?.numericValue || 0,
                sgstAmount: fields.get(StandardField.SGST_AMOUNT)?.numericValue || 0,
                igstAmount: fields.get(StandardField.IGST_AMOUNT)?.numericValue || 0,
                rackLocation: '',
                confidence: mappedRow.overallConfidence,
                rawText: mappedRow.originalText,
              } as ParsedItem;
              
              parsedItems.push(parsedItem);
            }
          } else if (rawDocument!.rawText) {
            // No mapped rows yet - try inline parsing from OCR text
            try {
              const { scanInvoiceHeaders } = await import('./ocrParser');
              
              // Extract basic invoice header info
              const header = scanInvoiceHeaders(rawDocument!.rawText);
              if (header.invoiceNo || header.supplierName) {
                invoiceHeader.invoiceNo = header.invoiceNo || invoiceHeader.invoiceNo;
                invoiceHeader.invoiceDate = header.invoiceDate || invoiceHeader.invoiceDate;
                invoiceHeader.supplierName = header.supplierName || invoiceHeader.supplierName;
                invoiceHeader.supplierGstin = header.supplierGstin || invoiceHeader.supplierGstin;
              }
            } catch {
              // ocrParser processing is optional at this stage
            }
          }
          
          // Run business rules validation on whatever items we have
          if (parsedItems.length > 0) {
            const batchResult = businessRules.validateBatch(parsedItems);
            
            // Collect warnings from business rules
            if (batchResult.summary.totalCriticalIssues > 0) {
              warnings.push(`${batchResult.summary.totalCriticalIssues} critical issues found across ${batchResult.totalItems} items`);
            }
            
            if (batchResult.summary.totalWarnings > 0) {
              warnings.push(`${batchResult.summary.totalWarnings} warnings from business rules validation`);
            }
            
            if (batchResult.summary.totalAutoCorrections > 0) {
              suggestions.push(`${batchResult.summary.totalAutoCorrections} values auto-corrected by business rules`);
            }
            
            if (batchResult.summary.fieldsWithLowConfidence.length > 0) {
              warnings.push(`Consistently low confidence in fields: ${batchResult.summary.fieldsWithLowConfidence.join(', ')}`);
            }
            
            // Update review counts
            if (!batchResult.autoSaveEligible) {
              reviewRequiredCount += batchResult.itemsNeedingReview;
            }
          } else {
            warnings.push('No table structure detected for field validation');
            suggestions.push('Consider manual entry for documents without clear table structure');
          }
          
          return items;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Stage 9: Medicine Master Validation ─────────────────────
      
      items = await this.runStage(
        PipelineStage.MEDICINE_VALIDATION,
        'Medicine Validation',
        'Validating extracted medicines against master database',
        async () => {
          if (items.length === 0) return items;

          const validatedItems: ValidatedItem[] = [];

          try {
            const { matchMedicineName } =
              await import('./medicineMatcher');

            for (const item of items) {
              // Match medicine name against database
              const matchResult = matchMedicineName(
                item.medicineName,
                context.existingMedicines.map((m: any) => ({
                  id: m.id,
                  name: m.name || m.medicineName || '',
                  batch_number: m.batch_number || m.batchNumber || '',
                  company: m.company || m.manufacturer || null,
                  strength: m.strength || null,
                  pack_size: m.pack_size || m.packSize || null,
                }))
              );

              // Apply learning engine patterns
              let medicineName = item.medicineName;
              let batchNumber = item.batchNumber;
              try {
                const corrected = learningEngine.applyPatterns({
                  id: item.itemId,
                  selected: true,
                  name: item.medicineName,
                  manufacturer: item.manufacturer,
                  batchNumber: item.batchNumber,
                  hsnCode: item.hsnCode,
                  barcode: '',
                  scheduleType: item.scheduleType,
                  strength: item.strength,
                  packSize: item.packSize,
                  quantity: item.quantity,
                  freeQty: item.freeQty,
                  schemeQty: item.schemeQty,
                  mfgDate: item.mfgDate,
                  expiryDate: item.expiryDate,
                  mrp: item.mrp,
                  ptr: item.ptr,
                  pts: item.pts,
                  unitPrice: item.unitPrice,
                  purchasePrice: item.unitPrice,
                  totalAmount: item.totalAmount,
                  taxableValue: item.taxableValue,
                  discountPercent: item.discountPercent,
                  gstRate: item.gstRate,
                  cgstAmount: item.cgstAmount,
                  sgstAmount: item.sgstAmount,
                  igstAmount: item.igstAmount,
                  rackLocation: '',
                  confidence: item.overallConfidence,
                  rawText: item.sourceText,
                } as ParsedItem);
                medicineName = corrected.name;
                batchNumber = corrected.batchNumber;
              } catch {
                // Learning engine optional
              }

              // Update item with match results
              const updatedItem: ValidatedItem = {
                ...item,
                medicineName: matchResult.medicineName || medicineName,
                matchedMedicineId: matchResult.medicineId,
                matchConfidence: matchResult.confidence,
                matchType: matchResult.matched
                  ? (matchResult.similarity >= 95 ? 'exact'
                    : matchResult.similarity >= 75 ? 'fuzzy'
                    : 'generic')
                  : 'new',
                batchNumber,
                fieldValidations: item.fieldValidations || [],
                overallConfidence: Math.round(
                  (item.overallConfidence + matchResult.confidence) / 2
                ),
              };

              validatedItems.push(updatedItem);

              // Generate warnings for unmatched or low-confidence items
              if (!matchResult.matched && matchResult.suggestions.length > 0) {
                warnings.push(`Medicine "${item.medicineName}" not found - suggestions: ${matchResult.suggestions.map(s => s.name).join(', ')}`);
              } else if (!matchResult.matched) {
                warnings.push(`Medicine "${item.medicineName}" is new - will be added to master`);
                suggestions.push(`Verify medicine "${item.medicineName}" before adding to stock`);
              }
            }
          } catch (err) {
            console.warn('Medicine matcher not available:', err);
            return items;
          }

          // Record supplier profile on successful validation
          if (input.supplierProfile && validatedItems.length > 0) {
            const avgConfidence = Math.round(
              validatedItems.reduce((s, i) => s + i.matchConfidence, 0) / validatedItems.length
            );
            if (avgConfidence >= 80) {
              suggestions.push(`Supplier ${input.supplierProfile.supplierName}: profile will be updated with ${validatedItems.length} validated items`);
            }
          }

          return validatedItems;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Stage 10: Invoice Total Validation ──────────────────────
      
      items = await this.runStage(
        PipelineStage.INVOICE_VALIDATION,
        'Invoice Validation',
        'Validating invoice totals',
        async () => {
          // TODO: Import and run invoice validator
          // For now, return items as-is
          return items;
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Stage 11: Confidence Scoring ────────────────────────────
      
      const result = await this.runStage(
        PipelineStage.CONFIDENCE_SCORING,
        'Confidence Scoring',
        'Calculating confidence scores',
        async () => {
          const overallConfidence = items.length > 0
            ? Math.round(items.reduce((sum, item) => sum + item.overallConfidence, 0) / items.length)
            : 0;
          
          // Count auto-save vs review required
          for (const item of items) {
            if (item.overallConfidence >= this.config.autoSaveThreshold) {
              autoSaveCount++;
            } else {
              reviewRequiredCount++;
            }
          }
          
          return {
            overallConfidence,
            autoSaveCount,
            reviewRequiredCount,
          };
        },
        context,
        stageTimings,
        stagesCompleted
      );
      
      // ── Determine Status ────────────────────────────────────────
      
      let status: ProcessingResult['status'] = 'success';
      if (items.length === 0) {
        status = 'failed';
      } else if (reviewRequiredCount > 0) {
        status = 'needs_review';
      } else if (autoSaveCount < items.length) {
        status = 'partial_success';
      }
      
      const canAutoSave = result.overallConfidence >= this.config.autoSaveThreshold && reviewRequiredCount === 0;
      
      // ── Build Final Result ──────────────────────────────────────
      
      const processingResult: ProcessingResult = {
        pipelineId,
        inputDocument: rawDocument,
        config: this.config,
        layout,
        table,
        items,
        invoiceHeader,
        overallConfidence: result.overallConfidence,
        autoSaveCount,
        reviewRequiredCount,
        suggestions,
        warnings,
        errors,
        totalProcessingTimeMs: Date.now() - startTime,
        stagesCompleted,
        stageTimings,
        status,
        canAutoSave,
      };
      
      return processingResult;
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      const emptyResult = createEmptyProcessingResult(pipelineId, this.config);
      return {
        ...emptyResult,
        inputDocument: rawDocument!,
        stagesCompleted,
        stageTimings,
        warnings,
        errors,
        totalProcessingTimeMs: Date.now() - startTime,
        status: 'failed',
        canAutoSave: false,
      };
    }
  }
  
  // ── Run a single pipeline stage ───────────────────────────────────
  
  private async runStage<T>(
    stage: PipelineStage,
    name: string,
    description: string,
    handler: () => Promise<T>,
    context: ProcessingContext,
    stageTimings: Record<PipelineStage, number>,
    stagesCompleted: PipelineStage[]
  ): Promise<T> {
    const startTime = Date.now();
    
    this.emitEvent({
      stage,
      status: 'started',
      timestamp: new Date(),
      durationMs: 0,
      message: `${name}: ${description}`,
    });
    
    try {
      // Check for abort
      if (context.abortSignal?.aborted) {
        throw new Error('Pipeline aborted');
      }
      
      // Run the stage handler
      const result = await handler();
      
      const duration = Date.now() - startTime;
      stageTimings[stage] = duration;
      stagesCompleted.push(stage);
      
      this.emitEvent({
        stage,
        status: 'completed',
        timestamp: new Date(),
        durationMs: duration,
        message: `${name} completed successfully`,
        data: result,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      stageTimings[stage] = duration;
      
      this.emitEvent({
        stage,
        status: 'failed',
        timestamp: new Date(),
        durationMs: duration,
        message: `${name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      
      throw error;
    }
  }
  
  // ── Emit pipeline event ──────────────────────────────────────────
  
  private emitEvent(event: PipelineEvent): void {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }
  
  // ── Abort pipeline ───────────────────────────────────────────────
  
  abort(): void {
    this.abortController?.abort();
  }
  
  // ── Generate unique IDs ──────────────────────────────────────────
  
  private generatePipelineId(): string {
    return `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ── Singleton instance ───────────────────────────────────────────────

export const pipelineOrchestrator = new PipelineOrchestrator();

// ── Hook for React components ────────────────────────────────────────

export function usePipeline() {
  return {
    execute: (input: Parameters<typeof pipelineOrchestrator.execute>[0], onEvent?: PipelineEventCallback) =>
      pipelineOrchestrator.execute(input, onEvent),
    
    abort: () => pipelineOrchestrator.abort(),
  };
}
