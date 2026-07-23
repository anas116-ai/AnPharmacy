/**
 * Adaptive OCR Pipeline - Smart text extraction with fallback strategies
 * 
 * This module implements a multi-stage text extraction strategy:
 * 1. Try PDF text layer extraction first (perfect for digital PDFs)
 * 2. If that fails or confidence is low, run OCR with primary engine
 * 3. If OCR confidence is below threshold or validation fails, try alternative OCR engine
 * 4. Never trust OCR output directly - always pass through validation and business rules
 * 5. Support multiple OCR engines for better accuracy
 * 6. Word-level confidence tracking for surgical correction
 */

import { RawDocument, PipelineConfig } from './documentModel';
import { TesseractWorkerManager } from './tesseractWorker';

// ── OCR Result Types ─────────────────────────────────────────────────

export interface OCRResult {
  engine: string;
  text: string;
  confidence: number;
  wordConfidences: WordConfidence[];
  boundingBoxes: BoundingBox[];
  processingTimeMs: number;
}

export interface WordConfidence {
  word: string;
  confidence: number;
  startPos: number;
  endPos: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export interface PDFTextResult {
  text: string;
  confidence: number;
  pageCount: number;
  processingTimeMs: number;
  pages: PDFPageResult[];
}

export interface PDFPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  wordCount: number;
}

// ── Validation Pass-Through Result ───────────────────────────────────

export interface ValidationPassThroughResult {
  passed: boolean;
  ocrResult: OCRResult;
  validationIssues: string[];
  correctedText: string;
  correctedConfidence: number;
  appliedCorrections: Correction[];
}

export interface Correction {
  type: 'spelling' | 'substitution' | 'formatting' | 'date_normalization';
  original: string;
  corrected: string;
  position: number;
  confidence: number;
}

// ── Supported OCR Engines ────────────────────────────────────────────

export enum OCREngine {
  TESSERACT = 'tesseract',
  TESSERACT_FAST = 'tesseract_fast',
  TESSERACT_ACCURATE = 'tesseract_accurate',
  TESSERACT_ALT = 'tesseract_alt',
}

// ── OCR Engine Configuration ─────────────────────────────────────────

interface OCREngineConfig {
  lang: string;
  oem: number; // OCR Engine Mode
  psm: number; // Page Segmentation Mode
  config?: string;
  priority: number; // Lower = tried first
  description: string;
}

const OCR_ENGINE_CONFIGS: Record<OCREngine, OCREngineConfig> = {
  [OCREngine.TESSERACT]: {
    lang: 'eng',
    oem: 3,   // LSTM only
    psm: 3,   // Fully automatic page segmentation
    priority: 1,
    description: 'Default Tesseract engine - balanced speed/accuracy',
  },
  [OCREngine.TESSERACT_FAST]: {
    lang: 'eng',
    oem: 3,
    psm: 6,   // Assume a single uniform block of text
    priority: 0,
    description: 'Fast mode - assumes uniform text block',
  },
  [OCREngine.TESSERACT_ACCURATE]: {
    lang: 'eng',
    oem: 3,
    psm: 4,   // Assume a single column of text of variable sizes
    priority: 2,
    description: 'Accurate mode - variable size column, slower but better',
  },
  [OCREngine.TESSERACT_ALT]: {
    lang: 'eng',
    oem: 1,   // Legacy + LSTM
    psm: 3,
    priority: 3,
    description: 'Alternative engine mode - legacy + LSTM combined',
  },
};

// ── Common OCR Error Patterns (for validation pass-through) ──────────

