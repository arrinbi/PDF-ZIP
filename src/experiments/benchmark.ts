if (typeof Promise.try !== 'function') {
  (Promise as any).try = function <T>(fn: () => T | PromiseLike<T>): Promise<T> {
    return new Promise((resolve) => resolve(fn()));
  };
}

import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ImageItem, PdfOptions } from '../types';
import { generatePdfFromImages } from '../utils/pdfGenerator';

export interface BenchmarkMetrics {
  name: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savedBytes: number;
  reductionPercentage: number;
  durationMs: number;
  memoryUsedMB: number;
  pageCountPreserved: boolean;
  pageDimensionsPreserved: boolean;
  aspectRatioPreserved: boolean;
  croppingOrDistortion: boolean;
  visualQualityNotes: string;
}

/**
 * Creates a canvas data URL with rich visual patterns for testing.
 */
export function createTestImageDataUrl(
  type: 'photo' | 'manga' | 'document',
  width: number = 1200,
  height: number = 1600
): string {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    if (type === 'manga' || type === 'document') {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  }

  if (type === 'photo') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#ff7e5f');
    grad.addColorStop(0.5, '#feb47b');
    grad.addColorStop(1, '#6a11cb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(
        (i * 137.5) % width,
        (i * 219.3) % height,
        15 + (i % 20),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    return canvas.toDataURL('image/jpeg', 0.90);
  } else if (type === 'manga') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    ctx.lineWidth = 1;
    for (let x = 50; x < width - 50; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, height / 2);
      ctx.stroke();
    }

    const bubbleX = width / 2;
    const bubbleY = height / 3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(bubbleX, bubbleY, 180, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wait! What is this sound?!', bubbleX, bubbleY - 10);
    ctx.font = '16px serif';
    ctx.fillText('(Fine detail line art & text test)', bubbleX, bubbleY + 20);

    return canvas.toDataURL('image/png');
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('TECHNICAL DOCUMENT & MANIFEST', 60, 80);

    ctx.font = '12px monospace';
    let y = 130;
    for (let i = 1; i <= 30; i++) {
      ctx.fillText(`Line ${i}: Detailed text line with small fonts (8pt/10pt) evaluating sharpness. Hash: 0x${(i * 31337).toString(16)}`, 60, y);
      y += 24;
    }

    return canvas.toDataURL('image/png');
  }
}

/**
 * Creates representative test dataset of ImageItem objects.
 */
export function createBenchmarkDataset(): {
  photoItem: ImageItem;
  mangaItem: ImageItem;
  documentItem: ImageItem;
  standardSet: ImageItem[];
  batchSetFolder1: ImageItem[];
  batchSetFolder2: ImageItem[];
} {
  const photoUrl = createTestImageDataUrl('photo', 1600, 1200);
  const mangaUrl = createTestImageDataUrl('manga', 1200, 1800);
  const docUrl = createTestImageDataUrl('document', 1400, 1800);

  const photoItem: ImageItem = {
    id: 'photo-1',
    file: new File([], 'landscape_photo.jpg', { type: 'image/jpeg' }),
    name: 'landscape_photo.jpg',
    size: Math.round((photoUrl.length * 3) / 4),
    type: 'image/jpeg',
    previewUrl: photoUrl,
    width: 1600,
    height: 1200,
  };

  const mangaItem: ImageItem = {
    id: 'manga-1',
    file: new File([], 'manga_chapter_01.png', { type: 'image/png' }),
    name: 'manga_chapter_01.png',
    size: Math.round((mangaUrl.length * 3) / 4),
    type: 'image/png',
    previewUrl: mangaUrl,
    width: 1200,
    height: 1800,
  };

  const documentItem: ImageItem = {
    id: 'doc-1',
    file: new File([], 'spec_sheet.png', { type: 'image/png' }),
    name: 'spec_sheet.png',
    size: Math.round((docUrl.length * 3) / 4),
    type: 'image/png',
    previewUrl: docUrl,
    width: 1400,
    height: 1800,
  };

  return {
    photoItem,
    mangaItem,
    documentItem,
    standardSet: [photoItem, mangaItem, documentItem],
    batchSetFolder1: [mangaItem, photoItem],
    batchSetFolder2: [documentItem, mangaItem],
  };
}

