import type {
  BatchFolder,
  DiscoveredSubfolder,
  ExportMode,
  ExportResult,
  ImageItem,
  ParentFolderScanResult,
  PdfOptions,
  ZipOptions,
} from '../types';
import { getImageDimensionsFromFile } from './imageOptimizer';
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
 * Scans a list of files selected from a parent directory (via webkitdirectory)
 * and discovers immediate subfolders containing valid image files (JPG, JPEG, PNG, WEBP).
 */
export function scanParentFolder(files: File[]): ParentFolderScanResult {
  const allowedFiles = files.filter(isAllowedImageFile);

  if (allowedFiles.length === 0) {
    return { parentFolderName: '', subfolders: [] };
  }

  // Extract parent folder name from first file's webkitRelativePath
  const firstPath = allowedFiles[0].webkitRelativePath || allowedFiles[0].name;
  const firstParts = firstPath.split('/');
  const parentFolderName = firstParts.length > 1 ? firstParts[0] : 'Parent Folder';

  // Group allowed files by immediate subfolder (parts[1] if parts.length >= 3)
  const groupMap = new Map<string, File[]>();

  for (const file of allowedFiles) {
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/');
    let subfolderName = '';

    if (parts.length >= 3) {
      subfolderName = parts[1];
    } else if (parts.length === 2) {
      subfolderName = `${parentFolderName} (Root)`;
    } else {
      subfolderName = 'Root';
    }

    if (!groupMap.has(subfolderName)) {
      groupMap.set(subfolderName, []);
    }
    groupMap.get(subfolderName)!.push(file);
  }

  // Sort subfolder names naturally
  const sortedSubfolderNames = Array.from(groupMap.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const subfolders: DiscoveredSubfolder[] = sortedSubfolderNames.map((name, index) => {
    const rawFiles = groupMap.get(name)!;
    const sortedFiles = sortFilesNaturally(rawFiles);
    return {
      id: `subfolder-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      files: sortedFiles,
      imageCount: sortedFiles.length,
    };
  });

  return {
    parentFolderName,
    subfolders,
  };
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
    let width = 1000;
    let height = 1000;

    try {
      const dims = await getImageDimensionsFromFile(file);
      width = dims.width;
      height = dims.height;
    } catch {
      // Fallback if image dimension reader fails
    }

    imageItems.push({
      id,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'image/jpeg',
      previewUrl: '', // Efficient: do not pre-load base64 Data URLs for batch processing
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
