import type { OptimizationOptions } from '../types';

export const DEFAULT_MAX_DIMENSION = 8192; // Max dimension reference
export const DEFAULT_QUALITY = 1.0; // Preserve 100% original quality

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
 * Returns original image data directly without canvas re-encoding or compression.
 */
export async function optimizeSingleImage(
  dataUrl: string,
  origWidth: number,
  origHeight: number,
  _options: OptimizationOptions = {}
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const base64Str = dataUrl.split(',')[1] || '';
  const sizeBytes = Math.round((base64Str.length * 3) / 4);

  return {
    dataUrl,
    width: origWidth,
    height: origHeight,
    sizeBytes,
  };
}
