/**
 * Undo Manager — Version Snapshots, Undo/Redo, and Rollback for Data Import Studio
 * 
 * Every import creates a version snapshot of the stock state BEFORE the commit.
 * This enables:
 * - Undo: Revert the last import
 * - Redo: Re-apply a reverted import
 * - Rollback: Restore to any previous version
 * - Compare: View differences between versions
 * 
 * Snapshots are stored in localStorage with a 30-day retention policy.
 */

import { ImportSource } from './types';

// ═════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════

export interface VersionSnapshot {
  id: string;
  timestamp: string;
  importSessionId: string;
  fileName: string;
  source: ImportSource;
  rowsAdded: number;
  rowsUpdated: number;
  rowsDeleted: number;
  stockValueChange: number;
  stockCountChange: number;
  previousStockState: any[]; // Full snapshot of medicines before import
  importedIds: number[];     // IDs of newly added medicines
  updatedIds: number[];      // IDs of updated medicines
  deletedIds: number[];      // IDs of deleted medicines
  userId: number;
  userName: string;
  rolledBack: boolean;
  rolledBackAt: string | null;
  rollbackSessionId: string | null;
}

export interface UndoRedoState {
  undoStack: VersionSnapshot[];
  redoStack: VersionSnapshot[];
  currentSnapshot: VersionSnapshot | null;
}

// ═════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═════════════════════════════════════════════════════════════════════

const SNAPSHOTS_KEY = 'anpharm_import_snapshots';
const MAX_SNAPSHOTS = 50;
const RETENTION_DAYS = 30;

// ═════════════════════════════════════════════════════════════════════
// UNDO MANAGER CLASS
// ═════════════════════════════════════════════════════════════════════

class UndoManager {
  private snapshots: VersionSnapshot[] = [];
  private initialized = false;

  /**
   * Initialize: load snapshots from localStorage
   */
  initialize(): void {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(SNAPSHOTS_KEY);
      if (stored) {
        this.snapshots = JSON.parse(stored);
        this.cleanupExpired();
      }
    } catch (e) {
      console.warn('Failed to load snapshots:', e);
      this.snapshots = [];
    }
    this.initialized = true;
  }

  /**
   * Create a new snapshot before an import commit
   */
  createSnapshot(params: {
    importSessionId: string;
    fileName: string;
    source: ImportSource;
    rowsAdded: number;
    rowsUpdated: number;
    rowsDeleted: number;
    stockValueChange: number;
    stockCountChange: number;
    previousStockState: any[];
    importedIds: number[];
    updatedIds: number[];
    deletedIds: number[];
    userId: number;
    userName: string;
  }): VersionSnapshot {
    this.initialize();

    const snapshot: VersionSnapshot = {
      id: 'snap_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      importSessionId: params.importSessionId,
      fileName: params.fileName,
      source: params.source,
      rowsAdded: params.rowsAdded,
      rowsUpdated: params.rowsUpdated,
      rowsDeleted: params.rowsDeleted,
      stockValueChange: params.stockValueChange,
      stockCountChange: params.stockCountChange,
      previousStockState: params.previousStockState,
      importedIds: params.importedIds,
      updatedIds: params.updatedIds,
      deletedIds: params.deletedIds,
      userId: params.userId,
      userName: params.userName,
      rolledBack: false,
      rolledBackAt: null,
      rollbackSessionId: null,
    };

    this.snapshots.push(snapshot);
    
    // Enforce max snapshots limit
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }

    this.persist();
    return snapshot;
  }

  /**
   * Get all snapshots (most recent first)
   */
  getSnapshots(): VersionSnapshot[] {
    this.initialize();
    return [...this.snapshots].reverse();
  }

  /**
   * Get a specific snapshot by ID
   */
  getSnapshot(id: string): VersionSnapshot | undefined {
    this.initialize();
    return this.snapshots.find(s => s.id === id);
  }

  /**
   * Get snapshots for a specific import session
   */
  getSnapshotsBySession(sessionId: string): VersionSnapshot[] {
    this.initialize();
    return this.snapshots
      .filter(s => s.importSessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get the latest snapshot
   */
  getLatestSnapshot(): VersionSnapshot | undefined {
    this.initialize();
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Rollback to a specific snapshot
   * Returns the previous stock state that can be restored
   */
  rollbackToSnapshot(
    snapshotId: string,
    rollbackSessionId: string
  ): { success: boolean; previousState: any[] | null; error?: string } {
    this.initialize();
    
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      return { success: false, previousState: null, error: 'Snapshot not found' };
    }

    if (snapshot.rolledBack) {
      return { success: false, previousState: null, error: 'Snapshot already rolled back' };
    }

    // Mark as rolled back
    snapshot.rolledBack = true;
    snapshot.rolledBackAt = new Date().toISOString();
    snapshot.rollbackSessionId = rollbackSessionId;
    this.persist();

    return {
      success: true,
      previousState: snapshot.previousStockState,
    };
  }

  /**
   * Undo the last import (rollback to the state before the last commit)
   */
  undoLastImport(
    currentStockState: any[],
    rollbackSessionId: string
  ): { success: boolean; previousState: any[] | null; snapshot: VersionSnapshot | null; error?: string } {
    this.initialize();
    
    const latest = this.getLatestSnapshot();
    if (!latest) {
      return { success: false, previousState: null, snapshot: null, error: 'No imports to undo' };
    }

    if (latest.rolledBack) {
      return { success: false, previousState: null, snapshot: null, error: 'Latest import already undone' };
    }

    const result = this.rollbackToSnapshot(latest.id, rollbackSessionId);
    return {
      ...result,
      snapshot: latest,
    };
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(id: string): boolean {
    this.initialize();
    const index = this.snapshots.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.snapshots.splice(index, 1);
    this.persist();
    return true;
  }

  /**
   * Clear all snapshots
   */
  clearAll(): void {
    this.snapshots = [];
    this.persist();
  }

  /**
   * Get the count of available snapshots
   */
  get count(): number {
    this.initialize();
    return this.snapshots.length;
  }

  /**
   * Get total stock value restored across all rollbacks
   */
  get totalRolledBackValue(): number {
    this.initialize();
    return this.snapshots
      .filter(s => s.rolledBack)
      .reduce((sum, s) => sum + Math.abs(s.stockValueChange), 0);
  }

  /**
   * Get total rows imported across all snapshots
   */
  get totalImportedRows(): number {
    this.initialize();
    return this.snapshots.reduce((sum, s) => sum + s.rowsAdded, 0);
  }

  /**
   * Clean up expired snapshots (older than RETENTION_DAYS)
   */
  private cleanupExpired(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => new Date(s.timestamp) > cutoff);
    
    if (this.snapshots.length !== before) {
      this.persist();
    }
  }

  /**
   * Persist snapshots to localStorage
   */
  private persist(): void {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(this.snapshots));
    } catch (e) {
      console.warn('Failed to persist snapshots:', e);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═════════════════════════════════════════════════════════════════════

export const undoManager = new UndoManager();
export default undoManager;