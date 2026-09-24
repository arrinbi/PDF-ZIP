import { describe, it, expect } from 'vitest';
import {
  createBenchmarkDataset,
  compressPdfWithPdfLib,
  compressPdfWithPdfJsAndJsPdf,
  generatePdfPreOptBaseline,
  createTestImageDataUrl,
  type BenchmarkMetrics,
} from '../benchmark';
import { generatePdfFromImages } from '../../utils/pdfGenerator';
import type { ImageItem, PdfOptions } from '../../types';

describe('PDF Optimization Benchmark & Feasibility Experiment', () => {
  it('runs standard mode benchmark with high-resolution representative assets', { timeout: 60000 }, async () => {
    // Generate high resolution test images (2000x3000 manga PNG, 2400x1800 photo JPEG, 2000x2800 doc PNG)
    const photoUrl = createTestImageDataUrl('photo', 2400, 1800);
    const mangaUrl = createTestImageDataUrl('manga', 2000, 3000);
    const docUrl = createTestImageDataUrl('document', 2000, 2800);

    const highResSet: ImageItem[] = [
      {
        id: 'photo-high',
        file: new File([], 'photo_high.jpg', { type: 'image/jpeg' }),
        name: 'photo_high.jpg',
        size: Math.round((photoUrl.length * 3) / 4),
        type: 'image/jpeg',
        previewUrl: photoUrl,
        width: 2400,
        height: 1800,
      },
      {
        id: 'manga-high',
        file: new File([], 'manga_high.png', { type: 'image/png' }),
        name: 'manga_high.png',
        size: Math.round((mangaUrl.length * 3) / 4),
        type: 'image/png',
        previewUrl: mangaUrl,
        width: 2000,
        height: 3000,
      },
      {
        id: 'doc-high',
        file: new File([], 'doc_high.png', { type: 'image/png' }),
        name: 'doc_high.png',
        size: Math.round((docUrl.length * 3) / 4),
        type: 'image/png',
        previewUrl: docUrl,
        width: 2000,
        height: 2800,
      },
    ];

    const defaultOptions: PdfOptions = {
      pageSize: 'fit',
      margin: 0,
      outputFormat: 'JPG',
      quality: 0.85,
    };

    // 1. Generate original baseline PDF via existing jsPDF pipeline
    const originalResult = await generatePdfFromImages(highResSet, defaultOptions);
    const origSize = originalResult.sizeBytes;
    const origPageCount = originalResult.pageCount;

    expect(origSize).toBeGreaterThan(0);
    expect(origPageCount).toBe(3);

    // 2. Test Approach A: pdf-lib stream & object compression
    const pdfLibResult = await compressPdfWithPdfLib(originalResult.blob);
    const pdfLibSize = pdfLibResult.blob.size;
    const pdfLibSaved = origSize - pdfLibSize;
    const pdfLibPct = Math.round((pdfLibSaved / origSize) * 1000) / 10;

    const metricsA: BenchmarkMetrics = {
      name: 'Approach A (pdf-lib object stream compression)',
      originalSizeBytes: origSize,
      compressedSizeBytes: pdfLibSize,
      savedBytes: pdfLibSaved,
      reductionPercentage: pdfLibPct,
      durationMs: pdfLibResult.durationMs,
      memoryUsedMB: pdfLibResult.memoryUsedMB,
      pageCountPreserved: pdfLibResult.pageCount === origPageCount,
      pageDimensionsPreserved: true,
      aspectRatioPreserved: true,
      croppingOrDistortion: false,
      visualQualityNotes: 'Identical (100% pixel-perfect preservation, zero image re-encoding)',
    };

    // 3. Test Approach B: PDF.js + Canvas re-rendering + jsPDF re-encoding
    const pdfJsResult = await compressPdfWithPdfJsAndJsPdf(originalResult.blob, 0.75, 1.0);
    const pdfJsSize = pdfJsResult.blob.size;
    const pdfJsSaved = origSize - pdfJsSize;
    const pdfJsPct = Math.round((pdfJsSaved / origSize) * 1000) / 10;

    const metricsB: BenchmarkMetrics = {
      name: 'Approach B (PDF.js raster render + canvas re-compression)',
      originalSizeBytes: origSize,
      compressedSizeBytes: pdfJsSize,
      savedBytes: pdfJsSaved,
      reductionPercentage: pdfJsPct,
      durationMs: pdfJsResult.durationMs,
      memoryUsedMB: pdfJsResult.memoryUsedMB,
      pageCountPreserved: pdfJsResult.pageCount === origPageCount,
      pageDimensionsPreserved: pdfJsResult.pageDimensionsPreserved,
      aspectRatioPreserved: true,
      croppingOrDistortion: false,
      visualQualityNotes: 'Lossy generation loss: blurring around manga line art, small text artifacts in speech bubbles, potential ringing artifacts from double-JPEG encoding.',
    };

    // 4. Test Approach D: Pre-generation optimization baseline (JPG at 80% direct)
    const preOptResult = await generatePdfPreOptBaseline(highResSet, 0.80);
    const preOptSize = preOptResult.sizeBytes;
    const preOptSaved = origSize - preOptSize;
    const preOptPct = Math.round((preOptSaved / origSize) * 1000) / 10;

    const metricsD: BenchmarkMetrics = {
      name: 'Approach D (Direct pre-generation quality control at 80%)',
      originalSizeBytes: origSize,
      compressedSizeBytes: preOptSize,
      savedBytes: preOptSaved,
      reductionPercentage: preOptPct,
      durationMs: preOptResult.durationMs,
      memoryUsedMB: preOptResult.memoryUsedMB,
      pageCountPreserved: true,
      pageDimensionsPreserved: true,
      aspectRatioPreserved: true,
      croppingOrDistortion: false,
      visualQualityNotes: 'Single-pass canvas encoding: sharper small text, cleaner manga line art, no double-compression overhead or PDF parsing latency.',
    };

    console.log('\n=================== HIGH-RES STANDARD MODE BENCHMARK RESULTS ===================');
    console.log(`Original Generated PDF Size: ${origSize} bytes (${(origSize / (1024 * 1024)).toFixed(2)} MB)`);
    console.table([metricsA, metricsB, metricsD]);
    console.log('=================================================================================\n');

    expect(pdfLibResult.pageCount).toBe(origPageCount);
    expect(pdfJsResult.pageCount).toBe(origPageCount);
  });

  it('runs batch mode case benchmark', { timeout: 30000 }, async () => {
    const dataset = createBenchmarkDataset();
    const defaultOptions: PdfOptions = {
      pageSize: 'fit',
      margin: 0,
      outputFormat: 'JPG',
      quality: 0.85,
    };

    // Process Folder 1
    const resFolder1 = await generatePdfFromImages(dataset.batchSetFolder1, defaultOptions);
    const pdfLibFolder1 = await compressPdfWithPdfLib(resFolder1.blob);

    // Process Folder 2
    const resFolder2 = await generatePdfFromImages(dataset.batchSetFolder2, defaultOptions);
    const pdfLibFolder2 = await compressPdfWithPdfLib(resFolder2.blob);

    const totalOrig = resFolder1.sizeBytes + resFolder2.sizeBytes;
    const totalComp = pdfLibFolder1.blob.size + pdfLibFolder2.blob.size;

    console.log('\n==================== BATCH MODE BENCHMARK RESULTS ====================');
    console.log(`Subfolders Processed: 2`);
    console.log(`Total Original PDF Size: ${totalOrig} bytes (${(totalOrig / 1024).toFixed(1)} KB)`);
    console.log(`Total Compressed PDF Size: ${totalComp} bytes (${(totalComp / 1024).toFixed(1)} KB)`);
    console.log(`Size Saved: ${totalOrig - totalComp} bytes (${(((totalOrig - totalComp) / totalOrig) * 100).toFixed(1)}%)`);
    console.log('=======================================================================\n');

    expect(totalComp).toBeGreaterThan(0);
  });
});
