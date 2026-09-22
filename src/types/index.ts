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

export type OutputFormat = 'JPG' | 'PNG' | 'WEBP';

export interface PdfOptions {
  pageSize: 'fit' | 'a4' | 'letter';
  margin: number; // margin in mm (for A4/Letter)
  filename?: string;
  outputFormat?: OutputFormat;
  quality?: number; // 0.50 to 1.00 (50% to 100%), default 0.85
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
