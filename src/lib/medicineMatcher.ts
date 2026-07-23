/**
 * Medicine Database Matching Engine
 * 
 * Step 5-6: Pharmacy AI Understanding & Database Matching
 * 
 * Uses multiple strategies to match OCR-extracted medicine names
 * against the existing Medicine Master database:
 * 1. Exact match
 * 2. Levenshtein distance (typo-tolerant)
 * 3. Word overlap / n-gram similarity
 * 4. Generic/Brand name mapping
 * 5. Local correction cache (learning from past corrections)
 */

export interface MatchResult {
  matched: boolean;
  medicineId?: number;
  medicineName?: string;
  similarity: number;         // 0-100
  matchType: 'exact' | 'fuzzy' | 'generic' | 'correction' | 'new';
  suggestions: Suggestion[];
  confidence: number;         // Per-field confidence for overall matching
}

export interface Suggestion {
  name: string;
  similarity: number;
  batchNumber?: string;
  company?: string;
}

interface CorrectionCache {
  [ocrText: string]: string;  // OCR text -> corrected medicine name
}

// ── Local correction cache (persisted in localStorage) ──────────────

const CORRECTION_CACHE_KEY = 'anpharmacy_ocr_corrections';

function loadCorrectionCache(): CorrectionCache {
  try {
    const data = localStorage.getItem(CORRECTION_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveCorrectionCache(cache: CorrectionCache): void {
  try {
    localStorage.setItem(CORRECTION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail if localStorage is full
  }
}

// ── Levenshtein distance ────────────────────────────────────────────

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return Math.max(0, Math.round((1 - distance / maxLen) * 100));
}

// ── Word overlap ────────────────────────────────────────────────────

function calculateWordOverlap(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  
  const overlap = wordsA.filter(w => wordsB.includes(w)).length;
  const maxWords = Math.max(wordsA.length, wordsB.length);
  
  return Math.round((overlap / maxWords) * 100);
}

// ── Normalize medicine name ─────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Known medicine database for fuzzy matching without existing stock ──

export const MEDICINE_DATABASE: string[] = [
  'Paracetamol', 'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline',
  'Metronidazole', 'Norfloxacin', 'Ofloxacin', 'Levofloxacin', 'Omeprazole',
  'Pantoprazole', 'Ranitidine', 'Esomeprazole', 'Lansoprazole', 'Amlodipine',
  'Atorvastatin', 'Telmisartan', 'Losartan', 'Metformin', 'Glimepiride',
  'Glipizide', 'Insulin', 'Montelukast', 'Levocetirizine', 'Cetirizine',
  'Fexofenadine', 'Loratadine', 'Chlorpheniramine', 'Phenylephrine', 'Pseudoephedrine',
  'Salbutamol', 'Budesonide', 'Fluticasone', 'Ibuprofen', 'Diclofenac',
  'Tramadol', 'Aspirin', 'Clopidogrel', 'Warfarin', 'Furosemide',
  'Spironolactone', 'Enalapril', 'Ramipril', 'Captopril', 'Digoxin',
  'Atenolol', 'Propranolol', 'Carvedilol', 'Metoprolol', 'Bisoprolol',
  'Cefixime', 'Cephalexin', 'Ceftriaxone', 'Cefuroxime', 'Cefadroxil',
  'Clindamycin', 'Erythromycin', 'Vitamin C', 'Vitamin D', 'Calcium',
  'Iron', 'Zinc', 'Magnesium', 'Multivitamin', 'Crocin', 'Combiflam',
  'Dolo', 'Nise', 'Voveran', 'Becosules', 'Supradyn', 'Zincovit',
  'Neurobion', 'Cobadex', 'Pantocid', 'Rantac', 'Sucral', 'Gelusil',
  'Digene', 'Rosuvas', 'Storvas', 'Amlovas', 'Angizaar', 'Coversyl',
  'Cardace', 'Asthalin', 'Ventolin', 'Foracort', 'Seretide',
  'Augmentin', 'Clavam', 'Taxim', 'Cefakind', 'Sporidex',
  'Nimulid', 'Intagesic', 'Ultracet', 'Saridon', 'Proxyvon',
  'Acyclovir', 'Fluconazole', 'Ketoconazole', 'Terbinafine',
  'Ondansetron', 'Domperidone', 'Metoclopramide', 'Gabapentin',
  'Pregabalin', 'Thyroxine', 'Prednisolone', 'Dexamethasone',
  'Hydroxychloroquine', 'Chloroquine', 'Nitroglycerin',
];

/**
 * matchMedicineFuzzy - Wrapper for quick fuzzy matching
 * Used by the table parser for medicine name verification
 */
export function matchMedicineFuzzy(
  ocrName: string,
  knownMedicines: string[] = MEDICINE_DATABASE
): { matched: string | null; similarity: number; suggestions: Suggestion[] } {
  const normalizedInput = normalizeName(ocrName);
  let bestMatch: string | null = null;
  let bestSimilarity = 0;
  const suggestions: Suggestion[] = [];

  for (const med of knownMedicines) {
    const normalizedMed = normalizeName(med);
    const levenshteinSim = calculateSimilarity(normalizedInput, normalizedMed);
    const wordOverlap = calculateWordOverlap(normalizedInput, normalizedMed);
    const combinedScore = Math.round(levenshteinSim * 0.6 + wordOverlap * 0.4);

    if (combinedScore > bestSimilarity) {
      bestSimilarity = combinedScore;
      bestMatch = med;
    }
    if (combinedScore > 40) {
      suggestions.push({ name: med, similarity: combinedScore });
    }
  }

  suggestions.sort((a, b) => b.similarity - a.similarity);

  return {
    matched: bestSimilarity >= 75 ? bestMatch : null,
    similarity: bestSimilarity,
    suggestions: suggestions.slice(0, 5),
  };
}

// ── Main matching function ──────────────────────────────────────────

export interface MedicineRecord {
  id: number;
  name: string;
  batch_number: string;
  company: string | null;
  strength: string | null;
  pack_size: string | null;
  expiry_date?: string;
}

export function matchMedicineName(
  ocrName: string,
  existingMedicines: MedicineRecord[]
): MatchResult {
  const normalizedInput = normalizeName(ocrName);
  const suggestions: Suggestion[] = [];
  
  // 0. Check correction cache first
  const cache = loadCorrectionCache();
  const cachedCorrection = cache[normalizedInput];
  if (cachedCorrection) {
    const exactMatch = existingMedicines.find(
      m => normalizeName(m.name) === normalizeName(cachedCorrection)
    );
    if (exactMatch) {
      return {
        matched: true,
        medicineId: exactMatch.id,
        medicineName: exactMatch.name,
        similarity: 99,
        matchType: 'correction',
        suggestions: [],
        confidence: 99,
      };
    }
  }
  
  // 1. Exact match
  let bestMatch: MedicineRecord | null = null;
  let bestSimilarity = 0;
  let bestMatchType: MatchResult['matchType'] = 'new';
  
  for (const medicine of existingMedicines) {
    const normalizedMedicine = normalizeName(medicine.name);
    
    // Exact match
    if (normalizedInput === normalizedMedicine) {
      return {
        matched: true,
        medicineId: medicine.id,
        medicineName: medicine.name,
        similarity: 100,
        matchType: 'exact',
        suggestions: [],
        confidence: 100,
      };
    }
    
    // Fuzzy match with Levenshtein
    const levenshteinSim = calculateSimilarity(normalizedInput, normalizedMedicine);
    
    // Word overlap
    const wordOverlap = calculateWordOverlap(normalizedInput, normalizedMedicine);
    
    // Combined score (weighted)
    const combinedScore = Math.round(levenshteinSim * 0.6 + wordOverlap * 0.4);
    
    if (combinedScore > bestSimilarity) {
      bestSimilarity = combinedScore;
      bestMatch = medicine;
    }
    
    // Add to suggestions if similarity > 50%
    if (combinedScore > 50) {
      suggestions.push({
        name: medicine.name,
        similarity: combinedScore,
        batchNumber: medicine.batch_number,
        company: medicine.company || undefined,
      });
    }
  }
  
  // Sort suggestions by similarity
  suggestions.sort((a, b) => b.similarity - a.similarity);
  
  // Determine match type
  if (bestMatch && bestSimilarity >= 90) {
    bestMatchType = 'exact';
  } else if (bestMatch && bestSimilarity >= 70) {
    bestMatchType = 'fuzzy';
  } else if (bestMatch && bestSimilarity >= 50) {
    bestMatchType = 'generic';
  } else {
    bestMatchType = 'new';
  }
  
  // Auto-match if similarity is high enough
  const autoMatchThreshold = 85;
  if (bestMatch && bestSimilarity >= autoMatchThreshold) {
    return {
      matched: true,
      medicineId: bestMatch.id,
      medicineName: bestMatch.name,
      similarity: bestSimilarity,
      matchType: bestMatchType,
      suggestions: suggestions.slice(0, 5),
      confidence: bestSimilarity,
    };
  }
  
  // Return best match suggestions without auto-matching
  return {
    matched: bestMatchType !== 'new' && bestSimilarity >= 70,
    medicineId: bestMatch?.id,
    medicineName: bestMatch?.name,
    similarity: bestSimilarity,
    matchType: bestMatchType,
    suggestions: suggestions.slice(0, 5),
    confidence: bestSimilarity,
  };
}

// ── Save user correction for local learning ─────────────────────────

export function saveCorrection(ocrText: string, correctedName: string): void {
  const cache = loadCorrectionCache();
  const normalizedInput = normalizeName(ocrText);
  cache[normalizedInput] = correctedName;
  saveCorrectionCache(cache);
}

// ── Per-field confidence system ─────────────────────────────────────

export interface FieldConfidence {
  field: string;
  value: string;
  confidence: number;
  action: 'auto_accept' | 'highlight' | 'review_required';
}

export function calculateFieldConfidence(
  field: string,
  value: string | null | undefined,
  matchResult?: MatchResult
): FieldConfidence {
  // If value is empty/null
  if (!value || value.trim() === '') {
    return {
      field,
      value: value || '',
      confidence: 0,
      action: 'review_required',
    };
  }
  
  let confidence = 100;
  
  switch (field) {
    case 'Medicine':
      if (matchResult) {
        confidence = matchResult.similarity;
      }
      break;
      
    case 'Batch':
      // Batch numbers should be alphanumeric, 3-15 chars
      if (/^[A-Z0-9-]{3,15}$/i.test(value)) {
        confidence = 95;
      } else if (value.startsWith('BATCH-')) {
        confidence = 30; // Auto-generated - needs review
      } else {
        confidence = 60;
      }
      break;
      
    case 'Expiry':
      // Valid date that's in the future
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const expiryDate = new Date(value);
        const now = new Date();
        if (expiryDate > now) {
          confidence = 95;
        } else if (expiryDate > new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
          confidence = 60; // Recently expired, might be wrong
        } else {
          confidence = 20; // Long expired - likely error
        }
      } else {
        confidence = 40;
      }
      break;
      
    case 'Qty':
      const qty = parseInt(value, 10);
      if (!isNaN(qty) && qty > 0 && qty <= 100000) {
        confidence = qty > 10000 ? 80 : 95;
      } else {
        confidence = 30;
      }
      break;
      
    case 'Mfg':
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const mfgDate = new Date(value);
        const now = new Date();
        if (mfgDate <= now && mfgDate > new Date(now.getTime() - 50 * 365 * 24 * 60 * 60 * 1000)) {
          confidence = 90;
        } else {
          confidence = 50;
        }
      } else {
        confidence = 40;
      }
      break;
      
    case 'Price':
      const price = parseFloat(value);
      if (!isNaN(price) && price > 0) {
        confidence = price > 100000 ? 70 : 95;
      } else {
        confidence = 30;
      }
      break;
      
    default:
      confidence = 70;
  }
  
  // Determine action based on confidence
  let action: FieldConfidence['action'];
  if (confidence >= 90) {
    action = 'auto_accept';
  } else if (confidence >= 70) {
    action = 'highlight';
  } else {
    action = 'review_required';
  }
  
  return { field, value, confidence, action };
}

// ── Overall confidence score ────────────────────────────────────────

export function calculateOverallConfidence(
  fieldConfidences: FieldConfidence[]
): number {
  if (fieldConfidences.length === 0) return 0;
  
  const weightedSum = fieldConfidences.reduce((sum, fc) => {
    let weight = 1;
    switch (fc.field) {
      case 'Medicine': weight = 4; break;
      case 'Batch': weight = 2; break;
      case 'Expiry': weight = 2; break;
      case 'Qty': weight = 1.5; break;
      case 'Mfg': weight = 0.5; break;
      default: weight = 1;
    }
    return sum + fc.confidence * weight;
  }, 0);
  
  const totalWeight = fieldConfidences.reduce((sum, fc) => {
    let weight = 1;
    switch (fc.field) {
      case 'Medicine': weight = 4; break;
      case 'Batch': weight = 2; break;
      case 'Expiry': weight = 2; break;
      case 'Qty': weight = 1.5; break;
      case 'Mfg': weight = 0.5; break;
      default: weight = 1;
    }
    return sum + weight;
  }, 0);
  
  return Math.round(weightedSum / totalWeight);
}

// ── Duplicate Detection ─────────────────────────────────────────────

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingInvoice?: string;
  existingItems: number;
  matchCount: number;
  action: 'skip' | 'merge' | 'replace' | 'cancel';
}

