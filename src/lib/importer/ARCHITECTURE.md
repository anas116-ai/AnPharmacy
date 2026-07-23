# Data Import Studio — Enterprise Architecture

## Overview
The Data Import Studio is a professional-grade data import workspace for the AnPhacy Pharmacy Management System. It follows the **staging pattern**: no data is ever written directly to the stock database. All imports pass through a multi-step review, validation, and approval pipeline.

## Architecture Pattern: Pipeline + Staging

```
[File] → [Adapter Layer] → [Parser] → [Staging Area] → [Validation Engine] 
    → [AI Mapping] → [User Review] → [Preview] → [Commit] → [Database]
```

## Key Principles
1. **Never update DB directly** — All imports are staged in memory
2. **User controls the commit** — Nothing is saved until explicit approval
3. **Extensible adapter pattern** — New file types = new adapter
4. **AI-assisted but human-approved** — Suggestions are always reviewable
5. **Full audit trail** — Every import is tracked and reversible
6. **Draft auto-save** — Work is never lost
7. **Version snapshots** — Undo/Rollback supported

## Module Structure

```
src/lib/importer/
├── adapters/              # File format adapters
│   ├── ExcelAdapter.ts    # .xlsx, .xls
│   ├── CsvAdapter.ts      # .csv, .tsv
│   ├── PdfAdapter.ts      # PDF (OCR)
│   ├── ImageAdapter.ts    # Image (OCR)
│   ├── BarcodeAdapter.ts  # Barcode/QR
│   └── ApiAdapter.ts      # Future API
├── types.ts               # All type definitions
├── columnMapper.ts        # AI column mapping engine
├── validationEngine.ts    # Validation rules engine
├── aiLearningEngine.ts    # ML learning from corrections
├── importProfileStore.ts  # Profile CRUD + matching
├── schemaManager.ts       # Dynamic schema management
├── undoManager.ts         # Version snapshots + undo/redo
└── auditLogger.ts         # Import audit trail

src/stores/
├── importSessionStore.ts  # Central session state

src/components/
├── DataImportStudio.tsx   # Main import workspace
├── DataImportStudio/
│   ├── VirtualDataGrid.tsx    # High-perf data grid
│   ├── ImportHistoryView.tsx  # Past imports
│   └── DataGrid.css           # Grid styling
```

## File Format Adapters

Each adapter implements the `ImportSourceAdapter` interface:

```typescript
interface ImportSourceAdapter {
  source: ImportSource;
  label: string;
  icon: string;
  accept: string;
  canHandle(file: File): boolean;
  parse(file: File): Promise<ParsedData>;
}
```

### Currently Supported
- Excel (.xlsx, .xls) — SheetJS/xlsx library
- CSV (.csv) — Custom CSV parser
- TSV (.tsv) — Tab-delimited parser
- PDF (.pdf) — OCR via Tesseract.js
- Image (.jpg, .png, etc.) — OCR via Tesseract.js

### Future Support (Architecture Ready)
- Barcode/QR — barcode scanner input
- API — REST/SOAP endpoints
- Supplier ERP — Custom format adapters

## Workflow Steps

### Step 1: Select File
- Drag & drop or file picker
- File type detection
- Size validation
- Encoding detection

### Step 2: Parse File
- Adapter-based parsing
- Multi-sheet support
- Header detection
- Data type detection
- Sample preview

### Step 3: Column Mapping
- Auto-mapping via AI synonym matching
- Import profile matching
- Unknown column detection
- User can remap any column
- AI suggestions with confidence scores
- Unknown column actions: Add to Schema / Import Once / Ignore

### Step 4: Validation
- Required field checks
- Data type validation
- Duplicate detection (medicine, batch, barcode)
- Expiry date validation
- Negative quantity detection
- Batch number format validation

### Step 5: Review & Edit
- Virtual data grid with:
  - Inline editing
  - Row delete/restore
  - Column resize/reorder/freeze
  - Search & filter
  - Multi-sort
  - Copy/paste
  - Undo/redo

### Step 6: Preview & Commit
- Impact analysis
- Financial summary
- Batch change summary
- Final confirmation dialog
- Commit to stock or cancel

### Step 7: Post-Import
- Dashboard refresh
- Stock store update
- Expiry alert regeneration
- Audit trail logging
- AI learning update
- Import profile usage tracking

## State Management

### ImportSession (Zustand Store)
The central session holds all import state. Key fields:
- `status` — Pipeline stage (parsing → mapping → reviewing → previewing → committed)
- `sheets` — Raw parsed data (never directly persisted to DB)
- `columnMappings` — File column → Stock field mapping
- `aiSuggestions` — AI mapping suggestions
- `validationResults` — Per-row validation
- `editedRows` — User inline edits
- `deletedRowIndices` — Rows marked for deletion
- `commitSummary` — Preview of what will change

## Dynamic Schema Management

When unknown columns are found:
1. User decides action: Add to Schema / Import Once / Ignore
2. If "Add to Schema", the schemaManager:
   - Creates custom field definition
   - Generates unique key
   - Updates session schema
   - On commit, stores as JSON in medicine.custom_fields
3. Schema changes are tracked for future imports

## Undo/Redo System

- Every import creates a version snapshot
- Snapshot stores: prev medicines state, import params, timestamp
- Rollback restores the snapshot + logs to audit trail
- Undo/Redo works on individual edits within the grid
- 30-day retention for rollback capability

## Import Profiles

- Store reusable column mappings
- Auto-detect matching profiles by filename pattern
- Auto-detect matching profiles by supplier name
- Profile stores: source patterns, target fields, ignored columns, defaults
- Usage tracking for popular profiles

## Performance Design

- Virtual scrolling for 100K+ rows
- Chunked processing for large files
- Web Worker for parsing (when available)
- Debounced auto-save
- Memoized column/value computations
- Lazy loading of grid cells

## Testing Strategy

- Unit tests for validation engine
- Unit tests for column mapper
- Unit tests for AI learning engine
- Integration tests for full workflow
- Performance tests with large datasets
- Regression tests for all adapters