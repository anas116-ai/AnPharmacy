/**
 * OCR Enhancement Engine — Phase 3: AI-Powered OCR Correction & Learning
 * 
 * Builds on top of existing OCR infrastructure:
 * - InvoiceLearningEngine (src/lib/invoiceLearningEngine.ts)
 * - OCR Pipeline (src/lib/ocrPipeline.ts)
 * - OCR Parser (src/lib/ocrParser.ts)
 * 
 * Adds:
 * 1. AI-powered error correction using common OCR mistake patterns
 * 2. Supplier-specific layout templates (learns from past invoices)
 * 3. Field-level confidence scoring with pass-through validation
 * 4. N-best suggestion generation for low-confidence fields
 */

import { learningEngine, LearnedPattern } from '../invoiceLearningEngine';
import { ParsedItem, OCRResult } from '../ocrParser';
import { Correction } from '../ocrPipeline';

// ── Common OCR Error Patterns (pharmacy-specific) ──

const OCR_ERROR_PATTERNS: { pattern: RegExp; replacement: string; context: string }[] = [
  // Zero/O confusion
  { pattern: /0(?=[A-Za-z])/g, replacement: 'O', context: 'medicine_name' },
  { pattern: /O(?=\d)/g, replacement: '0', context: 'batch' },
  // I/1/l confusion
  { pattern: /(?<=\d)I(?=\d)/g, replacement: '1', context: 'batch' },
  { pattern: /(?<=\d)l(?=\d)/g, replacement: '1', context: 'batch' },
  { pattern: /I(?=[A-Z])/g, replacement: 'l', context: 'medicine_name' },
  // S/5 confusion
  { pattern: /S(?=\d)/g, replacement: '5', context: 'batch' },
  { pattern: /(?<=\d)S/g, replacement: '5', context: 'batch' },
  // B/8 confusion
  { pattern: /B(?=\d)/g, replacement: '8', context: 'batch' },
  { pattern: /8(?=[A-Z])/g, replacement: 'B', context: 'medicine_name' },
  // G/6 confusion
  { pattern: /G(?=\d)/g, replacement: '6', context: 'batch' },
  // Common word normalization for pharmacy
  { pattern: /\bTabl?\b/g, replacement: 'Tab', context: 'dosage_form' },
  { pattern: /\bCap\b/g, replacement: 'Cap', context: 'dosage_form' },
  { pattern: /\bInj\b/g, replacement: 'Inj', context: 'dosage_form' },
  { pattern: /\bSyp\b/g, replacement: 'Syp', context: 'dosage_form' },
  { pattern: /\bOint\b/g, replacement: 'Oint', context: 'dosage_form' },
  { pattern: /\bSoln\b/g, replacement: 'Soln', context: 'dosage_form' },
  { pattern: /\bSusp\b/g, replacement: 'Susp', context: 'dosage_form' },
  { pattern: /\bCream\b/g, replacement: 'Cream', context: 'dosage_form' },
  // Stray character cleanup
  { pattern: /[|¦•·‗]/g, replacement: ' ', context: 'all' },
  { pattern: /[‗_-]{3,}/g, replacement: ' ', context: 'all' },
  // Space normalization
  { pattern: /(\d)\s+(\/)\s+(\d)/g, replacement: '$1$2$3', context: 'all' },
];

// ── Supplier Layout Templates ──

export interface SupplierLayoutTemplate {
  supplierName: string;
  headerPatterns: { field: string; pattern: RegExp; lineOffset: number }[];
  tableHeaders: string[];  // Expected column headers in order
  columnMapping: Record<string, string>;  // Raw header → StandardField
  confidence: number;
  useCount: number;
}

// ── Field Suggestion ──

export interface FieldSuggestion {
  field: string;
  originalValue: string;
  suggestedValue: string;
  confidence: number;
  reason: string;
  alternatives: { value: string; confidence: number }[];
}

// ── Enhancement Result ──

export interface EnhancementResult {
  items: ParsedItem[];
  suggestions: FieldSuggestion[];
  corrections: Correction[];
  confidence: number;
  supplierDetected: string | null;
}

// ── OCR Enhancement Engine ──

export class OCREnhancementEngine {
  private supplierTemplates: Map<string, SupplierLayoutTemplate> = new Map();

  constructor() {
    this.loadSupplierTemplates();
  }

