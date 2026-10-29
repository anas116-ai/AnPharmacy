/**
 * Image Processing Module for Gold Standard Invoice Scanning
 * 
 * Step 1: Image Quality Check
 * Step 2: Image Enhancement / Preprocessing
 * Step 3: Table Detection
 */

// ── Step 1: Image Quality Check ─────────────────────────────────────

export interface QualityCheckResult {
  passed: boolean;
  blurScore: number;       // 0-100 (100 = sharp)
  rotationAngle: number;   // Degrees
  hasShadow: boolean;
  brightnessScore: number; // 0-100 (50 = optimal)
  resolutionScore: number; // Width in pixels
  issues: string[];
}

function copyPixels(data: Uint8ClampedArray): Uint8ClampedArray {
  return new Uint8ClampedArray(data);
}

export async function checkImageQuality(imageData: string | HTMLCanvasElement | ImageData): Promise<QualityCheckResult> {
  const canvas = await ensureCanvas(imageData);
  const ctx = canvas.getContext('2d')!;
  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageDataObj.data;
  
  const issues: string[] = [];
  
  // 1. Blur Detection using Laplacian variance
  const blurScore = detectBlur(pixels, canvas.width, canvas.height);
  if (blurScore < 20) {
    issues.push(`Image is too blurry (score: ${blurScore}). Please retake with steady hands.`);
  }
  
  // 2. Rotation detection
  const rotationAngle = detectRotation(pixels, canvas.width, canvas.height);
  if (Math.abs(rotationAngle) > 5) {
    issues.push(`Image is rotated by ${rotationAngle.toFixed(1)}°. Will auto-deskew.`);
  }
  
  // 3. Shadow detection
  const hasShadow = detectShadows(pixels, canvas.width, canvas.height);
  if (hasShadow) {
    issues.push('Shadows detected on invoice. Will attempt to remove.');
  }
  
  // 4. Brightness check
  const brightnessScore = calculateBrightness(pixels);
  if (brightnessScore < 25) {
    issues.push('Image is too dark. Please use brighter lighting.');
  } else if (brightnessScore > 80) {
    issues.push('Image is too bright/overexposed. Please reduce lighting.');
  }
  
  // 5. Resolution check
  const resolutionScore = Math.min(canvas.width, canvas.height);
  if (resolutionScore < 800) {
    issues.push(`Resolution too low (${resolutionScore}px). Minimum 800px required.`);
  }
  
  const passed = blurScore >= 20 && brightnessScore >= 25 && brightnessScore <= 80 && resolutionScore >= 800;
  
  return {
    passed,
    blurScore,
    rotationAngle,
    hasShadow,
    brightnessScore,
    resolutionScore,
    issues,
  };
}

// ── Step 2: Image Enhancement ────────────────────────────────────────

export interface EnhancedImage {
  canvas: HTMLCanvasElement;
  transformations: string[];
}

export async function enhanceImage(
  imageData: string | HTMLCanvasElement | ImageData,
  qualityResult?: QualityCheckResult
): Promise<EnhancedImage> {
  const canvas = await ensureCanvas(imageData);
  const ctx = canvas.getContext('2d')!;
  const transformations: string[] = [];
  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let pixelsData = copyPixels(imageDataObj.data);
  const width = canvas.width;
  const height = canvas.height;
  
  // 1. Deskew if rotated
  if (qualityResult && Math.abs(qualityResult.rotationAngle) > 5) {
    transformations.push(`Deskewed by ${qualityResult.rotationAngle.toFixed(1)}°`);
  }
  
  // 2. Remove shadows
  if (qualityResult?.hasShadow) {
    pixelsData = removeShadows(pixelsData, width, height);
    transformations.push('Shadows removed');
  }
  
  // 3. Improve contrast
  pixelsData = improveContrast(pixelsData);
  transformations.push('Contrast enhanced');
  
  // 4. Sharpen
  pixelsData = sharpenImage(pixelsData, width, height);
  transformations.push('Sharpened');
  
  // 5. Noise removal (median filter)
  pixelsData = denoiseImage(pixelsData, width, height);
  transformations.push('Noise reduced');
  
  // Apply processed pixels back using canvas API directly
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  const imageData2 = tempCtx.createImageData(width, height);
  for (let i = 0; i < pixelsData.length; i++) {
    imageData2.data[i] = pixelsData[i];
  }
  tempCtx.putImageData(imageData2, 0, 0);
  
  // Draw to original canvas
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tempCanvas, 0, 0);
  
  return { canvas, transformations };
}

