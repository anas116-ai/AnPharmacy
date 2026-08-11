/**
 * Data Import Studio — Validation Engine
 * 
 * Validates every imported row against the stock schema rules:
 * - Required fields
 * - Data type correctness
 * - Duplicate detection (medicine name, batch, barcode)
 * - Date validity (expiry, mfg)
 * - Negative values
 * - Business rules (FEFO, near-expiry warnings)
 * 
 * Results are per-row with field-level detail, NOT blocking.
 * User can review all issues and decide what to fix or override.
 */

import {
  ValidationRecord,
  FieldError,
  DuplicateInfo,
  ValidationSummary,
  ColumnMapping,
  PROTECTED_SCHEMA_FIELDS,
} from './types';

export interface ValidationContext {
  rows: Record<string, any>[];
  columnMappings: ColumnMapping[];
  existingMedicines?: any[];
  skipRequiredCheck?: boolean;
}

export class ValidationEngine {
  /**
   * Validate ALL rows and return detailed per-record results
   */
  validateAll(context: ValidationContext): ValidationRecord[] {
    const { rows, columnMappings, existingMedicines, skipRequiredCheck } = context;
    // Index existing stock once so duplicate detection is O(1) per lookup, not O(stock) per row.
    // ponytail: plain Maps keyed on normalized values; upgrade to a real index only if stock > ~1M.
    const byBatch = new Map<string, any>();
    const byBarcode = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const m of existingMedicines || []) {
      const b = (m.batch_number || '').toUpperCase();
      if (b && !byBatch.has(b)) byBatch.set(b, m);
      const bc = (m.barcode || '').toUpperCase();
      if (bc && !byBarcode.has(bc)) byBarcode.set(bc, m);
      const n = (m.name || '').toLowerCase();
      if (n && !byName.has(n)) byName.set(n, m);
    }
    return rows.map((row, index) => this.validateRow(row, index, columnMappings, existingMedicines, skipRequiredCheck, { byBatch, byBarcode, byName }));
  }

  /**
   * Validate a single row
   */
  validateRow(
    row: Record<string, any>,
    rowIndex: number,
    columnMappings: ColumnMapping[],
    existingMedicines?: any[],
    skipRequiredCheck?: boolean,
    index?: { byBatch: Map<string, any>; byBarcode: Map<string, any>; byName: Map<string, any> }
  ): ValidationRecord {
    const fieldErrors: FieldError[] = [];
    const globalErrors: string[] = [];
    const globalWarnings: string[] = [];

    // 1. Required field check
    if (!skipRequiredCheck) {
      for (const field of PROTECTED_SCHEMA_FIELDS) {
        if (field.required) {
          // Find the mapped column for this field
          const mapping = columnMappings.find(m => m.targetField === field.key);
          if (mapping) {
            const value = row[mapping.sourceColumn];
            if (value === undefined || value === null || String(value).trim() === '') {
              fieldErrors.push({
                field: field.key,
                column: mapping.sourceColumn,
                message: `${field.label} is required`,
                severity: 'error',
                actualValue: '',
              });
            }
          }
        }
      }
    }

    // 2. Value validation per field
    for (const mapping of columnMappings) {
      if (!mapping.targetField) continue;
      const value = row[mapping.sourceColumn];
      if (value === undefined || value === null || String(value).trim() === '') continue;

      const rawValue = String(value).trim();
      const fieldDef = PROTECTED_SCHEMA_FIELDS.find(f => f.key === mapping.targetField);
      if (!fieldDef) continue;

      // Numeric validation
      if (fieldDef.type === 'number' || fieldDef.type === 'currency') {
        const num = parseFloat(rawValue);
        if (isNaN(num)) {
          fieldErrors.push({
            field: fieldDef.key,
            column: mapping.sourceColumn,
            message: `${fieldDef.label}: "${rawValue}" is not a valid number`,
            severity: 'error',
            actualValue: rawValue,
          });
        } else {
          if (fieldDef.validation?.min !== undefined && num < fieldDef.validation.min) {
            fieldErrors.push({
              field: fieldDef.key,
              column: mapping.sourceColumn,
              message: `${fieldDef.label}: ${num} is below minimum (${fieldDef.validation.min})`,
              severity: 'warning',
              actualValue: String(num),
              expectedValue: String(fieldDef.validation.min),
            });
          }
          if (fieldDef.key === 'quantity' && num < 0) {
            fieldErrors.push({
              field: 'quantity',
              column: mapping.sourceColumn,
              message: `Quantity cannot be negative: ${num}`,
              severity: 'error',
              actualValue: String(num),
            });
          }
        }
      }

      // Date validation
      if (fieldDef.type === 'date') {
        const parsed = new Date(rawValue);
        if (isNaN(parsed.getTime()) && !/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(rawValue)) {
          fieldErrors.push({
            field: fieldDef.key,
            column: mapping.sourceColumn,
            message: `${fieldDef.label}: "${rawValue}" is not a valid date`,
            severity: 'error',
            actualValue: rawValue,
          });
        } else {
          // Check expiry in the past
          if (fieldDef.key === 'expiry_date') {
            const expiryDate = new Date(rawValue);
            const today = new Date();
            if (!isNaN(expiryDate.getTime()) && expiryDate < today) {
              globalWarnings.push(`Row ${rowIndex + 1}: "${row.name || 'Unknown'}" is already EXPIRED (${rawValue})`);
            } else if (!isNaN(expiryDate.getTime())) {
              const daysRemaining = Math.round((expiryDate.getTime() - today.getTime()) / 86400000);
              if (daysRemaining <= 90) {
                globalWarnings.push(`Row ${rowIndex + 1}: "${row.name || 'Unknown'}" expires within ${daysRemaining} days (${rawValue}) — NEAR EXPIRY`);
              }
              if (daysRemaining <= 30) {
                globalWarnings.push(`Row ${rowIndex + 1}: "${row.name || 'Unknown'}" is CRITICAL — only ${daysRemaining} days until expiry`);
              }
            }
          }
        }
      }
    }

    // 3. Duplicate detection against existing stock
    let duplicateInfo: DuplicateInfo | null = null;
    if (existingMedicines && existingMedicines.length > 0) {
      // Rows carry source-column keys (e.g. "Batch No"), so resolve mapped values
      const getMapped = (field: string): string => {
        const mapping = columnMappings.find(m => m.targetField === field);
        if (!mapping) return '';
        const v = row[mapping.sourceColumn];
        return v === undefined || v === null ? '' : String(v);
      };
      const batchNumber = row.batch_number || row.batchNumber || getMapped('batch_number') || '';
      const medicineName = row.name || row.medicineName || getMapped('name') || '';
      const barcode = row.barcode || getMapped('barcode') || '';

      // Check duplicate batch
      if (batchNumber) {
        const existingBatch = index
          ? index.byBatch.get(batchNumber.toUpperCase())
          : existingMedicines.find((m: any) => {
              const mBatch = (m.batch_number || '').toUpperCase();
              const inBatch = batchNumber.toUpperCase();
              return mBatch === inBatch;
            });
        if (existingBatch) {
          duplicateInfo = {
            type: 'batch',
            existingIds: [existingBatch.id],
            existingValues: [existingBatch.batch_number],
            suggestion: 'replace',
          };
          globalWarnings.push(`Row ${rowIndex + 1}: Batch "${batchNumber}" already exists in stock (${existingBatch.name}). Will update with file values.`);
        }
      }

      // Check duplicate barcode
      if (barcode && !duplicateInfo) {
        const existingBarcode = index
          ? index.byBarcode.get(barcode.toUpperCase())
          : existingMedicines.find((m: any) => {
              const mBarcode = (m.barcode || '').toUpperCase();
              return mBarcode === barcode.toUpperCase();
            });
        if (existingBarcode) {
          duplicateInfo = {
            type: 'barcode',
            existingIds: [existingBarcode.id],
            existingValues: [existingBarcode.barcode],
            suggestion: 'skip',
          };
          globalWarnings.push(`Row ${rowIndex + 1}: Barcode "${barcode}" already exists for "${existingBarcode.name}". Will skip.`);
        }
      }

      // Check duplicate medicine name
      if (medicineName && !duplicateInfo) {
        const existingName = index
          ? index.byName.get(medicineName.toLowerCase())
          : existingMedicines.find((m: any) => {
              const mName = (m.name || '').toLowerCase();
              return mName === medicineName.toLowerCase();
            });
        if (existingName) {
          duplicateInfo = {
            type: 'medicine',
            existingIds: [existingName.id],
            existingValues: [existingName.name],
            suggestion: 'create_new_batch',
          };
          globalWarnings.push(`Row ${rowIndex + 1}: "${medicineName}" already exists in stock. Will create new batch.`);
        }
      }
    }

    // 4. Determine overall status
    const hasErrors = fieldErrors.some(e => e.severity === 'error');
    const hasWarnings = fieldErrors.some(e => e.severity === 'warning') || globalWarnings.length > 0;
    const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid';

    return {
      rowIndex,
      status,
      fieldErrors,
      globalErrors,
      globalWarnings,
      duplicateInfo,
    };
  }

  /**
   * Get summary statistics across all validation results
   */
  getSummary(records: ValidationRecord[]): ValidationSummary {
    const summary: ValidationSummary = {
      totalRows: records.length,
      validRows: 0,
      warningRows: 0,
      errorRows: 0,
      totalErrors: 0,
      totalWarnings: 0,
      duplicateCount: 0,
      missingRequiredCount: 0,
      expiredCount: 0,
      nearExpiryCount: 0,
      negativeQtyCount: 0,
      invalidDateCount: 0,
    };

    for (const record of records) {
      if (record.status === 'valid') summary.validRows++;
      if (record.status === 'warning') summary.warningRows++;
      if (record.status === 'error') summary.errorRows++;

      summary.totalErrors += record.fieldErrors.filter(e => e.severity === 'error').length;
      summary.totalWarnings += record.fieldErrors.filter(e => e.severity === 'warning').length + record.globalWarnings.length;

      if (record.duplicateInfo) summary.duplicateCount++;

      for (const err of record.fieldErrors) {
        if (err.field === 'quantity' && err.message.includes('negative')) summary.negativeQtyCount++;
        if (err.field === 'expiry_date' || err.field === 'mfg_date') summary.invalidDateCount++;
      }

      for (const warn of record.globalWarnings) {
        if (warn.includes('EXPIRED')) summary.expiredCount++;
        if (warn.includes('NEAR EXPIRY')) summary.nearExpiryCount++;
        if (warn.includes('required')) summary.missingRequiredCount++;
      }
    }

    return summary;
  }
}

// ── Singleton instance ──
export const validationEngine = new ValidationEngine();
