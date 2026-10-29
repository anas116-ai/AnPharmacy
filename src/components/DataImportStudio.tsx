/**
 * Data Import Studio Ã¢â‚¬â€ Main Component
 * 
 * Enterprise-grade import workspace. No stock updates happen until
 * the user explicitly clicks "Commit to Stock".
 * 
 * Workflow:
 *   Select File Ã¢â€ â€™ Parse Ã¢â€ â€™ Column Mapping Ã¢â€ â€™ Validate Ã¢â€ â€™ Review Ã¢â€ â€™ Preview Ã¢â€ â€™ Commit
 * 
 * Features:
 * - Multi-format support (Excel, CSV, PDF, OCR)
 * - AI column mapping suggestions
 * - Inline data editing
 * - Full validation engine
 * - Commit preview with impact analysis
 * - Import profiles (save/load mappings)
 * - Auto-save drafts
 * - Recycle Bin integration
 */

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useImportSessionStore, ImportStep } from '../stores/importSessionStore';
import { useStockStore } from '../stores/stockStore';
import { useToast } from '../hooks/useToast';

import { formatCurrency, cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  Upload, FileSpreadsheet, FileText, FileImage, File,
  ArrowRight, ArrowLeft, Check, X, AlertTriangle, AlertCircle,
  Info, RefreshCw, Save, Download, Search, Columns, Filter,
  ChevronDown, ChevronUp, Settings, Eye, EyeOff, Trash2,
  Undo2, Redo2, Grid3X3, Map, ShieldCheck, FileCheck,
  ListChecks, BarChart3, History, Bookmark,
  Loader2, RotateCcw, Package, HelpCircle, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, Type, ZoomIn, ZoomOut, ScanLine,
  Lightbulb, Target, Zap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ACCEPTED_FILE_TYPES } from '../lib/fileImporter';
import VirtualDataGrid, { DataGridColumn } from './DataImportStudio/VirtualDataGrid';
import { importProfileStore } from '../lib/importer/importProfileStore';

// Hub sub-views (lazy so the studio itself loads instantly)
const ScanInvoice = lazy(() => import('./ScanInvoice'));
const ImportHistoryView = lazy(() => import('./DataImportStudio/ImportHistoryView'));
import { 
  ColumnMapping, AIMappingSuggestion, UnknownColumnInfo,
  ValidationRecord, ValidationSummary, CommitSummary,
  PROTECTED_SCHEMA_FIELDS, GridColumn, GridState, GridSort, GridFilter,
  FIELD_SYNONYMS,
} from '../lib/importer/types';

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// STEP CONFIGURATION
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

interface StepConfig {
  id: ImportStep;
  label: string;
  icon: React.ElementType;
  description: string;
  activeBg: string;
}

const STEPS: StepConfig[] = [
  { id: 'select', label: 'Select File', icon: Upload, description: 'Choose your import file', activeBg: 'bg-[#14292E] border-[#14292E]' },
  { id: 'preview', label: 'Data Preview', icon: Eye, description: 'Review parsed data before mapping', activeBg: 'bg-[#14292E] border-[#14292E]' },
  { id: 'mapping', label: 'Map Columns', icon: Map, description: 'Map file columns to stock fields', activeBg: 'bg-[#14292E] border-[#14292E]' },
  { id: 'validation', label: 'Validate', icon: ShieldCheck, description: 'Review validation results', activeBg: 'bg-[#14292E] border-[#14292E]' },
  { id: 'review', label: 'Review', icon: ListChecks, description: 'Review and edit imported data', activeBg: 'bg-[#14292E] border-[#14292E]' },
  { id: 'commit', label: 'Commit', icon: FileCheck, description: 'Preview changes & commit to stock', activeBg: 'bg-[#14292E] border-[#14292E]' },
  { id: 'complete', label: 'Complete', icon: FileCheck, description: 'Import completed', activeBg: 'bg-[#14292E] border-[#14292E]' },
];

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// MAIN COMPONENT
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

interface DataImportStudioProps {
  /** Open the hub on a specific tab (used by legacy routes) */
  initialMode?: 'import' | 'scan' | 'history';
}

