/**
 * Pipeline Test Harness - Runs sample invoices through the full 13-stage pipeline
 * and reports field-level accuracy metrics for benchmarking.
 * 
 * Sample invoices represent real pharmacy invoice formats from different suppliers.
 */

import { pipelineOrchestrator } from './pipelineOrchestrator';
import type { ProcessingResult, ValidatedItem } from './documentModel';

// ═══════════════════════════════════════════════════════════════════
// SAMPLE INVOICE TEXTS
// ═══════════════════════════════════════════════════════════════════

export interface SampleInvoice {
  id: string;
  supplier: string;
  text: string;
  expected: {
    itemCount: number;
    totalAmount?: number;
  };
  description: string;
}

/**
 * Sample Invoice 1: Standard pharmacy invoice with all columns
 * Supplier: ABC Pharma - uses 'Medicine', 'Batch', 'Expiry', 'Qty', 'Rate', 'Amount' headers
 */
const SAMPLE_INVOICE_1: SampleInvoice = {
  id: 'abc-pharma-standard',
  supplier: 'ABC Pharma',
  description: 'Standard layout with all major columns',
  text: `ABC Pharma Pvt Ltd
Mumbai, Maharashtra | GSTIN: 27AABCU1234D1Z1
Invoice No: INV-2024-0891 | Date: 15/01/2024

S.No  Medicine                Batch       Expiry     Qty  Rate     Amount
1     Paracetamol 500mg Tab   BATCH-A01   12/2026    10   18.50    185.00
2     Amoxicillin 250mg Cap   AMX-784     08/2027    15   65.00    975.00
3     Cetirizine 10mg Tab     CET-21      04/2027    30   18.00    540.00
4     Omeprazole 20mg Cap     OME-455     11/2027    20   38.00    760.00
5     Ibuprofen 400mg Tab     IBU-332     09/2026    25   24.00    600.00
6     Vitamin C 500mg Tab     VIT-678     06/2028    10   95.00    950.00
7     Cough Syrup 100ml       COU-109     02/2029     5  110.00    550.00
8     Antacid Gel 200ml       ANT-881     01/2029     8   72.00    576.00

Total Items: 8 | Total Qty: 123
Sub Total: 5,136.00
CGST @ 9%: 462.24
SGST @ 9%: 462.24
Grand Total: 6,060.48`,
  expected: { itemCount: 8, totalAmount: 6060.48 },
};

/**
 * Sample Invoice 2: Compact format with minimal columns
 * Supplier: XYZ Labs - uses 'Product', 'Batch', 'Qty', 'Rate' (no Expiry column explicitly)
 */
const SAMPLE_INVOICE_2: SampleInvoice = {
  id: 'xyz-labs-compact',
  supplier: 'XYZ Labs',
  description: 'Compact format with fewer columns, Expiry embedded in description',
  text: `XYZ LABS LIMITED
Hyderabad, Telangana
Bill No: BL-2024-334 | Date: 05-02-2024

Product                   Batch      Qty  Rate   Amount
Azithromycin 500mg 3s     AZT-567    50   90.00  4,500.00
Metformin 500mg 10s       MET-890   100   14.00  1,400.00
Amlodipine 5mg 10s        AML-234    75   32.00  2,400.00
Pantoprazole 40mg 10s     PAN-456    60   45.00  2,700.00
Atorvastatin 10mg 10s     ATO-789    40   55.00  2,200.00

Total Qty: 325
Net Amount: 13,200.00
GST @ 12%: 1,584.00
Grand Total: 14,784.00`,
  expected: { itemCount: 5, totalAmount: 14784.00 },
};

/**
 * Sample Invoice 3: Extended format with HSN, GST, Manufacturer columns
 * Supplier: MediCorp - full header detail
 */
