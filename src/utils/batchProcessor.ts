import type { BatchFolder, ExportMode, ImageItem, PdfOptions, ZipOptions, ExportResult } from '../types';
import { readImageData } from './imageOptimizer';
import { generatePdfFromImages } from './pdfGenerator';
import { generateZipFromImages } from './zipGenerator';

/**
 * Checks if a file is an allowed image type for batch processing (JPG, JPEG, PNG, WEBP).
 */
export function isAllowedImageFile(file: File): boolean {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && allowedMimeTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  return /\.(jpg|jpeg|png|webp)$/i.test(file.name);
}

/**
 * Extracts folder name and relative path from a File object selected via webkitdirectory.
 */
export function getRelativePathAndFolderName(file: File): { folderName: string; relativePath: string } {
  // webkitRelativePath format is "FolderName/SubFolder/filename.jpg" or "FolderName/filename.jpg"
  const relPath = file.webkitRelativePath || file.name;
  const parts = relPath.split('/');
  const folderName = parts.length > 1 ? parts[0] : 'Folder';
  return { folderName, relativePath: relPath };
}

/**
 * Sorts files naturally (e.g. 01.jpg, 02.jpg, 10.jpg or page1.png, page2.png).
 */
export function sortFilesNaturally(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

/**
 * Parses files from a selected folder (via input directory or drag drop) and returns a BatchFolder item.
 * Filters out non-image files and sorts image files naturally.
 */
export async function createBatchFolderFromFiles(files: File[], customFolderName?: string): Promise<BatchFolder | null> {
  const allowedFiles = files.filter(isAllowedImageFile);
  if (allowedFiles.length === 0) {
    return null;
  }

  const sortedFiles = sortFilesNaturally(allowedFiles);

  let folderName = customFolderName;
  if (!folderName) {
    const { folderName: extractedName } = getRelativePathAndFolderName(sortedFiles[0]);
    folderName = extractedName;
  }

  const imageItems: ImageItem[] = [];
  for (const file of sortedFiles) {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let previewUrl = '';
    let width = 1000;
    let height = 1000;

    try {
      const imgData = await readImageData(file);
      previewUrl = imgData.previewUrl;
      width = imgData.width;
      height = imgData.height;
    } catch {
      // Fallback if image data reader fails (e.g., in headless test env)
    }

    imageItems.push({
      id,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'image/jpeg',
      previewUrl,
      width,
      height,
      status: 'idle',
    });
  }

  return {
    id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    folderName: folderName || 'Selected Folder',
    images: imageItems,
  };
}

/**
 * Runs processing on a single batch folder based on export mode (PDF or ZIP).
 */
export async function processBatchFolder(
  batch: BatchFolder,
  exportMode: ExportMode,
  options: {
    pdfOptions?: Partial<PdfOptions>;
    zipOptions?: Partial<ZipOptions>;
  },
  onProgress?: (currentStep: number, totalSteps: number) => void
): Promise<ExportResult> {
  if (exportMode === 'pdf') {
    const pdfOpts: PdfOptions = {
      pageSize: 'fit',
      margin: options.pdfOptions?.margin ?? 0,
      filename: batch.folderName,
      outputFormat: options.pdfOptions?.outputFormat ?? 'JPG',
      quality: options.pdfOptions?.quality ?? 0.85,
    };
    const pdfResult = await generatePdfFromImages(batch.images, pdfOpts, onProgress);
    return { mode: 'pdf', pdf: pdfResult };
  } else {
    const zipOpts: ZipOptions = {
      filename: batch.folderName,
      outputFormat: options.zipOptions?.outputFormat ?? 'ORIGINAL',
      quality: options.zipOptions?.quality ?? 0.85,
    };
    const zipResult = await generateZipFromImages(batch.images, zipOpts, onProgress);
    return { mode: 'zip', zip: zipResult };
  }
}