export default function DataImportStudio({ initialMode = 'import' }: DataImportStudioProps) {
  const {
    session, activeStep, isProcessing, processingMessage, error,
    validationSummary, showProfileDialog, matchedProfileName,
    selectFile, updateMapping, updateAllMappings, applyAISuggestion,
    applyUnknownColumnAction, runValidation, editRow, deleteRows,
    undeleteRow, generatePreview, commitToStock, resetSession,
    saveDraft, loadDraft, setActiveStep,
    saveAsProfile, applyProfile,
  } = useImportSessionStore();
  const { setMedicines, setDashboardStats } = useStockStore();
  
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saveProfileOpen, setSaveProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Data Import hub — Import Files / Scan Invoice / Import History
  const [mode, setMode] = useState<'import' | 'scan' | 'history'>(initialMode);

  // Display preferences (persisted for users who need bigger/clearer text)
  const FONT_OPTIONS = [
    { label: 'Default', value: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
    { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
    { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
    { label: 'Mono', value: "'Cascadia Mono', Consolas, monospace" },
  ];
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('anpharm_import_font') || FONT_OPTIONS[0].value);
  const [fontScale, setFontScale] = useState(() => {
    const s = parseFloat(localStorage.getItem('anpharm_import_fontscale') || '1');
    return isNaN(s) || s < 0.8 ? 1 : Math.min(s, 1.6);
  });
  useEffect(() => { localStorage.setItem('anpharm_import_font', fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem('anpharm_import_fontscale', String(fontScale)); }, [fontScale]);

  // Pagination for data preview / validation tables
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(0); }, [activeStep, session?.id]);

  const studioStyle: React.CSSProperties = { fontFamily, zoom: fontScale };

  // Mapped rows + per-row validation status for the Validate screen (built once per session)
  const mappedTable = useMemo(() => {
    if (!session || session.sheets.length === 0) return null;
    const sheet = session.sheets[session.activeSheetIndex];
    const vCols = session.columnMappings.filter(m => m.isMapped && !m.isHidden);
    const headers = vCols.map(m => m.displayLabel);
    const rows = sheet.rows.map(row => vCols.map(m => row[sheet.headers.indexOf(m.sourceColumn)] ?? ''));
    const statusByRow: Record<number, string> = {};
    session.validationResults.forEach(r => { statusByRow[r.rowIndex] = r.status; });
    return { headers, rows, statusByRow };
  }, [session]);

  // Load draft on mount (import mode only — Scan/History tabs don't need it)
  useEffect(() => {
    if (initialMode !== 'import') return;
    const hasDraft = loadDraft();
    if (hasDraft) {
      toast.info('Draft Restored', 'A saved draft was found and restored.');
    }
  }, []);

  // Auto-save draft every 30 seconds when session is active
  useEffect(() => {
    if (!session || session.status === 'committed') return;
    const interval = setInterval(() => saveDraft(), 30000);
    return () => clearInterval(interval);
  }, [session]);

  // Fullscreen / maximize Escape handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setIsMaximized(false);
        document.body.style.overflow = '';
      }
    };
    if (isFullscreen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Handle file drop/select
  const handleFile = useCallback(async (file: File) => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const accepted = ACCEPTED_FILE_TYPES.split(',').map(t => t.trim().toLowerCase());
    if (!accepted.includes(ext)) {
      toast.error('Unsupported Format', `File type "${ext}" is not supported. Accepted: ${ACCEPTED_FILE_TYPES}`);
      return;
    }
    await selectFile(file);
    toast.success('File Parsed', `Successfully parsed "${file.name}"`);
  }, [selectFile, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (e.target) e.target.value = '';
  }, [handleFile]);

  // Handle column mapping update
  const handleMappingChange = (sourceCol: string, targetField: string) => {
    updateMapping(sourceCol, targetField || null);
  };

  // Apply profile
  const handleApplyProfile = (profileId: string) => {
    applyProfile(profileId);
    toast.success('Profile Applied', 'Column mappings updated from profile.');
  };

  // Commit flow
  const handleCommit = async () => {
    setConfirmCommitOpen(false);
    await commitToStock();
    if (!error) {
      toast.success('Import Complete', 'Stock has been updated successfully.');
      // Refresh Dashboard & Stock stores after commit
      try {
        if (window.electronAPI) {
          const [stockResult, dashResult] = await Promise.all([
            window.electronAPI.listStock(),
            window.electronAPI.getDashboardStats(),
          ]);
          if (stockResult.success) setMedicines(stockResult.medicines || []);
          if (dashResult.success) setDashboardStats(dashResult.stats);
        }
      } catch (e) {
        console.warn('Post-commit refresh failed:', e);
      }
    }
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: STEP INDICATOR
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
      {STEPS.map((step, idx) => {
        const isActive = activeStep === step.id;
        const currentIdx = STEPS.findIndex(s => s.id === activeStep);
        const isPast = currentIdx > idx;
        const isClickable = isPast && step.id !== 'complete';
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isClickable && setActiveStep(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap border',
                isActive && cn('text-white shadow-md', step.activeBg),
                isPast && 'bg-background dark:bg-muted/40 text-success dark:text-success border-success/40 dark:border-success/40 hover:shadow-sm cursor-pointer',
                !isActive && !isPast && 'bg-background dark:bg-muted/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-border cursor-default'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{step.label}</span>
              {isPast && <Check className="w-3 h-3 text-emerald-500" />}
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'h-px w-6 flex-shrink-0',
                isPast ? 'bg-success' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: FILE SELECT
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // Shared paginated data table (used by Data Preview + Validation)
  // ponytail: one table for both screens; 500 max per page keeps render cheap
  const renderPagedTable = (
    headers: string[],
    rows: any[][],
    rowStatus?: Record<number, string>,
    rowStatusForIndex?: (rowIdx: number) => { label: string; cls: string } | null
  ) => {
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const p = Math.min(page, pageCount - 1);
    const start = p * pageSize;
    const slice = rows.slice(start, start + pageSize);
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-background shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-2 py-2 text-left font-bold text-slate-700 border-r border-slate-200 w-10">#</th>
                {headers.map((header, idx) => (
                  <th key={idx} className="px-2 py-2 text-left font-bold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                    {header || `(col ${idx + 1})`}
                  </th>
                ))}
                {rowStatusForIndex && <th className="px-2 py-2 text-left font-bold text-slate-700">Status</th>}
              </tr>
            </thead>
            <tbody>
              {slice.map((row, rIdx) => {
                const globalIdx = start + rIdx;
                const status = rowStatusForIndex ? rowStatusForIndex(globalIdx) : null;
                return (
                  <tr key={globalIdx} className={globalIdx % 2 === 0 ? 'bg-background' : 'bg-slate-50/60'}>
                    <td className="px-2 py-1.5 border-r border-slate-100 border-t border-slate-100/60 text-slate-400 text-[10px]">{globalIdx + 1}</td>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="px-2 py-1.5 border-r border-slate-100 border-t border-slate-100/60 max-w-[220px] truncate">
                        <span className={cn(
                          'font-mono',
                          cell === '' || cell === null || cell === undefined ? 'text-slate-300' : 'text-slate-800'
                        )}>
                          {cell ?? '—'}
                        </span>
                      </td>
                    ))}
                    {rowStatusForIndex && (
                      <td className="px-2 py-1.5 border-t border-slate-100/60">
                        {status ? <Badge variant={status.label === 'Error' ? 'destructive' : status.label === 'Warning' ? 'warning' : 'success'} size="sm">{status.label}</Badge> : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
              {slice.length === 0 && (
                <tr><td colSpan={headers.length + (rowStatusForIndex ? 2 : 1)} className="px-2 py-6 text-center text-slate-400">No rows to display</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="px-1.5 py-1 rounded-md border border-slate-300 bg-background text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#14292E]/25"
            >
              {[10, 25, 50, 100, 500].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="font-medium">
              Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, rows.length)} of <strong>{rows.length.toLocaleString()}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Page {p + 1} / {pageCount}</span>
            <Button size="sm" variant="outline" disabled={p <= 0} onClick={() => setPage(p - 1)} className="gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button size="sm" variant="outline" disabled={p >= pageCount - 1} onClick={() => setPage(p + 1)} className="gap-1">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Font family + size controls (accessibility: bigger/clearer text on demand)
  const renderDisplayControls = () => (
    <div className="flex items-center gap-1.5" title="Display options: font family and text size">
      <Type className="w-4 h-4 text-slate-500" />
      <select
        value={fontFamily}
        onChange={(e) => setFontFamily(e.target.value)}
        className="px-2 py-1 rounded-md border border-slate-300 bg-background text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14292E]/25"
      >
        {FONT_OPTIONS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>
      <div className="flex items-center rounded-md border border-slate-300 bg-background">
        <button
          onClick={() => setFontScale(s => Math.max(0.8, Math.round((s - 0.1) * 100) / 100))}
          className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 rounded-l-md"
          title="Decrease text size"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="px-1 text-xs font-bold text-slate-700 border-x border-slate-200">{Math.round(fontScale * 100)}%</span>
        <button
          onClick={() => setFontScale(s => Math.min(1.6, Math.round((s + 0.1) * 100) / 100))}
          className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 rounded-r-md"
          title="Increase text size"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // Data Import hub — mode switcher (Import Files / Scan Invoice / Import History)
  const renderModeTabs = () => {
    const modes: { id: 'import' | 'scan' | 'history'; label: string; desc: string; icon: React.ElementType }[] = [
      { id: 'import', label: 'Import Files', desc: 'Excel · CSV · PDF', icon: FileSpreadsheet },
      { id: 'scan', label: 'Scan Invoice', desc: 'Camera · Upload · OCR', icon: ScanLine },
      { id: 'history', label: 'Import History', desc: 'Past imports & results', icon: History },
    ];
    return (
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
        {modes.map(m => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer',
                active
                  ? 'bg-gradient-to-r from-[#14292E] to-[#123F3D] text-white shadow-md shadow-[#14292E]/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
              )}
              aria-pressed={active}
            >
              <Icon className="w-4 h-4" />
              <span>{m.label}</span>
              <span className={cn('hidden sm:block text-[10px] font-medium', active ? 'text-emerald-50/80' : 'text-slate-400 dark:text-slate-500')}>
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderFileSelect = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Import Stock Data</h3>
        <p className="text-sm text-slate-500 mt-1">
          Upload Excel, CSV, PDF, or Invoice Image to begin
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
          'hover:border-emerald-400 hover:bg-success-light/40 group',
          dragOver ? 'border-emerald-500 bg-success-light scale-[1.01]' : 'border-slate-200 dark:border-border bg-background dark:bg-slate-900'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className={cn(
          'w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-200 border',
          'bg-background dark:bg-muted/40 border-slate-100 dark:border-border',
          dragOver && 'border-success/40 bg-success-light dark:bg-success-light scale-110'
        )}>
          <Upload className={cn(
            'w-8 h-8 transition-colors duration-200',
            dragOver ? 'text-success' : 'text-slate-500'
          )} />
        </div>

        <p className="text-sm font-semibold text-slate-700">
          {dragOver ? 'Drop your file here' : 'Drag & drop your file here, or click to browse'}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Supports: Excel (.xlsx, .xls), CSV, PDF Invoices, Images (OCR)
        </p>
      </div>

      {/* Quick Format Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: FileSpreadsheet, label: 'Excel Files', desc: '.xlsx, .xls', color: 'text-[#14292E] bg-[#EDF5F6] border-[#14292E]/10' },
          { icon: FileText, label: 'CSV / TSV', desc: '.csv, .tsv', color: 'text-[#14292E] bg-[#EDF5F6] border-[#14292E]/10' },
          { icon: FileImage, label: 'PDF / Images', desc: '.pdf, .jpg, .png (OCR)', color: 'text-[#14292E] bg-[#EDF5F6] border-[#14292E]/10' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-background dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', item.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER: DATA PREVIEW (New Step)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const renderDataPreview = () => {
    if (!session || session.sheets.length === 0) return null;
    
    const activeSheet = session.sheets[session.activeSheetIndex];
    const totalRows = activeSheet.totalRows;
    const totalCols = activeSheet.totalCols;
    const headers = activeSheet.headers;
    
    // Detect potential issues
    const emptyHeaderCount = headers.filter(h => !h || h.trim() === '').length;
    const duplicateHeaders = headers.filter((h, i) => headers.indexOf(h) !== i && h.trim()).length > 0;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Data Preview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review the parsed data before mapping columns. {totalRows} rows Ã— {totalCols} columns detected.
            </p>
          </div>
          <Badge variant={emptyHeaderCount > 0 ? 'warning' : 'success'} size="sm" className="gap-1">
            <Check className="w-3 h-3" />
            {emptyHeaderCount > 0 ? `${emptyHeaderCount} empty headers` : 'All headers present'}
          </Badge>
        </div>

        {/* File Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Rows', value: totalRows.toLocaleString(), color: 'text-[#14292E] bg-[#EDF5F6]', icon: FileSpreadsheet },
            { label: 'Columns', value: totalCols, color: 'text-[#14292E] bg-[#EDF5F6]', icon: Columns },
            { label: 'File Size', value: session.fileSize ? `${(session.fileSize / 1024).toFixed(1)} KB` : 'â€”', color: 'text-[#14292E] bg-[#EDF5F6]', icon: File },
            { label: 'Format', value: session.source.toUpperCase(), color: 'text-[#14292E] bg-[#EDF5F6]', icon: HelpCircle },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Card key={item.label} variant="bordered" className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.value}</p>
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Warnings */}
        {(emptyHeaderCount > 0 || duplicateHeaders) && (
          <Card variant="bordered" className="bg-warning-light border-amber-200">
            <CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <div className="text-xs text-amber-800 space-y-1">
                {emptyHeaderCount > 0 && <p>âš  {emptyHeaderCount} column(s) have empty headers â€” they will be skipped</p>}
                {duplicateHeaders && <p>âš  Duplicate column headers detected â€” please verify mapping</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Column Headers Overview */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Detected Columns ({headers.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {headers.map((header, idx) => (
              <span
                key={header}
                className={cn(
                  'px-2 py-1 rounded text-[10px] font-mono border cursor-default',
                  header && header.trim() 
                    ? 'bg-background border-slate-200 text-slate-700' 
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                )}
                title={`Column ${idx + 1}: ${header || '(empty)'}`}
              >
                {header || `(empty ${idx + 1})`}
              </span>
            ))}
          </div>
        </div>

        {/* Full Data Table (paginated) */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            All Rows ({activeSheet.rows.length.toLocaleString()}) — every row visible via pagination
          </h4>
          {renderPagedTable(headers, activeSheet.rows)}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button size="sm" variant="outline" onClick={() => setActiveStep('select')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Change File
          </Button>
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => setActiveStep('mapping')}
            className="gap-2"
          >
            Continue to Column Mapping
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER: COLUMN MAPPING
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const renderColumnMapping = () => {
    if (!session) return null;
    const { columnMappings, aiSuggestions, unknownColumns } = session;
    const mappedCount = columnMappings.filter(m => m.isMapped).length;
    const totalCount = columnMappings.length;
    const progress = totalCount > 0 ? Math.round((mappedCount / totalCount) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Mapping Progress */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Column Mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Map file columns to stock fields. AI suggestions are shown where detected.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              <strong className="text-slate-700">{mappedCount}</strong> / {totalCount} mapped
            </span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success-light rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Smart Suggestions Summary */}
        {aiSuggestions.length > 0 && (
          <Card variant="bordered" className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-900">
                Auto-detected <strong>{aiSuggestions.length}</strong> column mappings.
                {unknownColumns.length > 0 && ` ${unknownColumns.length} unmapped columns require review.`}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Profile Match Dialog */}
        {showProfileDialog && matchedProfileName && (
          <Card variant="bordered" className="bg-gradient-to-r from-amber-50 to-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-warning" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Import Profile Found</p>
                    <p className="text-xs text-warning mt-0.5">
                      Profile: <strong>{matchedProfileName}</strong> Ã¢â‚¬â€ Apply saved column mappings?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => useImportSessionStore.setState({ showProfileDialog: false })}>
                    Ignore
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => {
                    const profiles = importProfileStore.list();
                    const match = profiles.find(p => p.name === matchedProfileName);
                    if (match) handleApplyProfile(match.id);
                  }}>
                    Apply Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Column Mapping List */}
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {columnMappings.map((mapping) => {
            const suggestion = aiSuggestions.find(s => s.sourceColumn === mapping.sourceColumn);
            const isUnknown = unknownColumns.find(u => u.sourceColumn === mapping.sourceColumn);
            
            return (
              <div
                key={mapping.sourceColumn}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                  'hover:border-slate-300 hover:shadow-sm',
                  mapping.isMapped ? 'bg-background border-border' : 'bg-warning-light/50 border-amber-200',
                )}
              >
                {/* Source Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700 truncate">{mapping.sourceColumn}</span>
                    {mapping.suggestedBy === 'ai' && (
                      <Badge variant="outline-teal" size="sm" className="gap-1">
                        <Check className="w-2.5 h-2.5" /> Auto
                      </Badge>
                    )}
                    {mapping.suggestedBy === 'profile' && (
                      <Badge variant="outline-teal" size="sm" className="gap-1">
                        <Bookmark className="w-2.5 h-2.5" /> Profile
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">
                      Type: {mapping.dataType}
                    </span>
                    {mapping.sampleValues.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        Sample: <span className="font-mono text-slate-500">{mapping.sampleValues.slice(0, 2).join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Target Field Select */}
                <div className="w-56">
                  <select
                    value={mapping.targetField || ''}
                    onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 text-xs rounded-lg border transition-all duration-200',
                      'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400',
                      mapping.isMapped 
                        ? 'bg-background border-border text-slate-700' 
                        : 'bg-warning-light border-amber-300 text-amber-800'
                    )}
                  >
                    <option value="">— Skip / Do Not Import —</option>
                    {PROTECTED_SCHEMA_FIELDS.map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label} {field.required ? '*' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Auto Mapping Suggestions */}
                  {suggestion && !mapping.isMapped && (
                    <div className="mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <button
                        onClick={() => applyAISuggestion(mapping.sourceColumn)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-medium"
                      >
                        Map to "{PROTECTED_SCHEMA_FIELDS.find(f => f.key === suggestion.suggestedField)?.label}"
                      </button>
                      <span className="text-[9px] text-emerald-600/70">({suggestion.confidence}%)</span>
                    </div>
                  )}

                  {/* Alternatives */}
                  {suggestion?.alternativeFields && suggestion.alternativeFields.length > 0 && !mapping.isMapped && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {suggestion.alternativeFields.slice(0, 2).map(alt => (
                        <button
                          key={alt.field}
                          onClick={() => handleMappingChange(mapping.sourceColumn, alt.field)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted transition-colors"
                        >
                          {PROTECTED_SCHEMA_FIELDS.find(f => f.key === alt.field)?.label || alt.field} ({alt.confidence}%)
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Unknown Column Actions */}
                  {isUnknown && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(['add_to_schema', 'import_once', 'ignore', 'rename'] as const).map(action => {
                        const isActive = isUnknown.action === action;
                        const labels: Record<string, string> = {
                          add_to_schema: 'Add to Schema',
                          import_once: 'Import Once',
                          ignore: 'Ignore',
                          rename: 'Rename',
                        };
                        return (
                          <button
                            key={action}
                            onClick={() => applyUnknownColumnAction(mapping.sourceColumn, action)}
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded transition-colors',
                              isActive ? 'bg-success-light text-success font-medium' : 'bg-muted text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {labels[action]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSaveProfileOpen(true)} disabled={mappedCount === 0}>
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              Save Profile
            </Button>
          </div>
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => { runValidation(); }} 
            disabled={mappedCount === 0}
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Validate & Review
          </Button>
        </div>

        {/* Save Profile Dialog */}
        <Dialog open={saveProfileOpen} onOpenChange={setSaveProfileOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-success" />
                Save Import Profile
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Profile Name *</label>
                <Input 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g., Cipla Excel Format"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name (optional)</label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g., Cipla, Sun Pharma"
                />
              </div>
              <p className="text-xs text-slate-400">
                Profile saves: {mappedCount} column mappings, ignored columns, and default values.
                Next time a matching file is detected, you'll be prompted to apply this profile.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveProfileOpen(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                disabled={!profileName.trim()} 
                onClick={() => {
                  saveAsProfile(profileName.trim(), supplierName.trim() || undefined);
                  setSaveProfileOpen(false);
                  setProfileName('');
                  setSupplierName('');
                  toast.success('Profile Saved', `Import profile "${profileName}" saved successfully.`);
                }}
              >
                <Bookmark className="w-4 h-4 mr-1" />
                Save Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: VALIDATION RESULTS
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  const renderValidation = () => {
    if (!session || !validationSummary) return null;
    
    const hasIssues = validationSummary.totalErrors > 0 || validationSummary.totalWarnings > 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Validation Results</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasIssues ? 'Issues found Ã¢â‚¬â€ review before proceeding' : 'All rows pass validation'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Valid Rows', value: validationSummary.validRows, color: 'text-success bg-success-light', icon: Check },
            { label: 'Warnings', value: validationSummary.totalWarnings, color: 'text-warning bg-warning-light', icon: AlertTriangle },
            { label: 'Errors', value: validationSummary.totalErrors, color: 'text-destructive bg-destructive/10', icon: AlertCircle },
            { label: 'Duplicates', value: validationSummary.duplicateCount, color: 'text-amber-700 bg-amber-50', icon: AlertTriangle },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Card key={item.label} variant="bordered" className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.value}</p>
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Mapped Data (paginated, with per-row validation status) */}
        {mappedTable && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Validated Data — All Rows ({mappedTable.rows.length.toLocaleString()})
          </h4>
          {renderPagedTable(mappedTable.headers, mappedTable.rows, undefined, (idx) => {
            const st = mappedTable.statusByRow[idx];
            if (st === 'error') return { label: 'Error', cls: '' };
            if (st === 'warning') return { label: 'Warning', cls: '' };
            return { label: 'Valid', cls: '' };
          })}
        </div>
        )}

        {/* Issue Details */}
        {hasIssues && (
          <Card variant="bordered">
            <CardContent className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
              {session.validationResults.filter(r => r.status !== 'valid').slice(0, 50).map(record => (
                <div key={record.rowIndex} className="p-3 rounded-xl bg-muted space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Row {record.rowIndex + 1}</span>
                    {record.status === 'error' && <Badge variant="destructive" size="sm">Error</Badge>}
                    {record.status === 'warning' && <Badge variant="warning" size="sm">Warning</Badge>}
                  </div>
                  {record.fieldErrors.map((err, i) => (
                    <p key={i} className={cn(
                      'text-[11px] flex items-start gap-1.5',
                      err.severity === 'error' ? 'text-destructive' : err.severity === 'warning' ? 'text-warning' : 'text-slate-500'
                    )}>
                      {err.severity === 'error' ? <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
                      <span>{err.message}</span>
                    </p>
                  ))}
                  {record.globalWarnings.map((w, i) => (
                    <p key={`gw-${i}`} className="text-[11px] text-warning flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </p>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => setActiveStep('mapping')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Mapping
          </Button>
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => setActiveStep('review')}
          >
            Continue to Review
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: DATA REVIEW (Virtual Data Grid)
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  const renderDataReview = () => {
    if (!session || session.sheets.length === 0) return null;
    
    const activeSheet = session.sheets[session.activeSheetIndex];
    const visibleColumns = session.columnMappings.filter(m => !m.isHidden);
    
    // Build grid columns
    const gridColumns: DataGridColumn[] = visibleColumns.map((m, i) => ({
      key: m.sourceColumn,
      label: m.displayLabel + (m.isProtected ? ' *' : ''),
      width: m.width,
      minWidth: 80,
      visible: true,
      frozen: i < 1, // First visible column is frozen
      resizable: true,
      draggable: true,
      editable: true,
      dataType: m.dataType === 'currency' ? 'currency' : m.dataType === 'number' ? 'number' : 'text',
      colorTag: m.isProtected ? '#059669' : undefined,
    }));
    
    // Build row data from active sheet
    const allRows = activeSheet.rows.map((row, idx) => {
      const obj: Record<string, any> = {};
      activeSheet.headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });
    
    // Build edited cells map for VirtualDataGrid
    const deletedSet = session.deletedRowIndices;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Review Import Data</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSheet.totalRows - deletedSet.size} rows Ã‚Â· {visibleColumns.length} columns
              {deletedSet.size > 0 && ` Ã‚Â· ${deletedSet.size} deleted`}
              {activeSheet.totalRows > 500 && ` Ã‚Â· Virtual scroll active`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => saveDraft()}>
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Draft
            </Button>
          </div>
        </div>

        {/* Virtual Data Grid */}
        <VirtualDataGrid
          columns={gridColumns}
          rows={allRows}
          totalRows={allRows.length}
          onColumnsChange={(cols) => {
            // Map back to session column mappings
            const newMappings = cols.map(c => {
              const existing = session.columnMappings.find(m => m.sourceColumn === c.key);
              if (existing) {
                return { ...existing, width: c.width, isHidden: !c.visible };
              }
              return existing;
            }).filter(Boolean) as typeof session.columnMappings;
            if (newMappings.length > 0) {
              updateAllMappings(newMappings);
            }
          }}
          onCellEdit={(rowIdx, colKey, value) => editRow(rowIdx, colKey, value)}
          onDeleteRow={(rowIdx) => deleteRows([rowIdx])}
          onRestoreRow={(rowIdx) => undeleteRow(rowIdx)}
          deletedRowIndices={deletedSet}
          editedCells={session.editedRows}
          selectedRows={new Set()}
          maxHeight={550}
        />

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => runValidation()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Re-validate
          </Button>
          <Button size="sm" variant="primary" onClick={() => { generatePreview(); }}>
            Preview Changes
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: COMMIT PREVIEW
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  const renderCommitPreview = () => {
    if (!session || !session.commitSummary) return null;
    const summary = session.commitSummary;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Commit Preview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review all changes before committing to stock
            </p>
          </div>
          <Badge variant="outline-teal" size="sm" className="gap-1">
            <Eye className="w-3 h-3" />
            Preview Mode
          </Badge>
        </div>

        {/* Impact Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Rows to Add', value: summary.rowsAdded, color: 'text-success bg-success-light' },
            { label: 'Rows to Update', value: summary.rowsUpdated, color: 'text-warning bg-warning-light' },
            { label: 'Rows to Skip', value: summary.rowsIgnored, color: 'text-slate-500 bg-muted' },
            { label: 'New Columns', value: summary.columnsAdded, color: 'text-[#14292E] bg-[#EDF5F6]' },
          ].map(item => (
            <Card key={item.label} variant="bordered" className="p-3">
              <p className={cn('text-lg font-bold', item.color.split(' ')[0])}>{item.value}</p>
              <p className="text-[10px] text-slate-500">{item.label}</p>
            </Card>
          ))}
        </div>

        {/* Financial Impact */}
        <Card variant="bordered" className="bg-gradient-to-r from-[#EDF5F6] to-[#2E9C90]/25 border-[#14292E]/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-navy-500 uppercase tracking-wider font-medium">Stock Value Change</p>
                <p className={cn(
                  'text-lg font-bold font-data',
                  summary.inventoryValueChange >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {summary.inventoryValueChange >= 0 ? '+' : ''}{formatCurrency(summary.inventoryValueChange)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-navy-500 uppercase tracking-wider font-medium">Stock Count Change</p>
                <p className="text-lg font-bold text-navy-800 font-data">
                  {summary.stockCountChange >= 0 ? '+' : ''}{summary.stockCountChange} units
                </p>
              </div>
              <div>
                <p className="text-[10px] text-navy-500 uppercase tracking-wider font-medium">Batch Count Change</p>
                <p className="text-lg font-bold text-navy-800 font-data">
                  {summary.batchCountChange >= 0 ? '+' : ''}{summary.batchCountChange} batches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Items List */}
        <Card variant="bordered">
          <CardContent className="p-4 max-h-[40vh] overflow-y-auto space-y-1">
            {summary.previewItems.slice(0, 100).map((item, idx) => (
              <div key={idx} className={cn(
                'flex items-center justify-between p-2 rounded-lg text-xs',
                item.action === 'add' && 'bg-success-light',
                item.action === 'update' && 'bg-warning-light',
                item.action === 'skip' && 'bg-muted',
                item.action === 'error' && 'bg-destructive/10',
              )}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.action === 'add' && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                  {item.action === 'update' && <RefreshCw className="w-3 h-3 text-warning shrink-0" />}
                  {item.action === 'skip' && <X className="w-3 h-3 text-slate-400 shrink-0" />}
                  {item.action === 'error' && <AlertCircle className="w-3 h-3 text-destructive shrink-0" />}
                  <span className="font-medium text-slate-700 truncate">{item.name}</span>
                  {item.batch && <span className="text-[10px] font-mono text-slate-400">{item.batch}</span>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="font-mono text-slate-600">{item.quantity} qty</span>
                  <span className="font-mono text-slate-500">Ã¢â€šÂ¹{item.mrp}</span>
                  {item.action === 'add' && <Badge variant="success" size="sm">New</Badge>}
                  {item.action === 'update' && <Badge variant="warning" size="sm">Update</Badge>}
                  {item.action === 'skip' && <Badge variant="secondary" size="sm">Skip</Badge>}
                  {item.action === 'error' && <Badge variant="destructive" size="sm">Error</Badge>}
                </div>
              </div>
            ))}
            {summary.previewItems.length > 100 && (
              <p className="text-center text-xs text-slate-400 pt-2">
                +{summary.previewItems.length - 100} more items
              </p>
            )}
          </CardContent>
        </Card>

        {/* Full Imported Data (paginated) */}
        {mappedTable && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Imported Data — All Rows ({mappedTable.rows.length.toLocaleString()})
            </h4>
            {renderPagedTable(mappedTable.headers, mappedTable.rows)}
          </div>
        )}

        {/* Commit Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" onClick={() => setActiveStep('review')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Review
          </Button>
          <Button 
            size="sm" 
            variant="success" 
            onClick={() => setConfirmCommitOpen(true)}
            className="gap-2 px-6"
          >
            <Check className="w-4 h-4" />
            Commit to Stock
          </Button>
        </div>

        {/* Commit Confirmation Dialog */}
        <Dialog open={confirmCommitOpen} onOpenChange={setConfirmCommitOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Confirm Commit to Stock
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-slate-600">
                This will permanently add <strong>{summary.rowsAdded} rows</strong> and update <strong>{summary.rowsUpdated} rows</strong> in your stock database.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-500" /> {summary.rowsAdded} new items will be added
                </li>
                {summary.rowsUpdated > 0 && (
                  <li className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 text-warning" /> {summary.rowsUpdated} existing items will be updated
                  </li>
                )}
                {summary.columnsAdded > 0 && (
                  <li className="flex items-center gap-2">
                    <Columns className="w-3 h-3 text-[#14292E]" /> {summary.columnsAdded} new custom fields will be created
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <BarChart3 className="w-3 h-3 text-navy-500" /> Stock value change: <strong>{formatCurrency(summary.inventoryValueChange)}</strong>
                </li>
              </ul>
              <p className="text-xs text-warning bg-warning-light p-3 rounded-lg">
                <strong>Warning:</strong> This action can be undone from Import History for the next 30 days.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmCommitOpen(false)}>Cancel</Button>
              <Button variant="success" onClick={handleCommit} disabled={isProcessing}>
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Committing...</>
                ) : (
                  <><Check className="w-4 h-4 mr-1" /> Confirm & Commit</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: COMPLETE
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  const renderComplete = () => {
    if (!session || !session.commitSummary) return null;

    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-success-light flex items-center justify-center">
          <FileCheck className="w-10 h-10 text-success" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-slate-900">Import Complete!</h3>
          <p className="text-sm text-slate-500 mt-1">
            Stock has been updated successfully
          </p>
        </div>

        {/* Results */}
        <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
          {[
            { label: 'Items Added', value: session.commitSummary.rowsAdded },
            { label: 'Items Updated', value: session.commitSummary.rowsUpdated },
            { label: 'Stock Value', value: formatCurrency(session.commitSummary.inventoryValueChange) },
            { label: 'File', value: session.fileName },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-muted">
              <p className="text-lg font-bold text-slate-800">{item.value}</p>
              <p className="text-[10px] text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Committed Data (paginated) */}
        {mappedTable && (
          <div className="max-w-3xl mx-auto text-left">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Committed Data — All Rows ({mappedTable.rows.length.toLocaleString()})
              </h4>
              {renderPagedTable(mappedTable.headers, mappedTable.rows)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => {
            resetSession();
            setActiveStep('select');
          }}>
            <Upload className="w-4 h-4 mr-1" />
            Import Another File
          </Button>
          <Button variant="primary" onClick={() => {
            // Navigate to stock management
            window.location.hash = '#/stock';
            window.location.reload();
          }}>
            <Package className="w-4 h-4 mr-1" />
            View Stock
          </Button>
        </div>
      </div>
    );
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: LOADING OVERLAY
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-700">{processingMessage}</p>
          <p className="text-xs text-slate-400">Please wait while we process your file...</p>
        </div>
      </div>
    );
  }

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // RENDER: ERROR STATE
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive/80 mx-auto" />
        <h3 className="text-lg font-semibold text-slate-900">Error</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
        <Button variant="outline" onClick={() => {
          useImportSessionStore.setState({ error: null });
          resetSession();
        }}>
          Try Again
        </Button>
      </div>
    );
  }

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // FULLSCREEN / MAXIMIZE HELPERS
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  const toggleFullscreen = () => {
    setIsFullscreen(f => !f);
    setIsMaximized(false);
  };

  const toggleMaximize = () => {
    setIsMaximized(m => !m);
    setIsFullscreen(false);
  };

  const dismissMinimize = () => {
    setIsMaximized(false);
    setIsFullscreen(false);
    document.body.style.overflow = '';
  };

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // MAIN RENDER
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // Non-import modes (Scan Invoice / Import History) live inside the hub
  if (mode !== 'import') {
    return (
      <div style={studioStyle} className="space-y-4 animate-fade-in">
        {renderModeTabs()}
        <Suspense fallback={
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-success animate-spin" />
          </div>
        }>
          {mode === 'scan' ? <ScanInvoice /> : <ImportHistoryView />}
        </Suspense>
      </div>
    );
  }

  if (isMaximized && !isFullscreen) {
    return (
      <div style={studioStyle} className="fixed inset-0 z-[9999] bg-background dark:bg-slate-900 flex flex-col animate-fade-in">
        {/* Maximized Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Data Import Studio</h2>
            <p className="text-xs text-slate-500 mt-0.5">Maximized view Ã¢â‚¬Â¢ Professional import workspace</p>
          </div>
          <div className="flex items-center gap-2">
            {renderDisplayControls()}
            <Button size="sm" variant="outline" onClick={dismissMinimize} className="gap-1">
              <Minimize2 className="w-4 h-4" /> Minimize
            </Button>
            <Button size="sm" variant="primary" onClick={toggleFullscreen} className="gap-1">
              <Maximize2 className="w-4 h-4" /> Fullscreen
            </Button>
          </div>
        </div>
        {/* Data Import hub tabs */}
        <div className="px-6 pt-3">{renderModeTabs()}</div>
        {/* Maximized Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepIndicator()}
          <Card variant="bordered" className={cn(
            'transition-all duration-300',
            activeStep === 'preview' ? 'bg-gradient-to-br from-slate-50 to-white' : 'bg-background'
          )}>
            <CardContent className="p-6">
              {activeStep === 'select' && renderFileSelect()}
              {activeStep === 'preview' && renderDataPreview()}
              {activeStep === 'mapping' && renderColumnMapping()}
              {activeStep === 'validation' && renderValidation()}
              {activeStep === 'review' && renderDataReview()}
              {activeStep === 'commit' && renderCommitPreview()}
              {activeStep === 'complete' && renderComplete()}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div style={studioStyle} className="fixed inset-0 z-[9999] bg-background dark:bg-slate-900 flex flex-col animate-fade-in">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Data Import Studio</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fullscreen view Ã¢â‚¬Â¢ Press ESC to exit</p>
          </div>
          <div className="flex items-center gap-2">
            {renderDisplayControls()}
            <Button size="sm" variant="outline" onClick={dismissMinimize} className="gap-1">
              <Minimize2 className="w-4 h-4" /> Exit Fullscreen
            </Button>
          </div>
        </div>
        {/* Data Import hub tabs */}
        <div className="px-6 pt-3">{renderModeTabs()}</div>
        {/* Fullscreen Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepIndicator()}
          <Card variant="bordered" className={cn(
            'transition-all duration-300',
            activeStep === 'preview' ? 'bg-gradient-to-br from-slate-50 to-white' : 'bg-background'
          )}>
            <CardContent className="p-6">
              {activeStep === 'select' && renderFileSelect()}
              {activeStep === 'preview' && renderDataPreview()}
              {activeStep === 'mapping' && renderColumnMapping()}
              {activeStep === 'validation' && renderValidation()}
              {activeStep === 'review' && renderDataReview()}
              {activeStep === 'commit' && renderCommitPreview()}
              {activeStep === 'complete' && renderComplete()}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={studioStyle} className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Data Import Studio</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Professional import workspace Ã¢â‚¬â€ nothing is committed until you confirm
          </p>
        </div>
        <div className="flex items-center gap-2">
          {renderDisplayControls()}
          {session && session.status !== 'committed' && (
            <>
              {session.draftSavedAt && (
                <span className="text-[10px] text-slate-400">
                  Draft saved: {new Date(session.draftSavedAt).toLocaleTimeString()}
                </span>
              )}
              <Badge variant="outline-teal" size="sm">
                <Info className="w-3 h-3 mr-1" />
                {session.fileName}
              </Badge>
            </>
          )}
          <div className="flex items-center gap-1 ml-2">
            <Button size="icon" variant="ghost" onClick={toggleMaximize} title="Maximize">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Data Import hub tabs — Import Files / Scan Invoice / Import History */}
      {renderModeTabs()}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content Area */}
      <Card variant="bordered" className={cn(
        'transition-all duration-300',
        activeStep === 'preview' ? 'bg-gradient-to-br from-slate-50 to-white' : 'bg-background'
      )}>
        <CardContent className="p-6">
          {activeStep === 'select' && renderFileSelect()}
          {activeStep === 'preview' && renderDataPreview()}
          {activeStep === 'mapping' && renderColumnMapping()}
          {activeStep === 'validation' && renderValidation()}
          {activeStep === 'review' && renderDataReview()}
          {activeStep === 'commit' && renderCommitPreview()}
          {activeStep === 'complete' && renderComplete()}
        </CardContent>
      </Card>
    </div>
  );
}
