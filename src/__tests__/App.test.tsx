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

  it('opens PDF preview in browser when "Preview in Browser" button is clicked', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {
      const mockDoc = {
        title: '',
        body: {
          style: {},
          appendChild: vi.fn(),
        },
        createElement: vi.fn().mockReturnValue({ style: {}, src: '' }),
      };
      return { document: mockDoc } as unknown as Window;
    });

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
      expect(screen.getByText(/Preview in Browser/i)).toBeDefined();
    });

    const previewButton = screen.getByRole('button', { name: /Preview in Browser/i });
    fireEvent.click(previewButton);

    expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
    windowOpenSpy.mockRestore();
  });
});
