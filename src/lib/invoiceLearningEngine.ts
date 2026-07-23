/**
 * Invoice Learning Engine - Learns from user corrections to improve OCR accuracy
 * 
 * This module implements a continuous learning system that:
 * 1. Records user corrections to OCR-extracted fields
 * 2. Builds patterns from corrections (field mappings, medicine name corrections, etc.)
 * 3. Applies learned patterns to future invoice scans
 * 4. Improves confidence scores based on historical accuracy
 * 
 * Storage: localStorage (browser) / file system (Electron)
 */

import { ParsedItem } from './ocrParser';
import { Medicine } from './types';

// ── Correction record ────────────────────────────────────────────────

export interface CorrectionRecord {
  id: string;
  timestamp: number;
  invoiceType?: string;        // Manufacturer/invoice type identifier
  originalValue: string;
  correctedValue: string;
  field: string;               // Which field was corrected
  context: {
    medicineName?: string;
    batchNumber?: string;
    surroundingText?: string;
    rowIndex?: number;
  };
  confidence: number;          // Confidence after correction (should be 100)
}

// ── Learning patterns ────────────────────────────────────────────────

export interface LearnedPattern {
  id: string;
  patternType: 'medicine_name' | 'batch_format' | 'date_format' | 'field_mapping' | 'manufacturer';
  pattern: string;             // The pattern to match
  replacement: string;         // The correct value
  context?: string;            // Optional context (medicine name, batch, etc.)
  confidence: number;          // How confident we are in this pattern
  usageCount: number;          // How many times this pattern has been applied
  lastUsed: number;            // Timestamp of last usage
  createdAt: number;           // Timestamp of creation
}

// ── Learning statistics ─────────────────────────────────────────────

export interface LearningStats {
  totalCorrections: number;
  patternsLearned: number;
  patternsApplied: number;
  accuracyImprovement: number; // Percentage improvement
  topCorrectedFields: Record<string, number>;
  recentCorrections: CorrectionRecord[];
}

// ── Storage keys ─────────────────────────────────────────────────────

const CORRECTIONS_KEY = 'anpharmacy_invoice_corrections';
const PATTERNS_KEY = 'anpharmacy_invoice_patterns';
const STATS_KEY = 'anpharmacy_invoice_stats';

// ── Learning Engine Class ────────────────────────────────────────────

export class InvoiceLearningEngine {
  private corrections: CorrectionRecord[] = [];
  private patterns: LearnedPattern[] = [];
  private stats: LearningStats;
  
  constructor() {
    this.stats = this.loadStats();
    this.corrections = this.loadCorrections();
    this.patterns = this.loadPatterns();
  }
  
  // ── Record a correction ──────────────────────────────────────────
  
  recordCorrection(
    originalValue: string,
    correctedValue: string,
    field: string,
    context: CorrectionRecord['context']
  ): void {
    const correction: CorrectionRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      originalValue,
      correctedValue,
      field,
      context,
      confidence: 100,
    };
    
    this.corrections.push(correction);
    
    // Keep only last 1000 corrections
    if (this.corrections.length > 1000) {
      this.corrections = this.corrections.slice(-1000);
    }
    
    // Learn pattern from correction
    this.learnPattern(correction);
    
    // Update stats
    this.updateStats(correction);
    
