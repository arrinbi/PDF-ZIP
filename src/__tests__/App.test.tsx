import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';
import * as imageOptimizer from '../utils/imageOptimizer';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-export-url');
}

describe('App Component', () => {
  beforeEach(() => {
    vi.spyOn(imageOptimizer, 'readImageData').mockImplementation(async () => {
      return {
        previewUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        width: 800,
        height: 600,
      };
    });
  });

  it('renders initial state with empty dropzone and feature highlights', () => {
    render(<App />);
    expect(screen.getByText(/PDF & ZIP Export/i)).toBeDefined();
    expect(screen.getByText(/Original Quality ZIP/i)).toBeDefined();
  });

  it('renders export mode selector when images are uploaded', async () => {
    render(<App />);

    const file1 = new File(['fake image data 1'], 'photo123.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [file1] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/Export Options/i)).toBeDefined();
      expect(screen.getByText(/Create PDF \(1\)/i)).toBeDefined();
    });

    // Check PDF-only options are visible
    expect(screen.getByText(/Page Margin/i)).toBeDefined();
    expect(screen.getByText(/Image Output & Compression/i)).toBeDefined();

    // Switch to ZIP export mode
    const zipButton = screen.getByRole('button', { name: /ZIP/i });
    fireEvent.click(zipButton);

    await waitFor(() => {
      expect(screen.getByText(/Export ZIP \(1\)/i)).toBeDefined();
      expect(screen.getByText(/ZIP Archive Name/i)).toBeDefined();
    });

    // Verify PDF-only options are hidden in ZIP mode
    expect(screen.queryByText(/Page Margin/i)).toBeNull();
    expect(screen.queryByText(/Image Output & Compression/i)).toBeNull();

    // Verify ZIP Format options exist
    expect(screen.getByText(/ZIP Format & Quality/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Original' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'JPG' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PNG' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'WEBP' })).toBeDefined();
  });

  it('allows switching ZIP format options and disables quality for Original/PNG', async () => {
    render(<App />);

    const file1 = new File(['fake image data 1'], 'photo123.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [file1] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/Export Options/i)).toBeDefined();
    });

    // Switch to ZIP export mode
    const zipModeButton = screen.getByRole('button', { name: /ZIP/i });
    fireEvent.click(zipModeButton);

    const qualityRange = screen.getByRole('slider') as HTMLInputElement;

    // Default ZIP mode is Original -> quality slider disabled
    expect(qualityRange.disabled).toBe(true);

    // Click JPG format
    const jpgBtn = screen.getByRole('button', { name: 'JPG' });
    fireEvent.click(jpgBtn);
    expect(qualityRange.disabled).toBe(false);

    // Click PNG format
    const pngBtn = screen.getByRole('button', { name: 'PNG' });
    fireEvent.click(pngBtn);
    expect(qualityRange.disabled).toBe(true);

    // Click WEBP format
    const webpBtn = screen.getByRole('button', { name: 'WEBP' });
    fireEvent.click(webpBtn);
    expect(qualityRange.disabled).toBe(false);
  });

  it('generates ZIP export when in ZIP mode and export button is clicked', async () => {
    render(<App />);

    const file1 = new File(['fake data 1'], 'img1.png', { type: 'image/png' });
    const file2 = new File(['fake data 2'], 'img2.jpg', { type: 'image/jpeg' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { files: [file1, file2] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/Create PDF \(2\)/i)).toBeDefined();
    });

    // Switch to ZIP mode
    const zipButton = screen.getByRole('button', { name: /ZIP/i });
    fireEvent.click(zipButton);

    const exportButton = screen.getByText(/Export ZIP \(2\)/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/Your ZIP Archive is Ready!/i)).toBeDefined();
      expect(screen.getByText(/Download ZIP/i)).toBeDefined();
    });
  });

  it('generates PDF export and renders Download PDF button without Preview in Browser button', async () => {
    render(<App />);

    const file1 = new File(['fake data 1'], 'img1.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [file1] } });
    }

    await waitFor(() => {
      expect(screen.getByText(/Create PDF \(1\)/i)).toBeDefined();
    });

    const exportButton = screen.getByText(/Create PDF \(1\)/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/Your PDF is Ready!/i)).toBeDefined();
      expect(screen.getByText(/Download PDF/i)).toBeDefined();
    });

    expect(screen.queryByText(/Preview in Browser/i)).toBeNull();
  });
});
