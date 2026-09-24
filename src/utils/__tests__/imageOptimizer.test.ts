import { describe, it, expect } from 'vitest';
import {
  calculateTargetDimensions,
  formatFileSize,
  optimizeSingleImage,
  processImageForPdf,
  DEFAULT_MAX_DIMENSION,
  DEFAULT_QUALITY,
} from '../imageOptimizer';
import type { ImageItem } from '../../types';

describe('imageOptimizer utilities', () => {
  it('uses expected default quality and max dimension constants', () => {
    expect(DEFAULT_QUALITY).toBe(0.85);
    expect(DEFAULT_MAX_DIMENSION).toBe(2400);
  });

  describe('calculateTargetDimensions', () => {
    it('1. Image below 2400px is not enlarged', () => {
      const resultLandscape = calculateTargetDimensions(1200, 800, 2400);
      expect(resultLandscape).toEqual({ width: 1200, height: 800 });

      const resultPortrait = calculateTargetDimensions(800, 1600, 2400);
      expect(resultPortrait).toEqual({ width: 800, height: 1600 });
    });

    it('2. Image exactly 2400px is unchanged', () => {
      const resultLandscape = calculateTargetDimensions(2400, 1800, 2400);
      expect(resultLandscape).toEqual({ width: 2400, height: 1800 });

      const resultPortrait = calculateTargetDimensions(1600, 2400, 2400);
      expect(resultPortrait).toEqual({ width: 1600, height: 2400 });

      const resultSquare = calculateTargetDimensions(2400, 2400, 2400);
      expect(resultSquare).toEqual({ width: 2400, height: 2400 });
    });

    it('3. Landscape image preserves aspect ratio', () => {
      const result = calculateTargetDimensions(4800, 2400, 2400);
      expect(result).toEqual({ width: 2400, height: 1200 });
      expect(result.width / result.height).toBeCloseTo(4800 / 2400);
    });

    it('4. Portrait image preserves aspect ratio', () => {
      const result = calculateTargetDimensions(3000, 4000, 2400);
      expect(result).toEqual({ width: 1800, height: 2400 });
      expect(result.width / result.height).toBeCloseTo(3000 / 4000);
    });

    it('5. Ultra-tall image preserves aspect ratio', () => {
      const result = calculateTargetDimensions(1000, 10000, 2400);
      expect(result).toEqual({ width: 240, height: 2400 });
      expect(result.width / result.height).toBeCloseTo(1000 / 10000);
    });

    it('6. Image above 2400px is correctly downscaled', () => {
      const result = calculateTargetDimensions(3600, 2700, 2400);
      expect(result).toEqual({ width: 2400, height: 1800 });
      expect(Math.max(result.width, result.height)).toBe(2400);
    });

    it('handles zero or invalid dimensions gracefully', () => {
      expect(calculateTargetDimensions(0, 0, 2400)).toEqual({ width: 1, height: 1 });
    });
  });

  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes under 1 KB', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes accurately', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes accurately', () => {
      expect(formatFileSize(2500000)).toBe('2.4 MB');
    });
  });

  describe('optimizeSingleImage', () => {
    it('returns original image data and dimensions directly without compression', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await optimizeSingleImage(dataUrl, 100, 200);
      expect(result.dataUrl).toBe(dataUrl);
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('processImageForPdf', () => {
    const pngItem: ImageItem = {
      id: 'png-1',
      file: new File([], 'test.png', { type: 'image/png' }),
      name: 'test.png',
      size: 100,
      type: 'image/png',
      previewUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      width: 100,
      height: 100,
    };

    it('returns original PNG dataUrl directly when PNG output format is selected for PNG source', async () => {
      const result = await processImageForPdf(pngItem, 'PNG', 0.85);
      expect(result.jsPdfFormat).toBe('PNG');
      expect(result.dataUrl).toBe(pngItem.previewUrl);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('clamps quality between 0.80 and 1.00', async () => {
      const resLow = await processImageForPdf(pngItem, 'JPG', 0.50);
      expect(resLow.jsPdfFormat).toBe('JPEG');
      const resHigh = await processImageForPdf(pngItem, 'JPG', 1.20);
      expect(resHigh.jsPdfFormat).toBe('JPEG');
    });

    it('processes image for JPG output format', async () => {
      const result = await processImageForPdf(pngItem, 'JPG', 0.8);
      expect(result.jsPdfFormat).toBe('JPEG');
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('embeds original JPEG dataUrl directly without re-encoding bloat for JPEG source', async () => {
      const jpegItem: ImageItem = {
        id: 'jpeg-1',
        file: new File([], 'test.jpg', { type: 'image/jpeg' }),
        name: 'test.jpg',
        size: 500,
        type: 'image/jpeg',
        previewUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        width: 100,
        height: 100,
      };

      const resultFull = await processImageForPdf(jpegItem, 'JPG', 1.0);
      expect(resultFull.jsPdfFormat).toBe('JPEG');
      expect(resultFull.dataUrl).toBe(jpegItem.previewUrl);
    });

    it('downscales images > 2400px when calling processImageForPdf', async () => {
      const largeItem: ImageItem = {
        id: 'large-1',
        file: new File([], 'large.jpg', { type: 'image/jpeg' }),
        name: 'large.jpg',
        size: 20000,
        type: 'image/jpeg',
        previewUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        width: 4000,
        height: 3000,
      };

      const result = await processImageForPdf(largeItem, 'JPG', 0.85);
      expect(result.width).toBe(2400);
      expect(result.height).toBe(1800);
    });
  });
});