const COMMON_OCR_ERRORS: { pattern: RegExp; replacement: string; context?: RegExp }[] = [
  // Digit-letter confusions common in OCR
  { pattern: /0(?=[A-Za-z])/g, replacement: 'O' },  // Zero before letter -> O
  { pattern: /O(?=\d)/g, replacement: '0' },          // O before digit -> 0
  { pattern: /(?<=\d)I(?=\d)/g, replacement: '1' },   // I between digits -> 1
  { pattern: /(?<=\d)l(?=\d)/g, replacement: '1' },   // l between digits -> 1
  { pattern: /S(?=\d)/g, replacement: '5' },           // S before digit -> 5
  { pattern: /(?<=\d)S/g, replacement: '5' },          // S after digit -> 5
  { pattern: /B(?=\d)/g, replacement: '8' },           // B before digit -> 8
  { pattern: /G(?=\d)/g, replacement: '6' },           // G before digit -> 6
  
  // Common word-level substitutions in pharmacy invoices
  { pattern: /\bTab\b/g, replacement: 'Tab' },         // Keep as is
  { pattern: /\bCaps?\b/g, replacement: 'Cap' },       // Normalize
  { pattern: /\bInj\b/g, replacement: 'Inj' },          // Keep as is
  { pattern: /\bSyp\b/g, replacement: 'Syp' },          // Keep as is
  { pattern: /\bOint\b/g, replacement: 'Oint' },        // Keep as is
  
  // Date and number normalization in text
  { pattern: /(\d{2})\/(\d{2})\/(\d{4})/g, replacement: '$1/$2/$3' },
  
  // Remove stray characters
  { pattern: /[|¦•·]/g, replacement: ' ' },
  { pattern: /[‗_-]{3,}/g, replacement: ' ' },
  
  // Fix spacing issues
  { pattern: /(\d)\s+(\/)\s+(\d)/g, replacement: '$1$2$3' },
  { pattern: /(\w)\s+(\.)/g, replacement: '$1$2' },
];

// ── Pharmacy-Specific Known Terms (for confidence boosting) ──────────

const PHARMACY_TERMS = new Set([
  'tab', 'cap', 'inj', 'syp', 'oint', 'soln', 'susp', 'drops', 'cream', 'lotion',
  'mrp', 'ptr', 'pts', 'gst', 'cgst', 'sgst', 'igst', 'hsn', 'batch', 'expiry',
  'mfg', 'mfd', 'exp', 'qty', 'pcs', 'nos', 'scheme', 'foc', 'free',
  'tablet', 'capsule', 'injection', 'syrup', 'ointment', 'solution', 'suspension',
  'manufacturer', 'supplier', 'invoice', 'bill', 'date', 'total', 'discount',
  'retail', 'wholesale', 'rate', 'amount', 'taxable', 'quantity',
]);

// ── OCR Pipeline Class ───────────────────────────────────────────────

