import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { importFile as importFileLegacy } from '../fileImporter';
import { columnMapper } from './columnMapper';
import { normalizeColumnHeader } from './types';

function makeXlsx(headers: string[], rows: string[][]): File {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'supplier-stock.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function runStoreParseSteps(result: any): { headers: string[]; rows: string[][] } {
  const detectedHeaders: string[] = result.rows.length > 0
    ? Object.keys(result.rows[0]._rawRowData || {}).filter(k => k && typeof k === 'string' && k.trim().length > 0 && !k.startsWith('_'))
    : [];
  const headers = detectedHeaders;
  const rows: string[][] = result.rows.map((r: any) =>
    headers.map((h: string) => {
      const rawVal = (r._rawRowData || {})[h];
      return rawVal === undefined || rawVal === null ? '' : String(rawVal).trim();
    })
  );
  return { headers, rows };
}

describe('E2E: real xlsx -> parse -> map -> Validate table shows data', () => {
  it('mapped cells are never empty for a realistic supplier file', async () => {
    const headers = [
      'Medicine Name', 'Generic Name', 'Strength', 'Batch No', 'Mfg Date', 'Expiry Date',
      'HSN', 'GST%', 'MRP', 'PTR', 'Qty', 'Free Qty', 'Company', 'Rack', 'Supplier GSTIN', 'Notes',
    ];
    const rows = [
      ['Paracetamol 500', 'Paracetamol', '500mg', 'BTX2410', '2024-01-10', '2027-01-09', '3004', '12', '25.00', '18.50', '100', '5', 'Cipla Ltd', 'A1', '27AABCC1234F1Z5', 'Top shelf'],
      ['Amoxicillin 250', 'Amoxicillin', '250mg', 'AMX9912', '2024-02-01', '2026-12-31', '3004', '12', '45.50', '33.75', '50', '0', 'GSK Pharma', 'B2', '24AABCC5678H1Z9', ''],
    ];
    const file = makeXlsx(headers, rows);
    const result = await importFileLegacy(file);

    expect(result.success).toBe(true);
    const { headers: sheetHeaders, rows: sheetRows } = runStoreParseSteps(result);
    expect(sheetHeaders).toEqual(headers);
    expect(sheetRows).toHaveLength(2);

    const mappingResult = columnMapper.mapHeaders(sheetHeaders, sheetRows, null);

    // Every sourceColumn must resolve
    for (const m of mappingResult.mappings) {
      expect(sheetHeaders.indexOf(m.sourceColumn), `"${m.sourceColumn}" not in headers`).toBeGreaterThanOrEqual(0);
    }

    // Validate-table logic
    const vCols = mappingResult.mappings.filter(m => m.isMapped && !m.isHidden);
    const table = sheetRows.map(row => vCols.map(m => row[sheetHeaders.indexOf(m.sourceColumn)] ?? ''));
    expect(table[0].some(c => c !== '')).toBe(true);
    expect(table[0]).toContain('Paracetamol 500');
    expect(table[0]).toContain('BTX2410');
    expect(table[0]).toContain('100');

    // Review-grid logic
    const allRows = sheetRows.map(row => {
      const obj: Record<string, any> = {};
      sheetHeaders.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });
    for (const m of mappingResult.mappings) {
      expect(allRows[0][m.sourceColumn], `Review cell for "${m.sourceColumn}"`).not.toBeUndefined();
    }
    expect(allRows[0]['Medicine Name']).toBe('Paracetamol 500');
  });

  it('headers survive round-trip even with an empty header column present', async () => {
    const headers = ['Medicine', '', 'Qty', 'MRP', 'Batch No'];
    const rows = [
      ['Paracetamol 500', '', '10', '25.00', 'BT001'],
      ['Amoxicillin 250', '', '5', '45.50', 'BT002'],
    ];
    const file = makeXlsx(headers, rows);
    const result = await importFileLegacy(file);
    const { headers: sh, rows: sr } = runStoreParseSteps(result);
    // Legacy importer drops empty headers (both in _rawRowData and detectedHeaders)
    expect(sh).not.toContain('');
    expect(sr[0]).toContain('10');
    expect(sr[0]).toContain('BT001');
  });

  it('normalizeColumnHeader does not alter exact-match lookup keys', () => {
    expect(normalizeColumnHeader('Medicine Name')).toBe('medicine name');
    expect(normalizeColumnHeader('MRP')).toBe('mrp');
  });
});
