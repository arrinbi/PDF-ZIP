import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import { SplitPdf } from '../SplitPdf';
import * as pdfSplitter from '../../utils/pdfSplitter';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-split-url');
}

describe('SplitPdf Component', () => {
  let validPdfFile: File;

  beforeEach(async () => {
    vi.spyOn(pdfSplitter, 'getPdfPageCount').mockResolvedValue(3);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([200, 200]);
    pdfDoc.addPage([200, 200]);
    pdfDoc.addPage([200, 200]);
    const pdfBytes = await pdfDoc.save();

    validPdfFile = new File([pdfBytes.buffer as ArrayBuffer], 'sample.pdf', { type: 'application/pdf' });
  });

  it('renders initial upload dropzone state', () => {
    render(<SplitPdf />);
    expect(screen.getByText(/Upload PDF File to Split/i)).toBeDefined();
    expect(screen.getByText(/Preserves 100% Original Vector & Text Quality/i)).toBeDefined();
  });

  it('renders split options and page grid when PDF file is uploaded', async () => {
    render(<SplitPdf />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [validPdfFile] } });
    }

    await waitFor(() => {
      expect(screen.getByText('sample.pdf')).toBeDefined();
      expect(screen.getByText(/3 pages/i)).toBeDefined();
      expect(screen.getByText(/Extract Selected Pages/i)).toBeDefined();
      expect(screen.getByText(/Split by Page Ranges/i)).toBeDefined();
      expect(screen.getByText(/Split Every Page/i)).toBeDefined();
    });
  });

  it('provides both Download PDF and Download ZIP buttons when single PDF is generated', async () => {
    render(<SplitPdf />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [validPdfFile] } });
    }

    await waitFor(() => {
      expect(screen.getByText('sample.pdf')).toBeDefined();
    });

    const splitBtn = screen.getByRole('button', { name: /Split PDF/i });
    fireEvent.click(splitBtn);

    await waitFor(() => {
      expect(screen.getByText(/PDF Split Successfully!/i)).toBeDefined();
      expect(screen.getByText(/Download PDF/i)).toBeDefined();
      expect(screen.getByText(/Download ZIP Archive/i)).toBeDefined();
    });
  });

  it('provides Download ZIP Archive button when multiple split files are generated', async () => {
    render(<SplitPdf />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [validPdfFile] } });
    }

    await waitFor(() => {
      expect(screen.getByText('sample.pdf')).toBeDefined();
    });

    // Select "Split Every Page" mode
    const everyPageBtn = screen.getByText(/Split Every Page/i);
    fireEvent.click(everyPageBtn);

    const splitBtn = screen.getByRole('button', { name: /Split PDF/i });
    fireEvent.click(splitBtn);

    await waitFor(() => {
      expect(screen.getByText(/PDF Split Successfully!/i)).toBeDefined();
      expect(screen.getByText(/Download ZIP Archive/i)).toBeDefined();
      expect(screen.getByText(/Individual Split Files:/i)).toBeDefined();
    });
  });
});
