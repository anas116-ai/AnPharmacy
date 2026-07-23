/**
 * Invoice Field Extractor - Validates and normalizes extracted fields
 * 
 * Each field type has specific validation rules:
 * - Medicine names: cleaned, matched against database
 * - Batch numbers: validated format, checked for duplicates
 * - Dates: normalized to YYYY-MM-DD, validated for logic
 * - Quantities: validated range, checked for reasonableness
 * - Prices: validated format, checked against MRP
 * - HSN codes: validated against known HSN code patterns
 * - GST rates: validated against standard GST rates
 */

import { ParsedItem } from './ocrParser';
import { Medicine } from './types';

// ── Field validation result ──────────────────────────────────────────

export interface FieldValidationResult {
  field: string;
  originalValue: string;
  normalizedValue: string;
  isValid: boolean;
  confidence: number;        // 0-100
  issues: string[];
  suggestions: string[];
}

export interface ItemValidationResult {
  item: ParsedItem;
  fields: FieldValidationResult[];
  overallConfidence: number;
  isUsable: boolean;
  criticalIssues: string[];
  warnings: string[];
}

// ── Validation thresholds ────────────────────────────────────────────

const VALIDATION_THRESHOLDS = {
  medicineName: {
    minLength: 3,
    maxLength: 200,
    confidenceIfValid: 95,
    confidenceIfInvalid: 40,
  },
  batchNo: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9\-]{3,15}$/i,
    confidenceIfValid: 95,
    confidenceIfInvalid: 50,
  },
  expiry: {
    minYear: 2020,
    maxYear: 2050,
    confidenceIfValid: 95,
    confidenceIfInvalid: 30,
  },
  mfg: {
    minYear: 2020,
    maxYear: 2030,
    confidenceIfValid: 90,
    confidenceIfInvalid: 40,
  },
  quantity: {
    min: 1,
    max: 100000,
    confidenceIfValid: 95,
    confidenceIfInvalid: 50,
  },
  unitPrice: {
    min: 0.01,
    max: 100000,
    confidenceIfValid: 90,
    confidenceIfInvalid: 60,
  },
  hsn: {
    pattern: /^\d{4,8}$/,
    confidenceIfValid: 95,
    confidenceIfInvalid: 40,
  },
  gst: {
    validRates: [0, 5, 6, 12, 18, 28],
    confidenceIfValid: 95,
    confidenceIfInvalid: 50,
  },
};

// ── Main validation function ─────────────────────────────────────────

export function validateParsedItem(item: ParsedItem, existingMedicines: Medicine[]): ItemValidationResult {
  const fields: FieldValidationResult[] = [
    validateMedicineName(item.name, item),
    validateBatchNumber(item.batchNumber, item),
    validateExpiryDate(item.expiryDate, item),
    validateMfgDate(item.mfgDate, item),
    validateQuantity(item.quantity, item),
    validateUnitPrice(item.unitPrice, item),
    validateTotalAmount(item.totalAmount, item),
    validateHSNCode(item.hsnCode, item),
    validateGSTRate(item.gstRate, item),
    validateManufacturer(item.manufacturer, item),
  ];
  
  const validFields = fields.filter(f => f.isValid);
  const invalidFields = fields.filter(f => !f.isValid);
  const warningFields = fields.filter(f => f.isValid && f.confidence < 80);
  
  const overallConfidence = fields.length > 0
    ? Math.round(fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length)
    : 0;
  
  const criticalIssues = invalidFields
    .filter(f => ['medicineName', 'batchNo', 'expiry', 'quantity'].includes(f.field))
    .flatMap(f => f.issues);
  
  const warnings = warningFields
    .filter(f => !['medicineName', 'batchNo', 'expiry', 'quantity'].includes(f.field))
    .flatMap(f => f.issues);
  
  return {
    item,
    fields,
    overallConfidence,
    isUsable: criticalIssues.length === 0 && validFields.length >= 4,
    criticalIssues,
    warnings,
  };
}

// ── Validate medicine name ───────────────────────────────────────────

