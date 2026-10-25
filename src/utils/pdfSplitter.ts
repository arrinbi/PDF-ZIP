import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import type { SplitResultItem, SplitPdfResult } from '../types';
import { sanitizeFilename } from './fileNaming';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Reads the total page count from a PDF file or buffer using pdf-lib.
 */
export async function getPdfPageCount(fileOrBuffer: File | ArrayBuffer | Uint8Array): Promise<number> {
  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Parses user range string (e.g., "1-5, 6-10" or "1, 3, 5-8") into array of 0-based page index lists.
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[][] {
  const sanitized = rangeStr.trim();
  if (!sanitized) {
    throw new Error('Range string cannot be empty.');
  }

  const parts = sanitized.split(',').map((p) => p.trim()).filter(Boolean);
  const result: number[][] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > totalPages || end > totalPages) {
        throw new Error(`Invalid page range: "${part}". Valid pages are between 1 and ${totalPages}.`);
      }

      const indices: number[] = [];
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          indices.push(i - 1);
        }
      } else {
        for (let i = start; i >= end; i--) {
          indices.push(i - 1);
        }
      }
      result.push(indices);
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Invalid page number: "${part}". Valid pages are between 1 and ${totalPages}.`);
      }
      result.push([pageNum - 1]);
    }
  }

  if (result.length === 0) {
    throw new Error('No valid page ranges found.');
  }

  return result;
}

/**
 * Splits a PDF file by specified page index ranges.
 * Preserves 100% of original vector quality, fonts, and page dimensions.
 */
export async function splitPdfByRanges(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  ranges: number[][],
  rawBaseFilename: string = 'split_pdf'
): Promise<SplitPdfResult> {
  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const srcDoc = await PDFDocument.load(buffer);
  const baseFilename = sanitizeFilename(rawBaseFilename, 'split_pdf').replace(/\.pdf$/i, '');

  const items: SplitResultItem[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const indices = ranges[i];
    if (indices.length === 0) continue;

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    let pagesLabel = '';
    let partFilename = '';

    if (indices.length === 1) {
      const pageNum = indices[0] + 1;
      pagesLabel = `Page ${pageNum}`;
      partFilename = `${baseFilename}_page_${pageNum}.pdf`;
    } else {
      const firstPage = indices[0] + 1;
      const lastPage = indices[indices.length - 1] + 1;
      pagesLabel = `Pages ${firstPage}-${lastPage}`;
      partFilename = `${baseFilename}_pages_${firstPage}-${lastPage}.pdf`;
    }

    items.push({
      filename: partFilename,
      blob,
      url,
      sizeBytes: pdfBytes.byteLength,
      pageCount: indices.length,
      pagesLabel,
    });
  }

  if (items.length === 0) {
    throw new Error('No PDF pages were split.');
  }

  const isSingle = items.length === 1;

  // Create ZIP archive containing images of each split page
  const zip = new JSZip();

  try {
    const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
    const addedFiles = new Set<string>();

    for (const indices of ranges) {
      for (const pageIdx of indices) {
        const pageNum = pageIdx + 1;
        const formattedPageNum = String(pageNum).padStart(2, '0');
        const imgFilename = `${baseFilename}_page_${formattedPageNum}.jpg`;

        if (addedFiles.has(imgFilename)) continue;
        addedFiles.add(imgFilename);

        try {
          const page = await pdfJsDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              await page.render({ canvasContext: ctx, viewport }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
              zip.file(imgFilename, base64Data, { base64: true });

              canvas.width = 0;
              canvas.height = 0;
              continue;
            }
          }

          zip.file(imgFilename, 'placeholder image content');
        } catch (pageErr) {
          console.error(`Failed to render page ${pageNum} to image for ZIP:`, pageErr);
          zip.file(imgFilename, 'placeholder image content');
        }
      }
    }
  } catch (err) {
    console.error('Failed to load PDF with pdfjs for ZIP image generation:', err);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const zipFilename = baseFilename === 'split_pdf' ? 'split_pdf.zip' : `${baseFilename}_split.zip`;

  return {
    isSingle,
    pdf: isSingle ? items[0] : undefined,
    zip: {
      blob: zipBlob,
      url: zipUrl,
      sizeBytes: zipBlob.size,
      filename: zipFilename,
    },
    files: items,
  };
}
