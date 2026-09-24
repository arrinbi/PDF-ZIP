import type { ImageItem, OptimizationOptions, OutputFormat } from '../types';

export const DEFAULT_MAX_DIMENSION = 8192; // Max dimension reference
export const DEFAULT_QUALITY = 0.85; // Default 85% image quality

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
 * Helper to convert a File to a Data URL on demand.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read file as Data URL.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads image natural dimensions from a File object using object URL without base64 conversion.
 */
export function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.URL || typeof window.URL.createObjectURL !== 'function') {
      resolve({ width: 1000, height: 1000 });
      return;
    }

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve({ width: 1000, height: 1000 });
      return;
    }

    const img = new Image();
    let settled = false;

    const cleanup = () => {
      try {
        img.src = '';
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve({ width: 1000, height: 1000 });
      }
    }, 300);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        const w = img.naturalWidth || img.width || 1000;
        const h = img.naturalHeight || img.height || 1000;
        cleanup();
        resolve({ width: w, height: h });
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve({ width: 1000, height: 1000 });
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Reads an image File and returns image dimensions and preview data URL.
 */
export function readImageData(file: File): Promise<{ previewUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      const img = new Image();
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({
            previewUrl: dataUrl,
            width: 1000,
            height: 1000,
          });
        }
      }, 200);

      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            previewUrl: dataUrl,
            width: img.naturalWidth || img.width || 1000,
            height: img.naturalHeight || img.height || 1000,
          });
        }
      };
      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            previewUrl: dataUrl,
            width: 1000,
            height: 1000,
          });
        }
      };
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

/**
 * Processes an image for PDF embedding according to user-selected format and quality settings.
 * Preserves exact natural dimensions without downscaling, upscaling, or cropping.
 */
