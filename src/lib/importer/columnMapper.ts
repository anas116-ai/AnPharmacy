/**
 * Data Import Studio — AI Column Mapping Engine
 * 
 * Automatically suggests field mappings for imported columns using:
 * 1. Synonym matching against 30+ pharmacy fields (500+ patterns)
 * 2. Sample value analysis (data type detection)
 * 3. Column position heuristics (common layouts)
 * 4. Import profile matching (known suppliers)
 * 5. Confidence scoring with alternatives
 * 
 * AI suggests → User approves → Nothing is automatic.
 */

import {
  ColumnMapping,
  AIMappingSuggestion,
  UnknownColumnInfo,
  FIELD_SYNONYMS,
  normalizeColumnHeader,
  detectDataType,
  StockSchemaField,
  PROTECTED_SCHEMA_FIELDS,
  ImportProfile,
  DetectedDataType,
} from './types';

export interface ColumnMapperResult {
  mappings: ColumnMapping[];
  aiSuggestions: AIMappingSuggestion[];
  unknownColumns: UnknownColumnInfo[];
}

export class ColumnMapper {
  /**
   * Auto-detect mappings for ALL headers from a parsed sheet
   */
  mapHeaders(
    headers: string[],
    sampleRows: string[][],
    existingProfile?: ImportProfile | null
  ): ColumnMapperResult {
    const mappings: ColumnMapping[] = [];
    const aiSuggestions: AIMappingSuggestion[] = [];
    const unknownCols: UnknownColumnInfo[] = [];

    // Filter out undefined/null/non-string headers to prevent toLowerCase crashes
    const cleanHeaders = headers.filter((h): h is string => typeof h === 'string' && h.trim().length > 0);

    // Extract samples (first 5 non-empty rows per column)
    const columnSamples = this.extractColumnSamples(cleanHeaders, sampleRows);

    for (let i = 0; i < cleanHeaders.length; i++) {
      const header = cleanHeaders[i];
      const samples = columnSamples[i] || [];
      const detectedType = detectDataType(samples);

      // Try profile match first (highest priority)
      if (existingProfile) {
        const profileMatch = this.matchFromProfile(header, existingProfile);
        if (profileMatch) {
          mappings.push(this.buildMapping(header, profileMatch.field, i, detectedType, samples, 'profile', profileMatch.confidence));
          continue;
        }
      }

      // Try AI synonym matching
      const matchResult = this.findBestSynonymMatch(header);
      
      if (matchResult) {
        mappings.push(this.buildMapping(header, matchResult.field, i, detectedType, samples, 'ai', matchResult.confidence));
        
        // Build AI suggestion with alternatives
        const alternatives = this.findAlternatives(header, matchResult.field);
        aiSuggestions.push({
          sourceColumn: header,
          suggestedField: matchResult.field,
          confidence: matchResult.confidence,
          reasoning: matchResult.reasoning,
          alternativeFields: alternatives.slice(0, 3),
        });
      } else {
        // Unknown column — no mapping found
        mappings.push(this.buildMapping(header, null, i, detectedType, samples, 'none', 0));
        
        // Detect possible duplicate fields
        const possibleDupes = this.findPossibleDuplicates(header, mappings.filter(m => m.isMapped));
        
        unknownCols.push({
          sourceColumn: header,
          sampleValues: samples.slice(0, 3),
          detectedType,
          businessMeaning: this.suggestBusinessMeaning(header, detectedType),
          possibleDuplicates: possibleDupes,
          action: 'import_once', // Default: import once without adding to schema
        });
      }
    }

    return { mappings, aiSuggestions, unknownColumns: unknownCols };
  }

