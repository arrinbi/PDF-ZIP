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

  const createWebkitFile = (name: string, relPath: string, mime = 'image/jpeg') => {
    const f = new File(['content'], name, { type: mime });
    Object.defineProperty(f, 'webkitRelativePath', { value: relPath });
    return f;
  };

  it('renders initial state with empty parent folder prompt', () => {
    render(<BatchProcessing />);
    expect(screen.getByText(/No Parent Folder Selected/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Select Parent Folder/i })).toBeDefined();
  });

  it('scans parent folder, pre-fills editable output name with original subfolder name', async () => {
    const files = [
      createWebkitFile('01.jpg', 'Manga/Love comes on a Moonlit Night Ch.2 Page 1 - Mangag/01.jpg'),
      createWebkitFile('02.jpg', 'Manga/Love comes on a Moonlit Night Ch.2 Page 1 - Mangag/02.jpg'),
      createWebkitFile('01.jpg', 'Manga/Chapter 3/01.jpg'),
    ];

    render(<BatchProcessing />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Love comes on a Moonlit Night Ch.2 Page 1 - Mangag/i)).toBeDefined();
      expect(screen.getByText(/Chapter 3/i)).toBeDefined();
    });

    // Check pre-filled output name input values
    const inputField1 = screen.getByDisplayValue('Love comes on a Moonlit Night Ch.2 Page 1 - Mangag') as HTMLInputElement;
    const inputField2 = screen.getByDisplayValue('Chapter 3') as HTMLInputElement;

    expect(inputField1).toBeDefined();
    expect(inputField2).toBeDefined();
  });

  it('allows user to edit output name independently and processes PDF with customized filenames', async () => {
    const files = [
      createWebkitFile('01.jpg', 'Manga/Love comes on a Moonlit Night Ch.2 Page 1 - Mangag/01.jpg'),
      createWebkitFile('01.jpg', 'Manga/Chapter 3/01.jpg'),
    ];

    render(<BatchProcessing />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Love comes on a Moonlit Night Ch.2 Page 1 - Mangag')).toBeDefined();
    });

    // Change output name for folder 1
    const inputField1 = screen.getByDisplayValue('Love comes on a Moonlit Night Ch.2 Page 1 - Mangag');
    fireEvent.change(inputField1, { target: { value: 'Love Comes on a Moonlit Night Ch.2' } });

    // Ensure inputField2 was NOT changed
    expect(screen.getByDisplayValue('Chapter 3')).toBeDefined();

    // Process selected folders
    const processButton = screen.getByText(/Process Selected Folders \(2 PDFs\)/i);
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Batch Processing Complete/i)).toBeDefined();
    }, { timeout: 10000 });

    // Verify customized output names appear in results
    expect(screen.getByText('Love Comes on a Moonlit Night Ch.2')).toBeDefined();
    expect(screen.getByText('Chapter 3')).toBeDefined();
  });

  it('processes ZIP mode with customized filenames', async () => {
    const files = [
      createWebkitFile('01.jpg', 'Manga/Folder A/01.jpg'),
      createWebkitFile('01.jpg', 'Manga/Folder B/01.jpg'),
    ];

    render(<BatchProcessing />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Folder A')).toBeDefined();
    });

    // Switch output mode to ZIP
    const zipButton = screen.getByRole('button', { name: /ZIP/i });
    fireEvent.click(zipButton);

    // Change output name for Folder A
    const inputFieldA = screen.getByDisplayValue('Folder A');
    fireEvent.change(inputFieldA, { target: { value: 'Renamed Archive A' } });

    // Process selected folders
    const processButton = screen.getByText(/Process Selected Folders \(2 ZIPs\)/i);
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Batch Processing Complete/i)).toBeDefined();
    });

    expect(screen.getByText('Renamed Archive A')).toBeDefined();
    expect(screen.getByText('Folder B')).toBeDefined();
  });

  it('handles invalid filename characters and empty output names safely on blur', async () => {
    const files = [
      createWebkitFile('01.jpg', 'Manga/Invalid/01.jpg'),
      createWebkitFile('01.jpg', 'Manga/EmptyName/01.jpg'),
    ];

    render(<BatchProcessing />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Invalid')).toBeDefined();
    });

    // Enter invalid characters / \ : * ? " < > |
    const inputField1 = screen.getByDisplayValue('Invalid');
    fireEvent.change(inputField1, { target: { value: 'Invalid/Name:Test?*|' } });
    fireEvent.blur(inputField1);

    // Enter empty name and blur -> should restore original subfolder name
    const inputField2 = screen.getByDisplayValue('EmptyName');
    fireEvent.change(inputField2, { target: { value: '   ' } });
    fireEvent.blur(inputField2);

    expect(screen.getByDisplayValue('InvalidNameTest')).toBeDefined();
    expect(screen.getByDisplayValue('EmptyName')).toBeDefined();
  });

  it('Download individual and Download All use the customized filename', async () => {
    const files = [
      createWebkitFile('01.jpg', 'Manga/CustomFolder/01.jpg'),
    ];

    render(<BatchProcessing />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('CustomFolder')).toBeDefined();
    });

    const inputField = screen.getByDisplayValue('CustomFolder');
    fireEvent.change(inputField, { target: { value: 'Final Document Name' } });

    const processButton = screen.getByText(/Process Selected Folders \(1 PDFs\)/i);
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Batch Processing Complete/i)).toBeDefined();
    });

    const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
    expect(downloadButtons.length).toBeGreaterThan(0);
    expect(screen.getByText('Final Document Name')).toBeDefined();
  });
});