const SAMPLE_INVOICE_3: SampleInvoice = {
  id: 'medicorp-extended',
  supplier: 'MediCorp',
  description: 'Extended layout with HSN, GST%, Manufacturer, and batch details',
  text: `MEDICORP DISTRIBUTORS PVT LTD
Bangalore, Karnataka | GST: 29MEDC9012F1Z1
Invoice: MC/24-25/887 | Date: 20-03-2024

SNo  Product Name           HSN Code   Batch     Expiry   Mfg      Qty  Price   GST%  Amount
1    Paracetamol 650mg Tab  30049011   PCM-902   08/2027  01/2024  100  22.00   12    2,200.00
2    Cefixime 200mg Tab     30049022   CFX-456   12/2027  03/2024   50  185.00  12    9,250.00
3    Montelukast 10mg Tab   30049033   MON-789   10/2028  02/2024   30  95.00   12    2,850.00
4    Prednisolone 5mg Tab   30049044   PRD-321   09/2027  01/2024   25  35.00   12      875.00
5    Salbutamol 100mcg Inh  30049055   SAL-654   11/2027  04/2024   10  295.00  12    2,950.00

Total Items: 5
Taxable Value: 18,125.00
CGST 6%: 1,087.50
SGST 6%: 1,087.50
Total Invoice: 20,300.00`,
  expected: { itemCount: 5, totalAmount: 20300.00 },
};

export const SAMPLE_INVOICES: SampleInvoice[] = [
  SAMPLE_INVOICE_1,
  SAMPLE_INVOICE_2,
  SAMPLE_INVOICE_3,
];

// ═══════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════

export interface FieldAccuracyMetrics {
  field: string;
  expectedCount: number;
  extractedCount: number;
  accuracy: number; // 0-100
  itemsWithField: number;
}

export interface PipelineTestResult {
  invoiceId: string;
  supplier: string;
  description: string;
  success: boolean;
  stagesCompleted: string[];
  itemCount: number;
  expectedItemCount: number;
  itemAccuracy: number;
  overallConfidence: number;
  processingTimeMs: number;
  status: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  metrics: FieldAccuracyMetrics[];
  itemDetails: Array<{
    medicineName: string;
    batchNumber: string;
    confidence: number;
    isUsable: boolean;
    matchType: string;
  }>;
}

export interface TestSuiteResult {
  invoices: PipelineTestResult[];
  summary: {
    totalInvoices: number;
    passed: number;
    failed: number;
    averageConfidence: number;
    averageItemAccuracy: number;
    totalProcessingTimeMs: number;
    totalItemsExtracted: number;
    totalItemsExpected: number;
  };
}

/**
 * Run a single sample invoice through the full pipeline
 */
export async function runSampleInvoice(
  sample: SampleInvoice
): Promise<PipelineTestResult> {
  const startTime = Date.now();

  try {
    const result: ProcessingResult = await pipelineOrchestrator.execute(
      {
        rawText: sample.text,
        existingMedicines: [],
      },
      (event) => {
        // Progress tracking - silent in test mode
      }
    );

    const processingTime = Date.now() - startTime;

    // Calculate item accuracy
    const actualCount = result.items.length;
    const expectedCount = sample.expected.itemCount;
    const itemAccuracy = expectedCount > 0
      ? Math.round((Math.min(actualCount, expectedCount) / Math.max(actualCount, expectedCount)) * 100)
      : 0;

    // Calculate field-level metrics
    const metrics: FieldAccuracyMetrics[] = computeFieldMetrics(result.items, sample);

    return {
      invoiceId: sample.id,
      supplier: sample.supplier,
      description: sample.description,
      success: result.status !== 'failed',
      stagesCompleted: result.stagesCompleted.map(s => s.toString()),
      itemCount: actualCount,
      expectedItemCount: expectedCount,
      itemAccuracy,
      overallConfidence: result.overallConfidence,
      processingTimeMs: processingTime,
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      metrics,
      itemDetails: result.items.map(item => ({
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        confidence: item.overallConfidence,
        isUsable: item.isUsable,
        matchType: item.matchType,
      })),
    };
  } catch (error) {
    return {
      invoiceId: sample.id,
      supplier: sample.supplier,
      description: sample.description,
      success: false,
      stagesCompleted: [],
      itemCount: 0,
      expectedItemCount: sample.expected.itemCount,
      itemAccuracy: 0,
      overallConfidence: 0,
      processingTimeMs: Date.now() - startTime,
      status: 'failed',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
      suggestions: [],
      metrics: [],
      itemDetails: [],
    };
  }
}

/**
 * Run all sample invoices through the pipeline
 */
