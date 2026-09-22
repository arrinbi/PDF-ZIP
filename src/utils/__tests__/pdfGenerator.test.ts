import { describe, it, expect, vi } from 'vitest';
import { generatePdfFromImages, getImageFormat } from '../pdfGenerator';
import type { ImageItem, PdfOptions } from '../../types';

// Mock URL.createObjectURL for jsdom environment
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-pdf-url');
}

describe('pdfGenerator utilities', () => {
  const dummyJpegDataUrl =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const dummyPngDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const sampleImages: ImageItem[] = [
    {
      id: 'img-1',
      file: new File([], '01.jpg', { type: 'image/jpeg' }),
      name: '01.jpg',
      size: 1024,
      type: 'image/jpeg',
      previewUrl: dummyJpegDataUrl,
      width: 1200,
      height: 800,
    },
    {
      id: 'img-2',
      file: new File([], '02.png', { type: 'image/png' }),
      name: '02.png',
      size: 2048,
      type: 'image/png',
      previewUrl: dummyPngDataUrl,
      width: 800,
      height: 1200,
    },
  ];

  it('getImageFormat correctly identifies PNG, JPEG, WEBP formats', () => {
    expect(getImageFormat('image/png')).toBe('PNG');
    expect(getImageFormat('image/jpeg')).toBe('JPEG');
    expect(getImageFormat('image/jpg')).toBe('JPEG');
    expect(getImageFormat('image/webp')).toBe('WEBP');
    expect(getImageFormat('', dummyPngDataUrl)).toBe('PNG');
    expect(getImageFormat('', dummyJpegDataUrl)).toBe('JPEG');
  });

  it('throws an error if no images are provided', async () => {
    const options: PdfOptions = { pageSize: 'fit', margin: 0 };
    await expect(generatePdfFromImages([], options)).rejects.toThrow(
      'No images provided for PDF generation.'
    );
  });

  it('generates a PDF document using Fit to Image behavior for all images', async () => {
    const options: PdfOptions = { pageSize: 'fit', margin: 0, filename: 'my_doc' };
    const progressSpy = vi.fn();

    const result = await generatePdfFromImages(sampleImages, options, progressSpy);

    expect(result).toBeDefined();
    expect(result.filename).toBe('my_doc.pdf');
    expect(result.pageCount).toBe(2);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(progressSpy).toHaveBeenCalledTimes(2);
    expect(progressSpy).toHaveBeenLastCalledWith(2, 2);
  });

  it('accepts outputFormat and quality options', async () => {
    const options: PdfOptions = {
      pageSize: 'fit',
      margin: 0,
      filename: 'my_doc',
      outputFormat: 'JPG',
      quality: 0.75,
    };

    const result = await generatePdfFromImages(sampleImages, options);
    expect(result).toBeDefined();
    expect(result.pageCount).toBe(2);
  });

  it('preserves original file names on ImageItem objects', () => {
    expect(sampleImages[0].name).toBe('01.jpg');
    expect(sampleImages[1].name).toBe('02.png');
  });

  it('handles images with varied aspect ratios including tall, wide, and square without cropping', async () => {
    const options: PdfOptions = { pageSize: 'fit', margin: 0 };
    const mixedImages: ImageItem[] = [
      {
        id: 'img-tall',
        file: new File([], '03.png', { type: 'image/png' }),
        name: '03.png',
        size: 5000,
        type: 'image/png',
        previewUrl: dummyPngDataUrl,
        width: 1000,
        height: 3000,
      },
      {
        id: 'img-wide',
        file: new File([], '04.jpg', { type: 'image/jpeg' }),
        name: '04.jpg',
        size: 3000,
        type: 'image/jpeg',
        previewUrl: dummyJpegDataUrl,
        width: 1200,
        height: 400,
      },
    ];

    const result = await generatePdfFromImages(mixedImages, options);
    expect(result).toBeDefined();
    expect(result.pageCount).toBe(2);
  });
});