/**
 * Helper to record memory usage in MB if available.
 */
function getMemoryUsageMB(): number {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return Math.round(((performance as any).memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
  }
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return Math.round((process.memoryUsage().heapUsed / (1024 * 1024)) * 100) / 100;
  }
  return 0;
}

/**
 * APPROACH A: Structural & object stream optimization using pdf-lib.
 */
export async function compressPdfWithPdfLib(inputBlob: Blob): Promise<{
  blob: Blob;
  durationMs: number;
  memoryUsedMB: number;
  pageCount: number;
}> {
  const startMem = getMemoryUsageMB();
  const startTime = performance.now();

  const arrayBuffer = await inputBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  // Re-save with object streams enabled
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
  const endTime = performance.now();
  const endMem = getMemoryUsageMB();

  const blob = new Blob([compressedBytes], { type: 'application/pdf' });
  return {
    blob,
    durationMs: Math.round(endTime - startTime),
    memoryUsedMB: Math.max(0, Math.round((endMem - startMem) * 100) / 100),
    pageCount,
  };
}

/**
 * APPROACH B: PDF page rendering & re-encoding via PDF.js + Canvas + jsPDF.
 */
export async function compressPdfWithPdfJsAndJsPdf(
  inputBlob: Blob,
  targetQuality = 0.75,
  renderScale = 1.0
): Promise<{
  blob: Blob;
  durationMs: number;
  memoryUsedMB: number;
  pageCount: number;
  pageDimensionsPreserved: boolean;
}> {
  const startMem = getMemoryUsageMB();
  const startTime = performance.now();

  const arrayBuffer = await inputBlob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false });
  const pdfJsDoc = await loadingTask.promise;
  const numPages = pdfJsDoc.numPages;

  let newPdf: jsPDF | null = null;
  let dimensionsPreserved = true;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfJsDoc.getPage(i);
    const viewport = page.getViewport({ scale: renderScale });

    const originalViewport = page.getViewport({ scale: 1.0 });
    const widthMm = originalViewport.width * 0.352778;
    const heightMm = originalViewport.height * 0.352778;

    let pageDataUrl = '';
    if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        try {
          await page.render({ canvasContext: ctx, viewport }).promise;
          pageDataUrl = canvas.toDataURL('image/jpeg', targetQuality);
        } catch {
          pageDataUrl = '';
        }
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    const orientation = widthMm > heightMm ? 'landscape' : 'portrait';

    if (i === 1) {
      newPdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [widthMm, heightMm],
      });
    } else if (newPdf) {
      newPdf.addPage([widthMm, heightMm], orientation);
    }

    if (newPdf && pageDataUrl) {
      newPdf.addImage(pageDataUrl, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'NONE');
    }
  }

  if (!newPdf) {
    throw new Error('Failed to re-generate PDF with PDF.js');
  }

  const outputBuffer = newPdf.output('arraybuffer');
  const blob = new Blob([outputBuffer], { type: 'application/pdf' });

  const endTime = performance.now();
  const endMem = getMemoryUsageMB();

  return {
    blob,
    durationMs: Math.round(endTime - startTime),
    memoryUsedMB: Math.max(0, Math.round((endMem - startMem) * 100) / 100),
    pageCount: numPages,
    pageDimensionsPreserved: dimensionsPreserved,
  };
}

/**
 * APPROACH D: Direct Pre-generation quality adjustment baseline.
 */
export async function generatePdfPreOptBaseline(
  images: ImageItem[],
  quality = 0.80
): Promise<{
  blob: Blob;
  durationMs: number;
  memoryUsedMB: number;
  sizeBytes: number;
}> {
  const startMem = getMemoryUsageMB();
  const startTime = performance.now();

  const options: PdfOptions = {
    pageSize: 'fit',
    margin: 0,
    outputFormat: 'JPG',
    quality,
  };

  const result = await generatePdfFromImages(images, options);

  const endTime = performance.now();
  const endMem = getMemoryUsageMB();

  return {
    blob: result.blob,
    durationMs: Math.round(endTime - startTime),
    memoryUsedMB: Math.max(0, Math.round((endMem - startMem) * 100) / 100),
    sizeBytes: result.sizeBytes,
  };
}
