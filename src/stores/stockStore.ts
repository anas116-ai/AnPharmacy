import { create } from 'zustand';
import { Medicine, DashboardStats } from '../lib/types';

interface StockState {
  medicines: Medicine[];
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  setMedicines: (medicines: Medicine[]) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshAll: () => Promise<void>;
}

export const useStockStore = create<StockState>((set) => ({
  medicines: [],
  dashboardStats: null,
  isLoading: false,
  error: null,

  setMedicines: (medicines) => set({ medicines }),
  setDashboardStats: (dashboardStats) => set({ dashboardStats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Refresh medicines + dashboard stats from backend after any stock mutation
  refreshAll: async () => {
    if (!window.electronAPI) return;
    try {
      const [stockResult, dashResult] = await Promise.all([
        window.electronAPI.listStock(),
        window.electronAPI.getDashboardStats(),
      ]);
      if (stockResult.success) set({ medicines: stockResult.medicines || [] });
      if (dashResult.success) set({ dashboardStats: dashResult.stats });
    } catch {}
  },
}));
