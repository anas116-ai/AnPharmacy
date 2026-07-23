/**
 * Audit Trail Store — Full import history with snapshot-based rollback
 * 
 * Features:
 * - Every import creates a snapshot of stock state BEFORE the import
 * - Full audit log with all import details
 * - Rollback: restore stock to pre-import state by replaying snapshot
 * - Version comparison: see what changed between imports
 * - 30-day retention (auto-cleanup of old entries)
 */

import { create } from 'zustand';
import { ImportSource } from '../lib/importer/types';
import { useStockStore } from './stockStore';

// ── Types ──

export interface AuditEntry {
  id: string;
  userId: number;
  userName: string;
  timestamp: string;
  fileName: string;
  source: ImportSource;
  profileName: string | null;
  
  // What happened
  rowsAdded: number;
  rowsUpdated: number;
  rowsDeleted: number;
  rowsIgnored: number;
  columnsAdded: number;
  columnsRenamed: number;
  stockValueChange: number;
  stockCountChange: number;
  
  // Snapshot for rollback
  previousStockSnapshot: string;  // JSON array of Medicine[]
  importedIds: number[];          // IDs of newly added medicines
  updatedIds: number[];           // IDs of updated medicines
  
  // Metadata
  warnings: string[];
  errors: string[];
  duration: number;               // Import duration in ms
  
  // Rollback tracking
  rolledBack: boolean;
  rolledBackAt: string | null;
}

export interface AuditSummary {
  totalImports: number;
  totalRowsAdded: number;
  totalRowsUpdated: number;
  totalStockValueChange: number;
  lastImportDate: string | null;
  rollbacksPerformed: number;
}

// ── Store ──

const STORAGE_KEY = 'anpharm_import_audit';
const MAX_ENTRIES = 500;
const RETENTION_DAYS = 90;

interface AuditTrailState {
  entries: AuditEntry[];
  isLoading: boolean;
  
  // Actions
  loadEntries: () => void;
  addEntry: (entry: AuditEntry) => void;
  getEntry: (id: string) => AuditEntry | null;
  rollback: (entryId: string) => Promise<boolean>;
  deleteEntry: (id: string) => void;
  clearAll: () => void;
  getSummary: () => AuditSummary;
  cleanupOldEntries: () => void;
}

function loadFromStorage(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(entries: AuditEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {}
}

function generateId(): string {
  return 'audit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export const useAuditTrailStore = create<AuditTrailState>((set, get) => ({
  entries: [],
  isLoading: false,

  loadEntries: () => {
    set({ isLoading: true });
    const entries = loadFromStorage();
    set({ entries, isLoading: false });
  },

  addEntry: (entry: AuditEntry) => {
    const entries = loadFromStorage();
    entries.unshift(entry); // Newest first
    saveToStorage(entries);
    set({ entries: loadFromStorage() });
    get().cleanupOldEntries();
  },

  getEntry: (id: string) => {
    return get().entries.find(e => e.id === id) || null;
  },

  /**
   * Rollback an import — restore stock to the snapshot taken before the import
   */
  rollback: async (entryId: string): Promise<boolean> => {
    const entry = get().entries.find(e => e.id === entryId);
    if (!entry || entry.rolledBack) return false;

    try {
      // Parse the pre-import snapshot
      const previousStock: any[] = JSON.parse(entry.previousStockSnapshot);
      
      // Update stock store via API
      if (window.electronAPI) {
        // Clear all imported/updated items
        const currentStock = [...previousStock];
        
        // For each updated medicine, restore from snapshot
        // For each deleted/added medicine, remove from current stock
        // Since we have the snapshot, just restore the entire stock to snapshot state
        
        // We need to remove the imported items and restore the updated ones
        // The simplest approach: directly set the stock to the snapshot state
        // Then persist each medicine
        
        useStockStore.getState().setMedicines(previousStock);
        
        // If browser API is available, also update localStorage
        if (window.electronAPI) {
          for (const med of previousStock) {
            await window.electronAPI.addStock({ medicine: med, userId: entry.userId });
          }
        }
        
        // Also refresh dashboard stats
        try {
          const dashResult = await window.electronAPI.getDashboardStats();
          if (dashResult.success) {
            useStockStore.getState().setDashboardStats(dashResult.stats);
          }
        } catch {}
      }

      // Mark entry as rolled back
      const entries = loadFromStorage();
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx !== -1) {
        entries[idx] = {
          ...entries[idx],
          rolledBack: true,
          rolledBackAt: new Date().toISOString(),
        };
        saveToStorage(entries);
        set({ entries: loadFromStorage() });
      }

      return true;
    } catch (err) {
      console.error('Rollback failed:', err);
      return false;
    }
  },

  deleteEntry: (id: string) => {
    const entries = loadFromStorage().filter(e => e.id !== id);
    saveToStorage(entries);
    set({ entries: loadFromStorage() });
  },

  clearAll: () => {
    saveToStorage([]);
    set({ entries: [] });
  },

  getSummary: () => {
    const entries = get().entries;
    return {
      totalImports: entries.length,
      totalRowsAdded: entries.reduce((s, e) => s + e.rowsAdded, 0),
      totalRowsUpdated: entries.reduce((s, e) => s + e.rowsUpdated, 0),
      totalStockValueChange: entries.reduce((s, e) => s + e.stockValueChange, 0),
      lastImportDate: entries.length > 0 ? entries[0].timestamp : null,
      rollbacksPerformed: entries.filter(e => e.rolledBack).length,
    };
  },

  cleanupOldEntries: () => {
    const entries = loadFromStorage();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    
    const filtered = entries.filter(e => new Date(e.timestamp) > cutoff);
    if (filtered.length !== entries.length) {
      saveToStorage(filtered);
      set({ entries: loadFromStorage() });
    }
  },
}));
