import { describe, it, expect, vi } from 'vitest';
import {
  isAllowedImageFile,
  getRelativePathAndFolderName,
  sortFilesNaturally,
  createBatchFolderFromFiles,
  processBatchFolder,
} from '../batchProcessor';

describe('batchProcessor utilities', () => {
  it('identifies allowed image files correctly', () => {
    const jpgFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const jpegFile = new File(['content'], 'test.jpeg', { type: 'image/jpeg' });
    const pngFile = new File(['content'], 'test.png', { type: 'image/png' });
    const webpFile = new File(['content'], 'test.webp', { type: 'image/webp' });
    const txtFile = new File(['content'], 'document.txt', { type: 'text/plain' });
    const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });

    expect(isAllowedImageFile(jpgFile)).toBe(true);
    expect(isAllowedImageFile(jpegFile)).toBe(true);
    expect(isAllowedImageFile(pngFile)).toBe(true);
    expect(isAllowedImageFile(webpFile)).toBe(true);
    expect(isAllowedImageFile(txtFile)).toBe(false);
    expect(isAllowedImageFile(pdfFile)).toBe(false);
  });

  it('extracts folder name from webkitRelativePath', () => {
    const fileWithRelativePath = new File([''], 'page01.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileWithRelativePath, 'webkitRelativePath', {
      value: '01. Manhwa/Chapter 1/page01.jpg',
    });

    const info = getRelativePathAndFolderName(fileWithRelativePath);
    expect(info.folderName).toBe('01. Manhwa');
    expect(info.relativePath).toBe('01. Manhwa/Chapter 1/page01.jpg');
  });

  it('sorts files naturally by name', () => {
    const files = [
      new File([''], 'page10.jpg', { type: 'image/jpeg' }),
      new File([''], 'page2.jpg', { type: 'image/jpeg' }),
      new File([''], 'page1.jpg', { type: 'image/jpeg' }),
    ];

    const sorted = sortFilesNaturally(files);
    expect(sorted.map((f) => f.name)).toEqual(['page1.jpg', 'page2.jpg', 'page10.jpg']);
  });

  it('creates a BatchFolder from files filtering out unrelated files and preserving order', async () => {
    const files = [
      new File(['data'], '02.jpg', { type: 'image/jpeg' }),
      new File(['data'], 'notes.txt', { type: 'text/plain' }),
      new File(['data'], '01.jpg', { type: 'image/jpeg' }),
      new File(['data'], '03.png', { type: 'image/png' }),
    ];

    const batch = await createBatchFolderFromFiles(files, '01. Manhwa');
    expect(batch).not.toBeNull();
    expect(batch?.folderName).toBe('01. Manhwa');
    expect(batch?.images.length).toBe(3);
    expect(batch?.images.map((img) => img.name)).toEqual(['01.jpg', '02.jpg', '03.png']);
  }, 10000);

  it('returns null if no valid image files exist', async () => {
    const files = [
      new File(['data'], 'readme.md', { type: 'text/markdown' }),
      new File(['data'], 'data.csv', { type: 'text/csv' }),
    ];

    const batch = await createBatchFolderFromFiles(files, 'EmptyFolder');
    expect(batch).toBeNull();
  });

  it('processes batch folder into PDF export', async () => {
    const batch = {
      id: 'batch-1',
      folderName: '01. Manhwa',
      images: [
        {
          id: '1',
          file: new File(['img'], '01.jpg', { type: 'image/jpeg' }),
          name: '01.jpg',
          size: 100,
          type: 'image/jpeg',
          previewUrl: 'data:image/jpeg;base64,123',
          width: 800,
          height: 600,
        },
      ],
    };

    const progressCb = vi.fn();
    const result = await processBatchFolder(
      batch,
      'pdf',
      { pdfOptions: { margin: 0, outputFormat: 'JPG', quality: 0.85 } },
      progressCb
    );

    expect(result.mode).toBe('pdf');
    if (result.mode === 'pdf') {
      expect(result.pdf.filename).toBe('01. Manhwa.pdf');
      expect(result.pdf.pageCount).toBe(1);
    }
  });

  it('processes batch folder into ZIP export', async () => {
    const batch = {
      id: 'batch-2',
      folderName: '02. Manhwa',
      images: [
        {
          id: '1',
          file: new File(['img'], '01.jpg', { type: 'image/jpeg' }),
          name: '01.jpg',
          size: 100,
          type: 'image/jpeg',
          previewUrl: 'data:image/jpeg;base64,123',
          width: 800,
          height: 600,
        },
      ],
    };

    const progressCb = vi.fn();
    const result = await processBatchFolder(
      batch,
      'zip',
      { zipOptions: { outputFormat: 'ORIGINAL', quality: 0.85 } },
      progressCb
    );

    expect(result.mode).toBe('zip');
    if (result.mode === 'zip') {
      expect(result.zip.filename).toBe('02. Manhwa.zip');
      expect(result.zip.fileCount).toBe(1);
    }
  });
});
