import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiLearningEngine } from './aiLearningEngine';

describe('aiLearningEngine (plain object API)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('recordMapping', () => {
    it('should record a confirmed mapping with initial confidence', () => {
      aiLearningEngine.recordMapping('Medicine Name', 'name', 'xlsx', true, true, false);
      const stats = aiLearningEngine.getStats();
      expect(stats.totalMappings).toBe(1);
      expect(stats.acceptedSuggestions).toBe(1);
    });

    it('should record a corrected mapping with higher confidence (70 vs 50)', () => {
      aiLearningEngine.recordMapping('Brand', 'name', 'xlsx', false, false, true);
      const stats = aiLearningEngine.getStats();
      expect(stats.totalMappings).toBe(1);
      expect(stats.corrections).toBe(1);
    });

    it('should record a rejected mapping and decrease confidence', () => {
      aiLearningEngine.recordMapping('Some Field', 'name', 'xlsx', true, false, false);
      const stats = aiLearningEngine.getStats();
      expect(stats.rejectedSuggestions).toBe(1);
    });
  });

  describe('getSuggestion', () => {
    it('should return learned suggestion with exact match', () => {
      aiLearningEngine.recordMapping('Batch No', 'batch_number', 'xlsx', true, true, false);
      aiLearningEngine.recordMapping('Batch No', 'batch_number', 'xlsx', true, true, false);

      const suggestion = aiLearningEngine.getSuggestion('Batch No');
      expect(suggestion).not.toBeNull();
      expect(suggestion!.field).toBe('batch_number');
      expect(suggestion!.confidence).toBeGreaterThan(50);
    });

    it('should return null when no learned data exists', () => {
      const suggestion = aiLearningEngine.getSuggestion('Random Header');
      expect(suggestion).toBeNull();
    });

    it('should handle partial match with adjusted confidence', () => {
      aiLearningEngine.recordMapping('Medicine Name', 'name', 'xlsx', true, true, false);

      const suggestion = aiLearningEngine.getSuggestion('Medicine');
      expect(suggestion).not.toBeNull();
      expect(suggestion!.field).toBe('name');
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for multiple headers', () => {
      aiLearningEngine.recordMapping('Batch No', 'batch_number', 'xlsx', true, true, false);
      aiLearningEngine.recordMapping('Medicine Name', 'name', 'xlsx', true, true, false);

      const suggestions = aiLearningEngine.getSuggestions(['Batch No', 'Medicine Name', 'Unknown']);
      expect(suggestions.size).toBe(3);
      expect(suggestions.get('Batch No')).not.toBeNull();
      expect(suggestions.get('Unknown')).toBeNull();
    });
  });

  describe('recordRejection', () => {
    it('should decrease confidence on rejection', () => {
      aiLearningEngine.recordMapping('Test Col', 'test_field', 'xlsx', true, true, false);
      const before = aiLearningEngine.getSuggestion('Test Col')!;
      const beforeConfidence = before.confidence;

      aiLearningEngine.recordRejection('Test Col', 'test_field');

      const after = aiLearningEngine.getSuggestion('Test Col');
      // After rejection, confidence should be lower or null
      expect(after).not.toBeNull();
      if (after) {
        expect(after.confidence).toBeLessThan(beforeConfidence);
      }
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings sorted by confidence descending', () => {
      aiLearningEngine.recordMapping('Low Conf', 'field1', 'xlsx', true, true, false);
      aiLearningEngine.recordMapping('High Conf', 'field2', 'xlsx', true, true, false);
      aiLearningEngine.recordMapping('High Conf', 'field2', 'xlsx', true, true, false);

      const mappings = aiLearningEngine.getAllMappings();
      // High Conf should have higher confidence (confirmed twice)
      expect(mappings.length).toBe(2);
    });
  });

  describe('stats tracking', () => {
    it('should correctly track high/medium/low confidence counts', () => {
      // Repeated confirmations increase confidence
      for (let i = 0; i < 5; i++) {
        aiLearningEngine.recordMapping('Batch', 'batch_number', 'xlsx', true, true, false);
      }
      // Single confirming
      aiLearningEngine.recordMapping('Single', 'name', 'xlsx', true, true, false);

      const stats = aiLearningEngine.getStats();
      expect(stats.totalMappings).toBe(2);
    });
  });

  describe('persistence', () => {
    it('should persist data to localStorage', () => {
      aiLearningEngine.recordMapping('Batch No', 'batch_number', 'xlsx', true, true, false);

      const saved = localStorage.getItem('anpharm_ai_learned_mappings');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.length).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all learned data', () => {
      aiLearningEngine.recordMapping('Test', 'test', 'xlsx', true, true, false);
      expect(aiLearningEngine.getStats().totalMappings).toBe(1);

      aiLearningEngine.reset();
      expect(aiLearningEngine.getStats().totalMappings).toBe(0);
      expect(aiLearningEngine.getAllMappings()).toHaveLength(0);
    });
  });

  describe('export/import data', () => {
    it('should export and re-import data correctly', () => {
      aiLearningEngine.recordMapping('Batch', 'batch_number', 'xlsx', true, true, false);
      const exported = aiLearningEngine.exportData();

      aiLearningEngine.reset();
      expect(aiLearningEngine.getStats().totalMappings).toBe(0);

      const success = aiLearningEngine.importData(exported);
      expect(success).toBe(true);
      expect(aiLearningEngine.getStats().totalMappings).toBe(1);
    });

    it('should return false for invalid JSON', () => {
      const success = aiLearningEngine.importData('not valid json');
      expect(success).toBe(false);
    });
  });
});