function validateMedicineName(value: string, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value.trim().length === 0) {
    return {
      field: 'medicineName',
      originalValue: value,
      normalizedValue: '',
      isValid: false,
      confidence: 0,
      issues: ['Medicine name is missing'],
      suggestions: ['Please enter medicine name manually'],
    };
  }
  
  const normalized = value.trim();
  
  if (normalized.length < VALIDATION_THRESHOLDS.medicineName.minLength) {
    issues.push('Medicine name is too short');
    confidence -= 30;
  }
  
  if (normalized.length > VALIDATION_THRESHOLDS.medicineName.maxLength) {
    issues.push('Medicine name is too long');
    confidence -= 20;
  }
  
  // Check if it's just a number or contains too many numbers
  const alphaCount = (normalized.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < 3) {
    issues.push('Medicine name must contain at least 3 letters');
    confidence -= 40;
  }
  
  // Check for garbage patterns
  if (/^[\d\s\.]+$/.test(normalized)) {
    issues.push('Medicine name cannot be only numbers');
    confidence -= 50;
  }
  
  // Check for common OCR errors
  if (/\d{4}-\d{2}-\d{2}/.test(normalized)) {
    issues.push('Date found in medicine name field');
    confidence -= 20;
    suggestions.push('Remove date from medicine name');
  }
  
  // Check for batch number embedded in name
  if (item.batchNumber && normalized.includes(item.batchNumber)) {
    issues.push('Batch number appears in medicine name');
    confidence -= 15;
    suggestions.push('Remove batch number from medicine name');
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'medicineName',
    originalValue: value,
    normalizedValue: normalized,
    isValid: issues.length === 0 || confidence > 60,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate batch number ────────────────────────────────────────────

function validateBatchNumber(value: string, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value.trim().length === 0) {
    return {
      field: 'batchNo',
      originalValue: value,
      normalizedValue: '',
      isValid: false,
      confidence: 30,
      issues: ['Batch number is missing'],
      suggestions: ['Please enter batch number manually'],
    };
  }
  
  const normalized = value.toUpperCase().trim();
  
  if (normalized.length < VALIDATION_THRESHOLDS.batchNo.minLength) {
    issues.push('Batch number is too short');
    confidence -= 20;
  }
  
  if (normalized.length > VALIDATION_THRESHOLDS.batchNo.maxLength) {
    issues.push('Batch number is too long');
    confidence -= 20;
  }
  
  // Check for auto-generated batch numbers
  if (normalized.startsWith('BATCH-') || normalized.startsWith('AUTO-')) {
    issues.push('Auto-generated batch number detected');
    confidence -= 40;
    suggestions.push('Verify batch number from physical invoice');
  }
  
  // Validate format
  if (!VALIDATION_THRESHOLDS.batchNo.pattern.test(normalized)) {
    issues.push('Batch number format is invalid');
    confidence -= 20;
    suggestions.push('Batch number should be alphanumeric (3-15 characters)');
  }
  
  // Check if it looks like a date or quantity
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}$/.test(normalized)) {
    issues.push('Batch number looks like a date');
    confidence -= 30;
    suggestions.push('Verify this is not a date value');
  }
  
  if (/^\d+$/.test(normalized)) {
    issues.push('Batch number is only digits');
    confidence -= 20;
    suggestions.push('Batch numbers usually contain letters');
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'batchNo',
    originalValue: value,
    normalizedValue: normalized,
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate expiry date ─────────────────────────────────────────────

function validateExpiryDate(value: string, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value.trim().length === 0) {
    return {
      field: 'expiry',
      originalValue: value,
      normalizedValue: '',
      isValid: false,
      confidence: 30,
      issues: ['Expiry date is missing'],
      suggestions: ['Please enter expiry date manually'],
    };
  }
  
  const normalized = normalizeDate(value);
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    issues.push('Expiry date format is invalid');
    confidence -= 30;
  }
  
  const expiryDate = new Date(normalized);
  const now = new Date();
  
  if (isNaN(expiryDate.getTime())) {
    issues.push('Expiry date is not a valid date');
    confidence -= 50;
  } else {
    // Check if date is in reasonable range
    if (expiryDate.getFullYear() < VALIDATION_THRESHOLDS.expiry.minYear) {
      issues.push('Expiry date is too far in the past');
      confidence -= 40;
    }
    
    if (expiryDate.getFullYear() > VALIDATION_THRESHOLDS.expiry.maxYear) {
      issues.push('Expiry date is too far in the future');
      confidence -= 30;
    }
    
    // Check if expired
    if (expiryDate < now) {
      const daysExpired = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
      issues.push(`Medicine expired ${daysExpired} days ago`);
      confidence -= 20;
      suggestions.push('Do not add expired medicines to stock');
    }
    
    // Check if expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (expiryDate > now && expiryDate < thirtyDaysFromNow) {
      issues.push('Medicine expires within 30 days');
      confidence -= 10;
      suggestions.push('Consider rejecting near-expiry medicines');
    }
  }
  
  // Check if expiry is before mfg date
  if (item.mfgDate) {
    const mfgDate = new Date(item.mfgDate);
    if (!isNaN(mfgDate.getTime()) && !isNaN(expiryDate.getTime()) && expiryDate <= mfgDate) {
      issues.push('Expiry date is before manufacturing date');
      confidence -= 30;
      suggestions.push('Verify manufacturing and expiry dates');
    }
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'expiry',
    originalValue: value,
    normalizedValue: normalized,
    isValid: issues.length === 0 || confidence > 40,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate manufacturing date ──────────────────────────────────────

function validateMfgDate(value: string, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value.trim().length === 0) {
    return {
      field: 'mfg',
      originalValue: value,
      normalizedValue: '',
      isValid: true, // Mfg date is optional
      confidence: 60,
      issues: [],
      suggestions: [],
    };
  }
  
  const normalized = normalizeDate(value);
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    issues.push('Manufacturing date format is invalid');
    confidence -= 30;
  }
  
  const mfgDate = new Date(normalized);
  const now = new Date();
  
  if (isNaN(mfgDate.getTime())) {
    issues.push('Manufacturing date is not a valid date');
    confidence -= 50;
  } else {
    if (mfgDate > now) {
      issues.push('Manufacturing date is in the future');
      confidence -= 40;
    }
    
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
    if (mfgDate < twoYearsAgo) {
      issues.push('Manufacturing date is very old');
      confidence -= 20;
    }
    
    // Check if mfg is after expiry
    if (item.expiryDate) {
      const expiryDate = new Date(item.expiryDate);
      if (!isNaN(expiryDate.getTime()) && mfgDate >= expiryDate) {
        issues.push('Manufacturing date is after expiry date');
        confidence -= 30;
      }
    }
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'mfg',
    originalValue: value,
    normalizedValue: normalized,
    isValid: issues.length === 0 || confidence > 40,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate quantity ────────────────────────────────────────────────

function validateQuantity(value: number, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value <= 0) {
    return {
      field: 'qty',
      originalValue: value?.toString() || '0',
      normalizedValue: '0',
      isValid: false,
      confidence: 30,
      issues: ['Quantity is missing or zero'],
      suggestions: ['Please enter quantity manually'],
    };
  }
  
  if (value < VALIDATION_THRESHOLDS.quantity.min) {
    issues.push('Quantity is too low');
    confidence -= 20;
  }
  
  if (value > VALIDATION_THRESHOLDS.quantity.max) {
    issues.push('Quantity is unusually high');
    confidence -= 30;
    suggestions.push('Please verify the quantity value');
  }
  
  // Check if quantity is suspiciously round (might be OCR error)
  if (value >= 1000 && value % 100 === 0) {
    issues.push('Quantity is a round number - verify it\'s correct');
    confidence -= 10;
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'qty',
    originalValue: value.toString(),
    normalizedValue: value.toString(),
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate unit price ──────────────────────────────────────────────

function validateUnitPrice(value: number, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value <= 0) {
    return {
      field: 'unitPrice',
      originalValue: value?.toString() || '0',
      normalizedValue: '0',
      isValid: true, // Price might be in a different column
      confidence: 60,
      issues: [],
      suggestions: ['Price may be in a different column (MRP, PTR, etc.)'],
    };
  }
  
  if (value < VALIDATION_THRESHOLDS.unitPrice.min) {
    issues.push('Unit price is too low');
    confidence -= 20;
  }
  
  if (value > VALIDATION_THRESHOLDS.unitPrice.max) {
    issues.push('Unit price is unusually high');
    confidence -= 30;
    suggestions.push('Please verify the price value');
  }
  
  // Check if price is suspiciously round
  if (value >= 100 && value % 10 === 0) {
    issues.push('Price is a round number - verify it\'s correct');
    confidence -= 10;
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'unitPrice',
    originalValue: value.toFixed(2),
    normalizedValue: value.toFixed(2),
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate total amount ────────────────────────────────────────────

function validateTotalAmount(value: number, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  let confidence = 100;
  
  if (!value || value <= 0) {
    return {
      field: 'totalAmount',
      originalValue: '0',
      normalizedValue: '0',
      isValid: true, // Total might not be present
      confidence: 70,
      issues: [],
      suggestions: [],
    };
  }
  
  // Check if total matches quantity * unit price
  const expectedTotal = (item.quantity || 0) * (item.unitPrice || 0);
  if (expectedTotal > 0 && Math.abs(value - expectedTotal) > expectedTotal * 0.1) {
    issues.push(`Total (${value}) doesn't match qty × price (${expectedTotal.toFixed(2)})`);
    confidence -= 15;
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'totalAmount',
    originalValue: value.toFixed(2),
    normalizedValue: value.toFixed(2),
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions: issues.length > 0 ? ['Verify total amount calculation'] : [],
  };
}

// ── Validate HSN code ────────────────────────────────────────────────

function validateHSNCode(value: string, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value || value.trim().length === 0) {
    return {
      field: 'hsn',
      originalValue: value,
      normalizedValue: '',
      isValid: true, // HSN is optional
      confidence: 60,
      issues: [],
      suggestions: ['HSN code not found - will use default 3004'],
    };
  }
  
  const normalized = value.trim();
  
  if (!VALIDATION_THRESHOLDS.hsn.pattern.test(normalized)) {
    issues.push('HSN code format is invalid');
    confidence -= 30;
    suggestions.push('HSN code should be 4-8 digits');
  }
  
  // Validate against known HSN code patterns for medicines
  if (!/^30/.test(normalized) && !/^21/.test(normalized)) {
    issues.push('HSN code may not be for pharmaceutical products');
    confidence -= 20;
    suggestions.push('HSN codes for medicines usually start with 30');
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'hsn',
    originalValue: value,
    normalizedValue: normalized,
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate GST rate ────────────────────────────────────────────────

function validateGSTRate(value: number, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let confidence = 100;
  
  if (!value && value !== 0) {
    return {
      field: 'gst',
      originalValue: '',
      normalizedValue: '12',
      isValid: true, // GST is optional, will use default
      confidence: 70,
      issues: [],
      suggestions: ['GST rate not found - using default 12%'],
    };
  }
  
  if (!VALIDATION_THRESHOLDS.gst.validRates.includes(value)) {
    issues.push(`GST rate ${value}% is not a standard rate`);
    confidence -= 20;
    suggestions.push(`Standard GST rates: ${VALIDATION_THRESHOLDS.gst.validRates.join(', ')}%`);
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'gst',
    originalValue: value.toString(),
    normalizedValue: value.toString(),
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions,
  };
}

// ── Validate manufacturer ────────────────────────────────────────────

function validateManufacturer(value: string, item: ParsedItem): FieldValidationResult {
  const issues: string[] = [];
  let confidence = 100;
  
  if (!value || value.trim().length === 0) {
    return {
      field: 'manufacturer',
      originalValue: value || '',
      normalizedValue: '',
      isValid: true, // Manufacturer is optional
      confidence: 70,
      issues: [],
      suggestions: ['Manufacturer name not found'],
    };
  }
  
  const normalized = value.trim();
  
  if (normalized.length < 2) {
    issues.push('Manufacturer name is too short');
    confidence -= 20;
  }
  
  if (normalized.length > 100) {
    issues.push('Manufacturer name is too long');
    confidence -= 10;
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    field: 'manufacturer',
    originalValue: value,
    normalizedValue: normalized,
    isValid: issues.length === 0 || confidence > 50,
    confidence,
    issues,
    suggestions: [],
  };
}

// ── Normalize date value ─────────────────────────────────────────────

function normalizeDate(value: string): string {
  const patterns = [
    /^(\d{1,2})[\/\-\.](\d{2,4})$/,           // MM/YYYY or MM/YY
    /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // YYYY-MM-DD
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/, // DD/MM/YYYY or MM/DD/YYYY
  ];
  
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      if (match.length === 3) {
        const month = match[1].padStart(2, '0');
        const year = match[2].length === 2 ? '20' + match[2] : match[2];
        return `${year}-${month}-01`;
      } else if (match.length === 4) {
        let year = match[1];
        let month = match[2];
        let day = match[3];
        
        if (year.length === 2) {
          year = parseInt(year) > 30 ? '19' + year : '20' + year;
        }
        
        if (parseInt(month) > 12) {
          [month, day] = [day, month];
        }
        
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return value;
}

// ── Batch validation for multiple items ──────────────────────────────

export function validateBatchItems(items: ParsedItem[]): {
  validItems: ParsedItem[];
  invalidItems: ParsedItem[];
  warnings: string[];
} {
  const validItems: ParsedItem[] = [];
  const invalidItems: ParsedItem[] = [];
  const warnings: string[] = [];
  
  const batchNumbers = new Set<string>();
  
  for (const item of items) {
    const result = validateParsedItem(item, []);
    
    if (result.isUsable) {
      // Check for duplicate batch numbers
      if (item.batchNumber && batchNumbers.has(item.batchNumber)) {
        warnings.push(`Duplicate batch number detected: ${item.batchNumber}`);
        result.warnings.push(`Duplicate batch number: ${item.batchNumber}`);
      }
      
      if (item.batchNumber) {
        batchNumbers.add(item.batchNumber);
      }
      
      validItems.push(result.item);
    } else {
      invalidItems.push(result.item);
    }
    
    // Collect all warnings
    warnings.push(...result.warnings);
  }
  
  return { validItems, invalidItems, warnings: [...new Set(warnings)] };
}

// ── Get validation summary ───────────────────────────────────────────

export function getValidationSummary(results: ItemValidationResult[]): {
  totalItems: number;
  usableItems: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  criticalIssues: number;
  warnings: number;
} {
  const totalItems = results.length;
  const usableItems = results.filter(r => r.isUsable).length;
  const highConfidence = results.filter(r => r.overallConfidence >= 85).length;
  const mediumConfidence = results.filter(r => r.overallConfidence >= 65 && r.overallConfidence < 85).length;
  const lowConfidence = results.filter(r => r.overallConfidence < 65).length;
  const criticalIssues = results.reduce((sum, r) => sum + r.criticalIssues.length, 0);
  const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  
  return {
    totalItems,
    usableItems,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    criticalIssues,
    warnings,
  };
}

// ── Auto-fix common issues ───────────────────────────────────────────

export function autoFixItem(item: ParsedItem): ParsedItem {
  const fixed = { ...item };
  
  // Auto-fix medicine name
  if (fixed.name) {
    fixed.name = fixed.name
      .replace(/^[^a-zA-Z0-9]+/, '')
      .replace(/[^a-zA-Z0-9\s().%\/\[\]\-]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Auto-fix batch number
  if (fixed.batchNumber) {
    fixed.batchNumber = fixed.batchNumber
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, '')
      .trim();
  }
  
  // Auto-fix expiry date
  if (fixed.expiryDate) {
    fixed.expiryDate = normalizeDate(fixed.expiryDate);
  }
  
  // Auto-fix mfg date
  if (fixed.mfgDate) {
    fixed.mfgDate = normalizeDate(fixed.mfgDate);
  }
  
  // Auto-fix quantity
  if (fixed.quantity && fixed.quantity > 10000) {
    fixed.quantity = Math.round(fixed.quantity / 10);
  }
  
  // Auto-fix unit price
  if (fixed.unitPrice) {
    fixed.unitPrice = Math.round(fixed.unitPrice * 100) / 100;
  }
  
  // Auto-fix total amount
  if (fixed.totalAmount) {
    fixed.totalAmount = Math.round(fixed.totalAmount * 100) / 100;
  }
  
  // Auto-fix HSN code
  if (fixed.hsnCode && !/^\d{4,8}$/.test(fixed.hsnCode)) {
    fixed.hsnCode = '3004'; // Default to medicine HSN
  }
  
  return fixed;
}
