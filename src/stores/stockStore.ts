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
}));
