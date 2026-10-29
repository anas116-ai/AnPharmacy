import { create } from 'zustand';

export type AccentColor = 'teal' | 'ocean' | 'lavender' | 'amber';
export type Density = 'compact' | 'default' | 'comfortable';
export type FontFamily = 'inter' | 'manrope' | 'dm-sans' | 'plus-jakarta' | 'poppins' | 'roboto' | 'open-sans';
export type FontSize = 'small' | 'default' | 'medium' | 'large';

export const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string; ring: string }[] = [
  { value: 'teal', label: 'Pharmacy Teal (Default)', swatch: 'bg-[#17827A]', ring: 'ring-[#17827A]' },
  { value: 'ocean', label: 'Ocean', swatch: 'bg-[#3D93B3]', ring: 'ring-[#3D93B3]' },
  { value: 'lavender', label: 'Lavender', swatch: 'bg-[#8D82E8]', ring: 'ring-[#8D82E8]' },
  { value: 'amber', label: 'Amber', swatch: 'bg-amber-500', ring: 'ring-amber-500' },
];

/** User-selectable typography (Settings → Appearance → Typography) */
export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'dm-sans', label: 'DM Sans' },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans' },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; hint: string }[] = [
  { value: 'small', label: 'Small', hint: 'More data on screen' },
  { value: 'default', label: 'Default', hint: 'Balanced' },
  { value: 'medium', label: 'Medium', hint: 'Easier reading' },
  { value: 'large', label: 'Large', hint: 'Maximum readability' },
];

const ACCENT_KEY = 'anpharmacy-accent';
const DENSITY_KEY = 'anpharmacy-density';
const FONT_KEY = 'anpharmacy-font';
const FONT_SIZE_KEY = 'anpharmacy-font-size';

function readStored<T extends string>(key: string, fallback: T, valid: T[]): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && valid.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function applyToRoot(accent: AccentColor, density: Density, font: FontFamily, fontSize: FontSize) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-density', density);
  root.setAttribute('data-font', font);
  root.setAttribute('data-font-size', fontSize);
}

export interface AppearanceState {
  accent: AccentColor;
  density: Density;
  font: FontFamily;
  fontSize: FontSize;
  setAccent: (accent: AccentColor) => void;
  setDensity: (density: Density) => void;
  setFont: (font: FontFamily) => void;
  setFontSize: (fontSize: FontSize) => void;
}

const INITIAL_ACCENT = readStored<AccentColor>(ACCENT_KEY, 'teal', ACCENT_OPTIONS.map(o => o.value));
const INITIAL_DENSITY = readStored<Density>(DENSITY_KEY, 'default', ['compact', 'default', 'comfortable']);
const INITIAL_FONT = readStored<FontFamily>(FONT_KEY, 'inter', FONT_OPTIONS.map(o => o.value));
const INITIAL_FONT_SIZE = readStored<FontSize>(FONT_SIZE_KEY, 'default', FONT_SIZE_OPTIONS.map(o => o.value));

if (typeof document !== 'undefined') {
  applyToRoot(INITIAL_ACCENT, INITIAL_DENSITY, INITIAL_FONT, INITIAL_FONT_SIZE);
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  accent: INITIAL_ACCENT,
  density: INITIAL_DENSITY,
  font: INITIAL_FONT,
  fontSize: INITIAL_FONT_SIZE,
  setAccent: (accent) => {
    localStorage.setItem(ACCENT_KEY, accent);
    const s = useAppearanceStore.getState();
    applyToRoot(accent, s.density, s.font, s.fontSize);
    set({ accent });
  },
  setDensity: (density) => {
    localStorage.setItem(DENSITY_KEY, density);
    const s = useAppearanceStore.getState();
    applyToRoot(s.accent, density, s.font, s.fontSize);
    set({ density });
  },
  setFont: (font) => {
    localStorage.setItem(FONT_KEY, font);
    const s = useAppearanceStore.getState();
    applyToRoot(s.accent, s.density, font, s.fontSize);
    set({ font });
  },
  setFontSize: (fontSize) => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
    const s = useAppearanceStore.getState();
    applyToRoot(s.accent, s.density, s.font, fontSize);
    set({ fontSize });
  },
}));
