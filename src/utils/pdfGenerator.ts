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

  for (let i = 0; i < totalImages; i++) {
    const item = images[i];
    const imageDataUrl = item.optimizedDataUrl || item.previewUrl;
    const imgWidthPx = item.optimizedWidth || item.width;
    const imgHeightPx = item.optimizedHeight || item.height;

    // Every PDF page is fixed to A4 Portrait
    const format = 'a4';
    const orientation = 'portrait';

    if (i === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
      });
    } else if (pdf) {
      pdf.addPage(format, orientation);
    }

    if (pdf) {
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = options.margin || 0;

      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      const imgAspect = imgWidthPx / imgHeightPx;
      const availAspect = availWidth / availHeight;

      let drawW = availWidth;
      let drawH = availHeight;

      if (imgAspect > availAspect) {
        // Fit to width
        drawH = availWidth / imgAspect;
      } else {
        // Fit to height
        drawW = availHeight * imgAspect;
      }

      // Center image on A4 page
      const x = margin + (availWidth - drawW) / 2;
      const y = margin + (availHeight - drawH) / 2;

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
