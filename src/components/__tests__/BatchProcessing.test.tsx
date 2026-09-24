import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchProcessing } from '../BatchProcessing';
import * as imageOptimizer from '../../utils/imageOptimizer';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-batch-url');
}

describe('BatchProcessing Component', () => {
  beforeEach(() => {
    vi.spyOn(imageOptimizer, 'readImageData').mockImplementation(async () => {
      return {
        previewUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        width: 800,
        height: 600,
      };
    });
  });

  it('renders initial state with empty parent folder prompt', () => {
    render(<BatchProcessing />);
    expect(screen.getByText(/No Parent Folder Selected/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Select Parent Folder/i })).toBeDefined();
  });

  it('scans parent folder, lists subfolders in checklist, processes selected ones, and shows results with Download buttons', async () => {
    const createWebkitFile = (name: string, relPath: string, mime = 'image/jpeg') => {
      const f = new File(['content'], name, { type: mime });
      Object.defineProperty(f, 'webkitRelativePath', { value: relPath });
      return f;
    };

    const files = [
      createWebkitFile('01.jpg', 'DCIM/01. Manhwa/01.jpg'),
      createWebkitFile('02.jpg', 'DCIM/01. Manhwa/02.jpg'),
      createWebkitFile('01.jpg', 'DCIM/02. Manhwa/01.jpg'),
      createWebkitFile('pic.jpg', 'DCIM/Random/pic.jpg'),
    ];

    render(<BatchProcessing />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/01. Manhwa/i)).toBeDefined();
      expect(screen.getByText(/02. Manhwa/i)).toBeDefined();
      expect(screen.getByText(/Random/i)).toBeDefined();
    });

    // Deselect 'Random' subfolder
    const randomLabel = screen.getByText(/Random/i).closest('label');
    if (randomLabel) {
      fireEvent.click(randomLabel);
    }

    // Process selected folders (2 selected)
    const processButton = screen.getByText(/Process Selected Folders \(2 PDFs\)/i);
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Batch Processing Complete/i)).toBeDefined();
    });

    // Should render Download buttons for 01. Manhwa and 02. Manhwa, but NOT Random
    expect(screen.getByText(/01. Manhwa/i)).toBeDefined();
    expect(screen.getByText(/02. Manhwa/i)).toBeDefined();
    expect(screen.queryByText(/Random/i)).toBeNull();

    const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
    expect(downloadButtons.length).toBeGreaterThan(0);
  });
});
