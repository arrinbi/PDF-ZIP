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
    expect(DEFAULT_MAX_DIMENSION).toBe(8192);
  });

  describe('calculateTargetDimensions', () => {
    it('returns exact dimensions if image is smaller than max dimension', () => {
      const result = calculateTargetDimensions(800, 600, 8192);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('does not upscale smaller images', () => {
      const result = calculateTargetDimensions(1920, 1080);
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('scales down landscape images exceeding max dimension while preserving aspect ratio', () => {
      const result = calculateTargetDimensions(16384, 8192, 8192);
      expect(result).toEqual({ width: 8192, height: 4096 });
    });

    it('scales down portrait images exceeding max dimension while preserving aspect ratio', () => {
      const result = calculateTargetDimensions(3000, 6000, 4000);
      expect(result).toEqual({ width: 2000, height: 4000 });
    });

    it('handles square images accurately', () => {
      const result = calculateTargetDimensions(5000, 5000, 2500);
      expect(result).toEqual({ width: 2500, height: 2500 });
    });

    it('handles zero or invalid dimensions gracefully', () => {
      expect(calculateTargetDimensions(0, 0, 4096)).toEqual({ width: 1, height: 1 });
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
  });
});
