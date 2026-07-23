/**
 * Schema Manager — Dynamic Schema Management for Data Import Studio
 * 
 * Handles the discovery, creation, and management of custom fields
 * when imported files contain unknown columns that the user wants to
 * add to the stock schema.
 * 
 * The schema is stored in localStorage and can be extended dynamically.
 * Custom field values are stored in medicine.custom_fields as JSON.
 */

import { CustomFieldDefinition, DetectedDataType, StockSchemaField, PROTECTED_SCHEMA_FIELDS } from './types';

// ═════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═════════════════════════════════════════════════════════════════════

const CUSTOM_FIELDS_KEY = 'anpharm_custom_fields';
const CUSTOM_FIELD_VALUES_KEY = 'anpharm_custom_field_values';

// ═════════════════════════════════════════════════════════════════════
// SCHEMA MANAGER CLASS
// ═════════════════════════════════════════════════════════════════════

class SchemaManager {
  private customFields: CustomFieldDefinition[] = [];
  private initialized = false;

  /**
   * Initialize: load custom fields from localStorage
   */
  initialize(): void {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(CUSTOM_FIELDS_KEY);
      if (stored) {
        this.customFields = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load custom fields:', e);
      this.customFields = [];
    }
    this.initialized = true;
  }

  /**
   * Get all custom field definitions
   */
  getCustomFields(): CustomFieldDefinition[] {
    this.initialize();
    return [...this.customFields];
  }

  /**
   * Get all fields (protected schema + custom fields)
   */
  getAllFields(): StockSchemaField[] {
    this.initialize();
    const protectedFields = PROTECTED_SCHEMA_FIELDS;
    const customAsSchema: StockSchemaField[] = this.customFields.map(cf => ({
      key: cf.key,
      label: cf.label,
      type: this.mapDataType(cf.type),
      required: false,
      protected: false,
      unique: false,
      default: null,
    }));
    return [...protectedFields, ...customAsSchema];
  }

  /**
   * Get a field definition by key
   */
  getField(key: string): StockSchemaField | CustomFieldDefinition | undefined {
    this.initialize();
    const protectedField = PROTECTED_SCHEMA_FIELDS.find(f => f.key === key);
    if (protectedField) return protectedField;
    return this.customFields.find(f => f.key === key);
  }

  /**
   * Check if a field exists
   */
  fieldExists(key: string): boolean {
    this.initialize();
    return (
      PROTECTED_SCHEMA_FIELDS.some(f => f.key === key) ||
      this.customFields.some(f => f.key === key)
    );
  }

  /**
   * Check if a field is protected (cannot be deleted)
   */
  isProtected(key: string): boolean {
    return PROTECTED_SCHEMA_FIELDS.some(f => f.key === key);
  }

  /**
   * Generate a unique key from a column name
   */
  generateKey(columnName: string): string {
    const base = columnName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .replace(/_{2,}/g, '_');
    
    let key = base;
    let counter = 1;
    while (this.fieldExists(key)) {
      key = `${base}_${counter}`;
      counter++;
    }
    return key;
  }

  /**
   * Add a new custom field to the schema
   */
  addCustomField(
    label: string,
    type: DetectedDataType,
    source: 'import' | 'user' = 'import',
    importSource?: string,
    preferredKey?: string
  ): CustomFieldDefinition | null {
    this.initialize();
    
    const key = preferredKey || this.generateKey(label);
    
    // Check if field already exists with this key
    if (this.fieldExists(key)) {
      // If it's a custom field, return the existing one
      const existing = this.customFields.find(f => f.key === key);
      if (existing) return existing;
      return null;
    }

    const newField: CustomFieldDefinition = {
      key,
      label,
      type,
      source,
      importSource,
      values: {},
      createdAt: new Date().toISOString(),
    };

    this.customFields.push(newField);
    this.persist();
    return newField;
  }

  /**
   * Add multiple custom fields at once
   */
  addCustomFields(
    fields: Array<{ label: string; type: DetectedDataType; importSource?: string }>
  ): CustomFieldDefinition[] {
    return fields
      .map(f => this.addCustomField(f.label, f.type, 'import', f.importSource))
      .filter((f): f is CustomFieldDefinition => f !== null);
  }

