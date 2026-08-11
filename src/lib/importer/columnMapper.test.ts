import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnMapper } from './columnMapper';

describe('ColumnMapper', () => {
  let mapper: ColumnMapper;

  beforeEach(() => {
    mapper = new ColumnMapper();
  });

  describe('findBestSynonymMatch', () => {
    it('should exact match "Medicine Name" to name', () => {
      const result = mapper.findBestSynonymMatch('Medicine Name');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('name');
      expect(result!.confidence).toBe(100);
    });

    it('should match "Medicine" to name (exact synonym)', () => {
      const result = mapper.findBestSynonymMatch('Medicine');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('name');
    });

    it('should match "Batch No" to batch_number', () => {
      const result = mapper.findBestSynonymMatch('Batch No');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('batch_number');
      expect(result!.confidence).toBeGreaterThanOrEqual(85);
    });

    it('should match "Batch Number" to batch_number', () => {
      const result = mapper.findBestSynonymMatch('Batch Number');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('batch_number');
    });

    it('should match "MRP" to mrp with high confidence', () => {
      const result = mapper.findBestSynonymMatch('MRP');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('mrp');
      expect(result!.confidence).toBeGreaterThanOrEqual(85);
    });

    it('should match "Max Retail Price" to mrp', () => {
      const result = mapper.findBestSynonymMatch('Max Retail Price');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('mrp');
    });

    it('should match "Expiry Date" to expiry_date', () => {
      const result = mapper.findBestSynonymMatch('Expiry Date');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('expiry_date');
    });

    it('should match "Qty" to quantity', () => {
      const result = mapper.findBestSynonymMatch('Qty');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('quantity');
    });

    it('should match "GST %" to gst_percent', () => {
      const result = mapper.findBestSynonymMatch('GST %');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('gst_percent');
    });

    it('should match "HSN/SAC" to hsn_code', () => {
      const result = mapper.findBestSynonymMatch('HSN/SAC');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('hsn_code');
    });

    it('should match "Manufacturing Date" to mfg_date', () => {
      const result = mapper.findBestSynonymMatch('Manufacturing Date');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('mfg_date');
    });

    it('should match "Brand Name" to name (brand is a product name, not company)', () => {
      const result = mapper.findBestSynonymMatch('Brand Name');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('name');
    });

    it('should match "Supplier" to supplier_name, not company', () => {
      const result = mapper.findBestSynonymMatch('Supplier');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('supplier_name');
    });

    it('should match "PTR" to ptr', () => {
      const result = mapper.findBestSynonymMatch('PTR');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('ptr');
    });

    it('should match "PTS" to pts', () => {
      const result = mapper.findBestSynonymMatch('PTS');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('pts');
    });

    it('should return null for completely unknown column', () => {
      const result = mapper.findBestSynonymMatch('JklMnOpQrSt');
      expect(result).toBeNull();
    });
  });

  describe('mapHeaders', () => {
    it('should map known headers correctly', () => {
      const headers = ['Medicine Name', 'Batch No', 'Qty', 'MRP', 'Expiry'];
      const sampleRows: string[][] = [
        ['Paracetamol', 'BT24001', '100', '100.00', '2026-12-31'],
      ];

      const result = mapper.mapHeaders(headers, sampleRows);

      expect(result.mappings).toHaveLength(5);
      const nameMapping = result.mappings.find(m => m.targetField === 'name');
      expect(nameMapping).not.toBeUndefined();
      expect(nameMapping!.confidence).toBeGreaterThanOrEqual(85);

      const batchMapping = result.mappings.find(m => m.targetField === 'batch_number');
      expect(batchMapping).not.toBeUndefined();
    });

    it('should detect unknown columns', () => {
      const headers = ['Medicine Name', 'CustomField_XYZ'];
      const sampleRows: string[][] = [
        ['Paracetamol', 'Extra Data'],
      ];

      const result = mapper.mapHeaders(headers, sampleRows);

      expect(result.unknownColumns.length).toBeGreaterThanOrEqual(1);
      expect(result.unknownColumns.some(u => u.sourceColumn === 'CustomField_XYZ')).toBe(true);
    });

    it('should generate AI suggestions for known mappings', () => {
      const headers = ['Medicine Name', 'Batch No'];
      const sampleRows: string[][] = [
        ['Paracetamol', 'BT24001'],
      ];

      const result = mapper.mapHeaders(headers, sampleRows);
      expect(result.aiSuggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty headers', () => {
      const result = mapper.mapHeaders([], []);
      expect(result.mappings).toHaveLength(0);
      expect(result.aiSuggestions).toHaveLength(0);
      expect(result.unknownColumns).toHaveLength(0);
    });

    it('should handle headers with special characters', () => {
      const result = mapper.findBestSynonymMatch('Batch No.');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('batch_number');
    });

    it('should handle case insensitivity', () => {
      const result = mapper.findBestSynonymMatch('medicine name');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('name');
    });
  });

  describe('findAlternatives', () => {
    it('should return alternative field suggestions', () => {
      const alternatives = mapper.findAlternatives('Medicine', 'name');
      expect(Array.isArray(alternatives)).toBe(true);
    });

    it('should exclude the already-mapped field', () => {
      const alternatives = mapper.findAlternatives('Medicine', 'name');
      const hasExcluded = alternatives.some(a => a.field === 'name');
      expect(hasExcluded).toBe(false);
    });
  });
});
