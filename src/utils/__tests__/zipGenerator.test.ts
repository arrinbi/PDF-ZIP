import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { getFileExtension, formatNumberedFilename, generateZipFromImages } from '../zipGenerator';
import type { ImageItem } from '../../types';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-zip-url');
}

describe('zipGenerator utilities', () => {
  describe('getFileExtension', () => {
    it('extracts extension from filename', () => {
      expect(getFileExtension('photo.jpg')).toBe('.jpg');
      expect(getFileExtension('image456.PNG')).toBe('.PNG');
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    });

    it('infers extension from MIME type if filename has no extension', () => {
      expect(getFileExtension('photo', 'image/png')).toBe('.png');
      expect(getFileExtension('file', 'image/webp')).toBe('.webp');
      expect(getFileExtension('graphic', 'image/jpeg')).toBe('.jpg');
    });

    it('defaults to .jpg if neither extension nor MIME type is present', () => {
      expect(getFileExtension('file_without_ext')).toBe('.jpg');
    });
  });

  describe('formatNumberedFilename', () => {
    it('formats two-digit zero-padded numbers below 100', () => {
      expect(formatNumberedFilename(0, '.jpg')).toBe('01.jpg');
      expect(formatNumberedFilename(8, '.png')).toBe('09.png');
      expect(formatNumberedFilename(9, '.jpg')).toBe('10.jpg');
      expect(formatNumberedFilename(98, '.webp')).toBe('99.webp');
    });

    it('formats 100 and above naturally without truncating', () => {
      expect(formatNumberedFilename(99, '.jpg')).toBe('100.jpg');
      expect(formatNumberedFilename(104, '.png')).toBe('105.png');
    });

    it('ensures dot is present in extension', () => {
      expect(formatNumberedFilename(0, 'png')).toBe('01.png');
    });
  });

  describe('generateZipFromImages', () => {
    it('throws an error if no images are provided', async () => {
      await expect(generateZipFromImages([])).rejects.toThrow('No images provided for ZIP generation.');
    });

    it('creates a ZIP archive with original files renamed by current preview order', async () => {
      const file1Content = new Uint8Array([1, 2, 3, 4, 5]);
      const file2Content = new Uint8Array([10, 20, 30, 40]);
      const file3Content = new Uint8Array([100, 200]);

      const file1 = new File([file1Content], 'abcxyz.jpg', { type: 'image/jpeg' });
      const file2 = new File([file2Content], 'random-name.png', { type: 'image/png' });
      const file3 = new File([file3Content], 'test123.webp', { type: 'image/webp' });

      const images: ImageItem[] = [
        {
          id: '1',
          file: file1,
          name: 'abcxyz.jpg',
          size: file1Content.length,
          type: 'image/jpeg',
          previewUrl: 'data:image/jpeg;base64,123',
          width: 100,
          height: 100,
        },
        {
          id: '2',
          file: file2,
          name: 'random-name.png',
          size: file2Content.length,
          type: 'image/png',
          previewUrl: 'data:image/png;base64,456',
          width: 200,
          height: 200,
        },
        {
          id: '3',
          file: file3,
          name: 'test123.webp',
          size: file3Content.length,
          type: 'image/webp',
          previewUrl: 'data:image/webp;base64,789',
          width: 300,
          height: 300,
        },
      ];

      const progressSpy = vi.fn();
      const result = await generateZipFromImages(images, { filename: 'my_archive' }, progressSpy);

      expect(result.filename).toBe('my_archive.zip');
      expect(result.fileCount).toBe(3);
      expect(progressSpy).toHaveBeenCalledTimes(3);

      // Verify ZIP contents using JSZip
      const zip = await JSZip.loadAsync(result.blob);
      const zipFiles = Object.keys(zip.files);

      expect(zipFiles).toEqual(['01.jpg', '02.png', '03.webp']);

      // Verify byte-for-byte content match
      const content1 = await zip.files['01.jpg'].async('uint8array');
      const content2 = await zip.files['02.png'].async('uint8array');
      const content3 = await zip.files['03.webp'].async('uint8array');

      expect(content1).toEqual(file1Content);
      expect(content2).toEqual(file2Content);
      expect(content3).toEqual(file3Content);
    });

    it('reflects new order when user reorders images before exporting', async () => {
      const file1 = new File(['file1'], 'first.png', { type: 'image/png' });
      const file2 = new File(['file2'], 'second.jpg', { type: 'image/jpeg' });
      const file3 = new File(['file3'], 'third.webp', { type: 'image/webp' });

      // Reordered order: file3 (index 0), file1 (index 1), file2 (index 2)
      const images: ImageItem[] = [
        {
          id: '3',
          file: file3,
          name: 'third.webp',
          size: 5,
          type: 'image/webp',
          previewUrl: 'data:image/webp;base64,789',
          width: 300,
          height: 300,
        },
        {
          id: '1',
          file: file1,
          name: 'first.png',
          size: 5,
          type: 'image/png',
          previewUrl: 'data:image/png;base64,123',
          width: 100,
          height: 100,
        },
        {
          id: '2',
          file: file2,
          name: 'second.jpg',
          size: 5,
          type: 'image/jpeg',
          previewUrl: 'data:image/jpeg;base64,456',
          width: 200,
          height: 200,
        },
      ];

      const result = await generateZipFromImages(images);
      const zip = await JSZip.loadAsync(result.blob);
      const zipFiles = Object.keys(zip.files);

      expect(zipFiles).toEqual(['01.webp', '02.png', '03.jpg']);

      const content01 = await zip.files['01.webp'].async('string');
      expect(content01).toBe('file3');
    });
  });
});
