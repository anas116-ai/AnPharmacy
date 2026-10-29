import { create } from 'zustand';
import { User, ROLE_PERMISSIONS } from '../lib/types';

/** Session keys — localStorage survives a full app restart, sessionStorage a refresh only. */
const SESSION_KEY = 'anpharmacy.session';

interface PersistedSession {
  user: User;
  remember: boolean;
}

/**
 * Read the stored session so a hard refresh (Ctrl+Shift+R) lands back inside the
 * app instead of bouncing to the landing page.
 */
function readSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession> | null;
    const user = parsed?.user;
    if (!user || !user.username || !user.role) return null;
    return { user, remember: parsed?.remember !== false };
  } catch {
    return null;
  }
}

function writeSession(user: User, remember: boolean) {
  try {
    const payload = JSON.stringify({ user, remember } satisfies PersistedSession);
    if (remember) {
      localStorage.setItem(SESSION_KEY, payload);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode / quota) — the session simply
    // stays in memory for this tab.
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Route key so the last visited module is restored after a refresh. */
export const ROUTE_STORAGE_KEY = 'anpharmacy.route';

function clearRoute() {
  try {
    localStorage.removeItem(ROUTE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  licenseStatus: string;
  deviceId: string;
  licenseChecked: boolean;
  setUser: (user: User | null, remember?: boolean) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setLicenseStatus: (status: string) => void;
  setDeviceId: (id: string) => void;
  setLicenseChecked: (checked: boolean) => void;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
}

const restored = readSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: restored?.user ?? null,
  isAuthenticated: !!restored?.user,
  isInitialized: false,
  isLoading: false,
  licenseStatus: '',
  deviceId: '',
  licenseChecked: false,

  setUser: (user, remember = true) => {
    if (user) writeSession(user, remember);
    else clearSession();
    set({ user, isAuthenticated: !!user });
  },

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

  logout: () => {
    clearSession();
    clearRoute();
    set({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
    });
  },
}));
