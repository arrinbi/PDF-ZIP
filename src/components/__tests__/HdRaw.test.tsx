import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HdRaw } from '../HdRaw';
import * as hdUpscaler from '../../utils/hdUpscaler';
import * as imageOptimizer from '../../utils/imageOptimizer';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
}

describe('HdRaw Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(imageOptimizer, 'readImageData').mockResolvedValue({
      previewUrl: 'data:image/png;base64,mock',
      width: 800,
      height: 1200,
    });

    vi.spyOn(hdUpscaler, 'upscaleImageWithAi').mockImplementation(
      async (file, fileName, options, onProgress) => {
        const actualName = fileName || (file instanceof File ? file.name : 'image.png');
        const actualSize = file.size || 1024;
        onProgress?.(1, 2, 'Processing AI...');
        onProgress?.(2, 2, 'Done');
        return {
          id: `mock-id-${actualName}-${Math.random()}`,
          fileName: actualName,
          outputFileName: hdUpscaler.getHdOutputFilename(actualName, options.scaleFactor, options.outputFormat),
          originalWidth: 800,
          originalHeight: 1200,
          originalSize: actualSize,
          upscaledWidth: 800 * options.scaleFactor,
          upscaledHeight: 1200 * options.scaleFactor,
          upscaledSize: 2048,
          originalPreviewUrl: 'blob:mock-orig-url',
          upscaledPreviewUrl: 'blob:mock-upscaled-url',
          blob: new Blob(['fake upscaled data'], { type: 'image/png' }),
          status: 'done',
        };
      }
    );
  });

  it('renders initial empty state with Single Image and Batch / ZIP mode toggle', () => {
    render(<HdRaw />);
    expect(screen.getByRole('button', { name: /Single Image/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Batch \/ ZIP Mode/i })).toBeDefined();
    expect(screen.getByText(/Unggah Gambar Manhwa \/ Komik/i)).toBeDefined();
  });

  it('allows switching between Single Image and Batch / ZIP modes', async () => {
    render(<HdRaw />);

    const batchModeBtn = screen.getByRole('button', { name: /Batch \/ ZIP Mode/i });
    fireEvent.click(batchModeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Unggah Beberapa Gambar \(Batch\)/i)).toBeDefined();
    });

    const singleModeBtn = screen.getByRole('button', { name: /Single Image/i });
    fireEvent.click(singleModeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Unggah Gambar Manhwa \/ Komik/i)).toBeDefined();
    });
  });

  it('handles Single Image upload, option selection, and upscaling execution', async () => {
    render(<HdRaw />);

    const file = new File(['fake data'], 'manhwa_ch1_01.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/manhwa_ch1_01.png/i)).toBeDefined();
      expect(screen.getByText(/Tingkatkan Kualitas Gambar \(2x\)/i)).toBeDefined();
    });

    // Select 4x scale option
    const scale4xBtn = screen.getByRole('button', { name: /Skala 4x/i });
    fireEvent.click(scale4xBtn);

    const upscaleBtn = screen.getByText(/Tingkatkan Kualitas Gambar \(4x\)/i);
    fireEvent.click(upscaleBtn);

    await waitFor(() => {
      expect(screen.getByText(/HD AI Upscale Selesai!/i)).toBeDefined();
      expect(screen.getByText(/Unduh Gambar HD/i)).toBeDefined();
      expect(screen.getByText(/3200 × 4800 px/i)).toBeDefined(); // 800*4 x 1200*4
    });
  });

  it('handles Batch / ZIP mode upload and batch execution', async () => {
    render(<HdRaw />);

    // Switch to batch mode
    const batchModeBtn = screen.getByRole('button', { name: /Batch \/ ZIP Mode/i });
    fireEvent.click(batchModeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Unggah Beberapa Gambar \(Batch\)/i)).toBeDefined();
    });

    const file1 = new File(['fake data 1'], 'page_01.jpg', { type: 'image/jpeg' });
    const file2 = new File(['fake data 2'], 'page_02.jpg', { type: 'image/jpeg' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file1, file2] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/File Gambar Batch \(2\)/i)).toBeDefined();
      expect(screen.getByText(/Mulai AI Upscaling \(2 File\)/i)).toBeDefined();
    });

    const startBatchBtn = screen.getByText(/Mulai AI Upscaling \(2 File\)/i);
    fireEvent.click(startBatchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Batch AI Upscaling Selesai!/i)).toBeDefined();
      expect(screen.getByText(/Unduh Arsip ZIP Batch/i)).toBeDefined();
      expect(screen.getByText(/page_01_hd2x.jpg/i)).toBeDefined();
      expect(screen.getByText(/page_02_hd2x.jpg/i)).toBeDefined();
    });
  });

  it('displays error message when an invalid file is selected in Single Image mode', async () => {
    render(<HdRaw />);

    const invalidFile = new File(['fake text'], 'document.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/Format file tidak didukung/i)).toBeDefined();
    });
  });
});
