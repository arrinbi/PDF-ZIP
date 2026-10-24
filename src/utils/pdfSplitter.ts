import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import type { SplitResultItem, SplitPdfResult } from '../types';
import { sanitizeFilename } from './fileNaming';

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
  rawBaseFilename: string = 'split_document'
): Promise<SplitPdfResult> {
  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const srcDoc = await PDFDocument.load(buffer);
  const baseFilename = sanitizeFilename(rawBaseFilename, 'split_document').replace(/\.pdf$/i, '');

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

  if (isSingle) {
    return {
      isSingle: true,
      pdf: items[0],
      files: items,
    };
  }

  // Create ZIP archive for multiple split files
  const zip = new JSZip();
  items.forEach((item) => {
    zip.file(item.filename, item.blob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const zipFilename = `${baseFilename}_split.zip`;

  return {
    isSingle: false,
    zip: {
      blob: zipBlob,
      url: zipUrl,
      sizeBytes: zipBlob.size,
      filename: zipFilename,
    },
    files: items,
  };
}
