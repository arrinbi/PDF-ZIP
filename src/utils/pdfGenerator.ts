import jsPDF from 'jspdf';
import type { GeneratedPdfResult, ImageItem, PdfOptions } from '../types';

/**
 * Generates a single PDF document containing all provided images.
 * Automatically fits images to PDF pages while preserving original aspect ratios.
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

  for (let i = 0; i < totalImages; i++) {
    const item = images[i];
    const imageDataUrl = item.optimizedDataUrl || item.previewUrl;
    const imgWidthPx = item.optimizedWidth || item.width;
    const imgHeightPx = item.optimizedHeight || item.height;

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
      pdf.addImage(imageDataUrl, 'JPEG', x, y, drawW, drawH);
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
    : 'optimized_images.pdf';

  return {
    blob,
    url,
    sizeBytes,
    filename: defaultFilename,
    pageCount: totalImages,
  };
}