  /**
   * Enhance OCR-parsed items with AI corrections and suggestions
   */
  enhance(items: ParsedItem[], rawText: string): EnhancementResult {
    const suggestions: FieldSuggestion[] = [];
    const corrections: Correction[] = [];
    let totalConfidence = 0;
    const enhancedItems: ParsedItem[] = [];

    // Detect supplier from text
    const supplierDetected = this.detectSupplier(rawText);

    for (const item of items) {
      let enhanced = { ...item };

      // 1. Apply common OCR error corrections
      const applied = this.applyOCRErrorCorrections(enhanced);
      enhanced = applied.item;
      corrections.push(...applied.corrections);

      // 2. Apply learned patterns from InvoiceLearningEngine
      enhanced = learningEngine.applyPatterns(enhanced);

      // 3. Apply supplier-specific template corrections
      if (supplierDetected) {
        const template = this.supplierTemplates.get(supplierDetected);
        if (template) {
          const supplierEnhanced = this.applySupplierTemplate(enhanced, template);
          suggestions.push(...supplierEnhanced.suggestions);
          enhanced = supplierEnhanced.item;
        }
      }

      // 4. Generate suggestions for low-confidence fields
      const fieldSuggestions = this.generateFieldSuggestions(enhanced);
      suggestions.push(...fieldSuggestions);

      // 5. Calculate overall confidence for this item
      enhanced.confidence = this.calculateItemConfidence(enhanced);
      totalConfidence += enhanced.confidence;

      enhancedItems.push(enhanced);
    }

    return {
      items: enhancedItems,
      suggestions,
      corrections,
      confidence: items.length > 0 ? Math.round(totalConfidence / items.length) : 0,
      supplierDetected,
    };
  }

  /**
   * Apply common OCR error patterns to a parsed item
   */
  private applyOCRErrorCorrections(item: ParsedItem): { item: ParsedItem; corrections: Correction[] } {
    const corrections: Correction[] = [];
    const corrected = { ...item };

    for (const field of ['name', 'batchNumber', 'manufacturer'] as const) {
      let value = corrected[field] || '';
      if (!value) continue;

      for (const err of OCR_ERROR_PATTERNS) {
        if (err.context === 'all' || err.context === field || 
            (err.context === 'medicine_name' && field === 'name') ||
            (err.context === 'batch' && field === 'batchNumber')) {
          const newValue = value.replace(err.pattern, err.replacement);
          if (newValue !== value) {
            corrections.push({
              type: 'substitution',
              original: value.substring(0, Math.min(50, value.length)),
              corrected: newValue.substring(0, Math.min(50, newValue.length)),
              position: 0,
              confidence: 80,
            });
            value = newValue;
          }
        }
      }

      (corrected as any)[field] = value;
    }

    return { item: corrected, corrections };
  }

  /**
   * Apply supplier-specific template corrections
   */
  private applySupplierTemplate(
    item: ParsedItem,
    template: SupplierLayoutTemplate
  ): { item: ParsedItem; suggestions: FieldSuggestion[] } {
    const suggestions: FieldSuggestion[] = [];

    // Apply column mapping corrections if applicable
    for (const [rawField, mappedField] of Object.entries(template.columnMapping)) {
      const value = (item as any)[mappedField];
      if (value && value !== (item as any)[mappedField]) {
        suggestions.push({
          field: mappedField,
          originalValue: (item as any)[mappedField] || '',
          suggestedValue: value,
          confidence: template.confidence,
          reason: `Supplier template "${template.supplierName}" suggests mapping`,
          alternatives: [],
        });
      }
    }

    return { item, suggestions };
  }

