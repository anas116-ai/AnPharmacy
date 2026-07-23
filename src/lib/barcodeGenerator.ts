export interface BarcodeOptions {
  format: 'qrcode' | 'code128' | 'code39' | 'ean13' | 'upc';
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export const generateBarcode = async (options: BarcodeOptions): Promise<string> => {
  const { format, value, width = 2, height = 80, displayValue = true } = options;

  // For QR codes, we'll use a simple canvas-based approach
  if (format === 'qrcode') {
    return generateQRCode(value, width, height);
  }

  // For other barcode formats, use a library-like approach
  return generateLinearBarcode(format, value, width, height, displayValue);
};

const generateQRCode = (value: string, width: number, height: number): string => {
  // Simple QR code generation using canvas
  const size = Math.max(width * 25, 150);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Generate a simple pattern (in production, use a proper QR library like qrcode)
  const cellSize = Math.floor(size / 25);
  ctx.fillStyle = '#000000';

  // Create a deterministic pattern based on the value
  const hash = simpleHash(value);
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      // Position patterns (corners)
      const isPositionPattern = 
        (i < 7 && j < 7) || 
        (i < 7 && j >= 18) || 
        (i >= 18 && j < 7);

      if (isPositionPattern) {
        // Draw position pattern
        const isBorder = i === 0 || i === 6 || j === 0 || j === 6 || 
                        i === 18 || i === 24 || j === 18 || j === 24;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4 ||
                       i >= 20 && i <= 22 && j >= 2 && j <= 4 ||
                       i >= 2 && i <= 4 && j >= 20 && j <= 22;
        
        if (isBorder || isInner) {
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      } else {
        // Data pattern
        const shouldFill = ((hash * (i + 1) * (j + 1)) % 3) !== 0;
        if (shouldFill) {
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  return canvas.toDataURL('image/png');
};

const generateLinearBarcode = (
  format: string,
  value: string,
  width: number,
  height: number,
  displayValue: boolean
): string => {
  const canvas = document.createElement('canvas');
  const barWidth = width;
  const totalWidth = value.length * barWidth * 7 + (displayValue ? 40 : 0);
  canvas.width = totalWidth;
  canvas.height = height + (displayValue ? 20 : 0);
  const ctx = canvas.getContext('2d')!;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, canvas.height);

  // Generate barcode pattern
  ctx.fillStyle = '#000000';
  let x = 10;

  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    const pattern = generateBarcodePattern(charCode, format);
    
    pattern.forEach((barWidth, index) => {
      if (barWidth) {
        ctx.fillRect(x, 0, barWidth * width, height);
      }
      x += barWidth * width;
    });
  }

  // Draw text if needed
  if (displayValue) {
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(value, totalWidth / 2, height + 15);
  }

  return canvas.toDataURL('image/png');
};

const generateBarcodePattern = (charCode: number, format: string): number[] => {
  // Simplified barcode pattern generation
  const patterns: number[] = [];
  const binary = charCode.toString(2).padStart(8, '0');
  
  for (let i = 0; i < binary.length; i++) {
    patterns.push(1); // Bar
    patterns.push(parseInt(binary[i])); // Space (width varies)
  }
  
  return patterns;
};

const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const downloadBarcode = (barcodeDataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = barcodeDataUrl;
  link.download = filename;
  link.click();
};

export const generateBatchBarcode = (batchNumber: string): Promise<string> => {
  return generateBarcode({
    format: 'qrcode',
    value: batchNumber,
    width: 3,
    height: 100,
    displayValue: false,
  });
};

export const generateMedicineQRCode = (medicineData: {
  name: string;
  batch: string;
  expiry: string;
}): Promise<string> => {
  const qrValue = JSON.stringify(medicineData);
  return generateBarcode({
    format: 'qrcode',
    value: qrValue,
    width: 3,
    height: 100,
    displayValue: false,
  });
};