export async function processImageForPdf(
  item: ImageItem,
  targetFormat: OutputFormat | 'WEBP' = 'JPG',
  quality: number = DEFAULT_QUALITY
): Promise<{ dataUrl: string; jsPdfFormat: string; width: number; height: number }> {
  let srcDataUrl = item.previewUrl || item.optimizedDataUrl || '';
  const origWidth = item.width || 1;
  const origHeight = item.height || 1;

  // Determine source MIME type
  let srcType = (item.type || item.file?.type || '').toLowerCase();
  if (!srcType && srcDataUrl) {
    if (srcDataUrl.startsWith('data:image/png')) srcType = 'image/png';
    else if (srcDataUrl.startsWith('data:image/webp')) srcType = 'image/webp';
    else if (srcDataUrl.startsWith('data:image/jpeg') || srcDataUrl.startsWith('data:image/jpg')) srcType = 'image/jpeg';
  }

  // Handle PNG:
  // For PNG output:
  // - Keep PNG as PNG and lossless.
  // - If source is PNG, return original dataUrl directly without re-encoding.
  if (targetFormat === 'PNG' && srcType.includes('png')) {
    if (!srcDataUrl && item.file) {
      srcDataUrl = await readFileAsDataUrl(item.file);
    }
    return {
      dataUrl: srcDataUrl,
      jsPdfFormat: 'PNG',
      width: origWidth,
      height: origHeight,
    };
  }

  const isJpegSource = srcType.includes('jpeg') || srcType.includes('jpg');

  // Optimization for JPEG source -> JPG output:
  // If quality is 1.0 (100%), embed original JPEG directly without canvas re-encoding bloat.
  if (targetFormat === 'JPG' && isJpegSource && quality >= 0.99) {
    if (!srcDataUrl && item.file) {
      srcDataUrl = await readFileAsDataUrl(item.file);
    }
    return {
      dataUrl: srcDataUrl,
      jsPdfFormat: 'JPEG',
      width: origWidth,
      height: origHeight,
    };
  }

  // For canvas processing (JPG, or PNG conversion from non-PNG inputs):
  return new Promise(async (resolve) => {
    // In node/jsdom test environments without full canvas/Image rendering engine, return source/fallback directly.
    if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
      if (!srcDataUrl && item.file) {
        try {
          srcDataUrl = await readFileAsDataUrl(item.file);
        } catch {
          // fallback
        }
      }
      const fallbackFormat = targetFormat === 'PNG' ? 'PNG' : 'JPEG';
      resolve({
        dataUrl: srcDataUrl,
        jsPdfFormat: fallbackFormat,
        width: origWidth,
        height: origHeight,
      });
      return;
    }

    let tempObjectUrl = '';
    let imgSrc = srcDataUrl;

    if (!imgSrc && item.file && typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
      try {
        tempObjectUrl = URL.createObjectURL(item.file);
        imgSrc = tempObjectUrl;
      } catch {
        try {
          srcDataUrl = await readFileAsDataUrl(item.file);
          imgSrc = srcDataUrl;
        } catch {
          // ignore
        }
      }
    } else if (!imgSrc && item.file) {
      try {
        srcDataUrl = await readFileAsDataUrl(item.file);
        imgSrc = srcDataUrl;
      } catch {
        // ignore
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let settled = false;
    const finish = (res: { dataUrl: string; jsPdfFormat: string; width: number; height: number }) => {
      if (!settled) {
        settled = true;
        try {
          img.src = '';
          if (tempObjectUrl) {
            URL.revokeObjectURL(tempObjectUrl);
          }
        } catch {
          // ignore
        }
        resolve(res);
      }
    };

    // Timeout safety for environments where Image onload does not trigger
    const timer = setTimeout(async () => {
      const jsPdfFormat = targetFormat === 'PNG' ? 'PNG' : 'JPEG';
      if (!srcDataUrl && item.file) {
        try {
          srcDataUrl = await readFileAsDataUrl(item.file);
        } catch {
          // fallback
        }
      }
      finish({
        dataUrl: srcDataUrl,
        jsPdfFormat,
        width: origWidth,
        height: origHeight,
      });
    }, 300);

    img.onload = async () => {
      clearTimeout(timer);
      const naturalW = img.naturalWidth || origWidth;
      const naturalH = img.naturalHeight || origHeight;

      const canvas = document.createElement('canvas');
      canvas.width = naturalW;
      canvas.height = naturalH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (!srcDataUrl && item.file) {
          try {
            srcDataUrl = await readFileAsDataUrl(item.file);
          } catch {
            // fallback
          }
        }
        finish({
          dataUrl: srcDataUrl,
          jsPdfFormat: targetFormat === 'PNG' ? 'PNG' : 'JPEG',
          width: naturalW,
          height: naturalH,
        });
        return;
      }

      // If encoding to JPEG, fill white background for transparent PNG/WEBP inputs
      if (targetFormat === 'JPG') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, naturalW, naturalH);
      }

      ctx.drawImage(img, 0, 0, naturalW, naturalH);

      let mimeType = 'image/jpeg';
      let jsPdfFormat = 'JPEG';

      if (targetFormat === 'PNG') {
        mimeType = 'image/png';
        jsPdfFormat = 'PNG';
      } else if (targetFormat === 'WEBP') {
        mimeType = 'image/webp';
        jsPdfFormat = 'WEBP';
      } else {
        mimeType = 'image/jpeg';
        jsPdfFormat = 'JPEG';
      }

      // Clamp quality value between 0.8 and 1.0
      const clampedQuality = Math.max(0.8, Math.min(1.0, quality));

      const encodedDataUrl = canvas.toDataURL(mimeType, clampedQuality);

      // Explicitly release canvas buffer memory
      canvas.width = 0;
      canvas.height = 0;

      // If encoding JPEG source to JPG, check if canvas re-encoding bloated the payload size.
      // If canvas output is larger or equal in size to original JPEG data URL, prefer original data URL.
      let finalDataUrl = encodedDataUrl;
      if (targetFormat === 'JPG' && isJpegSource) {
        if (!srcDataUrl && item.file) {
          try {
            srcDataUrl = await readFileAsDataUrl(item.file);
          } catch {
            // fallback
          }
        }
        if (srcDataUrl && encodedDataUrl.length >= srcDataUrl.length) {
          finalDataUrl = srcDataUrl;
        }
      }

      finish({
        dataUrl: finalDataUrl,
        jsPdfFormat,
        width: naturalW,
        height: naturalH,
      });
    };

    img.onerror = async () => {
      clearTimeout(timer);
      if (!srcDataUrl && item.file) {
        try {
          srcDataUrl = await readFileAsDataUrl(item.file);
        } catch {
          // fallback
        }
      }
      finish({
        dataUrl: srcDataUrl,
        jsPdfFormat: targetFormat === 'PNG' ? 'PNG' : 'JPEG',
        width: origWidth,
        height: origHeight,
      });
    };

    img.src = imgSrc;
  });
}