  /**
   * Delete a custom field from the schema
   */
  deleteCustomField(key: string): boolean {
    this.initialize();
    
    if (this.isProtected(key)) {
      console.warn(`Cannot delete protected field: ${key}`);
      return false;
    }

    const index = this.customFields.findIndex(f => f.key === key);
    if (index === -1) return false;

    this.customFields.splice(index, 1);
    this.persist();
    
    // Also clean up values
    this.clearFieldValues(key);
    return true;
  }

  /**
   * Rename a custom field
   */
  renameCustomField(key: string, newLabel: string): boolean {
    this.initialize();
    
    const field = this.customFields.find(f => f.key === key);
    if (!field) return false;

    field.label = newLabel;
    this.persist();
    return true;
  }

  /**
   * Set a value for a custom field on a specific medicine
   */
  setFieldValue(medicineId: number, fieldKey: string, value: any): void {
    this.initialize();
    
    const field = this.customFields.find(f => f.key === fieldKey);
    if (!field) return;

    field.values[medicineId] = value;
    this.persistValues();
  }

  /**
   * Get a value for a custom field
   */
  getFieldValue(medicineId: number, fieldKey: string): any {
    this.initialize();
    
    const field = this.customFields.find(f => f.key === fieldKey);
    return field?.values[medicineId] ?? null;
  }

  /**
   * Get all values for a custom field
   */
  getFieldValues(fieldKey: string): Record<number, any> {
    this.initialize();
    
    const field = this.customFields.find(f => f.key === fieldKey);
    return field?.values || {};
  }

  /**
   * Clear all values for a field
   */
  clearFieldValues(fieldKey: string): void {
    this.initialize();
    
    const field = this.customFields.find(f => f.key === fieldKey);
    if (field) {
      field.values = {};
      this.persistValues();
    }
  }

  /**
   * Export all custom fields and their values as a plain object
   * (for backup/restore)
   */
  exportSchema(): { fields: CustomFieldDefinition[]; values: Record<string, Record<number, any>> } {
    this.initialize();
    
    const values: Record<string, Record<number, any>> = {};
    this.customFields.forEach(f => {
      values[f.key] = { ...f.values };
    });

    return {
      fields: this.customFields.map(f => ({ ...f, values: {} })),
      values,
    };
  }

  /**
   * Import schema from a backup
   */
  importSchema(data: { fields: CustomFieldDefinition[]; values: Record<string, Record<number, any>> }): void {
    this.customFields = data.fields.map(f => ({
      ...f,
      values: data.values[f.key] || {},
    }));
    this.persist();
    this.persistValues();
  }

  /**
   * Reset all custom fields
   */
  reset(): void {
    this.customFields = [];
    this.persist();
    localStorage.removeItem(CUSTOM_FIELD_VALUES_KEY);
  }

  /**
   * Get the count of custom fields
   */
  get count(): number {
    this.initialize();
    return this.customFields.length;
  }

  /**
   * Map DetectedDataType to the schema field type
   */
  private mapDataType(type: DetectedDataType): StockSchemaField['type'] {
    switch (type) {
      case 'number':
      case 'percentage':
        return 'number';
      case 'currency':
        return 'currency';
      case 'date':
        return 'date';
      case 'boolean':
        return 'boolean';
      default:
        return 'text';
    }
  }

  /**
   * Persist custom fields to localStorage
   */
  private persist(): void {
    try {
      const toStore = this.customFields.map(f => ({
        ...f,
        values: {}, // Don't store values in the main fields key
      }));
      localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.warn('Failed to persist custom fields:', e);
    }
    this.persistValues();
  }

  /**
   * Persist field values to localStorage
   */
  private persistValues(): void {
    try {
      const values: Record<string, Record<number, any>> = {};
      this.customFields.forEach(f => {
        if (Object.keys(f.values).length > 0) {
          values[f.key] = f.values;
        }
      });
      localStorage.setItem(CUSTOM_FIELD_VALUES_KEY, JSON.stringify(values));
    } catch (e) {
      console.warn('Failed to persist custom field values:', e);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═════════════════════════════════════════════════════════════════════

export const schemaManager = new SchemaManager();
export default schemaManager;