export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: any) => boolean;
  customMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateField = (value: any, rules: ValidationRule): ValidationResult => {
  // Required check
  if (rules.required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'This field is required' };
  }

  // Skip further validation if empty and not required
  if (!value || value === '' || value === null || value === undefined) {
    return { isValid: true };
  }

  // String validations
  const strValue = String(value);
  
  if (rules.minLength && strValue.length < rules.minLength) {
    return { isValid: false, error: `Minimum ${rules.minLength} characters required` };
  }

  if (rules.maxLength && strValue.length > rules.maxLength) {
    return { isValid: false, error: `Maximum ${rules.maxLength} characters allowed` };
  }

  // Number validations
  const numValue = Number(value);
  if (!isNaN(numValue)) {
    if (rules.min !== undefined && numValue < rules.min) {
      return { isValid: false, error: `Minimum value is ${rules.min}` };
    }
    if (rules.max !== undefined && numValue > rules.max) {
      return { isValid: false, error: `Maximum value is ${rules.max}` };
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(strValue)) {
    return { isValid: false, error: rules.patternMessage || 'Invalid format' };
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    return { isValid: false, error: rules.customMessage || 'Invalid value' };
  }

  return { isValid: true };
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return /^[0-9]{10}$/.test(phone);
};

export const validateBatchNumber = (batch: string): boolean => {
  return /^[A-Z0-9-]+$/i.test(batch);
};

export const validateGSTIN = (gstin: string): boolean => {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
};

export const validatePrice = (price: number): boolean => {
  return price >= 0 && price <= 1000000;
};

export const validateQuantity = (quantity: number): boolean => {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 100000;
};

export const validateExpiryDate = (date: string): boolean => {
  if (!date) return true;
  const expiry = new Date(date);
  const now = new Date();
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 50);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 50);
  return expiry >= minDate && expiry <= maxDate;
};

export const validateManufacturingDate = (date: string): boolean => {
  if (!date) return true;
  const mfg = new Date(date);
  const now = new Date();
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 50);
  return mfg <= now && mfg >= minDate;
};

export const validateMedicineName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 100 && /^[a-zA-Z0-9\s\-\.]+$/.test(name);
};

export const validateCompanyName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 100;
};

export const validateCustomerName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};

export const validateUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 50;
};

export const validateDisplayName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};

export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDateRange = (startDate: string, endDate: string): boolean => {
  if (!startDate || !endDate) return true;
  return new Date(startDate) <= new Date(endDate);
};

export const validatePercentage = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

export const validateDiscount = (discount: number): boolean => {
  return discount >= 0 && discount <= 100;
};

export const validateTax = (tax: number): boolean => {
  return tax >= 0 && tax <= 100;
};

export const validateStockBalance = (quantity: number, sold: number): boolean => {
  return quantity >= sold;
};

export const validateBatchExpiry = (mfgDate: string, expiryDate: string): boolean => {
  if (!mfgDate || !expiryDate) return true;
  return new Date(mfgDate) < new Date(expiryDate);
};

export const validateDuplicateBatch = (batch: string, existingBatches: string[]): boolean => {
  return !existingBatches.some(b => b.toLowerCase() === batch.toLowerCase());
};

export const validateISO8601 = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export const validateCurrencyAmount = (amount: number): boolean => {
  return amount >= 0 && amount <= 999999999.99;
};

const DATE_FORMAT_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export const validateDDMMYYYY = (value: string): boolean => {
  const match = DATE_FORMAT_REGEX.test(value);
  if (!match) return false;
  
  const [, day, month, year] = value.match(DATE_FORMAT_REGEX)!;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  if (monthNum < 1 || monthNum > 12) return false;
  if (dayNum < 1 || dayNum > 31) return false;
  
  const date = new Date(yearNum, monthNum - 1, dayNum);
  const d = date.getMonth();
  const d2 = date.getDate();
  return d === monthNum - 1 && d2 === dayNum;
};

function isValidISODate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