export function checkForDuplicateInvoice(
  batchNumbers: string[],
  invoiceNo: string | null,
  existingMedicines: MedicineRecord[]
): DuplicateCheckResult {
  // Check batch numbers against existing
  const matches = existingMedicines.filter(m =>
    batchNumbers.some(b => b.toLowerCase() === m.batch_number.toLowerCase())
  );
  
  if (matches.length > 0) {
    const matchCount = matches.length;
    const existingItems = existingMedicines.length;
    
    return {
      isDuplicate: true,
      existingInvoice: matchCount >= 3 ? `Invoice with ${matchCount} matching batches detected` : undefined,
      existingItems: matchCount,
      matchCount,
      action: matchCount >= 5 ? 'skip' : matchCount >= 3 ? 'merge' : 'replace',
    };
  }
  
  // Check invoice number if provided
  if (invoiceNo) {
    const invoiceMatch = existingMedicines.filter(m =>
      m.batch_number.toLowerCase().includes(invoiceNo.toLowerCase())
    );
    if (invoiceMatch.length > 0) {
      return {
        isDuplicate: true,
        existingInvoice: `Invoice number ${invoiceNo} has ${invoiceMatch.length} existing items`,
        existingItems: invoiceMatch.length,
        matchCount: invoiceMatch.length,
        action: 'merge',
      };
    }
  }
  
  return {
    isDuplicate: false,
    existingItems: 0,
    matchCount: 0,
    action: 'cancel',
  };
}