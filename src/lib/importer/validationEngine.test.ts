import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine, ValidationContext } from './validationEngine';
import { ColumnMapping } from './types';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;
  let baseMappings: ColumnMapping[];

  beforeEach(() => {
    engine = new ValidationEngine();
    baseMappings = [
      {
        sourceColumn: 'Medicine Name',
        targetField: 'name',
        displayLabel: 'Medicine Name',
        dataType: 'text',
        sampleValues: ['Paracetamol'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 150,
        order: 0,
        confidence: 95,
        suggestedBy: 'ai',
      },
      {
        sourceColumn: 'Batch No',
        targetField: 'batch_number',
        displayLabel: 'Batch Number',
        dataType: 'text',
        sampleValues: ['BT24001'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 120,
        order: 1,
        confidence: 95,
        suggestedBy: 'ai',
      },
      {
        sourceColumn: 'Quantity',
        targetField: 'quantity',
        displayLabel: 'Quantity',
        dataType: 'number',
        sampleValues: ['100'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 100,
        order: 2,
        confidence: 95,
        suggestedBy: 'ai',
      },
      {
        sourceColumn: 'Expiry',
        targetField: 'expiry_date',
        displayLabel: 'Expiry Date',
        dataType: 'date',
        sampleValues: ['2026-12-31'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 120,
        order: 3,
        confidence: 95,
        suggestedBy: 'ai',
      },
      {
        sourceColumn: 'MRP',
        targetField: 'mrp',
        displayLabel: 'MRP',
        dataType: 'currency',
        sampleValues: ['100.00'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 100,
        order: 4,
        confidence: 95,
        suggestedBy: 'ai',
      },
      {
        sourceColumn: 'HSN',
        targetField: 'hsn_code',
        displayLabel: 'HSN Code',
        dataType: 'text',
        sampleValues: ['3004'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 100,
        order: 5,
        confidence: 95,
        suggestedBy: 'ai',
      },
      {
        sourceColumn: 'GST',
        targetField: 'gst_percent',
        displayLabel: 'GST %',
        dataType: 'number',
        sampleValues: ['12'],
        isMapped: true,
        isProtected: true,
        isHidden: false,
        width: 80,
        order: 6,
        confidence: 95,
        suggestedBy: 'ai',
      },
    ];
  });

  describe('validateAll', () => {
    it('should return valid for a correct row', () => {
      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol',
            'Batch No': 'BT24001',
            Quantity: '100',
            Expiry: '2028-12-31',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('valid');
      expect(results[0].fieldErrors).toHaveLength(0);
    });

    it('should flag missing required fields', () => {
      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': '',
            'Batch No': 'BT24001',
            Quantity: '100',
            Expiry: '2026-12-31',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results[0].status).toBe('error');
      expect(results[0].fieldErrors.some(e => e.field === 'name')).toBe(true);
    });

    it('should detect negative quantity', () => {
      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol',
            'Batch No': 'BT24001',
            Quantity: '-10',
            Expiry: '2026-12-31',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results[0].status).toBe('error');
      expect(results[0].fieldErrors.some(e => e.field === 'quantity' && e.message.includes('negative'))).toBe(true);
    });

    it('should detect expired stock', () => {
      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol',
            'Batch No': 'BT24001',
            Quantity: '100',
            Expiry: '2020-01-01',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results[0].globalWarnings.some(w => w.includes('EXPIRED'))).toBe(true);
    });

    it('should detect near-expiry stock (within 90 days)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const dateStr = futureDate.toISOString().split('T')[0];

      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol',
            'Batch No': 'BT24001',
            Quantity: '100',
            Expiry: dateStr,
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results[0].globalWarnings.some(w => w.includes('NEAR EXPIRY'))).toBe(true);
    });

    it('should detect duplicate batch numbers against existing stock', () => {
      const existingMedicines = [
        { id: 1, name: 'Paracetamol', batch_number: 'BT24001', barcode: '8901234567890' },
      ];

      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol 650',
            name: 'Paracetamol 650',
            'Batch No': 'BT24001',
            batch_number: 'BT24001',
            batchNumber: 'BT24001',
            Quantity: '100',
            Expiry: '2026-12-31',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
        existingMedicines,
      };

      const results = engine.validateAll(context);
      expect(results[0].duplicateInfo).not.toBeNull();
      expect(results[0].duplicateInfo!.type).toBe('batch');
      expect(results[0].globalWarnings.some(w => w.includes('already exists'))).toBe(true);
    });

    it('should detect duplicate batch when rows only have source-column keys (real runValidation shape)', () => {
      const existingMedicines = [
        { id: 1, name: 'Paracetamol', batch_number: 'BT24001', barcode: '8901234567890' },
      ];

      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol 650',
            'Batch No': 'BT24001',
            Quantity: '100',
            Expiry: '2026-12-31',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
        existingMedicines,
      };

      const results = engine.validateAll(context);
      expect(results[0].duplicateInfo).not.toBeNull();
      expect(results[0].duplicateInfo!.type).toBe('batch');
      expect(results[0].duplicateInfo!.suggestion).toBe('replace');
    });

    it('should detect invalid number format', () => {
      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': 'Paracetamol',
            'Batch No': 'BT24001',
            Quantity: 'ABC',
            Expiry: '2026-12-31',
            MRP: '100.00',
            HSN: '3004',
            GST: '12',
          },
        ],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results[0].status).toBe('error');
      expect(results[0].fieldErrors.some(e => e.field === 'quantity')).toBe(true);
    });

    it('should handle empty rows gracefully', () => {
      const context: ValidationContext = {
        rows: [],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      expect(results).toHaveLength(0);
    });

    it('should skip required check when skipRequiredCheck is true', () => {
      const context: ValidationContext = {
        rows: [
          {
            'Medicine Name': '',
            'Batch No': '',
            Quantity: '',
            Expiry: '',
            MRP: '',
            HSN: '',
            GST: '',
          },
        ],
        columnMappings: baseMappings,
        skipRequiredCheck: true,
      };

      const results = engine.validateAll(context);
      // Should not have any errors since required check is skipped
      expect(results[0].status).toBe('valid');
    });
  });

  describe('getSummary', () => {
    it('should return correct summary statistics', () => {
      const validRow = {
        'Medicine Name': 'Paracetamol',
        'Batch No': 'BT24001',
        Quantity: '100',
        Expiry: '2026-12-31',
        MRP: '100.00',
        HSN: '3004',
        GST: '12',
      };
      const invalidRow = {
        'Medicine Name': '',
        'Batch No': '',
        Quantity: '-5',
        Expiry: '2020-01-01',
        MRP: '0',
        HSN: '3004',
        GST: '12',
      };

      const context: ValidationContext = {
        rows: [validRow, invalidRow],
        columnMappings: baseMappings,
      };

      const results = engine.validateAll(context);
      const summary = engine.getSummary(results);

      expect(summary.totalRows).toBe(2);
      expect(summary.validRows + summary.errorRows + summary.warningRows).toBe(2);
    });
  });
});