  /**
   * Generate suggestions for low-confidence fields
   */
  private generateFieldSuggestions(item: ParsedItem): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];

    // Check medicine name
    if (item.name && item.name.length < 3) {
      const learnedSuggestions = learningEngine.getSuggestions('medicine_name', item.name);
      if (learnedSuggestions.length > 0) {
        suggestions.push({
          field: 'name',
          originalValue: item.name,
          suggestedValue: learnedSuggestions[0],
          confidence: 70,
          reason: 'Learned from previous corrections',
          alternatives: learnedSuggestions.slice(1).map(v => ({ value: v, confidence: 50 })),
        });
      }
    }

    // Check batch number
    if (item.batchNumber && !/^[A-Z0-9]{4,20}$/i.test(item.batchNumber)) {
      suggestions.push({
        field: 'batchNumber',
        originalValue: item.batchNumber,
        suggestedValue: this.normalizeBatchNumber(item.batchNumber),
        confidence: 85,
        reason: 'Batch number format correction',
        alternatives: [],
      });
    }

    // Check MRP vs Unit Price (common OCR swap)
    if (item.mrp > 0 && item.unitPrice > item.mrp) {
      suggestions.push({
        field: 'mrp',
        originalValue: String(item.mrp),
        suggestedValue: String(item.unitPrice),
        confidence: 60,
        reason: 'MRP is usually higher than unit price — possible swap detected',
        alternatives: [{ value: String(item.mrp), confidence: 40 }],
      });
    }

    return suggestions;
  }

  /**
   * Calculate overall confidence for an item based on field completeness
   */
  private calculateItemConfidence(item: ParsedItem): number {
    let score = 60; // Base score

    if (item.name && item.name.length >= 3) score += 10;
    if (item.batchNumber && /^[A-Z0-9]{4,20}$/i.test(item.batchNumber)) score += 10;
    if (item.expiryDate) score += 5;
    if (item.quantity > 0) score += 5;
    if (item.mrp > 0) score += 5;
    if (item.unitPrice > 0) score += 5;
    if (item.hsnCode && item.hsnCode !== '3004') score += 3;
    if (item.gstRate > 0) score += 3;
    if (item.manufacturer) score += 2;
    if (item.barcode) score += 2;

    return Math.min(100, score);
  }

  /**
   * Normalize batch number format
   */
  private normalizeBatchNumber(batch: string): string {
    return batch
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, '')
      .replace(/O/g, '0')
      .replace(/^0+/, '')
      .trim();
  }

  /**
   * Detect supplier from invoice text
   */
  private detectSupplier(text: string): string | null {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Check first 15 lines for supplier name patterns
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      
      // Check if this line matches any known supplier
      for (const [name] of this.supplierTemplates) {
        if (line.toLowerCase().includes(name.toLowerCase())) {
          return name;
        }
      }
    }

    // Try to detect from learned patterns in InvoiceLearningEngine
    const topPatterns = learningEngine.getTopPatterns(5);
    for (const pattern of topPatterns) {
      if (pattern.context && text.toLowerCase().includes(pattern.context.toLowerCase())) {
        return pattern.context;
      }
    }

    return null;
  }

  /**
   * Learn a new supplier layout template from a user-corrected invoice
   */
  learnSupplierLayout(
    supplierName: string,
    headers: string[],
    columnMapping: Record<string, string>,
    rawText: string
  ): void {
    const existing = this.supplierTemplates.get(supplierName);
    
    if (existing) {
      existing.useCount++;
      existing.confidence = Math.min(100, existing.confidence + 5);
      existing.tableHeaders = this.mergeHeaders(existing.tableHeaders, headers);
      existing.columnMapping = { ...existing.columnMapping, ...columnMapping };
    } else {
      this.supplierTemplates.set(supplierName, {
        supplierName,
        headerPatterns: this.extractHeaderPatterns(rawText),
        tableHeaders: headers,
        columnMapping,
        confidence: 70,
        useCount: 1,
      });
    }

    this.saveSupplierTemplates();
  }

  /**
   * Extract header patterns from raw invoice text
   */
  private extractHeaderPatterns(text: string): { field: string; pattern: RegExp; lineOffset: number }[] {
    // Simple extraction — get the line containing invoice header keywords
    const patterns: { field: string; pattern: RegExp; lineOffset: number }[] = [];
    const lines = text.split('\n');
    
    const headerKeywords = [
      { field: 'invoiceNo', keyword: /invoice\s*(?:no|#|number)/i },
      { field: 'date', keyword: /(?:invoice\s*)?date/i },
      { field: 'gstin', keyword: /gstin|gst\s*no/i },
      { field: 'supplier', keyword: /supplier|vendor|party|name/i },
    ];

    for (const hk of headerKeywords) {
      const idx = lines.findIndex(l => hk.keyword.test(l));
      if (idx >= 0) {
        patterns.push({ field: hk.field, pattern: hk.keyword, lineOffset: idx });
      }
    }

    return patterns;
  }

  /**
   * Merge two header arrays without duplicates
   */
  private mergeHeaders(existing: string[], incoming: string[]): string[] {
    const set = new Set([...existing, ...incoming]);
    return Array.from(set);
  }

  /**
   * Save supplier templates to localStorage
   */
  private saveSupplierTemplates(): void {
    try {
      const data: Record<string, SupplierLayoutTemplate> = {};
      this.supplierTemplates.forEach((v, k) => { data[k] = v; });
      localStorage.setItem('anpharm_supplier_templates', JSON.stringify(data));
    } catch {}
  }

  /**
   * Load supplier templates from localStorage
   */
  private loadSupplierTemplates(): void {
    try {
      const raw = localStorage.getItem('anpharm_supplier_templates');
      if (raw) {
        const data = JSON.parse(raw);
        for (const [key, value] of Object.entries(data)) {
          this.supplierTemplates.set(key, value as SupplierLayoutTemplate);
        }
      }
    } catch {}
  }

  /**
   * Get all known supplier templates
   */
  getSupplierTemplates(): SupplierLayoutTemplate[] {
    return Array.from(this.supplierTemplates.values())
      .sort((a, b) => b.useCount - a.useCount);
  }

  /**
   * Delete a supplier template
   */
  deleteSupplierTemplate(name: string): void {
    this.supplierTemplates.delete(name);
    this.saveSupplierTemplates();
  }
}

// ── Singleton ──
export const ocrEnhancementEngine = new OCREnhancementEngine();
