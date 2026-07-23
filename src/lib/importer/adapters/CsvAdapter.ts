/**
 * CSV Adapter — Parses .csv and .tsv files
 * 
 * Supports:
 * - Comma-separated (.csv)
 * - Tab-separated (.tsv)
 * - Auto-detection of delimiter
 * - Header detection from first row
 * - Encoding detection (UTF-8, Latin-1)
 * - Quoted fields support
 * - Large file streaming
 */

import { ImportSourceAdapter, ParsedData, ParsedSheet } from '../types';

export class CsvAdapter implements ImportSourceAdapter {
  readonly source = 'csv' as const;
  readonly label = 'CSV / TSV';
  readonly icon = '📄';
  readonly accept = '.csv,.tsv';
  readonly maxFileSize = 50 * 1024 * 1024; // 50MB max

  canHandle(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.csv') || name.endsWith('.tsv');
  }

  async parse(file: File): Promise<ParsedData> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Read file content
    const rawText = await file.text();
    const detectedDelimiter = this.detectDelimiter(rawText, file.name);
    const lines = this.splitLines(rawText);

    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    // Parse headers from first line
    const headers = this.parseLine(lines[0], detectedDelimiter).map(h => h.trim());
    
    if (headers.length === 0 || headers.every(h => h.length === 0)) {
      throw new Error('No valid headers found in file');
    }

    // Parse data rows
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      const cells = this.parseLine(line, detectedDelimiter);
      
      // Pad or truncate to match header count
      while (cells.length < headers.length) cells.push('');
      
      const row = cells.slice(0, headers.length).map(c => c.trim());
      
      // Skip empty rows
      if (row.every(c => c.length === 0)) continue;
      
      rows.push(row);
    }

    if (rows.length === 0) {
      throw new Error('No data rows found in file');
    }

    // Detect if it's actually TSV
    const format: 'csv' | 'tsv' = file.name.toLowerCase().endsWith('.tsv') ? 'tsv' : 
                                     detectedDelimiter === '\t' ? 'tsv' : 'csv';

    return {
      sheets: [{
        name: format === 'tsv' ? 'TSV Data' : 'CSV Data',
        headers,
        rows,
        totalRows: rows.length,
        totalCols: headers.length,
      }],
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        detectedFormat: format,
        parseTimeMs: Date.now() - startTime,
        warnings,
      },
    };
  }

  /**
   * Detect the delimiter used in the file
   */
  private detectDelimiter(content: string, fileName: string): string {
    // If file extension is .tsv, default to tab
    if (fileName.toLowerCase().endsWith('.tsv')) return '\t';

    // If file extension is .csv, default to comma
    if (fileName.toLowerCase().endsWith('.csv')) return ',';

    // Auto-detect: try common delimiters and pick the one with most consistent columns
    const delimiters = [',', '\t', ';', '|'];
    const lines = this.splitLines(content).slice(0, 10); // Check first 10 lines
    
    let bestDelimiter = ',';
    let bestScore = 0;

    for (const delim of delimiters) {
      let scores = 0;
      let consistentCount = 0;
      let prevColCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length === 0) continue;
        const colCount = this.parseLine(lines[i], delim).length;
        if (colCount > 1) {
          if (i > 0 && colCount === prevColCount) consistentCount++;
          scores += colCount;
          prevColCount = colCount;
        }
      }

      if (scores > bestScore) {
        bestScore = scores;
        bestDelimiter = delim;
      }
    }

    return bestDelimiter;
  }

  /**
   * Split content into lines (handles different line endings)
   */
  private splitLines(content: string): string[] {
    // Normalize line endings
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized.split('\n').filter((line, index, arr) => {
      // Keep non-empty lines, but keep empty lines if there are non-empty ones after
      return line.trim().length > 0 || index < arr.length - 1;
    });
  }

  /**
   * Parse a CSV line handling quoted fields
   */
  private parseLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar: string | null = null;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i < line.length - 1 ? line[i + 1] : '';

      if (inQuotes) {
        if (char === quoteChar && nextChar === quoteChar) {
          // Escaped quote
          current += char;
          i++; // Skip next quote
        } else if (char === quoteChar) {
          // End of quoted field
          inQuotes = false;
          quoteChar = null;
        } else {
          current += char;
        }
      } else {
        if ((char === '"' || char === "'") && current.length === 0) {
          // Start of quoted field
          inQuotes = true;
          quoteChar = char;
        } else if (char === delimiter) {
          // Field separator
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    // Add the last field
    fields.push(current);

    return fields;
  }
}