    // Persist
    this.saveCorrections();
    this.savePatterns();
    this.saveStats();
  }
  
  // ── Learn pattern from correction ────────────────────────────────
  
  private learnPattern(correction: CorrectionRecord): void {
    const { originalValue, correctedValue, field } = correction;
    
    // Don't learn if values are the same
    if (originalValue.toLowerCase() === correctedValue.toLowerCase()) {
      return;
    }
    
    // Check if pattern already exists
    const existingPattern = this.patterns.find(p => 
      p.pattern.toLowerCase() === originalValue.toLowerCase() &&
      p.patternType === this.getPatternType(field)
    );
    
    if (existingPattern) {
      // Update existing pattern
      existingPattern.replacement = correctedValue;
      existingPattern.usageCount++;
      existingPattern.lastUsed = Date.now();
      existingPattern.confidence = Math.min(100, existingPattern.confidence + 5);
    } else {
      // Create new pattern
      const pattern: LearnedPattern = {
        id: this.generateId(),
        patternType: this.getPatternType(field),
        pattern: originalValue,
        replacement: correctedValue,
        context: correction.context?.medicineName,
        confidence: 70,
        usageCount: 1,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      };
      
      this.patterns.push(pattern);
      
      // Keep only last 500 patterns
      if (this.patterns.length > 500) {
        this.patterns = this.patterns
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 500);
      }
    }
  }
  
  // ── Apply learned patterns to parsed items ────────────────────────
  
  applyPatterns(item: ParsedItem): ParsedItem {
    const corrected = { ...item };
    
    // Apply medicine name patterns
    corrected.name = this.applyPatternToValue(corrected.name, 'medicine_name');
    
    // Apply batch number patterns
    corrected.batchNumber = this.applyPatternToValue(corrected.batchNumber, 'batch_format');
    
    // Apply manufacturer patterns
    corrected.manufacturer = this.applyPatternToValue(corrected.manufacturer, 'manufacturer');
    
    // Update confidence if corrections were applied
    if (corrected.name !== item.name || corrected.batchNumber !== item.batchNumber) {
      corrected.confidence = Math.min(100, corrected.confidence + 10);
    }
    
    return corrected;
  }
  
  // ── Apply pattern to a single value ──────────────────────────────
  
  private applyPatternToValue(value: string, patternType: LearnedPattern['patternType']): string {
    if (!value) return value;
    
    const relevantPatterns = this.patterns
      .filter(p => p.patternType === patternType)
      .sort((a, b) => b.confidence - a.confidence);
    
    let correctedValue = value;
    
    for (const pattern of relevantPatterns) {
      if (pattern.confidence < 50) continue;
      
      // Case-insensitive match
      const regex = new RegExp(`^${this.escapeRegex(pattern.pattern)}$`, 'i');
      if (regex.test(correctedValue)) {
        correctedValue = pattern.replacement;
        
        // Update pattern usage
        pattern.usageCount++;
        pattern.lastUsed = Date.now();
        
        break;
      }
    }
    
    return correctedValue;
  }
  
  // ── Get suggestions for a field ──────────────────────────────────
  
  getSuggestions(field: string, value: string): string[] {
    const relevantPatterns = this.patterns
      .filter(p => p.patternType === this.getPatternType(field))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
    
    return relevantPatterns
      .filter(p => p.pattern.toLowerCase().includes(value.toLowerCase()) || 
                   value.toLowerCase().includes(p.pattern.toLowerCase()))
      .map(p => p.replacement);
  }
  
  // ── Get pattern type from field name ──────────────────────────────
  
  private getPatternType(field: string): LearnedPattern['patternType'] {
    const fieldLower = field.toLowerCase();
    
    if (fieldLower.includes('name') || fieldLower.includes('medicine') || fieldLower.includes('product')) {
      return 'medicine_name';
    }
    
    if (fieldLower.includes('batch') || fieldLower.includes('lot')) {
      return 'batch_format';
    }
    
    if (fieldLower.includes('date') || fieldLower.includes('expiry') || fieldLower.includes('mfg')) {
      return 'date_format';
    }
    
    if (fieldLower.includes('manufacturer') || fieldLower.includes('company') || fieldLower.includes('brand')) {
      return 'manufacturer';
    }
    
    return 'field_mapping';
  }
  
  // ── Get learning statistics ──────────────────────────────────────
  
  getStats(): LearningStats {
    return { ...this.stats };
  }
  
  // ── Get top patterns ─────────────────────────────────────────────
  
  getTopPatterns(limit: number = 10): LearnedPattern[] {
    return this.patterns
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }
  
  // ── Get recent corrections ───────────────────────────────────────
  
  getRecentCorrections(limit: number = 20): CorrectionRecord[] {
    return this.corrections
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  // ── Clear all learning data ──────────────────────────────────────
  
  clearAll(): void {
    this.corrections = [];
    this.patterns = [];
    this.stats = {
      totalCorrections: 0,
      patternsLearned: 0,
      patternsApplied: 0,
      accuracyImprovement: 0,
      topCorrectedFields: {},
      recentCorrections: [],
    };
    
    this.saveCorrections();
    this.savePatterns();
    this.saveStats();
  }
  
  // ── Export patterns for backup ───────────────────────────────────
  
  exportPatterns(): string {
    return JSON.stringify({
      corrections: this.corrections,
      patterns: this.patterns,
      stats: this.stats,
      exportedAt: Date.now(),
    }, null, 2);
  }
  
  // ── Import patterns from backup ──────────────────────────────────
  
  importPatterns(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.corrections) {
        this.corrections = parsed.corrections.slice(-1000);
      }
      
      if (parsed.patterns) {
        this.patterns = parsed.patterns.slice(-500);
      }
      
      if (parsed.stats) {
        this.stats = parsed.stats;
      }
      
      this.saveCorrections();
      this.savePatterns();
      this.saveStats();
      
      return true;
    } catch {
      return false;
    }
  }
  
  // ── Private: Update statistics ───────────────────────────────────
  
  private updateStats(correction: CorrectionRecord): void {
    this.stats.totalCorrections++;
    this.stats.patternsLearned = this.patterns.length;
    
    // Update top corrected fields
    const field = correction.field;
    this.stats.topCorrectedFields[field] = (this.stats.topCorrectedFields[field] || 0) + 1;
    
    // Update recent corrections
    this.stats.recentCorrections = [
      correction,
      ...this.stats.recentCorrections.slice(0, 19),
    ];
    
    // Calculate accuracy improvement (simplified)
    if (this.stats.totalCorrections > 0) {
      this.stats.accuracyImprovement = Math.min(
        100,
        Math.round((this.stats.patternsApplied / this.stats.totalCorrections) * 100)
      );
    }
  }
  
  // ── Private: Generate unique ID ──────────────────────────────────
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  
  // ── Private: Escape regex special characters ─────────────────────
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // ── Private: Load/Save from localStorage ──────────────────────────
  
  private loadCorrections(): CorrectionRecord[] {
    try {
      const data = localStorage.getItem(CORRECTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
  
  private saveCorrections(): void {
    try {
      localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(this.corrections));
    } catch {
      // Silently fail if localStorage is full
    }
  }
  
  private loadPatterns(): LearnedPattern[] {
    try {
      const data = localStorage.getItem(PATTERNS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
  
  private savePatterns(): void {
    try {
      localStorage.setItem(PATTERNS_KEY, JSON.stringify(this.patterns));
    } catch {
      // Silently fail if localStorage is full
    }
  }
  
  private loadStats(): LearningStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      return data ? JSON.parse(data) : this.getDefaultStats();
    } catch {
      return this.getDefaultStats();
    }
  }
  
  private saveStats(): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
    } catch {
      // Silently fail if localStorage is full
    }
  }
  
  private getDefaultStats(): LearningStats {
    return {
      totalCorrections: 0,
      patternsLearned: 0,
      patternsApplied: 0,
      accuracyImprovement: 0,
      topCorrectedFields: {},
      recentCorrections: [],
    };
  }
}

// ── Singleton instance ───────────────────────────────────────────────

export const learningEngine = new InvoiceLearningEngine();

// ── Hook for React components ────────────────────────────────────────

export function useLearningEngine() {
  return {
    recordCorrection: (
      originalValue: string,
      correctedValue: string,
      field: string,
      context: CorrectionRecord['context']
    ) => learningEngine.recordCorrection(originalValue, correctedValue, field, context),
    
    applyPatterns: (item: ParsedItem) => learningEngine.applyPatterns(item),
    
    getSuggestions: (field: string, value: string) => learningEngine.getSuggestions(field, value),
    
    getStats: () => learningEngine.getStats(),
    
    getTopPatterns: (limit?: number) => learningEngine.getTopPatterns(limit),
    
    getRecentCorrections: (limit?: number) => learningEngine.getRecentCorrections(limit),
    
    clearAll: () => learningEngine.clearAll(),
    
    exportPatterns: () => learningEngine.exportPatterns(),
    
    importPatterns: (data: string) => learningEngine.importPatterns(data),
  };
}