  /**
   * Find the best matching standard field for a header
   */
  findBestSynonymMatch(header: string): { field: string; confidence: number; reasoning: string } | null {
    if (!header || typeof header !== 'string') return null;
    const normalized = normalizeColumnHeader(header);
    let bestMatch: { field: string; confidence: number; reasoning: string } | null = null;

    for (const [fieldKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      let fieldConfidence = 0;
      let matchType = '';

      // Phase 1: Exact match
      if (synonyms.some(s => normalizeColumnHeader(s) === normalized)) {
        fieldConfidence = 100;
        matchType = 'exact match';
      }
      // Phase 2: Header contains synonym word
      else if (synonyms.some(s => {
        const synNormalized = normalizeColumnHeader(s);
        return normalized.includes(synNormalized) || synNormalized.includes(normalized);
      })) {
        fieldConfidence = 85;
        matchType = 'partial match';
      }
      // Phase 3: Word overlap (2+ words)
      else {
        const headerWords = normalized.split(' ').filter(w => w.length > 0);
        const maxOverlap = Math.max(...synonyms.map(syn => {
          const synWords = normalizeColumnHeader(syn).split(' ').filter(w => w.length > 0);
          let overlap = 0;
          headerWords.forEach(w => { if (synWords.includes(w)) overlap++; });
          return overlap;
        }));
        if (maxOverlap >= 2) {
          fieldConfidence = 70;
          matchType = 'word overlap';
        } else if (maxOverlap === 1) {
          // Check first letter matching for abbreviations
          const firstLetter = normalized.charAt(0);
          const synFirstLetters = synonyms.map(s => normalizeColumnHeader(s).charAt(0));
          if (synFirstLetters.includes(firstLetter)) {
            fieldConfidence = 40;
            matchType = 'first letter match';
          }
        }
      }

      // Phase 4: Fuzzy match - check if header is SIMILAR to any synonym (handles typos like "medecine" -> "medicine")
      if (fieldConfidence === 0) {
        for (const syn of synonyms) {
          const synNorm = normalizeColumnHeader(syn);
          if (this.levenshteinDistance(normalized, synNorm) <= 2 && normalized.length > 3) {
            fieldConfidence = 60;
            matchType = 'fuzzy match';
            break;
          }
        }
      }

      if (fieldConfidence > 0 && (!bestMatch || fieldConfidence > bestMatch.confidence)) {
        bestMatch = { field: fieldKey, confidence: fieldConfidence, reasoning: matchType };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Try to match against an existing import profile
   */
  private matchFromProfile(header: string, profile: ImportProfile): { field: string; confidence: number } | null {
    const normalized = normalizeColumnHeader(header);
    
    for (const pc of profile.columnMappings) {
      const pattern = pc.sourcePattern.toLowerCase();
      const normValue = normalizeColumnHeader(pattern);
      
      // Try exact match
      if (normValue === normalized) {
        return { field: pc.targetField, confidence: 95 };
      }
      
      // Try regex
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(header)) {
          return { field: pc.targetField, confidence: 90 };
        }
      } catch {}
    }

    return null;
  }

  /**
   * Find alternative field suggestions (for showing options to user)
   */
  findAlternatives(header: string, excludeField: string): { field: string; confidence: number }[] {
    const normalized = normalizeColumnHeader(header);
    const alternatives: { field: string; confidence: number }[] = [];

    for (const [fieldKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (fieldKey === excludeField) continue;

      const hasPartial = synonyms.some(s => {
        const synNormalized = normalizeColumnHeader(s);
        return normalized.includes(synNormalized) || synNormalized.includes(normalized);
      });

      if (hasPartial) {
        alternatives.push({ field: fieldKey, confidence: 60 });
      }
    }

    return alternatives;
  }

  /**
   * Check if a column might be a duplicate of an already-mapped field
   */
  private findPossibleDuplicates(header: string, mappedMappings: ColumnMapping[]): string[] {
    const normalized = normalizeColumnHeader(header);
    const duplicates: string[] = [];

    for (const mapping of mappedMappings) {
      const mappedNorm = normalizeColumnHeader(mapping.sourceColumn);
      if (normalized.includes(mappedNorm) || mappedNorm.includes(normalized)) {
        duplicates.push(mapping.sourceColumn);
      }
    }

    return duplicates;
  }

  /**
   * Suggest a business meaning for unknown columns based on sample data
   */
  private suggestBusinessMeaning(header: string, dataType: DetectedDataType): string {
    const normalized = normalizeColumnHeader(header);
    const words = normalized.split(' ');

    // Check against all synonym fields for contextual hints
    for (const [fieldKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      for (const syn of synonyms) {
        const synWords = normalizeColumnHeader(syn).split(' ');
        const matchCount = words.filter(w => synWords.includes(w)).length;
        if (matchCount >= 1) {
          const fieldLabel = PROTECTED_SCHEMA_FIELDS.find(f => f.key === fieldKey)?.label || fieldKey;
          return `Possibly related to "${fieldLabel}"`;
        }
      }
    }

    if (dataType === 'number') return 'Numeric field — possibly rate, quantity, or ID';
    if (dataType === 'date') return 'Date field — possibly order date, delivery date';
    if (dataType === 'currency') return 'Monetary value — possibly price or amount';
    if (dataType === 'text') return 'Text field — possibly notes, remarks, or additional info';

    return 'Unknown column — please review';
  }

  /**
   * Build a ColumnMapping object
   */
  private buildMapping(
    sourceColumn: string,
    targetField: string | null,
    order: number,
    dataType: DetectedDataType,
    sampleValues: string[],
    suggestedBy: 'ai' | 'user' | 'profile' | 'none',
    confidence: number
  ): ColumnMapping {
    const isProtected = targetField ? PROTECTED_SCHEMA_FIELDS.some(f => f.key === targetField) : false;
    const fieldDef = targetField ? PROTECTED_SCHEMA_FIELDS.find(f => f.key === targetField) : null;
    
    return {
      sourceColumn,
      targetField,
      displayLabel: fieldDef?.label || sourceColumn,
      dataType,
      sampleValues,
      isMapped: targetField !== null,
      isProtected,
      isHidden: false,
      width: Math.max(100, Math.min(300, sourceColumn.length * 12)),
      order,
      confidence,
      suggestedBy,
    };
  }

  /**
   * Extract sample values per column from raw rows
   */
  private extractColumnSamples(headers: string[], rows: string[][]): string[][] {
    const samples: string[][] = headers.map(() => []);
    const maxSamples = 5;

    for (let rowIdx = 0; rowIdx < Math.min(rows.length, 100); rowIdx++) {
      const row = rows[rowIdx];
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        if (colIdx < row.length && row[colIdx] && row[colIdx].trim()) {
          if (samples[colIdx].length < maxSamples) {
            samples[colIdx].push(row[colIdx].trim());
          }
        }
      }
    }

    return samples;
  }
}

// ── Singleton instance ──
export const columnMapper = new ColumnMapper();
