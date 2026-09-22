import { describe, it, expect } from 'vitest';
import { calculateTargetDimensions, formatFileSize } from '../imageOptimizer';

describe('imageOptimizer utilities', () => {
  describe('calculateTargetDimensions', () => {
    it('returns exact dimensions if image is smaller than max dimension', () => {
      const result = calculateTargetDimensions(800, 600, 2400);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('scales down landscape images exceeding max dimension while preserving aspect ratio', () => {
      const result = calculateTargetDimensions(4800, 2400, 2400);
      expect(result).toEqual({ width: 2400, height: 1200 });
    });

    it('scales down portrait images exceeding max dimension while preserving aspect ratio', () => {
      const result = calculateTargetDimensions(3000, 4000, 2000);
      expect(result).toEqual({ width: 1500, height: 2000 });
    });

    it('handles square images accurately', () => {
      const result = calculateTargetDimensions(3000, 3000, 1500);
      expect(result).toEqual({ width: 1500, height: 1500 });
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
});
