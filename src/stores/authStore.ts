import { create } from 'zustand';
import { User, ROLE_PERMISSIONS } from '../lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  licenseStatus: string;
  deviceId: string;
  licenseChecked: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setLicenseStatus: (status: string) => void;
  setDeviceId: (id: string) => void;
  setLicenseChecked: (checked: boolean) => void;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  licenseStatus: '',
  deviceId: '',
  licenseChecked: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setLicenseStatus: (licenseStatus) => set({ licenseStatus }),

  setDeviceId: (deviceId) => set({ deviceId }),

  setLicenseChecked: (licenseChecked) => set({ licenseChecked }),

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  },

  logout: () => set({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
  }),
}));
