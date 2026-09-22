import type { OptimizationOptions } from '../types';

export const DEFAULT_MAX_DIMENSION = 8192; // Avoid unnecessary downscaling while preventing canvas overflow and upscaling
export const DEFAULT_QUALITY = 0.85; // Balanced JPEG compression (85%) for clear line art and text readability while optimizing PDF file size

/**
 * Calculates new width and height respecting max dimension and maintaining aspect ratio.
 */
export function calculateTargetDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number = DEFAULT_MAX_DIMENSION
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: Math.max(1, origWidth), height: Math.max(1, origHeight) };
  }

  const maxOriginal = Math.max(origWidth, origHeight);
  if (maxOriginal <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  const scaleFactor = maxDimension / maxOriginal;
  return {
    width: Math.round(origWidth * scaleFactor),
    height: Math.round(origHeight * scaleFactor),
  };
}

/**
 * Formats byte sizes into human readable strings (e.g., 1.2 MB, 450 KB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Reads an image File and returns image dimensions and preview data URL.
 */
export function readImageData(file: File): Promise<{ previewUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          previewUrl: dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image structure.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes an image using HTML Canvas with balanced compression.
 * White background added for transparent PNG/WEBP conversion to JPEG.
 */
export async function optimizeSingleImage(
  dataUrl: string,
  origWidth: number,
  origHeight: number,
  options: OptimizationOptions = {}
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(origWidth, origHeight, maxDim);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context from canvas'));
          return;
        }

        // Fill background with white (handles transparent PNG/WEBP cleanly)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw scaled image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Compress to JPEG format
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate size in bytes from base64 string
        const base64Str = optimizedDataUrl.split(',')[1] || '';
        const sizeBytes = Math.round((base64Str.length * 3) / 4);

        resolve({
          dataUrl: optimizedDataUrl,
          width: targetWidth,
          height: targetHeight,
          sizeBytes,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to process image canvas'));
    img.src = dataUrl;
  });
}
