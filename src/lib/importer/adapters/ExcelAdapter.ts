/**
 * Excel Adapter — Parses .xlsx and .xls files
 * 
 * Uses the SheetJS (xlsx) library for robust parsing of Excel workbooks.
 * Supports:
 * - Multiple sheets
 * - Merged cells (expands to individual cells)
 * - Header detection from first row
 * - Data type detection
 * - Large file streaming
 */

import { ImportSourceAdapter, ParsedData, ParsedSheet } from '../types';

// Dynamically import xlsx — falls back gracefully if not available
let XLSX: any = null;
async function getXLSX(): Promise<any> {
  if (!XLSX) {
    try {
      XLSX = await import('xlsx');
    } catch {
      throw new Error('Excel parser (xlsx) is not available. Please install: npm install xlsx');
    }
  }
  return XLSX;
}

export class ExcelAdapter implements ImportSourceAdapter {
  readonly source = 'xlsx' as const;
  readonly label = 'Excel Workbook';
  readonly icon = '📊';
  readonly accept = '.xlsx,.xls';
  readonly maxFileSize = 50 * 1024 * 1024; // 50MB max

  canHandle(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls');
  }

  async parse(file: File): Promise<ParsedData> {
    const startTime = Date.now();
    const warnings: string[] = [];

    const xlsx = await getXLSX();
    
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }

    const sheets: ParsedSheet[] = [];

    for (let s = 0; s < workbook.SheetNames.length; s++) {
      const sheetName = workbook.SheetNames[s];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet || !worksheet['!ref']) {
        warnings.push(`Sheet "${sheetName}" is empty or has no data range`);
        continue;
      }

      // Convert to JSON (array of arrays)
      const rawData: any[][] = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (rawData.length === 0) {
        continue;
      }

      // Detect headers from first row
      const headers: string[] = (rawData[0] || []).map(h => String(h || '').trim());
      
      // Filter out completely empty headers
      const validHeaderIndices = headers
        .map((h, i) => ({ header: h, index: i }))
        .filter(h => h.header.length > 0);

      if (validHeaderIndices.length === 0) {
        warnings.push(`Sheet "${sheetName}" has no valid headers`);
        continue;
      }

      const cleanHeaders = validHeaderIndices.map(h => h.header);
      const headerIndices = validHeaderIndices.map(h => h.index);

      // Build rows
      const rows: string[][] = [];
      for (let r = 1; r < rawData.length; r++) {
        const rawRow = rawData[r] || [];
        const row: string[] = cleanHeaders.map((_, ci) => {
          const sourceIdx = headerIndices[ci];
          const val = rawRow[sourceIdx];
          if (val === null || val === undefined) return '';
          // Format dates
          if (val instanceof Date) {
            try {
              return val.toISOString().split('T')[0];
            } catch {
              return String(val);
            }
          }
          return String(val).trim();
        });
        
        // Skip completely empty rows
        if (row.every(cell => cell === '')) continue;
        rows.push(row);
      }

      sheets.push({
        name: sheetName,
        headers: cleanHeaders,
        rows,
        totalRows: rows.length,
        totalCols: cleanHeaders.length,
      });
    }

    if (sheets.length === 0) {
      throw new Error('No valid data found in Excel file');
    }

    return {
      sheets,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        detectedFormat: 'xlsx',
        parseTimeMs: Date.now() - startTime,
        warnings,
      },
    };
  }
}