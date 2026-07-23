/**
 * File Format Adapters — Registry
 * 
 * Central registry for all import source adapters.
 * Each adapter implements the ImportSourceAdapter interface and handles
 * a specific file format (Excel, CSV, PDF, Image, Barcode, etc.)
 * 
 * To add a new format:
 * 1. Create a new adapter file (e.g., ExcelAdapter.ts)
 * 2. Implement the ImportSourceAdapter interface
 * 3. Register it in the ADAPTERS array below
 * 
 * No changes to the core import workflow are needed.
 */

import { ImportSourceAdapter, ParsedData, ImportSource } from '../types';
import { ExcelAdapter } from './ExcelAdapter.ts';
import { CsvAdapter } from './CsvAdapter.ts';
import { PdfAdapter } from './PdfAdapter.ts';
import { ImageAdapter } from './ImageAdapter.ts';

// ═════════════════════════════════════════════════════════════════════
// ADAPTER REGISTRY
// ═════════════════════════════════════════════════════════════════════

const ADAPTERS: ImportSourceAdapter[] = [
  new ExcelAdapter(),
  new CsvAdapter(),
  new PdfAdapter(),
  new ImageAdapter(),
];

// Future adapters (to be implemented):
// import { BarcodeAdapter } from './BarcodeAdapter';
// import { ApiAdapter } from './ApiAdapter';
// ADAPTERS.push(new BarcodeAdapter());
// ADAPTERS.push(new ApiAdapter());

// ═════════════════════════════════════════════════════════════════════
// ADAPTER REGISTRY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

/**
 * Find the appropriate adapter for a given file
 */
export function findAdapter(file: File): ImportSourceAdapter | undefined {
  return ADAPTERS.find(adapter => adapter.canHandle(file));
}

/**
 * Get all registered adapters
 */
export function getAdapters(): ImportSourceAdapter[] {
  return [...ADAPTERS];
}

/**
 * Get adapters for a specific source type
 */
export function getAdaptersBySource(source: ImportSource): ImportSourceAdapter[] {
  return ADAPTERS.filter(a => a.source === source);
}

/**
 * Get supported file accept string (for file input accept attribute)
 */
export function getAcceptedFileTypes(): string {
  return ADAPTERS.map(a => a.accept).join(',');
}

/**
 * Parse a file using the appropriate adapter
 */
export async function parseWithAdapter(file: File): Promise<ParsedData> {
  const adapter = findAdapter(file);
  if (!adapter) {
    throw new Error(`Unsupported file format: ${file.name}. Accepted formats: ${getAcceptedFileTypes()}`);
  }
  return adapter.parse(file);
}

export default ADAPTERS;