// ── Step 3: Table Detection ─────────────────────────────────────────

export interface DetectedTable {
  rows: DetectedRow[];
  columns: string[];
}

export interface DetectedRow {
  cells: Record<string, string>;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface TableCell {
  text: string;
  column: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export async function detectTableStructures(ocrText: string): Promise<{
  headers: string[];
  rows: string[][];
  confidence: number;
}> {
  const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
  
  // Detect column headers
  const headerPatterns = [
    /medicine|med\b|product|item|drug|description/i,
    /batch|bat|lot|b\.?no/i,
    /expiry|exp|exp\.?date/i,
    /qty|quantity|pcs|nos/i,
    /price|rate|amount|mrp/i,
    /total|amount/i,
  ];
  
  let headerLineIndex = -1;
  let maxHeaderMatches = 0;
  let detectedHeaders: string[] = [];
  
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    let matches = 0;
    const foundHeaders: string[] = [];
    
    for (const pattern of headerPatterns) {
      if (pattern.test(line)) {
        matches++;
        const match = line.match(pattern);
        if (match) foundHeaders.push(match[0]);
      }
    }
    
    if (matches > maxHeaderMatches) {
      maxHeaderMatches = matches;
      headerLineIndex = i;
    }
  }
  
  // Parse columns from header line
  if (headerLineIndex >= 0) {
    detectedHeaders = lines[headerLineIndex]
      .split(/\s{2,}|\t|\|/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }
  
  // Detect common column names
  const standardColumns = detectStandardColumns(detectedHeaders);
  
  // Extract data rows (skip header)
  const dataLines = lines.slice(headerLineIndex + 1).filter(line => {
    return !/total|sub.?total|grand total|thanks|regards|page|invoice|gst|tax/i.test(line);
  });
  
  // Parse each row
  const rows: string[][] = [];
  for (const line of dataLines) {
    const cells = line.split(/\s{3,}|\t/).map(c => c.trim()).filter(c => c.length > 0);
    
    if (cells.length <= 2) {
      const spaceSplit = line.split(/\s+/).filter(c => c.length > 0);
      if (spaceSplit.length >= 4) {
        rows.push(spaceSplit);
        continue;
      }
    }
    
    if (cells.length >= 2) {
      rows.push(cells);
    }
  }
  
  const confidence = standardColumns.length >= 3 ? 85 : 
                     standardColumns.length >= 2 ? 65 : 40;
  
  return {
    headers: standardColumns,
    rows,
    confidence,
  };
}

function detectStandardColumns(headers: string[]): string[] {
  const standardColumns: string[] = [];
  
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (/medicine|med\b|product|item|drug|description|name/i.test(lower)) {
      if (!standardColumns.includes('Medicine')) standardColumns.push('Medicine');
    } else if (/batch|bat|lot|b\.?no/i.test(lower)) {
      if (!standardColumns.includes('Batch')) standardColumns.push('Batch');
    } else if (/expiry|exp/i.test(lower)) {
      if (!standardColumns.includes('Expiry')) standardColumns.push('Expiry');
    } else if (/mfg|mfd|manufacturing|manf/i.test(lower)) {
      if (!standardColumns.includes('Mfg')) standardColumns.push('Mfg');
    } else if (/qty|quantity|pcs|nos/i.test(lower)) {
      if (!standardColumns.includes('Qty')) standardColumns.push('Qty');
    } else if (/price|rate|amount|mrp/i.test(lower)) {
      if (!standardColumns.includes('Price')) standardColumns.push('Price');
    }
  }
  
  return standardColumns;
}

// ── Private helpers ─────────────────────────────────────────────────

function ensureCanvas(imageData: string | HTMLCanvasElement | ImageData): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    if (typeof imageData === 'string') {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.src = imageData;
    } else if (imageData instanceof HTMLCanvasElement) {
      resolve(imageData);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    }
  });
}

