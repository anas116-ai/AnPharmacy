/**
 * AI Learning Engine — Learns from user column mapping decisions over time
 * 
 * How it works:
 * 1. Every time a user manually maps a column → store the decision
 * 2. Every time a user accepts/rejects an AI suggestion → store the feedback
 * 3. Every time a user applies an import profile → store the usage
 * 4. When mapping new files, check learned patterns BEFORE synonym matching
 * 5. Confidence increases with repeated confirmations
 * 
 * Storage: localStorage (offline-first)
 * Learning happens entirely on-device — no data leaves the user's machine.
 */

import { ImportSource } from './types';

// ── Types ──

export interface LearnedMapping {
  sourcePattern: string;        // Column header pattern (lowercase, normalized)
  targetField: string;          // Mapped standard field
  confidence: number;           // 0-100, increases with repeated confirmations
  timesMapped: number;          // How many times user mapped this
  timesAccepted: number;        // How many times user accepted AI suggestion
  timesRejected: number;        // How many times user rejected AI suggestion
  lastUsed: string;             // ISO date
  firstLearned: string;         // ISO date
  sourceFormat: ImportSource;   // File format when learned
  userCorrected: boolean;       // True if user manually corrected (higher weight)
}

export interface LearnedPattern {
  id: string;
  pattern: RegExp | string;     // Regex or exact string
  targetField: string;
  confidence: number;
  isRegex: boolean;
}

export interface LearningStats {
  totalMappings: number;
  uniquePatterns: number;
  highConfidence: number;       // > 80% confidence
  mediumConfidence: number;     // 50-80%
  lowConfidence: number;        // < 50%
  corrections: number;          // User corrections made
  acceptedSuggestions: number;  // AI suggestions accepted
  rejectedSuggestions: number;  // AI suggestions rejected
}

// ── Store Keys ──

const STORAGE_KEY = 'anpharm_ai_learned_mappings';
const STATS_KEY = 'anpharm_ai_learning_stats';

// ── Helper: normalize column name for matching ──
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Helper: generate ID ──
function genId(): string {
  return 'learn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Load mappings from localStorage ──
function loadMappings(): LearnedMapping[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Save mappings to localStorage ──
function saveMappings(mappings: LearnedMapping[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings)); } catch {}
}

// ── Load stats ──
function loadStats(): LearningStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : getEmptyStats();
  } catch { return getEmptyStats(); }
}

function getEmptyStats(): LearningStats {
  return {
    totalMappings: 0, uniquePatterns: 0, highConfidence: 0,
    mediumConfidence: 0, lowConfidence: 0, corrections: 0,
    acceptedSuggestions: 0, rejectedSuggestions: 0,
  };
}