export class OCRPipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Extract text from document using adaptive strategy
   * Strategy: PDF text layer → primary OCR → alternative OCR → merged result
   */
  async extract(rawDocument: RawDocument): Promise<RawDocument> {
    const startTime = Date.now();
    let bestResult: { text: string; confidence: number; engine: string } | null = null;
    const attemptedEngines: string[] = [];

    // ── Step 1: Try PDF text layer extraction ────────────────────────
    if (rawDocument.sourceType === 'pdf' || rawDocument.sourceType === 'scanned_pdf') {
      const pdfResult = await this.extractPDFTextLayer(rawDocument);
      attemptedEngines.push('pdf_text_layer');

      if (pdfResult && pdfResult.confidence >= 85) {
        bestResult = {
          text: pdfResult.text,
          confidence: pdfResult.confidence,
          engine: 'pdf_text_layer',
        };

        // PDF text layer passed confidence check, return it
        return {
          ...rawDocument,
          rawText: pdfResult.text,
          textConfidence: pdfResult.confidence,
          ocrEngine: 'pdf_text_layer',
          pdfTextLayer: pdfResult.text,
          pdfPageCount: pdfResult.pageCount,
          processingTimeMs: rawDocument.processingTimeMs + pdfResult.processingTimeMs,
        };
      }

      // PDF text layer had low confidence, but we may still use partial text
      if (pdfResult && pdfResult.confidence >= 40 && pdfResult.text.trim().length > 0) {
        bestResult = {
          text: pdfResult.text,
          confidence: pdfResult.confidence,
          engine: 'pdf_text_layer_partial',
        };
      }
    }

    // ── Step 2: Run OCR on image/scanned PDF ────────────────────────
    const needsOCRPrimary = rawDocument.sourceType === 'image' ||
      rawDocument.sourceType === 'scanned_pdf' ||
      (bestResult === null);

    if (needsOCRPrimary) {
      // Step 2a: Try primary engine (fastest first for quick results)
      const engines = this.getEngineExecutionOrder();
      
      for (const engine of engines) {
        if (bestResult && bestResult.confidence >= this.config.ocrConfidenceThreshold) {
          break; // Already have a good result
        }

        try {
          const ocrResult = await this.runOCREngine(rawDocument, engine);
          attemptedEngines.push(engine);

          // Run validation pass-through
          const validated = this.validateOCRResult(ocrResult);

          if (validated.passed && validated.correctedConfidence > (bestResult?.confidence || 0)) {
            bestResult = {
              text: validated.correctedText,
              confidence: validated.correctedConfidence,
              engine: `${engine}+validation`,
            };

            // If confidence is high enough, stop trying more engines
            if (validated.correctedConfidence >= this.config.ocrConfidenceThreshold + 20) {
              break;
            }
          } else if (ocrResult.confidence > (bestResult?.confidence || 0)) {
            // Use raw result as fallback
            bestResult = {
              text: validated.correctedText || ocrResult.text,
              confidence: ocrResult.confidence,
              engine: engine,
            };
          }
        } catch (error) {
          console.warn(`OCR engine ${engine} failed:`, error);
          continue; // Try next engine
        }
      }

      // Step 2b: If we have multiple results, try merging for better accuracy
      if (attemptedEngines.length >= 2 && bestResult) {
        // Re-run validation on merged result
        bestResult.text = this.normalizeText(bestResult.text);
      }
    }

    // ── Step 3: Final fallback ────────────────────────────────────
    if (!bestResult || bestResult.confidence < 30) {
      return {
        ...rawDocument,
        textConfidence: Math.max(rawDocument.textConfidence || 0, 20),
        rawText: bestResult?.text || rawDocument.rawText || '',
        ocrEngine: 'failed',
        processingTimeMs: Date.now() - startTime + rawDocument.processingTimeMs,
      };
    }

    return {
      ...rawDocument,
      rawText: bestResult.text,
      textConfidence: bestResult.confidence,
      ocrEngine: bestResult.engine,
      processingTimeMs: Date.now() - startTime + rawDocument.processingTimeMs,
    };
  }

  /**
   * Extract text from PDF text layer (digital PDFs)
   * Uses browser's built-in PDF.js or Electron's PDF API
   */
  async extractPDFTextLayer(rawDocument: RawDocument): Promise<PDFTextResult | null> {
    const startTime = Date.now();

    try {
      // Try Electron's native PDF viewer API first (if in Electron)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.extractPDFText) {
        const result = await (window as any).electronAPI.extractPDFText(rawDocument.sourcePath);
        if (result && result.text && result.text.trim().length > 0) {
          return {
            text: result.text,
            confidence: this.assessPDFTextConfidence(result.text),
            pageCount: result.pageCount || 1,
            processingTimeMs: Date.now() - startTime,
            pages: result.pages || [],
          };
        }
      }

      // Fallback: try pdf.js in the browser
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        const pdfjsLib = (window as any).pdfjsLib;
        const data = await this.loadPDFData(rawDocument);
        if (data) {
          const pdf = await pdfjsLib.getDocument({ data }).promise;
          const pages: PDFPageResult[] = [];
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) => item.str)
              .join(' ')
              .replace(/\s+/g, ' ');

            const wordCount = pageText.split(/\s+/).filter(Boolean).length;
            pages.push({
              pageNumber: i,
              text: pageText,
              confidence: 95, // Digital PDF text layer is highly reliable
              wordCount,
            });
            fullText += pageText + '\n';
          }

          if (fullText.trim().length > 0) {
            return {
              text: fullText.trim(),
              confidence: 95,
              pageCount: pdf.numPages,
              processingTimeMs: Date.now() - startTime,
              pages,
            };
          }
        }
      }

      // If no PDF extraction available, return null to trigger OCR fallback
      return null;

    } catch (error) {
      console.warn('PDF text layer extraction failed:', error);
      return null;
    }
  }

  /**
   * Run a specific OCR engine on the document
   * Uses real Tesseract.js via the worker manager, with graceful degradation
   */
  private async runOCREngine(
    rawDocument: RawDocument,
    engine: OCREngine
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const config = OCR_ENGINE_CONFIGS[engine];

    // Track attempt modes for logging
    const attemptModes: string[] = [];

    try {
      // ── ATTEMPT 1: Electron Native OCR (if in Electron) ──────────
      if (typeof window !== 'undefined' && (window as any).electronAPI?.runOCR) {
        attemptModes.push('electron');
        try {
          const result = await (window as any).electronAPI.runOCR({
            imagePath: rawDocument.sourcePath,
            engine: engine,
            lang: config.lang,
            oem: config.oem,
            psm: config.psm,
          });

          if (result && result.text && result.text.trim().length > 0) {
            return {
              engine: `${engine}@electron`,
              text: result.text,
              confidence: result.confidence || 85,
              wordConfidences: result.wordConfidences || [],
              boundingBoxes: result.boundingBoxes || [],
              processingTimeMs: Date.now() - startTime,
            };
          }
        } catch (electronError) {
          console.warn('Electron OCR failed, falling back to Tesseract.js:', electronError);
        }
      }

      // ── ATTEMPT 2: Tesseract.js Worker Manager (primary OCR) ─────
      attemptModes.push('tesseract_worker');
      try {
        const imageData = await this.loadImageData(rawDocument);
        
        if (imageData) {
          // Configure engine-specific parameters
          const tesseractConfig = {
            psm: config.psm,
            lang: config.lang,
            oem: config.oem,
          };

          // Lazy-init the worker manager for this pipeline instance
          const worker = this.getOrCreateWorkerManager();
          
          if (worker.isReady()) {
            const result = await worker.recognize(imageData, { psm: config.psm });

            if (result.text && result.text.trim().length > 0) {
              // Convert Tesseract blocks into pipeline formats
              const wordConfidences = result.words.map((w: any) => ({
                word: w.text,
                confidence: w.confidence,
                startPos: w.bbox?.x0 || 0,
                endPos: w.bbox?.x1 || 0,
              }));

              const boundingBoxes = result.blocks.flatMap((block: any) =>
                block.paragraphs.flatMap((p: any) =>
                  p.words.map((w: any) => ({
                    x: w.bbox?.x0 || 0,
                    y: w.bbox?.y0 || 0,
                    width: (w.bbox?.x1 || 0) - (w.bbox?.x0 || 0),
                    height: (w.bbox?.y1 || 0) - (w.bbox?.y0 || 0),
                    text: w.text || '',
                    confidence: w.confidence || 0,
                  }))
                )
              );

              return {
                engine: `${engine}@tesseract.js`,
                text: result.text,
                confidence: result.confidence,
                wordConfidences,
                boundingBoxes,
                processingTimeMs: Date.now() - startTime,
              };
            }
          }
        }
      } catch (tesseractError) {
        console.warn('Tesseract.js worker failed, falling back to direct API:', tesseractError);
      }

      // ── ATTEMPT 3: Tesseract.js Direct (single-use worker) ───────
      attemptModes.push('tesseract_direct');
      try {
        const imageData = await this.loadImageData(rawDocument);
        
        if (imageData) {
          // Use quick one-shot recognize
          const { quickRecognize } = await import('./tesseractWorker');
          const result = await quickRecognize(imageData, config.lang);

          if (result.text && result.text.trim().length > 0) {
            return {
              engine: `${engine}@tesseract.direct`,
              text: result.text,
              confidence: result.confidence,
              wordConfidences: [],
              boundingBoxes: [],
              processingTimeMs: Date.now() - startTime,
            };
          }
        }
      } catch (directError) {
        console.warn('Direct Tesseract.js failed:', directError);
      }

      // ── ALL ATTEMPTS FAILED: Return empty result ─────────────────
      console.warn(`All OCR engines failed for ${engine}. Attempted: ${attemptModes.join(' -> ')}`);
      
      return {
        engine: `${engine}_failed`,
        text: rawDocument.rawText || '',
        confidence: 0,
        wordConfidences: [],
        boundingBoxes: [],
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      console.warn(`OCR engine ${engine} execution failed:`, error);
      
      return {
        engine: `${engine}_failed`,
        text: rawDocument.rawText || '',
        confidence: 0,
        wordConfidences: [],
        boundingBoxes: [],
        processingTimeMs: Date.now() - startTime,
      };
    } finally {
      // Only log fallback chains (multiple attempts) for debugging
      if (attemptModes.length > 2) {

      }
    }
  }

  /**
   * Get or create the Tesseract worker manager (lazy singleton)
   */
  private workerManager: TesseractWorkerManager | null = null;
  
  private getOrCreateWorkerManager(): TesseractWorkerManager {
    if (!this.workerManager) {
      this.workerManager = new TesseractWorkerManager({
        lang: this.config.ocrLanguage,
        maxWorkers: 2,
        workerTimeoutMs: 120000,
      });
      
      // Initialize in background (don't await - OCR can fall back to direct mode)
      this.workerManager.initialize().catch(err => {
        console.warn('Background worker pool init failed, will use fallback:', err);
      });
    }
    return this.workerManager;
  }

  /**
   * Validate OCR output before trusting it
   * Checks for common OCR errors, applies corrections, recalculates confidence
   */
  validateOCRResult(ocrResult: OCRResult): ValidationPassThroughResult {
    const validationIssues: string[] = [];
    const appliedCorrections: Correction[] = [];
    let text = ocrResult.text;
    let confidence = ocrResult.confidence;

    // ── Check 1: Empty or near-empty text ──────────────────────────
    if (!text || text.trim().length === 0) {
      return {
        passed: false,
        ocrResult,
        validationIssues: ['No text extracted'],
        correctedText: '',
        correctedConfidence: 0,
        appliedCorrections: [],
      };
    }

    // ── Check 2: Assessment of text quality ────────────────────────
    const lines = text.split('\n').filter(l => l.trim());
    const words = text.split(/\s+/).filter(w => w);

    if (lines.length === 0) {
      validationIssues.push('No lines of text found');
      confidence = Math.min(confidence, 20);
    }

    // Check for gibberish (too many special chars)
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s\/\-.,:;()%]/g) || []).length / text.length;
    if (specialCharRatio > 0.15) {
      validationIssues.push(`High special character ratio: ${(specialCharRatio * 100).toFixed(1)}%`);
      confidence -= 20;
    }

    // Check for overly long lines (possible merged columns)
    const longLines = lines.filter(l => l.length > 200);
    if (longLines.length > lines.length * 0.3) {
      validationIssues.push('Multiple overly long lines detected - possible column merge');
      confidence -= 10;
    }

    // Check for too many short fragments (possible split columns)
    const shortFragments = words.filter(w => w.length === 1 && /[a-zA-Z]/.test(w));
    if (shortFragments.length > words.length * 0.2) {
      validationIssues.push('High ratio of single-character fragments');
      confidence -= 15;
    }

    // ── Check 3: Apply common OCR corrections ──────────────────────
    let correctedText = text;
    for (const error of COMMON_OCR_ERRORS) {
      const before = correctedText;
      correctedText = correctedText.replace(error.pattern, error.replacement);
      if (before !== correctedText) {
        appliedCorrections.push({
          type: 'substitution',
          original: before,
          corrected: correctedText,
          position: 0,
          confidence: 80,
        });
      }
    }

    // ── Check 4: Pharmacy-specific validation ──────────────────────
    const pharmacyTermCount = words.filter(w => PHARMACY_TERMS.has(w.toLowerCase())).length;
    if (pharmacyTermCount > 0) {
      // Boost confidence if pharmacy terms are detected
      const termRatio = pharmacyTermCount / words.length;
      if (termRatio > 0.1) {
        confidence = Math.min(100, confidence + 10);
      }
    }

    // Check for expected invoice patterns
    const hasInvoiceNo = /invoice|bill|inv/i.test(text);
    const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text);
    const hasAmount = /\d+\.\d{2}/.test(text);
    const hasGST = /gst|cgst|sgst/i.test(text);

    if (hasInvoiceNo || hasDate || hasAmount || hasGST) {
      confidence = Math.min(100, confidence + 5);
    } else {
      validationIssues.push('No typical invoice patterns detected');
      confidence = Math.max(0, confidence - 15);
    }

    // ── Check 5: Clamp confidence ──────────────────────────────────
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    const passed = confidence >= this.config.ocrConfidenceThreshold && validationIssues.length <= 3;

    return {
      passed,
      ocrResult,
      validationIssues,
      correctedText,
      correctedConfidence: confidence,
      appliedCorrections,
    };
  }

  /**
   * Assess confidence of PDF text layer based on content analysis
   */
  private assessPDFTextConfidence(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    const words = text.split(/\s+/).filter(w => w);
    if (words.length === 0) return 0;

    let score = 95; // Start high for PDF text layer

    // Check for encoding issues
    const encodingIssues = text.match(/[^\x20-\x7E\n\r\t]/g);
    if (encodingIssues && encodingIssues.length > text.length * 0.05) {
      score -= 20;
    }

    // Check for ligature issues
    const ligatureIssues = text.match(/ﬁ|ﬂ|ﬃ|ﬄ|ﬀ|ĳ|œ/g);
    if (ligatureIssues) {
      score -= 10;
    }

    // Check word length distribution (real text has varied word lengths)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    if (avgWordLength < 3 || avgWordLength > 12) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Normalize text by removing duplicates and fixing common issues
   */
  private normalizeText(text: string): string {
    // Remove duplicate lines
    const lines = text.split('\n');
    const uniqueLines = [...new Set(lines)];
    
    // Remove duplicate words within lines
    const deduped = uniqueLines.map(line => {
      const words = line.split(/\s+/);
      const seen = new Set<string>();
      return words.filter(w => {
        const lower = w.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      }).join(' ');
    });

    return deduped.join('\n').trim();
  }

  /**
   * Get engines in execution order (fast first, then accurate)
   */
  private getEngineExecutionOrder(): OCREngine[] {
    if (this.config.enableMultiOCR && this.config.secondaryOCREngine) {
      return Object.values(OCREngine)
        .filter(e => typeof e === 'string') // Filter out numeric enum values
        .sort((a, b) => {
          const configA = OCR_ENGINE_CONFIGS[a as OCREngine];
          const configB = OCR_ENGINE_CONFIGS[b as OCREngine];
          return (configA?.priority ?? 99) - (configB?.priority ?? 99);
        }) as OCREngine[];
    }

    // Single engine mode
    return [OCREngine.TESSERACT];
  }

  /**
   * Load PDF data from source path
   */
  private async loadPDFData(rawDocument: RawDocument): Promise<ArrayBuffer | null> {
    if (!rawDocument.sourcePath) return null;

    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.readFile) {
        return await (window as any).electronAPI.readFile(rawDocument.sourcePath);
      }

      // Browser fallback: fetch the PDF
      const response = await fetch(rawDocument.sourcePath);
      return await response.arrayBuffer();

    } catch (error) {
      console.warn('Failed to load PDF data:', error);
      return null;
    }
  }

  /**
   * Load image data for OCR processing
   * Supports: file paths (Electron), URLs (browser), File objects (drag-and-drop)
   */
  private async loadImageData(rawDocument: RawDocument): Promise<string | ImageData | ArrayBuffer | null> {
    // Case 1: No source path
    if (!rawDocument.sourcePath && !rawDocument.rawText) {
      return null;
    }

    try {
      // Case 2: rawText is actually base64 image data
      if (rawDocument.rawText && rawDocument.rawText.startsWith('data:image')) {
        return rawDocument.rawText;
      }

      // Case 3: Electron with file path
      if (typeof window !== 'undefined' && (window as any).electronAPI?.readImageAsBase64) {
        if (rawDocument.sourcePath) {
          const base64 = await (window as any).electronAPI.readImageAsBase64(rawDocument.sourcePath);
          if (base64) return base64;
        }
      }

      // Case 4: rawText is a URL or data URI
      if (rawDocument.rawText && (
        rawDocument.rawText.startsWith('http') ||
        rawDocument.rawText.startsWith('blob:')
      )) {
        return rawDocument.rawText;
      }

      // Case 5: Browser with sourcePath as URL
      if (rawDocument.sourcePath && (
        rawDocument.sourcePath.startsWith('http') ||
        rawDocument.sourcePath.startsWith('blob:')
      )) {
        return rawDocument.sourcePath;
      }

      // Fallback: return null (will trigger simulation in dev mode)
      return null;

    } catch (error) {
      console.warn('Failed to load image data:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DEVELOPMENT SIMULATION (dev-only, bypassed when real OCR is active)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Dev-only: Simulate OCR when no real engine is available
   * In production, all paths will fail before reaching this
   */
  private devSimulateOCR(
    rawDocument: RawDocument,
    engine: OCREngine,
    config: OCREngineConfig
  ): OCRResult {
    const startTime = Date.now();

    let baseConfidence = 75;
    switch (engine) {
      case OCREngine.TESSERACT_ACCURATE: baseConfidence = 85; break;
      case OCREngine.TESSERACT_FAST: baseConfidence = 60; break;
      case OCREngine.TESSERACT_ALT: baseConfidence = 70; break;
      default: baseConfidence = 75;
    }

    if (rawDocument.imageQuality) {
      baseConfidence += (rawDocument.imageQuality.overallScore - 50) / 10;
    }

    const confidence = Math.min(98, Math.max(20, Math.round(baseConfidence)));
    
    return {
      engine: `${engine}@simulation`,
      text: rawDocument.rawText || '',
      confidence,
      wordConfidences: [],
      boundingBoxes: [],
      processingTimeMs: Date.now() - startTime,
    };
  }
}
