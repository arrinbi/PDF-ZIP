import JSZip from 'jszip';
import type { GeneratedZipResult, ImageItem, OutputFormat, ZipOptions } from '../types';
import { processImageForPdf, DEFAULT_QUALITY } from './imageOptimizer';

/**
 * Extracts extension from filename or infers it from MIME type.
 */
export function getFileExtension(filename: string, mimeType?: string): string {
  if (filename && filename.includes('.')) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
      return filename.substring(lastDotIndex);
    }
  }

  if (mimeType) {
    const lowerType = mimeType.toLowerCase();
    if (lowerType.includes('png')) return '.png';
    if (lowerType.includes('webp')) return '.webp';
    if (lowerType.includes('gif')) return '.gif';
    if (lowerType.includes('svg')) return '.svg';
    if (lowerType.includes('jpeg') || lowerType.includes('jpg')) return '.jpg';
  }

  return '.jpg';
}

/**
 * Formats 0-based index to a two-digit (or more) zero-padded string with extension.
 * Below 100 images: 01, 02, ..., 09, 10, ..., 99
 * 100 images and above: 100, 101, ...
 */
export function formatNumberedFilename(index: number, extension: string): string {
  const numberStr = String(index + 1).padStart(2, '0');
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${numberStr}${ext}`;
}

/**
 * Generates a ZIP archive containing the uploaded images renamed by their current
 * display order in two-digit zero-padded format.
 * Supports ORIGINAL (byte-for-byte), JPG, PNG, and WEBP formats.
 */
export async function generateZipFromImages(
  images: ImageItem[],
  options: ZipOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedZipResult> {
  if (images.length === 0) {
    throw new Error('No images provided for ZIP generation.');
  }

  const zip = new JSZip();
  const totalCount = images.length;
  const outputFormat = options.outputFormat || 'ORIGINAL';
  const quality = options.quality !== undefined ? options.quality : DEFAULT_QUALITY;

  for (let i = 0; i < totalCount; i++) {
    const item = images[i];

    if (outputFormat === 'ORIGINAL') {
      const ext = getFileExtension(item.file?.name || item.name, item.type);
      const filename = formatNumberedFilename(i, ext);

      // Add exact original File byte-for-byte to ZIP archive
      zip.file(filename, item.file);
    } else {
      const targetFormat: OutputFormat | 'WEBP' = outputFormat;
      const ext = targetFormat === 'JPG' ? '.jpg' : targetFormat === 'PNG' ? '.png' : '.webp';
      const filename = formatNumberedFilename(i, ext);

      const processed = await processImageForPdf(item, targetFormat, quality);
      const base64Data = processed.dataUrl.split(',')[1] || '';

      zip.file(filename, base64Data, { base64: true });
    }

    if (onProgress) {
      onProgress(i + 1, totalCount);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  let filename = options.filename?.trim() || 'images';
  if (!filename.toLowerCase().endsWith('.zip')) {
    filename = `${filename}.zip`;
  }

  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    sizeBytes: blob.size,
    filename,
    fileCount: totalCount,
  };
}