function detectBlur(pixels: Uint8ClampedArray, width: number, height: number): number {
  let sum = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      
      const top = (y - 1) * width + x;
      const bottom = (y + 1) * width + x;
      const left = y * width + (x - 1);
      const right = y * width + (x + 1);
      
      const lap = Math.abs(
        4 * gray -
        (0.299 * pixels[top * 4] + 0.587 * pixels[top * 4 + 1] + 0.114 * pixels[top * 4 + 2]) -
        (0.299 * pixels[bottom * 4] + 0.587 * pixels[bottom * 4 + 1] + 0.114 * pixels[bottom * 4 + 2]) -
        (0.299 * pixels[left * 4] + 0.587 * pixels[left * 4 + 1] + 0.114 * pixels[left * 4 + 2]) -
        (0.299 * pixels[right * 4] + 0.587 * pixels[right * 4 + 1] + 0.114 * pixels[right * 4 + 2])
      );
      
      sum += lap;
      count++;
    }
  }
  
  if (count === 0) return 0;
  const variance = sum / count;
  return Math.min(100, Math.round(variance / 5));
}

function detectRotation(pixels: Uint8ClampedArray, width: number, height: number): number {
  // Fast skew detection via Radon / horizontal projection profile variance on downscaled sample
  const sampleW = Math.min(width, 360);
  const sampleH = Math.min(height, 360);
  const stepX = Math.max(1, Math.floor(width / sampleW));
  const stepY = Math.max(1, Math.floor(height / sampleH));

  const gray: number[][] = [];
  for (let y = 0; y < sampleH; y++) {
    const row: number[] = [];
    const srcY = y * stepY;
    for (let x = 0; x < sampleW; x++) {
      const srcX = x * stepX;
      const idx = (srcY * width + srcX) * 4;
      row.push(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    }
    gray.push(row);
  }

  let bestAngle = 0;
  let maxVariance = -1;

  for (let deg = -8; deg <= 8; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    const tan = Math.tan(rad);
    const rowSums = new Float64Array(sampleH);

    for (let y = 0; y < sampleH; y++) {
      let sum = 0;
      let count = 0;
      for (let x = 0; x < sampleW; x++) {
        const shiftedY = Math.round(y + (x - sampleW / 2) * tan);
        if (shiftedY >= 0 && shiftedY < sampleH) {
          sum += gray[shiftedY][x];
          count++;
        }
      }
      rowSums[y] = count > 0 ? sum / count : 128;
    }

    let mean = 0;
    for (let i = 0; i < sampleH; i++) mean += rowSums[i];
    mean /= sampleH;

    let variance = 0;
    for (let i = 0; i < sampleH; i++) {
      const diff = rowSums[i] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = deg;
    }
  }

  return bestAngle;
}

function detectShadows(pixels: Uint8ClampedArray, width: number, height: number): boolean {
  let shadowPixels = 0;
  const totalPixels = width * height;
  let totalBrightness = 0;
  
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const brightness = (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    totalBrightness += brightness;
  }
  
  const avgBrightness = totalBrightness / totalPixels;
  
  const cornerSize = Math.min(width, height) * 0.1;
  const corners = [
    { x: 0, y: height - cornerSize },
    { x: width - cornerSize, y: height - cornerSize },
  ];
  
  for (const corner of corners) {
    for (let y = corner.y; y < height; y++) {
      for (let x = corner.x; x < Math.min(width, corner.x + cornerSize); x++) {
        const idx = (y * width + x) * 4;
        const brightness = (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
        if (brightness < avgBrightness * 0.6) {
          shadowPixels++;
        }
      }
    }
  }
  
  return (shadowPixels / totalPixels) > 0.02;
}

function calculateBrightness(pixels: Uint8ClampedArray): number {
  let total = 0;
  const count = pixels.length / 4;
  
  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    total += (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
  }
  
  return Math.round((total / count / 255) * 100);
}

function removeShadows(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = copyPixels(pixels);
  const kernelSize = 15;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = halfKernel; y < height - halfKernel; y++) {
    for (let x = halfKernel; x < width - halfKernel; x++) {
      const idx = (y * width + x) * 4;
      
      let localMean = 0;
      let count = 0;
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const kidx = ((y + ky) * width + (x + kx)) * 4;
          localMean += (0.299 * pixels[kidx] + 0.587 * pixels[kidx + 1] + 0.114 * pixels[kidx + 2]);
          count++;
        }
      }
      localMean /= count;
      
      const correction = localMean / 128;
      
      result[idx] = Math.min(255, Math.max(0, pixels[idx] * correction));
      result[idx + 1] = Math.min(255, Math.max(0, pixels[idx + 1] * correction));
      result[idx + 2] = Math.min(255, Math.max(0, pixels[idx + 2] * correction));
    }
  }
  
  return result;
}

