import { create } from 'zustand';
import { Medicine } from '../lib/types';
import { useStockStore } from './stockStore';

export interface DeletedMedicine extends Medicine {
  deleted_at: string;
  deleted_by?: number;
}

interface RecycleBinState {
  deletedItems: DeletedMedicine[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadDeletedItems: () => Promise<void>;
  refreshStockStore: () => Promise<void>;
  moveToBin: (medicine: Medicine) => Promise<boolean>;
  moveManyToBin: (medicines: Medicine[]) => Promise<number>;
  restoreFromBin: (itemId: number) => Promise<boolean>;
  restoreManyFromBin: (itemIds: number[]) => Promise<number>;
  permanentDelete: (itemId: number) => Promise<boolean>;
  permanentDeleteMany: (itemIds: number[]) => Promise<number>;
  emptyBin: () => Promise<boolean>;
}

export const useRecycleBinStore = create<RecycleBinState>((set, get) => ({
  deletedItems: [],
  isLoading: false,
  error: null,

  loadDeletedItems: async () => {
    set({ isLoading: true, error: null });
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getDeletedStock();
        if (result.success) {
          set({ deletedItems: (result.deletedItems || []).map((item: any) => ({
            ...item,
            deleted_at: item.deleted_at || new Date().toISOString(),
            status: item.status || 'deleted',
          })), isLoading: false });
        } else {
          set({ error: result.error || 'Failed to load deleted items', isLoading: false });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load deleted items', isLoading: false });
    }
  },

  // Helper: refresh the stock store from the backend after bin operations
  refreshStockStore: async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listStock();
        if (result.success) {
          useStockStore.getState().setMedicines(result.medicines || []);
          // Also refresh dashboard stats
          const dashResult = await window.electronAPI.getDashboardStats();
          if (dashResult.success) {
            useStockStore.getState().setDashboardStats(dashResult.stats);
          }
        }
      }
    } catch {}
  },

  moveToBin: async (medicine: Medicine): Promise<boolean> => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteToBin({ id: medicine.id });
        if (result.success) {
          await get().loadDeletedItems();
          await get().refreshStockStore();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  moveManyToBin: async (medicines: Medicine[]): Promise<number> => {
    let successCount = 0;
    for (const medicine of medicines) {
      const ok = await get().moveToBin(medicine);
      if (ok) successCount++;
    }
    if (successCount > 0) {
      await get().loadDeletedItems();
      await get().refreshStockStore();
    }
    return successCount;
  },

  restoreFromBin: async (itemId: number): Promise<boolean> => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.restoreFromBin({ id: itemId });
        if (result.success) {
          await get().loadDeletedItems();
          await get().refreshStockStore();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  restoreManyFromBin: async (itemIds: number[]): Promise<number> => {
    let successCount = 0;
    for (const id of itemIds) {
      const ok = await get().restoreFromBin(id);
      if (ok) successCount++;
    }
    return successCount;
  },

  permanentDelete: async (itemId: number): Promise<boolean> => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.permanentDeleteStock({ id: itemId });
        if (result.success) {
          set(state => ({
            deletedItems: state.deletedItems.filter(item => item.id !== itemId)
          }));
          await get().refreshStockStore();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  permanentDeleteMany: async (itemIds: number[]): Promise<number> => {
    let successCount = 0;
    for (const id of itemIds) {
      const ok = await get().permanentDelete(id);
      if (ok) successCount++;
    }
    return successCount;
  },

  emptyBin: async (): Promise<boolean> => {
    try {
      const items = get().deletedItems;
      if (window.electronAPI && items.length > 0) {
        for (const item of items) {
          await window.electronAPI.permanentDeleteStock({ id: item.id });
        }
      }
      set({ deletedItems: [] });
      await get().refreshStockStore();
      return true;
    } catch {
      return false;
    }
  },
}));
