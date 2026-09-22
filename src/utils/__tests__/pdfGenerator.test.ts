import { describe, it, expect, vi } from 'vitest';
import { generatePdfFromImages } from '../pdfGenerator';
import type { ImageItem, PdfOptions } from '../../types';

// Mock URL.createObjectURL for jsdom environment
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-pdf-url');
}

describe('pdfGenerator utilities', () => {
  const dummyDataUrl =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const sampleImages: ImageItem[] = [
    {
      id: 'img-1',
      file: new File([], 'test1.jpg', { type: 'image/jpeg' }),
      name: 'test1.jpg',
      size: 1024,
      type: 'image/jpeg',
      previewUrl: dummyDataUrl,
      width: 1200,
      height: 800,
      optimizedDataUrl: dummyDataUrl,
      optimizedWidth: 1200,
      optimizedHeight: 800,
      optimizedSize: 800,
    },
    {
      id: 'img-2',
      file: new File([], 'test2.png', { type: 'image/png' }),
      name: 'test2.png',
      size: 2048,
      type: 'image/png',
      previewUrl: dummyDataUrl,
      width: 800,
      height: 1200,
      optimizedDataUrl: dummyDataUrl,
      optimizedWidth: 800,
      optimizedHeight: 1200,
      optimizedSize: 1500,
    },
  ];

  it('throws an error if no images are provided', async () => {
    const options: PdfOptions = { pageSize: 'a4', margin: 0 };
    await expect(generatePdfFromImages([], options)).rejects.toThrow(
      'No images provided for PDF generation.'
    );
  });

  it('generates a PDF document with A4 Portrait pages for all images', async () => {
    const options: PdfOptions = { pageSize: 'a4', margin: 0, filename: 'my_doc' };
    const progressSpy = vi.fn();

    const result = await generatePdfFromImages(sampleImages, options, progressSpy);

    expect(result).toBeDefined();
    expect(result.filename).toBe('my_doc.pdf');
    expect(result.pageCount).toBe(2);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(progressSpy).toHaveBeenCalledTimes(2);
    expect(progressSpy).toHaveBeenLastCalledWith(2, 2);
  });

  it('calculates image width to fill full usable A4 width without horizontal downscaling for tall images', async () => {
    const options: PdfOptions = { pageSize: 'a4', margin: 0 };
    // Image with aspect ratio 1:3 (tall manhwa page e.g. 1000 x 3000)
    const tallImage: ImageItem[] = [
      {
        id: 'img-tall',
        file: new File([], 'tall.jpg', { type: 'image/jpeg' }),
        name: 'tall.jpg',
        size: 5000,
        type: 'image/jpeg',
        previewUrl: dummyDataUrl,
        width: 1000,
        height: 3000,
        optimizedDataUrl: dummyDataUrl,
        optimizedWidth: 1000,
        optimizedHeight: 3000,
        optimizedSize: 5000,
      },
    ];

    const result = await generatePdfFromImages(tallImage, options);
    expect(result).toBeDefined();
    expect(result.pageCount).toBe(1);
  });
});
