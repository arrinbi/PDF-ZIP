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

    // Determine orientation based on aspect ratio
    const isLandscape = imgWidthPx > imgHeightPx;

    if (options.pageSize === 'fit') {
      // Convert pixels to points/mm (1 px ≈ 0.264583 mm at 96 DPI)
      // To ensure high quality fit without huge pages, scale proportionally
      const pxToMm = 0.264583;
      let pageW = imgWidthPx * pxToMm;
      let pageH = imgHeightPx * pxToMm;

      // Cap maximum page size to standard desktop print limits (e.g., max 500mm) while preserving exact aspect ratio
      const maxPageDim = 420; // A3 length limit in mm
      const maxPxDim = Math.max(pageW, pageH);
      if (maxPxDim > maxPageDim) {
        const scale = maxPageDim / maxPxDim;
        pageW *= scale;
        pageH *= scale;
      }

      if (i === 0) {
        pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pageW, pageH],
        });
      } else if (pdf) {
        pdf.addPage([pageW, pageH], isLandscape ? 'landscape' : 'portrait');
      }

      if (pdf) {
        pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pageW, pageH);
      }
    } else {
      // Standard page sizes (A4 or Letter)
      const format = options.pageSize === 'a4' ? 'a4' : 'letter';

      if (i === 0) {
        pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format,
        });
      } else if (pdf) {
        pdf.addPage(format, isLandscape ? 'landscape' : 'portrait');
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

        // Center image on page
        const x = margin + (availWidth - drawW) / 2;
        const y = margin + (availHeight - drawH) / 2;

        pdf.addImage(imageDataUrl, 'JPEG', x, y, drawW, drawH);
      }
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
