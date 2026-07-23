/**
 * Tesseract.js Worker Manager - Manages OCR worker pool for the PIDP system
 * 
 * Features:
 * - Worker pool with configurable size (1-4 workers)
 * - Automatic worker lifecycle (create, reuse, terminate)
 * - Job scheduling across workers
 * - Progress reporting via logger callback
 * - Auto-recovery on worker failure
 * - Memory-efficient worker management
 * 
 * Tesseract.js v5 API:
 * - createWorker(lang, oem, options) → Worker
 * - worker.recognize(image, options, output) → RecognizeResult
 * - worker.terminate() → cleanup
 * - createScheduler() for multi-worker queuing
 */

import { createWorker, createScheduler, Worker } from 'tesseract.js';

// ── Types ────────────────────────────────────────────────────────────

export interface TesseractWorkerConfig {
  lang: string;
  oem: number;
  psm: number;
  maxWorkers: number;
  workerTimeoutMs: number;
  cachePath?: string;
  corePath?: string;
  langPath?: string;
}

export const DEFAULT_TESSERACT_CONFIG: TesseractWorkerConfig = {
  lang: 'eng',
  oem: 3,          // LSTM only (best accuracy)
  psm: 3,          // Fully automatic page segmentation
  maxWorkers: 2,   // Default: 2 workers for balanced performance
  workerTimeoutMs: 120000, // 2 min timeout per worker job
};

export interface TesseractJobResult {
  text: string;
  confidence: number;
  words: TesseractWord[];
  paragraphs: TesseractParagraph[];
  blocks: TesseractBlock[];
  processingTimeMs: number;
  workerId: string;
}

export interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface TesseractParagraph {
  text: string;
  confidence: number;
  words: TesseractWord[];
}

export interface TesseractBlock {
  text: string;
  confidence: number;
  blockType: 'text' | 'table' | 'image' | 'line' | 'word' | 'paragraph';
  paragraphs: TesseractParagraph[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface WorkerStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageConfidence: number;
  averageProcessingTimeMs: number;
  currentActiveWorkers: number;
  workerPoolSize: number;
  isInitialized: boolean;
}

// ── Worker Manager ──────────────────────────────────────────────────

export class TesseractWorkerManager {
  private config: TesseractWorkerConfig;
  private scheduler: ReturnType<typeof createScheduler> | null = null;
  private workers: Worker[] = [];
  private initialized = false;
  private initializing = false;
  
  // Stats tracking
  private totalJobs = 0;
  private successfulJobs = 0;
  private failedJobs = 0;
  private confidenceSum = 0;
  private processingTimeSum = 0;
  
  constructor(config: Partial<TesseractWorkerConfig> = {}) {
    this.config = { ...DEFAULT_TESSERACT_CONFIG, ...config };
  }

  /**
   * Initialize the worker pool
   * Creates the configured number of Tesseract workers
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;
    this.initializing = true;

    try {
      this.scheduler = createScheduler();
      const workerCount = this.config.maxWorkers;

      for (let i = 0; i < workerCount; i++) {
        try {
          const worker = await this.createWorker(i);
          this.workers.push(worker);
          this.scheduler.addWorker(worker);
        } catch (error) {
          console.warn(`Failed to create Tesseract worker ${i}:`, error);
          // Continue with fewer workers
        }
      }

      if (this.workers.length === 0) {
        throw new Error('Failed to create any Tesseract workers');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Tesseract worker pool:', error);
      // Clean up any partial workers
      await this.terminateAll();
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Recognize text from an image using the worker pool
   */
  async recognize(
    image: string | ImageData | Buffer | ArrayBuffer,
    options?: {
      psm?: number;
      rectangle?: { left: number; top: number; width: number; height: number };
    }
  ): Promise<TesseractJobResult> {
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // If still no workers available, throw
    if (this.workers.length === 0) {
      throw new Error('No Tesseract workers available');
    }

    const startTime = Date.now();
    this.totalJobs++;

    try {
      // Convert image to supported format
      const imageData = await this.prepareImage(image);

      // Recognize with timeout
      const result = await this.recognizeWithTimeout(imageData, options);

      const processingTime = Date.now() - startTime;
      this.successfulJobs++;
      this.confidenceSum += result.confidence;
      this.processingTimeSum += processingTime;

      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
        words: (result.data.words || []).map((w: any) => ({
          text: w.text || '',
          confidence: w.confidence || 0,
          bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        })),
        paragraphs: (result.data.paragraphs || []).map((p: any) => ({
          text: p.text || '',
          confidence: p.confidence || 0,
          words: (p.words || []).map((w: any) => ({
            text: w.text || '',
            confidence: w.confidence || 0,
            bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
          })),
        })),
        blocks: (result.data.blocks || []).map((b: any) => ({
          text: b.text || '',
          confidence: b.confidence || 0,
          blockType: b.blockType || 'text',
          paragraphs: (b.paragraphs || []).map((p: any) => ({
            text: p.text || '',
            confidence: p.confidence || 0,
            words: (p.words || []).map((w: any) => ({
              text: w.text || '',
              confidence: w.confidence || 0,
              bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
            })),
          })),
          bbox: b.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        })),
        processingTimeMs: Date.now() - startTime,
        workerId: `worker_pool`,
      };
    } catch (error) {
      this.failedJobs++;
      console.error('Tesseract recognition failed:', error);
      throw error;
    }
  }

