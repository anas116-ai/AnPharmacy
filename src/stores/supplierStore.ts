import { create } from 'zustand';
import { Supplier } from '../lib/types';

interface SupplierState {
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  setSuppliers: (suppliers: Supplier[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'created_at'>) => Promise<Supplier | null>;
  updateSupplier: (id: number, supplier: Partial<Omit<Supplier, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteSupplier: (id: number) => Promise<boolean>;
  refreshSuppliers: () => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  isLoading: false,
  error: null,

  setSuppliers: (suppliers) => set({ suppliers }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addSupplier: async (supplierData) => {
    set({ isLoading: true, error: null });
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createSupplier(supplierData);
        if (result.success && result.supplier) {
          const updated = [...get().suppliers, result.supplier];
          set({ suppliers: updated, isLoading: false });
          return result.supplier;
        }
        set({ error: result.error || 'Failed to create supplier', isLoading: false });
        return null;
      }
      set({ error: 'Electron API not available', isLoading: false });
      return null;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create supplier', isLoading: false });
      return null;
    }
  },

  updateSupplier: async (id, supplierData) => {
    set({ isLoading: true, error: null });
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.updateSupplier({ id, ...supplierData });
        if (result.success) {
          const updated = get().suppliers.map(s =>
            s.id === id ? { ...s, ...supplierData } : s
          );
          set({ suppliers: updated, isLoading: false });
          return true;
        }
        set({ error: result.error || 'Failed to update supplier', isLoading: false });
        return false;
      }
      set({ error: 'Electron API not available', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update supplier', isLoading: false });
      return false;
    }
  },

  deleteSupplier: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteSupplier({ id });
        if (result.success) {
          const updated = get().suppliers.filter(s => s.id !== id);
          set({ suppliers: updated, isLoading: false });
          return true;
        }
        set({ error: result.error || 'Failed to delete supplier', isLoading: false });
        return false;
      }
      set({ error: 'Electron API not available', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete supplier', isLoading: false });
      return false;
    }
  },

  refreshSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listSuppliers();
        if (result.success) {
          set({ suppliers: result.suppliers || [], isLoading: false });
        } else {
          set({ error: result.error || 'Failed to load suppliers', isLoading: false });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load suppliers', isLoading: false });
    }
  },
}));
