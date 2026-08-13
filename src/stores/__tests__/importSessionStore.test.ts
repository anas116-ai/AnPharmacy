import { describe, it, expect, beforeEach } from 'vitest';
import { useImportSessionStore } from '../importSessionStore';
import { useStockStore } from '../stockStore';
import type { ImportSession } from '../../lib/importer/types';

function makeSession(): ImportSession {
  return {
    id: 'test-session',
    status: 'previewing',
    fileName: 'test.xlsx',
    fileSize: 100,
    source: 'xlsx',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sheets: [{
      name: 'Sheet1',
      headers: ['Medicine Name', 'Batch No', 'Qty', 'MRP', 'Purchase Rate'],
      rows: [
        ['Paracetamol 500', 'BT-001', '10', '25.00', '18.50'],
        ['Amoxicillin 250', 'BT-002', '5', '45.50', '33.75'],
      ],
      totalRows: 2,
      totalCols: 5,
    }],
    activeSheetIndex: 0,
    columnMappings: [
      { sourceColumn: 'Medicine Name', targetField: 'name', displayLabel: 'Medicine Name', dataType: 'text', sampleValues: [], isMapped: true, isProtected: true, isHidden: false, width: 120, order: 0, confidence: 100, suggestedBy: 'ai' },
      { sourceColumn: 'Batch No', targetField: 'batch_number', displayLabel: 'Batch No', dataType: 'text', sampleValues: [], isMapped: true, isProtected: true, isHidden: false, width: 100, order: 1, confidence: 100, suggestedBy: 'ai' },
      { sourceColumn: 'Qty', targetField: 'quantity', displayLabel: 'Qty', dataType: 'number', sampleValues: [], isMapped: true, isProtected: true, isHidden: false, width: 80, order: 2, confidence: 100, suggestedBy: 'ai' },
      { sourceColumn: 'MRP', targetField: 'mrp', displayLabel: 'MRP', dataType: 'currency', sampleValues: [], isMapped: true, isProtected: true, isHidden: false, width: 80, order: 3, confidence: 100, suggestedBy: 'ai' },
      { sourceColumn: 'Purchase Rate', targetField: 'purchase_price', displayLabel: 'Purchase Rate', dataType: 'currency', sampleValues: [], isMapped: true, isProtected: true, isHidden: false, width: 100, order: 4, confidence: 100, suggestedBy: 'ai' },
    ],
    unknownColumns: [],
    aiSuggestions: [],
    validationResults: [
      { rowIndex: 0, status: 'valid', fieldErrors: [], globalErrors: [], globalWarnings: [], duplicateInfo: null },
      { rowIndex: 1, status: 'valid', fieldErrors: [], globalErrors: [], globalWarnings: [], duplicateInfo: null },
    ],
    editedRows: {},
    deletedRowIndices: new Set(),
    addedRows: [],
    commitSummary: {
      rowsAdded: 2, rowsUpdated: 0, rowsDeleted: 0, rowsIgnored: 0, rowsInvalid: 0,
      columnsAdded: 0, columnsRenamed: 0, columnsIgnored: 0,
      warnings: [], errors: [], inventoryValueChange: 0, stockCountChange: 0, batchCountChange: 2,
      previewItems: [],
    },
    committedAt: null,
    profileId: null,
    draftSavedAt: null,
  };
}

describe('commitToStock', () => {
  beforeEach(() => {
    localStorage.clear();
    useStockStore.setState({ medicines: [], dashboardStats: null, isLoading: false, error: null });
    // Browser fallback path (no window.electronAPI in jsdom)
  });

  it('persists imported rows into the stock store (parseNumeric works)', async () => {
    useImportSessionStore.setState({
      session: makeSession(),
      activeStep: 'commit',
      isProcessing: false,
      processingMessage: '',
      error: null,
    });

    await useImportSessionStore.getState().commitToStock();

    // Commit must not error
    expect(useImportSessionStore.getState().error).toBeNull();

    const meds = useStockStore.getState().medicines;
    expect(meds).toHaveLength(2);
    expect(meds[0].name).toBe('Paracetamol 500');
    expect(meds[0].batch_number).toBe('BT-001');
    expect(meds[0].quantity).toBe(10);
    expect(meds[0].mrp).toBe(25);
    expect(meds[0].purchase_price).toBe(18.5);
    expect(meds[1].name).toBe('Amoxicillin 250');

    // Session moves to complete
    expect(useImportSessionStore.getState().activeStep).toBe('complete');
    expect(useImportSessionStore.getState().session?.status).toBe('committed');
  });

  it('handles currency symbols and commas in numeric fields', async () => {
    const s = makeSession();
    s.sheets[0].rows = [['Paracetamol', 'BT-001', '10,000', '₹25.00', '18.50%']];
    useImportSessionStore.setState({ session: s, activeStep: 'commit', error: null });

    await useImportSessionStore.getState().commitToStock();

    expect(useImportSessionStore.getState().error).toBeNull();
    const med = useStockStore.getState().medicines[0];
    expect(med.quantity).toBe(10000);
    expect(med.mrp).toBe(25);
    expect(med.purchase_price).toBe(18.5);
  });

  it('works through the Electron IPC path (window.electronAPI present)', async () => {
    const saved: any[] = [];
    const electronAPI = {
      saveAllStock: async ({ medicines }: { medicines: any[] }) => { saved.push(...medicines); return { success: true, count: medicines.length }; },
      listStock: async () => ({ success: true, medicines: saved }),
      getDashboardStats: async () => ({ success: true, stats: null }),
      createPurchase: async () => ({ success: true }),
    };
    (window as any).electronAPI = electronAPI;

    useImportSessionStore.setState({
      session: makeSession(),
      activeStep: 'commit',
      error: null,
    });

    await useImportSessionStore.getState().commitToStock();

    expect(useImportSessionStore.getState().error).toBeNull();
    expect(saved).toHaveLength(2);
    expect(saved[0].name).toBe('Paracetamol 500');
    expect(saved[0].quantity).toBe(10);
    expect(useStockStore.getState().medicines).toHaveLength(2);
    expect(useImportSessionStore.getState().activeStep).toBe('complete');
  });
});
