export interface CSVColumn {
  key: string;
  label: string;
  required?: boolean;
  transform?: (value: string) => any;
}

export interface ParsedCSVRow {
  [key: string]: any;
  _rowNumber: number;
  _errors: string[];
}

export interface CSVParsingResult {
  success: boolean;
  data?: ParsedCSVRow[];
  errors: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export const parseCSV = (csvText: string, columns: CSVColumn[]): CSVParsingResult => {
  const errors: string[] = [];
  const rows: ParsedCSVRow[] = [];
  let validRows = 0;
  let invalidRows = 0;

  try {
    // Split into lines and remove empty lines
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        errors: ['CSV file is empty'],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      };
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    // Map headers to columns
    const columnMap = new Map<string, CSVColumn>();
    columns.forEach(col => {
      columnMap.set(col.label.toLowerCase(), col);
    });

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: ParsedCSVRow = {
        _rowNumber: i + 1,
        _errors: [],
      };

      // Map values to columns
      columns.forEach((col, index) => {
        const value = values[index] || '';
        const transformedValue = col.transform ? col.transform(value) : value;
        row[col.key] = transformedValue;
      });

      // Validate required fields
      const rowErrors: string[] = [];
      columns.forEach(col => {
        if (col.required && (!row[col.key] || row[col.key] === '')) {
          rowErrors.push(`${col.label} is required`);
        }
      });

      row._errors = rowErrors;
      
      if (rowErrors.length > 0) {
        invalidRows++;
        errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
      } else {
        validRows++;
      }

      rows.push(row);
    }

    return {
      success: invalidRows === 0,
      data: rows,
      errors,
      totalRows: lines.length - 1,
      validRows,
      invalidRows,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

export const generateMedicinesCSVTemplate = (): string => {
  const headers = [
    'Medicine Name',
    'Batch Number',
    'Company',
    'Quantity',
    'Purchase Price',
    'Selling Price',
    'Manufacturing Date (YYYY-MM-DD)',
    'Expiry Date (YYYY-MM-DD)',
  ];

  const sampleRow = [
    'Paracetamol 500mg',
    'BATCH001',
    'ABC Pharma',
    '500',
    '2.50',
    '5.00',
    '2024-01-15',
    '2026-01-15',
  ];

  const csvContent = [
    headers.join(','),
    sampleRow.join(','),
  ].join('\n');

  return csvContent;
};

export const validateMedicineRow = (row: ParsedCSVRow): string[] => {
  const errors: string[] = [];

  // Medicine name
  if (!row['name'] || row['name'].length < 2) {
    errors.push('Medicine name must be at least 2 characters');
  }

  // Batch number
  if (!row['batchNumber'] || row['batchNumber'].length < 2) {
    errors.push('Batch number must be at least 2 characters');
  }

  // Quantity
  const qty = row['quantity'];
  if (qty === undefined || qty === null || qty === '' || Number(qty) <= 0) {
    errors.push('Quantity must be a positive number');
  }

  // Purchase price
  if (row['purchasePrice'] !== undefined && row['purchasePrice'] !== '') {
    const price = Number(row['purchasePrice']);
    if (isNaN(price) || price < 0) {
      errors.push('Purchase price must be a valid non-negative number');
    }
  }

  // Selling price
  if (row['sellingPrice'] !== undefined && row['sellingPrice'] !== '') {
    const price = Number(row['sellingPrice']);
    if (isNaN(price) || price < 0) {
      errors.push('Selling price must be a valid non-negative number');
    }
  }

  // Manufacturing date
  if (row['mfgDate'] && !isValidDate(row['mfgDate'])) {
    errors.push('Manufacturing date must be in YYYY-MM-DD format');
  }

  // Expiry date
  if (row['expiryDate'] && !isValidDate(row['expiryDate'])) {
    errors.push('Expiry date must be in YYYY-MM-DD format');
  }

  // Date relationship
  if (row['mfgDate'] && row['expiryDate'] && isValidDate(row['mfgDate']) && isValidDate(row['expiryDate'])) {
    const mfg = new Date(row['mfgDate']);
    const exp = new Date(row['expiryDate']);
    if (mfg >= exp) {
      errors.push('Expiry date must be after manufacturing date');
    }
  }

  return errors;
};

const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export const downloadCSVTemplate = () => {
  const template = generateMedicinesCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medicines_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
  const headers = columns.map(col => col.label);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        // Escape quotes and wrap in quotes if contains comma
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};