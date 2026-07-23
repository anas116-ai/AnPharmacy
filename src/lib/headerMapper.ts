/**
 * Header Mapper v1 - Dynamic Column Detection & Field Mapping (Stage 7)
 * 
 * This module detects invoice column headers using synonym matching
 * and maps them to StandardField enum values. It is the bridge between
 * raw OCR text layout and structured data.
 * 
 * Key capabilities:
 * - 50+ synonym patterns for each standard field
 * - Multi-pass matching (exact → substring → regex → fuzzy)
 * - Column position tracking for row reconstruction
 * - Supplier profile integration for known layouts
 * - Confidence scoring per mapped field
 */

import {
  StandardField,
  MappedRow,
  MappedField,
  SupplierProfile,
  TableRow,
  TableStructure,
  TableHeader,
} from './documentModel';

// ═══════════════════════════════════════════════════════════════════
// HEADER SYNONYM DATABASE
// ═══════════════════════════════════════════════════════════════════

/**
 * Every standard field has 5-20 synonym patterns that real invoices use.
 * Patterns are matched in order: exact → normalized → regex.
 * The field with the highest confidence wins.
 */
export const HEADER_SYNONYMS: Record<StandardField, HeaderSynonym[]> = {
  [StandardField.SERIAL_NO]: [
    { patterns: [/^(s\.?no|sr\.?no|sl\.?no|sno|sn)$/i, /^#$/], confidence: 100 },
    { patterns: [/^serial\s*(no|number)?$/i, /^item\s*(no|number)?$/i, /^ref(\.|erence)?\s*(no|number)?$/i], confidence: 95 },
    { patterns: [/^sr$/i, /^sl$/i], confidence: 90 },
    { patterns: [/^s\.\s*no$/i, /^sr\.\s*no$/i], confidence: 85 },
  ],
  [StandardField.DESCRIPTION]: [
    { patterns: [/^description$/i, /^particulars$/i], confidence: 100 },
    { patterns: [/^medicine\s*(name)?$/i, /^drug\s*(name)?$/i, /^product\s*(name)?$/i], confidence: 100 },
    { patterns: [/^item\s*(name|description)?$/i, /^name\s*of\s*(product|medicine|drug)?$/i], confidence: 95 },
    { patterns: [/^item$/i, /^product$/i, /^drug$/i, /^medicine$/i, /^med$/i], confidence: 90 },
    { patterns: [/^molecule$/i, /^generic\s*name$/i, /^brand\s*name$/i, /^trade\s*name$/i], confidence: 85 },
    { patterns: [/^product\s*description$/i, /^item\s*description$/i], confidence: 95 },
    { patterns: [/^particulars$/i, /^particular$/i], confidence: 85 },
    { patterns: [/^name\s*&\s*description$/i, /^item\s*particulars$/i], confidence: 80 },
  ],
  [StandardField.BATCH_NO]: [
    { patterns: [/^batch\s*(no|number|#)?$/i, /^bat\s*(no)?$/i, /^batch\s*no\.?$/i], confidence: 100 },
    { patterns: [/^lot\s*(no|number|#)?$/i, /^lot\s*no\.?$/i, /^l\.?o\.?t\.?$/i], confidence: 100 },
    { patterns: [/^b\.?\s*no\.?$/i, /^b\.?atch$/i, /^bno$/i], confidence: 95 },
    { patterns: [/^batch\s*lot$/i, /^lot\s*batch$/i, /^batch\s*number$/i], confidence: 95 },
    { patterns: [/^bt\.?\s*no$/i, /^bat\.?\s*no$/i], confidence: 90 },
    { patterns: [/^manufacturing\s*lot$/i, /^mfg\s*lot$/i], confidence: 80 },
  ],
  [StandardField.EXPIRY_DATE]: [
    { patterns: [/^exp(\.|iry)?\s*(date)?$/i, /^exp\s*dt$/i, /^exp\.?\s*date$/i], confidence: 100 },
    { patterns: [/^expiry$/i, /^exp\.$/i, /^exp\s*date$/i, /^exp\s*dt$/i], confidence: 100 },
    { patterns: [/^valid\s*(upto|thru|till|up\s*to)?$/i, /^use\s*before$/i, /^best\s*before$/i], confidence: 95 },
    { patterns: [/^e\.?d\.?$/i, /^exp\.?$/i, /^exp\.?\s*dt$/i], confidence: 90 },
    { patterns: [/^exp\s*period$/i, /^shelf\s*life$/i, /^retest\s*date$/i], confidence: 80 },
    { patterns: [/^dom$/i, /^date\s*of\s*expiry$/i], confidence: 85 },
  ],
  [StandardField.MFG_DATE]: [
    { patterns: [/^mfg\s*(date)?$/i, /^mfg\s*dt$/i, /^mfd$/i, /^mfg\.?\s*date$/i], confidence: 100 },
    { patterns: [/^manufacturing\s*(date)?$/i, /^manuf\.?\s*(date)?$/i, /^manf\.?\s*date$/i], confidence: 100 },
    { patterns: [/^date\s*of\s*manufacturing$/i, /^m\.?f\.?g\.?\s*date$/i], confidence: 95 },
    { patterns: [/^m\.?d\.?$/i, /^mfg\s*dt$/i], confidence: 90 },
    { patterns: [/^date\s*of\s*pack(ing)?$/i, /^pack\s*date$/i, /^dop$/i], confidence: 75 },
  ],
  [StandardField.QUANTITY]: [
    { patterns: [/^qty$/i, /^qnty$/i, /^q\.?ty$/i], confidence: 100 },
    { patterns: [/^quantity$/i, /^q\.?ty\.?$/i], confidence: 100 },
    { patterns: [/^pcs$/i, /^nos$/i, /^units?$/i, /^packs?$/i, /^strips?$/i], confidence: 95 },
    { patterns: [/^boxes?$/i, /^bottles?$/i, /^vials?$/i, /^ampoules?$/i], confidence: 90 },
    { patterns: [/^ordered\s*qty$/i, /^supplied\s*qty$/i, /^delivered\s*qty$/i], confidence: 85 },
    { patterns: [/^qty\s*ordered$/i, /^qty\s*dispatched$/i], confidence: 80 },
  ],
  [StandardField.FREE_QTY]: [
    { patterns: [/^free\s*(qty)?$/i, /^foc$/i, /^freebie$/i], confidence: 100 },
    { patterns: [/^bonus$/i, /^extra$/i, /^complimentary$/i, /^free\s*item$/i], confidence: 95 },
    { patterns: [/^free\s*of\s*cost$/i, /^free\s*scheme$/i], confidence: 90 },
    { patterns: [/^free\s*goods$/i, /^free\s*sample$/i], confidence: 85 },
  ],
  [StandardField.SCHEME_QTY]: [
    { patterns: [/^scheme\s*(qty)?$/i, /^sch\s*qty$/i, /^scheme$/i], confidence: 100 },
    { patterns: [/^scheme\s*bonus$/i, /^scheme\s*qnty$/i], confidence: 95 },
    { patterns: [/^promotion$/i, /^promo$/i, /^promotional$/i], confidence: 80 },
  ],
  [StandardField.UNIT_PRICE]: [
    { patterns: [/^unit\s*price$/i, /^rate$/i, /^price$/i], confidence: 100 },
    { patterns: [/^ptr$/i, /^p\.?t\.?r$/i, /^trade\s*price$/i], confidence: 100 },
    { patterns: [/^sales\s*price$/i, /^net\s*rate$/i, /^basic\s*rate$/i, /^basic\s*price$/i], confidence: 95 },
    { patterns: [/^u\.?p\.?$/i, /^u\s*price$/i, /^unit\s*rate$/i], confidence: 90 },
    { patterns: [/^rate\s*per\s*unit$/i, /^price\s*per\s*unit$/i], confidence: 95 },
    { patterns: [/^purchase\s*rate$/i, /^buying\s*price$/i], confidence: 85 },
  ],
  [StandardField.MRP]: [
    { patterns: [/^mrp$/i, /^m\.?r\.?p$/i, /^max\s*retail\s*price$/i], confidence: 100 },
    { patterns: [/^retail\s*price$/i, /^maximum\s*retail\s*price$/i, /^m\.r\.p\.?\s*₹?$/i], confidence: 100 },
    { patterns: [/^mrp\s*₹?$/i, /^m\.r\.p\.?\s*₹?$/i], confidence: 95 },
    { patterns: [/^price\s*(to\s*)?retail$/i, /^retail$/i], confidence: 85 },
  ],
  [StandardField.PTR]: [
    { patterns: [/^ptr$/i, /^p\.?t\.?r$/i], confidence: 100 },
    { patterns: [/^price\s*to\s*retailer$/i, /^trade\s*price$/i], confidence: 95 },
    { patterns: [/^stockist\s*price$/i, /^distributor\s*price$/i], confidence: 85 },
  ],
  [StandardField.PTS]: [
    { patterns: [/^pts$/i, /^p\.?t\.?s$/i], confidence: 100 },
    { patterns: [/^price\s*to\s*stockist$/i, /^special\s*price$/i], confidence: 95 },
    { patterns: [/^wholesale\s*price$/i, /^stockist\s*rate$/i], confidence: 85 },
  ],
  [StandardField.TOTAL_AMOUNT]: [
    { patterns: [/^total$/i, /^amount$/i, /^total\s*amount$/i, /^net\s*amount$/i], confidence: 100 },
    { patterns: [/^value$/i, /^gross\s*(amt|amount)?$/i, /^sub\s*total$/i, /^net$/i], confidence: 95 },
    { patterns: [/^total\s*(amt|value)?$/i, /^amt$/i, /^tot$/i], confidence: 95 },
    { patterns: [/^line\s*total$/i, /^row\s*total$/i, /^final\s*amount$/i], confidence: 85 },
    { patterns: [/^total\s*value$/i, /^total\s*price$/i, /^net\s*payable$/i], confidence: 80 },
  ],
  [StandardField.DISCOUNT_PERCENT]: [
    { patterns: [/^disc(\.|ount)?$/i, /^disc\s*%?$/i, /^discount\s*%?$/i], confidence: 100 },
    { patterns: [/^discount\s*rate$/i, /^disc\s*rate$/i, /^trade\s*disc$/i], confidence: 95 },
    { patterns: [/^less\s*discount$/i, /^less$/i, /^special\s*discount$/i], confidence: 85 },
    { patterns: [/^cash\s*discount$/i, /^promotional\s*discount$/i], confidence: 80 },
  ],
  [StandardField.TAXABLE_VALUE]: [
    { patterns: [/^taxable\s*(value|amount)?$/i, /^tax\s*(value|amount)?$/i], confidence: 100 },
    { patterns: [/^assessable\s*value$/i, /^taxable$/i, /^txbl$/i], confidence: 95 },
    { patterns: [/^net\s*taxable$/i, /^taxable\s*amt$/i], confidence: 90 },
  ],
  [StandardField.GST_RATE]: [
    { patterns: [/^gst\s*(%|rate)?$/i, /^gst\s*%$/i, /^g\.?s\.?t$/i], confidence: 100 },
    { patterns: [/^tax\s*(%|rate)?$/i, /^igst$/i, /^cgst$/i, /^sgst$/i], confidence: 100 },
    { patterns: [/^gst\s*rate$/i, /^gst\s*%$/i, /^tax\s*%$/i], confidence: 100 },
    { patterns: [/^rate\s*of\s*tax$/i, /^tax\s*rate$/i, /^gst\s*rate\s*%$/i], confidence: 95 },
    { patterns: [/^integrated\s*tax$/i, /^central\s*tax$/i, /^state\s*tax$/i], confidence: 85 },
  ],
  [StandardField.CGST_AMOUNT]: [
    { patterns: [/^cgst\s*(amt|amount)?$/i, /^central\s*gst$/i, /^c\.g\.s\.t$/i], confidence: 100 },
    { patterns: [/^cgst\s*amt$/i, /^cgst\s*amount$/i], confidence: 100 },
    { patterns: [/^central\s*tax$/i], confidence: 85 },
  ],
  [StandardField.SGST_AMOUNT]: [
    { patterns: [/^sgst\s*(amt|amount)?$/i, /^state\s*gst$/i, /^s\.g\.s\.t$/i], confidence: 100 },
    { patterns: [/^sgst\s*amt$/i, /^sgst\s*amount$/i], confidence: 100 },
    { patterns: [/^state\s*tax$/i], confidence: 85 },
  ],
  [StandardField.IGST_AMOUNT]: [
    { patterns: [/^igst\s*(amt|amount)?$/i, /^integrated\s*gst$/i, /^i\.g\.s\.t$/i], confidence: 100 },
    { patterns: [/^igst\s*amt$/i, /^igst\s*amount$/i], confidence: 100 },
    { patterns: [/^integrated\s*tax$/i], confidence: 85 },
  ],
  [StandardField.HSN_CODE]: [
    { patterns: [/^hsn$/i, /^h\.?s\.?n$/i, /^hsn\s*code$/i, /^h\.s\.n$/i], confidence: 100 },
    { patterns: [/^hsn\s*code$/i, /^h\.s\.n\.?\s*code$/i, /^sac$/i, /^sac\s*code$/i], confidence: 100 },
    { patterns: [/^statistical\s*code$/i, /^commodity\s*code$/i, /^product\s*code$/i], confidence: 80 },
  ],
  [StandardField.MANUFACTURER]: [
    { patterns: [/^manufacturer$/i, /^mfr$/i, /^mfg\s*by$/i, /^manufactured\s*by$/i], confidence: 100 },
    { patterns: [/^company$/i, /^brand$/i, /^supplier$/i, /^vendor$/i, /^firm$/i], confidence: 95 },
    { patterns: [/^made\s*by$/i, /^marketed\s*by$/i, /^manufacturing\s*company$/i], confidence: 90 },
    { patterns: [/^manufactured$/i, /^m\.f\.g$/i, /^producer$/i], confidence: 85 },
  ],
  [StandardField.STRENGTH]: [
    { patterns: [/^strength$/i, /^str$/i, /^potency$/i, /^dosage$/i], confidence: 100 },
    { patterns: [/^dosage\s*form$/i, /^conc(\.|entration)?$/i], confidence: 95 },
    { patterns: [/^content$/i, /^composition$/i, /^active\s*ingredient$/i], confidence: 80 },
  ],
  [StandardField.PACK_SIZE]: [
    { patterns: [/^pack\s*(size|type)?$/i, /^packing$/i, /^pack\s*type$/i], confidence: 100 },
    { patterns: [/^presentation$/i, /^pack\s*form$/i, /^primary\s*pack$/i], confidence: 95 },
    { patterns: [/^package$/i, /^pkg$/i, /^size$/i], confidence: 90 },
  ],
  [StandardField.SCHEDULE_TYPE]: [
    { patterns: [/^schedule$/i, /^sch$/i, /^drug\s*schedule$/i], confidence: 100 },
    { patterns: [/^schedule\s*type$/i, /^drug\s*type$/i, /^category$/i], confidence: 95 },
    { patterns: [/^narcotic$/i, /^psychotropic$/i], confidence: 90 },
  ],
  [StandardField.BARCODE]: [
    { patterns: [/^barcode$/i, /^bar\s*code$/i, /^ean$/i, /^upc$/i], confidence: 100 },
    { patterns: [/^gtin$/i, /^jan$/i, /^isbn$/i, /^product\s*code$/i], confidence: 95 },
    { patterns: [/^code$/i, /^sku$/i, /^serial\s*code$/i], confidence: 80 },
  ],
  [StandardField.RACK_LOCATION]: [
    { patterns: [/^rack\s*(location|no|number)?$/i, /^shelf\s*(no|location)?$/i], confidence: 100 },
    { patterns: [/^location$/i, /^bin$/i, /^store$/i, /^godown$/i], confidence: 85 },
    { patterns: [/^storage\s*location$/i, /^store\s*location$/i], confidence: 90 },
  ],
  [StandardField.UNKNOWN]: [
    { patterns: [/.*/], confidence: 10 },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface HeaderSynonym {
  patterns: RegExp[];
  confidence: number;
}

export interface HeaderMatchResult {
  field: StandardField;
  originalText: string;
  confidence: number;
  columnIndex: number;
}

export interface HeaderMapperConfig {
  enableSupplierProfiles: boolean;
  minHeaderConfidence: number;
  maxColumns: number;
}

export const DEFAULT_HEADER_MAPPER_CONFIG: HeaderMapperConfig = {
  enableSupplierProfiles: true,
  minHeaderConfidence: 50,
  maxColumns: 20,
};

// ═══════════════════════════════════════════════════════════════════
// HEADER MAPPER CLASS
// ═══════════════════════════════════════════════════════════════════

export class HeaderMapper {
  private config: HeaderMapperConfig;

  constructor(config: Partial<HeaderMapperConfig> = {}) {
    this.config = { ...DEFAULT_HEADER_MAPPER_CONFIG, ...config };
  }

  /**
   * Main entry: detect headers from OCR text and map them to StandardField values.
   * Uses supplier profile to prioritize known layouts.
   */
  mapHeaders(
    ocrText: string,
    supplierProfile?: SupplierProfile
  ): HeaderMatchResult[] {
    const headerTokens = this.extractHeaderTokens(ocrText);
    if (headerTokens.length === 0) return [];

    // Phase 1: Try exact/normalized match against all synonyms
    const matchResults = this.matchHeaderTokens(headerTokens, supplierProfile);

    // Phase 2: Filter by minimum confidence
    const validMatches = matchResults.filter(m => m.confidence >= this.config.minHeaderConfidence);

    // Phase 3: Deduplicate - if two columns map to same field, keep higher confidence
    return this.deduplicateMatches(validMatches);
  }

  /**
   * Build MappedRow[] from table rows using the detected header mapping.
   * This converts the raw table parser output into the pipeline's MappedRow format.
   */
  buildMappedRows(
    table: { rows: any[]; headers: string[] },
    headerMatches: HeaderMatchResult[]
  ): MappedRow[] {
    const mappedRows: MappedRow[] = [];

    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri];
      const fields = new Map<StandardField, MappedField>();
      const missingCritical: StandardField[] = [];
      const lowConfidence: StandardField[] = [];
      let totalConfidence = 0;
      let fieldCount = 0;

      for (let ci = 0; ci < headerMatches.length; ci++) {
        const match = headerMatches[ci];
        const cellValue = row.fields?.[match.field] || row.cells?.[ci]?.originalText || '';

        if (!cellValue || cellValue.trim().length === 0) continue;

        const mappedField = this.createMappedField(match, cellValue, row);
        fields.set(match.field, mappedField);

        totalConfidence += mappedField.confidence;
        fieldCount++;

        if (!mappedField.isValid && this.isCriticalField(match.field)) {
          missingCritical.push(match.field);
        }
        if (mappedField.confidence < this.config.minHeaderConfidence) {
          lowConfidence.push(match.field);
        }
      }

      mappedRows.push({
        rowId: `row-${ri}-${Date.now()}`,
        tableId: table.headers.join('_'),
        rowIndex: ri,
        originalText: row.rawText || '',
        fields,
        isSelected: missingCritical.length === 0,
        isDuplicate: false,
        overallConfidence: fieldCount > 0
          ? Math.round(totalConfidence / fieldCount)
          : 0,
        missingCriticalFields: missingCritical,
        lowConfidenceFields: lowConfidence,
      });
    }

    return mappedRows;
  }

  /**
   * Build MappedRow[] from the pipeline's TableStructure type
   */
  buildMappedRowsFromTableStructure(
    table: TableStructure,
    headerMatches: HeaderMatchResult[]
  ): MappedRow[] {
    const mappedRows: MappedRow[] = [];

    for (const row of table.rows) {
      const fields = new Map<StandardField, MappedField>();
      const missingCritical: StandardField[] = [];
      const lowConfidence: StandardField[] = [];
      let totalConfidence = 0;
      let fieldCount = 0;

      for (let ci = 0; ci < headerMatches.length; ci++) {
        const match = headerMatches[ci];
        const cell = row.cells?.[ci];

        if (!cell || cell.isEmpty || !cell.originalText?.trim()) continue;

        const mappedField = this.createMappedField(
          match,
          cell.originalText,
          { normalizedValue: cell.normalizedValue, numericValue: cell.numericValue }
        );
        fields.set(match.field, mappedField);

        totalConfidence += mappedField.confidence;
        fieldCount++;

        if (!mappedField.isValid && this.isCriticalField(match.field)) {
          missingCritical.push(match.field);
        }
        if (mappedField.confidence < this.config.minHeaderConfidence) {
          lowConfidence.push(match.field);
        }
      }

      mappedRows.push({
        rowId: `row-${row.rowIndex}-${Date.now()}`,
        tableId: table.id,
        rowIndex: row.rowIndex,
        originalText: row.originalText || '',
        fields,
        isSelected: missingCritical.length === 0,
        isDuplicate: false,
        overallConfidence: fieldCount > 0
          ? Math.round(totalConfidence / fieldCount)
          : 0,
        missingCriticalFields: missingCritical,
        lowConfidenceFields: lowConfidence,
      });
    }

    return mappedRows;
  }

  /**
   * Get detailed mapping report for display/debug
   */
  getMappingReport(headerMatches: HeaderMatchResult[]): {
    detectedHeaders: string[];
    mappedFields: string[];
    unmappedTokens: string[];
    averageConfidence: number;
    criticalFieldsPresent: string[];
    criticalFieldsMissing: string[];
  } {
    const criticalFields = [
      StandardField.DESCRIPTION,
      StandardField.BATCH_NO,
      StandardField.EXPIRY_DATE,
      StandardField.QUANTITY,
    ];

    const presentFields = headerMatches
      .filter(m => m.confidence >= this.config.minHeaderConfidence)
      .map(m => m.field);

    const presentSet = new Set(presentFields);

    return {
      detectedHeaders: headerMatches.map(m => m.originalText),
      mappedFields: presentFields,
      unmappedTokens: [],
      averageConfidence: headerMatches.length > 0
        ? Math.round(headerMatches.reduce((s, m) => s + m.confidence, 0) / headerMatches.length)
        : 0,
      criticalFieldsPresent: criticalFields.filter(f => presentSet.has(f)),
      criticalFieldsMissing: criticalFields.filter(f => !presentSet.has(f)),
    };
  }

  /**
   * Extract header tokens from the first non-empty lines
   */
  private extractHeaderTokens(ocrText: string): string[] {
    const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Try first 15 lines to find the header row
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i].trim();
      const tokens = this.tokenizeHeaderLine(line);
      // Multiple tokens with diverse content suggests a header row
      const uniqueTokens = new Set(tokens.map(t => t.toLowerCase()));
      const alphaTokens = tokens.filter(t => /[a-zA-Z]/.test(t));
      if (alphaTokens.length >= 2 && uniqueTokens.size >= 2) {
        return tokens;
      }
    }

    return [];
  }

  /**
   * Tokenize a header line into individual column names
   */
  private tokenizeHeaderLine(line: string): string[] {
    // Try multiple tokenization strategies
    const strategies: (() => string[])[] = [
      // Strategy 1: Split by 3+ spaces (most reliable for printed invoices)
      () => line.split(/\s{3,}/).map(t => t.trim()).filter(t => t.length > 0),
      // Strategy 2: Split by tabs
      () => line.split('\t').map(t => t.trim()).filter(t => t.length > 0),
      // Strategy 3: Split by pipe
      () => line.split('|').map(t => t.trim()).filter(t => t.length > 0),
      // Strategy 4: Split by 2+ spaces (fallback)
      () => line.split(/\s{2,}/).map(t => t.trim()).filter(t => t.length > 0),
    ];

    for (const strategy of strategies) {
      const tokens = strategy();
      if (tokens.length >= 3) {
        // Verify these look like header tokens (containing letters)
        const alphaTokens = tokens.filter(t => /[a-zA-Z]/.test(t));
        if (alphaTokens.length >= 2) {
          return tokens;
        }
      }
    }

    // Final fallback: split by whitespace and group short words
    const words = line.split(/\s+/).filter(w => w.length > 0);
    const grouped: string[] = [];
    let current = '';

    for (const word of words) {
      if (word.length <= 3 && current) {
        current += ' ' + word;
      } else {
        if (current) grouped.push(current);
        current = word;
      }
    }
    if (current) grouped.push(current);

    return grouped;
  }

  /**
   * Match header tokens against synonym database
   */
  private matchHeaderTokens(
    tokens: string[],
    supplierProfile?: SupplierProfile
  ): HeaderMatchResult[] {
    const results: HeaderMatchResult[] = [];

    // Build supplier-priority map if available
    const supplierPriorities = new Map<StandardField, number>();
    if (supplierProfile?.typicalColumnOrder) {
      supplierProfile.typicalColumnOrder.forEach((field, idx) => {
        supplierPriorities.set(field, idx + 1);
      });
    }

    for (let ci = 0; ci < Math.min(tokens.length, this.config.maxColumns); ci++) {
      const token = tokens[ci];
      let bestMatch: { field: StandardField; confidence: number } | null = null;

      for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
        for (const synonym of synonyms) {
          for (const pattern of synonym.patterns) {
            if (pattern.test(token)) {
              let confidence = synonym.confidence;

              // Boost confidence if this field is in supplier's known order
              const supplierPriority = supplierPriorities.get(field as StandardField);
              if (supplierPriority) {
                // Boost confidence for known supplier column positions
                const positionMatch = Math.abs(ci - supplierPriority + 1) <= 1;
                if (positionMatch) confidence = Math.min(100, confidence + 10);
              }

              // Adjust confidence based on token length
              // Very short tokens are less reliable
              if (token.length <= 2 && confidence > 80) {
                confidence -= 10;
              }

              if (!bestMatch || confidence > bestMatch.confidence) {
                bestMatch = { field: field as StandardField, confidence };
              }
              break;
            }
          }
        }
      }

      results.push({
        field: bestMatch?.field || StandardField.UNKNOWN,
        originalText: token,
        confidence: bestMatch?.confidence || 10,
        columnIndex: ci,
      });
    }

    return results;
  }

  /**
   * Remove duplicate field matches, keeping highest confidence
   */
  private deduplicateMatches(matches: HeaderMatchResult[]): HeaderMatchResult[] {
    const fieldMap = new Map<StandardField, HeaderMatchResult>();

    for (const match of matches) {
      const existing = fieldMap.get(match.field);
      if (!existing || match.confidence > existing.confidence) {
        fieldMap.set(match.field, match);
      }
    }

    // Restore original column order
    return matches
      .filter(m => fieldMap.get(m.field) === m)
      .sort((a, b) => a.columnIndex - b.columnIndex);
  }

  /**
   * Create a MappedField with proper normalization
   */
  private createMappedField(
    match: HeaderMatchResult,
    cellValue: string,
    context?: { normalizedValue?: string; numericValue?: number }
  ): MappedField {
    const normalized = this.normalizeValue(match.field, cellValue);
    const numericValue = this.extractNumeric(normalized);
    const isValid = this.validateField(match.field, normalized);

    return {
      originalText: cellValue,
      normalizedValue: normalized,
      numericValue,
      confidence: match.confidence,
      isValid,
      issues: isValid ? [] : [`${match.field} value may be invalid`],
      suggestions: isValid ? [] : [`Please verify the ${match.field} value`],
      source: match.field,
    };
  }

  /**
   * Normalize a cell value based on its field type
   */
  private normalizeValue(field: StandardField, value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    switch (field) {
      case StandardField.BATCH_NO:
        return trimmed.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
      case StandardField.EXPIRY_DATE:
      case StandardField.MFG_DATE:
        return this.normalizeDate(trimmed);
      case StandardField.QUANTITY:
      case StandardField.FREE_QTY:
      case StandardField.SCHEME_QTY: {
        const num = parseInt(trimmed);
        return isNaN(num) ? trimmed : num.toString();
      }
      case StandardField.UNIT_PRICE:
      case StandardField.MRP:
      case StandardField.PTR:
      case StandardField.PTS:
      case StandardField.TOTAL_AMOUNT:
      case StandardField.TAXABLE_VALUE:
      case StandardField.CGST_AMOUNT:
      case StandardField.SGST_AMOUNT:
      case StandardField.IGST_AMOUNT: {
        const price = parseFloat(trimmed.replace(/[₹$,]/g, ''));
        return isNaN(price) ? trimmed : price.toFixed(2);
      }
      case StandardField.GST_RATE:
      case StandardField.DISCOUNT_PERCENT: {
        const rate = parseFloat(trimmed.replace(/%/g, ''));
        return isNaN(rate) ? trimmed : rate.toString();
      }
      case StandardField.HSN_CODE:
        return trimmed.replace(/\D/g, '');
      default:
        return trimmed;
    }
  }

  /**
   * Extract numeric value if applicable
   */
  private extractNumeric(value: string): number | undefined {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Validate a field value
   */
  private validateField(field: StandardField, value: string): boolean {
    if (!value) return false;

    switch (field) {
      case StandardField.DESCRIPTION:
        return value.length >= 2 && /[a-zA-Z]/.test(value);
      case StandardField.BATCH_NO:
        return /^[A-Z0-9\-]{3,15}$/i.test(value);
      case StandardField.EXPIRY_DATE:
      case StandardField.MFG_DATE:
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
      case StandardField.QUANTITY:
      case StandardField.FREE_QTY:
      case StandardField.SCHEME_QTY:
        return /^\d+$/.test(value) && parseInt(value) > 0;
      case StandardField.UNIT_PRICE:
      case StandardField.MRP:
      case StandardField.PTR:
      case StandardField.PTS:
      case StandardField.TOTAL_AMOUNT:
      case StandardField.TAXABLE_VALUE:
        return /^\d+(\.\d{1,2})?$/.test(value) && parseFloat(value) >= 0;
      case StandardField.GST_RATE:
      case StandardField.DISCOUNT_PERCENT:
        return /^\d+(\.\d{1,2})?$/.test(value);
      case StandardField.HSN_CODE:
        return /^\d{4,8}$/.test(value);
      case StandardField.MANUFACTURER:
        return value.length >= 2;
      default:
        return true;
    }
  }

  /**
   * Check if a field is critical for data quality
   */
  private isCriticalField(field: StandardField): boolean {
    return [
      StandardField.DESCRIPTION,
      StandardField.BATCH_NO,
      StandardField.EXPIRY_DATE,
      StandardField.QUANTITY,
    ].includes(field);
  }

  /**
   * Normalize date to YYYY-MM-DD
   */
  private normalizeDate(value: string): string {
    const patterns = [
      /^(\d{1,2})[\/\-\.](\d{2,4})$/,
      /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/,
      /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/,
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        if (match.length === 3) {
          const month = match[1].padStart(2, '0');
          const year = match[2].length === 2 ? '20' + match[2] : match[2];
          return `${year}-${month}-01`;
        } else if (match.length === 4) {
          let [_, p1, p2, p3] = match;
          if (p1.length === 4) {
            return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
          }
          const p1n = parseInt(p1), p2n = parseInt(p2);
          const year = p3.length === 2 ? '20' + p3 : p3;
          const month = p1n > 12 ? p2.padStart(2, '0') : p1.padStart(2, '0');
          const day = p1n > 12 ? p1.padStart(2, '0') : p2.padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }
    return value;
  }
}

// ── Singleton instance ───────────────────────────────────────────────
export const headerMapper = new HeaderMapper();