function saveStats(stats: LearningStats): void {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

// ═════════════════════════════════════════════════════════════════════
// AI LEARNING ENGINE API
// ═════════════════════════════════════════════════════════════════════

export const aiLearningEngine = {
  /**
   * Record a user's column mapping decision
   */
  recordMapping(
    sourceColumn: string,
    targetField: string,
    sourceFormat: ImportSource,
    wasAISuggestion: boolean,
    wasAccepted: boolean,
    wasCorrected: boolean
  ): void {
    const mappings = loadMappings();
    const normalized = normalize(sourceColumn);
    
    // Find existing mapping for this pattern
    const existing = mappings.find(m => m.sourcePattern === normalized && m.targetField === targetField);
    
    if (existing) {
      existing.timesMapped++;
      existing.lastUsed = new Date().toISOString();
      existing.confidence = Math.min(100, existing.confidence + (wasCorrected ? 15 : 10));
      if (wasAISuggestion && wasAccepted) {
        existing.timesAccepted++;
        existing.confidence = Math.min(100, existing.confidence + 5);
      }
      if (wasAISuggestion && !wasAccepted) {
        existing.timesRejected++;
        existing.confidence = Math.max(20, existing.confidence - 10);
      }
      if (wasCorrected) existing.userCorrected = true;
    } else {
      mappings.push({
        sourcePattern: normalized,
        targetField,
        confidence: wasCorrected ? 70 : wasAISuggestion && wasAccepted ? 60 : 50,
        timesMapped: 1,
        timesAccepted: wasAISuggestion && wasAccepted ? 1 : 0,
        timesRejected: wasAISuggestion && !wasAccepted ? 1 : 0,
        lastUsed: new Date().toISOString(),
        firstLearned: new Date().toISOString(),
        sourceFormat,
        userCorrected: wasCorrected,
      });
    }
    
    saveMappings(mappings);
    
    // Update stats
    const stats = loadStats();
    stats.totalMappings = mappings.length;
    stats.uniquePatterns = new Set(mappings.map(m => m.sourcePattern)).size;
    stats.highConfidence = mappings.filter(m => m.confidence >= 80).length;
    stats.mediumConfidence = mappings.filter(m => m.confidence >= 50 && m.confidence < 80).length;
    stats.lowConfidence = mappings.filter(m => m.confidence < 50).length;
    if (wasCorrected) stats.corrections++;
    if (wasAISuggestion && wasAccepted) stats.acceptedSuggestions++;
    if (wasAISuggestion && !wasAccepted) stats.rejectedSuggestions++;
    saveStats(stats);
  },

  /**
   * Get learned suggestion for a column header
   * Returns the best matching learned mapping with highest confidence
   */
  getSuggestion(header: string): { field: string; confidence: number } | null {
    const mappings = loadMappings();
    const normalized = normalize(header);
    
    let best: { field: string; confidence: number } | null = null;
    
    for (const mapping of mappings) {
      const pattern = mapping.sourcePattern;
      
      // Exact match
      if (normalized === pattern) {
        if (!best || mapping.confidence > best.confidence) {
          best = { field: mapping.targetField, confidence: mapping.confidence };
        }
        continue;
      }
      
      // Partial match
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        const adjustedConfidence = mapping.confidence * 0.9; // Slight penalty for partial
        if (!best || adjustedConfidence > best.confidence) {
          best = { field: mapping.targetField, confidence: Math.round(adjustedConfidence) };
        }
        continue;
      }
      
      // Word overlap
      const headerWords = new Set(normalized.split(' '));
      const patternWords = new Set(pattern.split(' '));
      let overlap = 0;
      headerWords.forEach(w => { if (patternWords.has(w)) overlap++; });
      if (overlap >= Math.min(2, Math.min(headerWords.size, patternWords.size))) {
        const adjustedConfidence = mapping.confidence * 0.7;
        if (!best || adjustedConfidence > best.confidence) {
          best = { field: mapping.targetField, confidence: Math.round(adjustedConfidence) };
        }
      }
    }
    
    return best;
  },

  /**
   * Get ALL suggestions for a list of headers
   */
  getSuggestions(headers: string[]): Map<string, { field: string; confidence: number } | null> {
    const result = new Map<string, { field: string; confidence: number } | null>();
    for (const header of headers) {
      result.set(header, this.getSuggestion(header));
    }
    return result;
  },

  /**
   * Record when a user rejects a learned suggestion (negative feedback)
   */
  recordRejection(sourceColumn: string, suggestedField: string): void {
    const mappings = loadMappings();
    const normalized = normalize(sourceColumn);
    const existing = mappings.find(m => m.sourcePattern === normalized && m.targetField === suggestedField);
    
    if (existing) {
      existing.timesRejected++;
      existing.confidence = Math.max(15, existing.confidence - 15);
      existing.lastUsed = new Date().toISOString();
      saveMappings(mappings);
    }
    
    const stats = loadStats();
    stats.rejectedSuggestions++;
    saveStats(stats);
  },

  /**
   * Get learning statistics
   */
  getStats(): LearningStats {
    return loadStats();
  },

  /**
   * Get all learned mappings (for display/debug)
   */
  getAllMappings(): LearnedMapping[] {
    return loadMappings().sort((a, b) => b.confidence - a.confidence);
  },

  /**
   * Clear all learned data (factory reset)
   */
  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATS_KEY);
  },

  /**
   * Export learned mappings as JSON (for backup/porting)
   */
  exportData(): string {
    return JSON.stringify({ mappings: loadMappings(), stats: loadStats() }, null, 2);
  },

  /**
   * Import learned mappings from JSON backup
   */
  importData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.mappings) saveMappings(data.mappings);
      if (data.stats) saveStats(data.stats);
      return true;
    } catch { return false; }
  },
};