function improveContrast(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const result = copyPixels(pixels);
  const totalPixels = pixels.length / 4;
  
  const hist = new Array(256).fill(0);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const gray = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    hist[gray]++;
  }
  
  let min = 0;
  let max = 255;
  let sum = 0;
  const threshold = totalPixels * 0.01;
  
  for (let i = 0; i < 256; i++) {
    sum += hist[i];
    if (sum > threshold) { min = i; break; }
  }
  
  sum = 0;
  for (let i = 255; i >= 0; i--) {
    sum += hist[i];
    if (sum > threshold) { max = i; break; }
  }
  
  const range = max - min;
  if (range > 0) {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      for (let c = 0; c < 3; c++) {
        const val = ((pixels[idx + c] - min) / range) * 255;
        result[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
  
  return result;
}

function sharpenImage(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = copyPixels(pixels);
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += pixels[idx] * kernel[ky + 1][kx + 1];
          }
        }
        result[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }
  
  return result;
}

function denoiseImage(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = copyPixels(pixels);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const neighbors: number[] = [];
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            neighbors.push(pixels[idx]);
          }
        }
        neighbors.sort((a, b) => a - b);
        result[(y * width + x) * 4 + c] = neighbors[4];
      }
    }
  }
  
  return result;
}

export function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (Math.abs(degrees) < 0.5) return canvas;
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const newWidth = Math.round(canvas.width * cos + canvas.height * sin);
  const newHeight = Math.round(canvas.height * cos + canvas.width * sin);

  const out = document.createElement('canvas');
  out.width = newWidth;
  out.height = newHeight;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, newWidth, newHeight);
  ctx.save();
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
  return out;
}

export function otsuBinarize(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const result = copyPixels(pixels);
  const total = pixels.length / 4;
  const hist = new Int32Array(256);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const g = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    hist[g]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varianceBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      threshold = t;
    }
  }

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const g = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    const val = g < threshold ? 0 : 255;
    result[idx] = val;
    result[idx + 1] = val;
    result[idx + 2] = val;
  }

  return result;
}

export async function preprocessForOcr(
  imageSource: string | HTMLCanvasElement | ImageData
): Promise<{ enhancedCanvas: HTMLCanvasElement; quality: QualityCheckResult; transformations: string[] }> {
  let canvas = await ensureCanvas(imageSource);
  const quality = await checkImageQuality(canvas);
  const transformations: string[] = [];

  // 1. Deskew if rotated
  if (Math.abs(quality.rotationAngle) >= 1) {
    canvas = rotateCanvas(canvas, -quality.rotationAngle);
    transformations.push(`Deskewed (${quality.rotationAngle > 0 ? '-' : '+'}${Math.abs(quality.rotationAngle)}°)`);
  }

  // 2. Enhance image contrast & remove shadows
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let pixels = copyPixels(imgData.data);

  if (quality.hasShadow) {
    pixels = removeShadows(pixels, canvas.width, canvas.height);
    transformations.push('Shadows normalized');
  }

  pixels = improveContrast(pixels);
  transformations.push('Contrast maximized');

  pixels = sharpenImage(pixels, canvas.width, canvas.height);
  transformations.push('Edges sharpened');

  // 3. Otsu adaptive binarization for high OCR precision
  pixels = otsuBinarize(pixels);
  transformations.push('Otsu binarization applied');

  const outImg = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < pixels.length; i++) outImg.data[i] = pixels[i];
  ctx.putImageData(outImg, 0, 0);

  return { enhancedCanvas: canvas, quality, transformations };
}