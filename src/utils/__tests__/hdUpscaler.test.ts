import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidHdImageFile,
  getHdOutputFilename,
  upscaleImageWithAi,
} from '../hdUpscaler';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
}

describe('hdUpscaler utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isValidHdImageFile', () => {
    it('returns true for supported image files', () => {
      const jpg = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const png = new File([''], 'test.png', { type: 'image/png' });
      const webp = new File([''], 'test.webp', { type: 'image/webp' });

      expect(isValidHdImageFile(jpg)).toBe(true);
      expect(isValidHdImageFile(png)).toBe(true);
      expect(isValidHdImageFile(webp)).toBe(true);
    });

    it('returns false for unsupported files or system hidden files', () => {
      const txt = new File([''], 'doc.txt', { type: 'text/plain' });
      const dsStore = new File([''], '.DS_Store', { type: '' });

      expect(isValidHdImageFile(txt)).toBe(false);
      expect(isValidHdImageFile(dsStore)).toBe(false);
    });
  });

  describe('getHdOutputFilename', () => {
    it('appends scale factor suffix and target format extension', () => {
      expect(getHdOutputFilename('chapter_01.png', 2, 'SAME')).toBe('chapter_01_hd2x.png');
      expect(getHdOutputFilename('chapter_01.png', 4, 'JPG')).toBe('chapter_01_hd4x.jpg');
      expect(getHdOutputFilename('chapter_01.jpg', 2, 'WEBP')).toBe('chapter_01_hd2x.webp');
    });

    it('prevents duplicate stacking of scale suffixes', () => {
      expect(getHdOutputFilename('chapter_01_hd2x.png', 2, 'SAME')).toBe('chapter_01_hd2x.png');
      expect(getHdOutputFilename('chapter_01_hd2x_hd4x.jpg', 4, 'PNG')).toBe('chapter_01_hd4x.png');
    });
  });

  describe('upscaleImageWithAi', () => {
    it('throws error for unsupported file formats', async () => {
      const txtFile = new File(['data'], 'test.txt', { type: 'text/plain' });
      await expect(
        upscaleImageWithAi(txtFile, 'test.txt', {
          scaleFactor: 2,
          outputFormat: 'SAME',
          quality: 0.85,
        })
      ).rejects.toThrow('Format file tidak didukung');
    });

    it('throws error when user cancels before or during execution', async () => {
      const imgFile = new File(['fake data'], 'test.png', { type: 'image/png' });
      const cancelSignal = { cancelled: true };

      await expect(
        upscaleImageWithAi(
          imgFile,
          'test.png',
          {
            scaleFactor: 2,
            outputFormat: 'SAME',
            quality: 0.85,
          },
          undefined,
          cancelSignal
        )
      ).rejects.toThrow('Pemrosesan dibatalkan oleh pengguna.');
    });
  });
});
