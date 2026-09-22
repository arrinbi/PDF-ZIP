import JSZip from 'jszip';
import type { GeneratedZipResult, ImageItem, ZipOptions } from '../types';

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
 * Generates a ZIP archive containing the exact original uploaded images,
 * renamed by their current display order in two-digit zero-padded format.
 * No re-encoding, compression, or format conversion is applied.
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

  for (let i = 0; i < totalCount; i++) {
    const item = images[i];
    const ext = getFileExtension(item.file?.name || item.name, item.type);
    const filename = formatNumberedFilename(i, ext);

    // Add exact original File byte-for-byte to ZIP archive
    zip.file(filename, item.file);

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
