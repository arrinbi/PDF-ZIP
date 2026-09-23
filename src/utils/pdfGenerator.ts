import jsPDF from 'jspdf';
import type { GeneratedPdfResult, ImageItem, PdfOptions } from '../types';
import { processImageForPdf, DEFAULT_QUALITY } from './imageOptimizer';

/**
 * Detects the image format required by jsPDF based on MIME type or Data URL header.
 */
export function getImageFormat(type?: string, dataUrl?: string): string {
  if (type) {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('png')) return 'PNG';
    if (lowerType.includes('webp')) return 'WEBP';
    if (lowerType.includes('jpeg') || lowerType.includes('jpg')) return 'JPEG';
  }
  if (dataUrl) {
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  }
  return 'JPEG';
}

/**
 * Generates a single PDF document containing all provided images.
 * Automatically fits images to PDF pages while preserving original aspect ratios and applying format/quality settings.
 */
export async function generatePdfFromImages(
  images: ImageItem[],
  options: PdfOptions,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedPdfResult> {
  if (images.length === 0) {
    throw new Error('No images provided for PDF generation.');
  }

  let pdf: jsPDF | null = null;
  const totalImages = images.length;

  const baseWidthMm = 210; // Standard reference width in mm
  const targetFormat = options.outputFormat || 'JPG';
  const targetQuality = options.quality !== undefined ? options.quality : DEFAULT_QUALITY;

  for (let i = 0; i < totalImages; i++) {
    const item = images[i];

    // Process image according to format and quality settings
    const processed = await processImageForPdf(item, targetFormat, targetQuality);

    const imageDataUrl = processed.dataUrl;
    const imgWidthPx = processed.width || item.width || 1;
    const imgHeightPx = processed.height || item.height || 1;
    const format = processed.jsPdfFormat || getImageFormat(item.type, imageDataUrl);

    const margin = options.margin || 0;
    const availWidth = baseWidthMm - margin * 2;
    const imgAspect = imgWidthPx / imgHeightPx;

    // Fit to Image: dynamically size page height based on natural image aspect ratio
    const drawW = availWidth;
    const drawH = drawW / imgAspect;

    const pageWidth = baseWidthMm;
    const pageHeight = drawH + margin * 2;

    const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

    if (i === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [pageWidth, pageHeight],
      });
    } else if (pdf) {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }

    if (pdf) {
      const x = margin;
      const y = margin;
      const compression = format === 'PNG' ? 'MEDIUM' : 'NONE';
      pdf.addImage(imageDataUrl, format, x, y, drawW, drawH, undefined, compression);
    }

    if (onProgress) {
      onProgress(i + 1, totalImages);
    }
  }

  if (!pdf) {
    throw new Error('Failed to instantiate PDF document.');
  }

  const pdfArrayBuffer = pdf.output('arraybuffer');
  const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const sizeBytes = blob.size;

  const defaultFilename = options.filename
    ? options.filename.endsWith('.pdf')
      ? options.filename
      : `${options.filename}.pdf`
    : 'converted_images.pdf';

  return {
    blob,
    url,
    sizeBytes,
    filename: defaultFilename,
    pageCount: totalImages,
  };
}
