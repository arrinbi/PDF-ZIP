import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import {
  getPdfPageCount,
  parsePageRanges,
  splitPdfByRanges,
} from '../pdfSplitter';

describe('pdfSplitter utility', () => {
  let samplePdfBytes: Uint8Array;

  beforeEach(async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([200, 200]); // Page 1
    pdfDoc.addPage([200, 300]); // Page 2
    pdfDoc.addPage([300, 300]); // Page 3
    pdfDoc.addPage([400, 400]); // Page 4
    samplePdfBytes = await pdfDoc.save();
  });

  describe('getPdfPageCount', () => {
    it('returns correct number of pages from Uint8Array', async () => {
      const pageCount = await getPdfPageCount(samplePdfBytes);
      expect(pageCount).toBe(4);
    });
  });

  describe('parsePageRanges', () => {
    it('parses valid range string into 0-based index lists', () => {
      const ranges = parsePageRanges('1-2, 3-4', 4);
      expect(ranges).toEqual([
        [0, 1],
        [2, 3],
      ]);
    });

    it('parses single pages and mixed ranges', () => {
      const ranges = parsePageRanges('1, 3, 2-4', 4);
      expect(ranges).toEqual([[0], [2], [1, 2, 3]]);
    });

    it('handles reverse range (e.g. 3-1)', () => {
      const ranges = parsePageRanges('3-1', 4);
      expect(ranges).toEqual([[2, 1, 0]]);
    });

    it('throws error for empty input', () => {
      expect(() => parsePageRanges('   ', 4)).toThrow('Range string cannot be empty.');
    });

    it('throws error for out-of-range page numbers', () => {
      expect(() => parsePageRanges('1-5', 4)).toThrow('Valid pages are between 1 and 4.');
      expect(() => parsePageRanges('0, 2', 4)).toThrow('Valid pages are between 1 and 4.');
    });

    it('throws error for invalid characters', () => {
      expect(() => parsePageRanges('1-abc', 4)).toThrow('Invalid page range');
    });
  });

  describe('splitPdfByRanges', () => {
    it('returns single PDF result with ZIP archive containing images when 1 range is provided', async () => {
      const result = await splitPdfByRanges(samplePdfBytes, [[0, 1]], 'my_doc');

      expect(result.isSingle).toBe(true);
      expect(result.pdf).toBeDefined();
      expect(result.pdf?.pageCount).toBe(2);
      expect(result.pdf?.filename).toContain('my_doc_pages_1-2.pdf');

      // Verify ZIP archive is generated and contains image files instead of PDF files
      expect(result.zip).toBeDefined();
      expect(result.zip?.filename).toBe('my_doc_split.zip');

      const zip = await JSZip.loadAsync(result.zip!.blob);
      const zipFileNames = Object.keys(zip.files);
      expect(zipFileNames).toContain('my_doc_page_1.png');
      expect(zipFileNames).toContain('my_doc_page_2.png');
      expect(zipFileNames.some((name) => name.endsWith('.pdf'))).toBe(false);

      // Verify created PDF has 2 pages
      const resDoc = await PDFDocument.load(await result.pdf!.blob.arrayBuffer());
      expect(resDoc.getPageCount()).toBe(2);
    });

    it('uses split_pdf.zip as filename when baseFilename is split_pdf and contains page images', async () => {
      const result = await splitPdfByRanges(samplePdfBytes, [[0]], 'split_pdf');

      expect(result.zip).toBeDefined();
      expect(result.zip?.filename).toBe('split_pdf.zip');

      const zip = await JSZip.loadAsync(result.zip!.blob);
      const zipFileNames = Object.keys(zip.files);
      expect(zipFileNames).toContain('split_pdf_page_1.png');
      expect(zipFileNames.some((name) => name.endsWith('.pdf'))).toBe(false);
    });

    it('returns ZIP archive containing page images and file list when multiple ranges are provided', async () => {
      const result = await splitPdfByRanges(samplePdfBytes, [[0], [1, 2], [3]], 'multi_split');

      expect(result.isSingle).toBe(false);
      expect(result.zip).toBeDefined();
      expect(result.zip?.filename).toBe('multi_split_split.zip');
      expect(result.files.length).toBe(3);

      expect(result.files[0].filename).toBe('multi_split_page_1.pdf');
      expect(result.files[0].pageCount).toBe(1);

      expect(result.files[1].filename).toBe('multi_split_pages_2-3.pdf');
      expect(result.files[1].pageCount).toBe(2);

      expect(result.files[2].filename).toBe('multi_split_page_4.pdf');
      expect(result.files[2].pageCount).toBe(1);

      const zip = await JSZip.loadAsync(result.zip!.blob);
      const zipFileNames = Object.keys(zip.files);
      expect(zipFileNames).toEqual([
        'multi_split_page_1.png',
        'multi_split_page_2.png',
        'multi_split_page_3.png',
        'multi_split_page_4.png',
      ]);
      expect(zipFileNames.some((name) => name.endsWith('.pdf'))).toBe(false);
    });
  });
});
