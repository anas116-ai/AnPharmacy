/**
 * Data Import Studio — Import Profile Store
 * 
 * Allows users to save and reuse column mapping configurations.
 * Profiles are stored in localStorage and include:
 * - Column mappings (source pattern → target field)
 * - Ignored columns
 * - Renamed columns
 * - Default values
 * - Supplier-specific validation rules
 * 
 * When a matching file is detected, user is prompted to apply the profile.
 */

import { ImportProfile, ImportSource, ProfileColumnMapping } from './types';

const STORAGE_KEY = 'anpharm_import_profiles';

// ── Helper: get all profiles from localStorage ──
function getProfiles(): ImportProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Helper: save profiles to localStorage ──
function saveProfiles(profiles: ImportProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}

// ── Generate short ID ──
function generateId(): string {
  return 'prof_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

export const importProfileStore = {
  /**
   * Get all saved import profiles
   */
  list(): ImportProfile[] {
    return getProfiles();
  },

  /**
   * Get profile by ID
   */
  get(id: string): ImportProfile | null {
    return getProfiles().find(p => p.id === id) || null;
  },

  /**
   * Find a profile by matching its name or source pattern
   * Uses multi-strategy matching:
   * 1. Exact supplier name match (highest confidence)
   * 2. File name contains profile name
   * 3. Profile name contains supplier name
   * 4. Profile keywords match file name keywords
   * 5. Most recently used profile with matching source format
   */
  findMatch(fileName: string, supplierName?: string): ImportProfile | null {
    const profiles = getProfiles();
    if (profiles.length === 0) return null;
    
    const fileLower = fileName.toLowerCase();
    const fileBase = fileLower.replace(/\.[^.]+$/, ''); // Remove extension
    const fileWords = new Set(fileBase.split(/[\s_-]+/).filter(w => w.length > 1));

    // Strategy 1: Exact supplier name match
    if (supplierName) {
      const supplierLower = supplierName.toLowerCase();
      const supplierWords = new Set(supplierLower.split(/[\s_-]+/).filter(w => w.length > 1));
      
      // Score each profile
      let bestScore = 0;
      let bestMatch: ImportProfile | null = null;
      
      for (const profile of profiles) {
        let score = 0;
        const profileLower = profile.name.toLowerCase();
        
        // Exact supplier match
        if (profile.supplierName?.toLowerCase() === supplierLower) score += 50;
        if (profile.name.toLowerCase().includes(supplierLower)) score += 30;
        
        // Word overlap between supplier name and profile name
        if (profile.supplierName) {
          const profileSupplierWords = new Set(profile.supplierName.toLowerCase().split(/[\s_-]+/).filter(w => w.length > 1));
          let overlap = 0;
          supplierWords.forEach(w => { if (profileSupplierWords.has(w)) overlap++; });
          score += overlap * 15;
        }
        
        // File name contains profile name pattern
        if (fileLower.includes(profileLower)) score += 20;
        if (profileLower.includes(fileBase)) score += 10;
        
        // File name keywords match profile name keywords
        const profileWords = new Set(profileLower.split(/[\s_-]+/).filter(w => w.length > 1));
        let wordOverlap = 0;
        fileWords.forEach(w => { if (profileWords.has(w)) wordOverlap++; });
        score += wordOverlap * 10;
        
        // Boost for frequently used profiles
        score += Math.min(profile.useCount || 0, 10);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = profile;
        }
      }
      
      if (bestScore >= 25) return bestMatch;
    }

    // Strategy 2: File name pattern matching (no supplier name)
    let bestScore = 0;
    let bestMatch: ImportProfile | null = null;

    for (const profile of profiles) {
      let score = 0;
      const profileLower = profile.name.toLowerCase();

      // File name contains profile name
      if (fileLower.includes(profileLower)) score += 25;
      
      // Profile name keywords in file name
      const profileWords = new Set(profileLower.split(/[\s_-]+/).filter(w => w.length > 1));
      let wordOverlap = 0;
      fileWords.forEach(w => { if (profileWords.has(w)) wordOverlap++; });
      score += wordOverlap * 10;
      
      // Extension match? (optional)
      // Use count boost
      score += Math.min(profile.useCount || 0, 5);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profile;
      }
    }

    return bestScore >= 15 ? bestMatch : null;
  },

  /**
   * Create a new import profile from current session mappings
   */
  create(data: {
    name: string;
    description: string;
    source: ImportSource;
    supplierName?: string;
    columnMappings: ProfileColumnMapping[];
    ignoredColumns: string[];
    renamedColumns: Record<string, string>;
    defaultValues: Record<string, any>;
  }): ImportProfile {
    const profile: ImportProfile = {
      id: generateId(),
      name: data.name,
      description: data.description,
      source: data.source,
      supplierName: data.supplierName,
      columnMappings: data.columnMappings,
      ignoredColumns: data.ignoredColumns,
      renamedColumns: data.renamedColumns,
      defaultValues: data.defaultValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0,
    };

    const profiles = getProfiles();
    profiles.push(profile);
    saveProfiles(profiles);
    return profile;
  },

  /**
   * Update an existing profile
   */
  update(id: string, updates: Partial<ImportProfile>): ImportProfile | null {
    const profiles = getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) return null;

    profiles[index] = {
      ...profiles[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveProfiles(profiles);
    return profiles[index];
  },

  /**
   * Increment use count for a profile
   */
  recordUsage(id: string): void {
    const profiles = getProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.useCount = (profile.useCount || 0) + 1;
      profile.updatedAt = new Date().toISOString();
      saveProfiles(profiles);
    }
  },

  /**
   * Delete a profile
   */
  delete(id: string): boolean {
    const profiles = getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    if (filtered.length === profiles.length) return false;
    saveProfiles(filtered);
    return true;
  },

  /**
   * Build ProfileColumnMapping[] from current session column mappings
   */
  buildProfileMappings(
    columnMappings: { sourceColumn: string; targetField: string | null }[]
  ): ProfileColumnMapping[] {
    return columnMappings
      .filter(m => m.targetField)
      .map(m => ({
        sourcePattern: m.sourceColumn,
        targetField: m.targetField!,
        confidence: 95,
      }));
  },

  /**
   * Check if a profile with this name already exists
   */
  exists(name: string): boolean {
    return getProfiles().some(p => p.name.toLowerCase() === name.toLowerCase());
  },
};