export async function runFullTestSuite(): Promise<TestSuiteResult> {
  const results: PipelineTestResult[] = [];
  let totalTime = 0;
  let totalExtracted = 0;
  let totalExpected = 0;

  for (const sample of SAMPLE_INVOICES) {
    const result = await runSampleInvoice(sample);
    results.push(result);
    totalTime += result.processingTimeMs;
    totalExtracted += result.itemCount;
    totalExpected += result.expectedItemCount;
  }

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    invoices: results,
    summary: {
      totalInvoices: results.length,
      passed,
      failed,
      averageConfidence: results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.overallConfidence, 0) / results.length)
        : 0,
      averageItemAccuracy: results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.itemAccuracy, 0) / results.length)
        : 0,
      totalProcessingTimeMs: totalTime,
      totalItemsExtracted: totalExtracted,
      totalItemsExpected: totalExpected,
    },
  };
}

/**
 * Compute field-level accuracy metrics
 */
function computeFieldMetrics(
  items: ValidatedItem[],
  sample: SampleInvoice
): FieldAccuracyMetrics[] {
  const criticalFields = [
    { field: 'Medicine Name', key: 'medicineName' as keyof ValidatedItem },
    { field: 'Batch Number', key: 'batchNumber' as keyof ValidatedItem },
    { field: 'Quantity', key: 'quantity' as keyof ValidatedItem },
    { field: 'Expiry Date', key: 'expiryDate' as keyof ValidatedItem },
    { field: 'Unit Price', key: 'unitPrice' as keyof ValidatedItem },
    { field: 'HSN Code', key: 'hsnCode' as keyof ValidatedItem },
    { field: 'GST Rate', key: 'gstRate' as keyof ValidatedItem },
  ];

  return criticalFields.map(({ field, key }) => {
    const itemsWithField = items.filter(item => {
      const val = item[key];
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'number') return val > 0;
      return false;
    }).length;

    const expectedCount = sample.expected.itemCount;
    const accuracy = expectedCount > 0
      ? Math.round((itemsWithField / expectedCount) * 100)
      : 0;

    return {
      field,
      expectedCount,
      extractedCount: itemsWithField,
      accuracy: Math.min(accuracy, 100),
      itemsWithField,
    };
  });
}

/**
 * Generate a human-readable test report
 */
export function generateTestReport(results: TestSuiteResult): string {
  const lines: string[] = [];
  const s = results.summary;

  lines.push('═'.repeat(60));
  lines.push('  PIPELINE TEST SUITE REPORT');
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(`  Date: ${new Date().toLocaleString()}`);
  lines.push(`  Total Invoices: ${s.totalInvoices}`);
  lines.push(`  Passed: ${s.passed} | Failed: ${s.failed}`);
  lines.push(`  Avg Confidence: ${s.averageConfidence}%`);
  lines.push(`  Avg Item Accuracy: ${s.averageItemAccuracy}%`);
  lines.push(`  Items: ${s.totalItemsExtracted}/${s.totalItemsExpected} extracted`);
  lines.push(`  Total Time: ${(s.totalProcessingTimeMs / 1000).toFixed(2)}s`);
  lines.push('');

  for (const invoice of results.invoices) {
    lines.push('─'.repeat(50));
    lines.push(`  ${invoice.supplier}: ${invoice.description}`);
    lines.push(`  Status: ${invoice.success ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`  Items: ${invoice.itemCount}/${invoice.expectedItemCount}`);
    lines.push(`  Confidence: ${invoice.overallConfidence}%`);
    lines.push(`  Time: ${(invoice.processingTimeMs / 1000).toFixed(2)}s`);
    lines.push(`  Stages: ${invoice.stagesCompleted.length}/13`);

    if (invoice.metrics.length > 0) {
      lines.push(`  Field Accuracy:`);
      for (const m of invoice.metrics) {
        const bar = '█'.repeat(Math.round(m.accuracy / 10));
        lines.push(`    ${m.field.padEnd(16)} ${m.accuracy.toString().padStart(3)}% ${bar}`);
      }
    }

    if (invoice.warnings.length > 0) {
      lines.push(`  Warnings:`);
      for (const w of invoice.warnings.slice(0, 3)) {
        lines.push(`    ⚠ ${w}`);
      }
    }

    if (invoice.errors.length > 0) {
      lines.push(`  Errors:`);
      for (const e of invoice.errors) {
        lines.push(`    ✗ ${e}`);
      }
    }
    lines.push('');
  }

  lines.push('═'.repeat(60));
  lines.push('  END OF REPORT');
  lines.push('═'.repeat(60));

  return lines.join('\n');
}
