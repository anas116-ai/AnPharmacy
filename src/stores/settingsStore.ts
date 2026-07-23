import { create } from 'zustand';

interface SettingsState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: localStorage.getItem('anpharmacy-language') || 'en',
  setLanguage: (language) => {
    localStorage.setItem('anpharmacy-language', language);
    set({ language });
  },
}));
