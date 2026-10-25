export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number; // original size in bytes
  type: string;
  previewUrl: string;
  width: number;
  height: number;
  optimizedDataUrl?: string;
  optimizedWidth?: number;
  optimizedHeight?: number;
  optimizedSize?: number; // size in bytes
  status?: 'idle' | 'optimizing' | 'done' | 'error';
}

export interface OptimizationOptions {
  maxDimension?: number; // e.g. 2400px
  quality?: number; // 0.1 to 1.0, default 0.82
}

export type OutputFormat = 'JPG' | 'PNG';

export type ZipOutputFormat = 'ORIGINAL' | 'JPG' | 'PNG' | 'WEBP';

export type ExportMode = 'pdf' | 'zip' | 'split' | 'protect' | 'hd-raw';

export type HdScaleFactor = 2 | 4;

export type HdOutputFormat = 'SAME' | 'JPG' | 'PNG' | 'WEBP';

export interface HdUpscaleOptions {
  scaleFactor: HdScaleFactor; // 2 or 4
  outputFormat: HdOutputFormat; // SAME, JPG, PNG, WEBP
  quality?: number; // 0.80 to 1.00
}

export interface HdItemResult {
  id: string;
  fileName: string;
  outputFileName: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  upscaledWidth: number;
  upscaledHeight: number;
  upscaledSize: number;
  originalPreviewUrl: string;
  upscaledPreviewUrl: string;
  blob: Blob;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
}

export interface HdBatchSummary {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  results: HdItemResult[];
  zipBlob?: Blob;
  zipUrl?: string;
  zipFileName?: string;
}

export type SplitMode = 'range' | 'every_page' | 'select';

export interface SplitResultItem {
  filename: string;
  blob: Blob;
  url: string;
  sizeBytes: number;
  pageCount: number;
  pagesLabel: string;
}

export interface SplitPdfResult {
  isSingle: boolean;
  pdf?: SplitResultItem;
  zip?: {
    blob: Blob;
    url: string;
    sizeBytes: number;
    filename: string;
  };
  files: SplitResultItem[];
}

export interface ProtectPdfResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
  filename: string;
}

export interface PdfOptions {
  pageSize: 'fit' | 'a4' | 'letter';
  margin: number; // margin in mm (for A4/Letter)
  filename?: string;
  outputFormat?: OutputFormat;
  quality?: number; // 0.50 to 1.00 (50% to 100%), default 0.85
  isPasswordProtected?: boolean;
  password?: string;
}

export interface ZipOptions {
  filename?: string;
  outputFormat?: ZipOutputFormat;
  quality?: number; // 0.80 to 1.00, default 0.85
}

export interface ProcessingProgress {
  stage: 'idle' | 'optimizing' | 'generating' | 'complete' | 'error';
  currentStep: number;
  totalSteps: number;
  message: string;
}

export interface GeneratedPdfResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
  filename: string;
  pageCount: number;
}

export interface GeneratedZipResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
  filename: string;
  fileCount: number;
}

export type ExportResult =
  | { mode: 'pdf'; pdf: GeneratedPdfResult }
  | { mode: 'zip'; zip: GeneratedZipResult };

export interface DiscoveredSubfolder {
  id: string;
  name: string;
  files: File[];
  imageCount: number;
}

export interface ParentFolderScanResult {
  parentFolderName: string;
  subfolders: DiscoveredSubfolder[];
}

export interface BatchFolder {
  id: string;
  folderName: string;
  images: ImageItem[];
}

export interface BatchResultItem {
  id: string;
  folderName: string;
  status: 'success' | 'error';
  exportResult?: ExportResult;
  filename?: string;
  downloadUrl?: string;
  sizeBytes?: number;
  errorMessage?: string;
}
