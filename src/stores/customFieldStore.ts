/**
 * Custom Field Store — Dynamic Schema for Medicine objects
 * 
 * Stores custom field definitions and values as JSON metadata.
 * Each Medicine object gets a `custom_fields` property that holds
 * key-value pairs for columns discovered during import.
 * 
 * Features:
 * - Define custom fields with type, label, and default value
 * - Store values per medicine in JSON metadata
 * - List all custom fields across all medicines
 * - Delete custom fields (removes values from all medicines)
 * - Supports: text, number, date, boolean, select types
 */

import { create } from 'zustand';
import { useStockStore } from './stockStore';
import { DetectedDataType } from '../lib/importer/types';

// ── Types ──

export interface CustomFieldMeta {
  key: string;
  label: string;
  type: DetectedDataType;
  source: 'import' | 'user';
  importSource?: string;
  createdAt: string;
  options?: string[];
  defaultValue?: any;
}

export interface CustomFieldValue {
  medicineId: number;
  fieldKey: string;
  value: any;
}

interface CustomFieldState {
  fieldDefinitions: CustomFieldMeta[];
  isLoading: boolean;

  // Actions
  loadDefinitions: () => void;
  addFieldDefinition: (field: CustomFieldMeta) => void;
  removeFieldDefinition: (key: string) => void;
  updateFieldDefinition: (key: string, updates: Partial<CustomFieldMeta>) => void;
  setFieldValue: (medicineId: number, fieldKey: string, value: any) => void;
  getFieldValue: (medicineId: number, fieldKey: string) => any;
  getAllFieldValues: (fieldKey: string) => CustomFieldValue[];
  mergeImportFields: (fields: { key: string; label: string; type: DetectedDataType }[]) => void;
  removeFieldFromAllMedicines: (fieldKey: string) => void;
  getFieldForMedicine: (medicineId: number) => Record<string, any>;
}

const STORAGE_KEY = 'anpharm_custom_field_defs';

export const useCustomFieldStore = create<CustomFieldState>((set, get) => ({
  fieldDefinitions: [],
  isLoading: false,

  loadDefinitions: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const defs = raw ? JSON.parse(raw) : [];
      set({ fieldDefinitions: defs, isLoading: false });
    } catch {
      set({ fieldDefinitions: [], isLoading: false });
    }
  },

  addFieldDefinition: (field: CustomFieldMeta) => {
    const defs = [...get().fieldDefinitions];
    // Don't add if already exists
    if (defs.some(d => d.key === field.key)) return;
    defs.push(field);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defs)); } catch {}
    set({ fieldDefinitions: defs });
  },

  removeFieldDefinition: (key: string) => {
    const defs = get().fieldDefinitions.filter(d => d.key !== key);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defs)); } catch {}
    set({ fieldDefinitions: defs });
    // Also remove values from all medicines
    get().removeFieldFromAllMedicines(key);
  },

  updateFieldDefinition: (key: string, updates: Partial<CustomFieldMeta>) => {
    const defs = get().fieldDefinitions.map(d => 
      d.key === key ? { ...d, ...updates } : d
    );
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defs)); } catch {}
    set({ fieldDefinitions: defs });
  },

  setFieldValue: (medicineId: number, fieldKey: string, value: any) => {
    const medicines = useStockStore.getState().medicines.map(m => {
      if (m.id !== medicineId) return m;
      const customFields = (m as any).custom_fields || {};
      return { ...m, custom_fields: { ...customFields, [fieldKey]: value } };
    });
    useStockStore.getState().setMedicines(medicines);
  },

  getFieldValue: (medicineId: number, fieldKey: string) => {
    const medicine = useStockStore.getState().medicines.find(m => m.id === medicineId);
    if (!medicine) return null;
    return (medicine as any).custom_fields?.[fieldKey] ?? null;
  },

  getAllFieldValues: (fieldKey: string) => {
    return useStockStore.getState().medicines
      .filter(m => (m as any).custom_fields?.[fieldKey] !== undefined)
      .map(m => ({
        medicineId: m.id,
        fieldKey,
        value: (m as any).custom_fields[fieldKey],
      }));
  },

  mergeImportFields: (fields: { key: string; label: string; type: DetectedDataType }[]) => {
    const existing = get().fieldDefinitions;
    let changed = false;

    for (const field of fields) {
      if (!existing.some(e => e.key === field.key)) {
        existing.push({
          ...field,
          source: 'import',
          createdAt: new Date().toISOString(),
        });
        changed = true;
      }
    }

    if (changed) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(existing)); } catch {}
      set({ fieldDefinitions: [...existing] });
    }
  },

  removeFieldFromAllMedicines: (fieldKey: string) => {
    const medicines = useStockStore.getState().medicines.map(m => {
      const customFields = (m as any).custom_fields || {};
      if (customFields[fieldKey] === undefined) return m;
      const { [fieldKey]: _, ...rest } = customFields;
      return { ...m, custom_fields: rest };
    });
    useStockStore.getState().setMedicines(medicines);
  },

  getFieldForMedicine: (medicineId: number) => {
    const medicine = useStockStore.getState().medicines.find(m => m.id === medicineId);
    if (!medicine) return {};
    return (medicine as any).custom_fields || {};
  },
}));