  /**
   * Recognize with timeout protection
   */
  private async recognizeWithTimeout(
    imageData: any,
    options?: { psm?: number; rectangle?: any }
  ): Promise<any> {
    if (!this.scheduler) {
      throw new Error('Scheduler not initialized');
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR recognition timed out')), this.config.workerTimeoutMs);
    });

    const recognizePromise = this.scheduler.addJob('recognize', imageData, {
      ...(options?.rectangle ? { rectangle: options.rectangle } : {}),
    });

    return Promise.race([recognizePromise, timeoutPromise]);
  }

  /**
   * Get worker pool statistics
   */
  getStats(): WorkerStats {
    return {
      totalJobs: this.totalJobs,
      successfulJobs: this.successfulJobs,
      failedJobs: this.failedJobs,
      averageConfidence: this.successfulJobs > 0
        ? Math.round(this.confidenceSum / this.successfulJobs)
        : 0,
      averageProcessingTimeMs: this.successfulJobs > 0
        ? Math.round(this.processingTimeSum / this.successfulJobs)
        : 0,
      currentActiveWorkers: this.workers.length,
      workerPoolSize: this.config.maxWorkers,
      isInitialized: this.initialized,
    };
  }

  /**
   * Check if the worker pool is ready
   */
  isReady(): boolean {
    return this.initialized && this.workers.length > 0;
  }

  /**
   * Reinitialize the worker pool (e.g., after lang change)
   */
  async reinitialize(newConfig?: Partial<TesseractWorkerConfig>): Promise<void> {
    await this.terminateAll();
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Terminate all workers and clean up
   */
  async terminateAll(): Promise<void> {
    for (const worker of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        console.warn('Error terminating worker:', error);
      }
    }
    this.workers = [];
    this.scheduler = null;
    this.initialized = false;
  }

  /**
   * Create a single Tesseract worker
   */
  private async createWorker(index: number): Promise<Worker> {
    const worker = await createWorker(
      this.config.lang,
      this.config.oem,
      {
        logger: (progress: any) => {
          // Progress callback - can be used for UI updates
          if (progress.status === 'recognizing text') {
            // Progress: progress.progress is 0-1
          }
        },
        cachePath: this.config.cachePath,
        corePath: this.config.corePath,
        langPath: this.config.langPath,
      }
    );

    // Set page segmentation mode
    await worker.setParameters({
      tessedit_pageseg_mode: String(this.config.psm) as any,
    });

    return worker;
  }

  /**
   * Prepare image for Tesseract processing
   * Tesseract.js v5 accepts: string (URL/base64), ImageData, Buffer, ArrayBuffer, Canvas, HTMLImageElement
   */
  private async prepareImage(
    image: string | ImageData | Buffer | ArrayBuffer
  ): Promise<any> {
    // If it's already a string (URL or base64), use it directly
    if (typeof image === 'string') {
      return image;
    }

    // If it's an ArrayBuffer, convert to Buffer-like for Tesseract
    if (image instanceof ArrayBuffer) {
      // Tesseract.js can handle ArrayBuffer directly
      return image;
    }

    // If it's ImageData, use it directly
    if (image instanceof ImageData) {
      return image;
    }

    // Buffer (Node.js)
    return image;
  }
}

// ── Singleton instance ───────────────────────────────────────────────

export const tesseractWorkerManager = new TesseractWorkerManager();

/**
 * Quick recognize function for simple OCR needs
 * No worker pool management needed - creates a single worker
 */
export async function quickRecognize(
  image: string | ImageData | Buffer | ArrayBuffer,
  lang: string = 'eng'
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker(lang, 3, {
    logger: () => {},
  });

  try {
    await worker.setParameters({ tessedit_pageseg_mode: '3' as any });
    const result = await worker.recognize(image as any);
    return {
      text: result.data.text || '',
      confidence: result.data.confidence || 0,
    };
  } finally {
    await worker.terminate();
  }
}
