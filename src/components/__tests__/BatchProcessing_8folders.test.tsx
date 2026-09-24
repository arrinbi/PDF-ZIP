import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchProcessing } from '../BatchProcessing';
import * as imageOptimizer from '../../utils/imageOptimizer';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockImplementation(() => `blob:mock-batch-url-${Math.random()}`);
  window.URL.revokeObjectURL = vi.fn();
}

describe('BatchProcessing 7, 8, 9, 10 subfolders test', () => {
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

  const testFolderCount = async (count: number) => {
    const files: File[] = [];
    for (let f = 1; f <= count; f++) {
      for (let img = 1; img <= 2; img++) {
        files.push(createWebkitFile(`0${img}.jpg`, `ParentFolder/SubFolder_${f}/0${img}.jpg`));
      }
    }

    const { unmount } = render(<BatchProcessing />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`SubFolder_${count}`, 'i'))).toBeDefined();
    });

    const processButton = screen.getByText(new RegExp(`Process Selected Folders \\(${count} PDFs\\)`, 'i'));
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Batch Processing Complete/i)).toBeDefined();
    }, { timeout: 20000 });

    expect(screen.getByText(new RegExp(`Processed ${count} folders`, 'i'))).toBeDefined();
    unmount();
  };

  it('processes 7 subfolders', async () => {
    await testFolderCount(7);
  }, 30000);

  it('processes 8 subfolders', async () => {
    await testFolderCount(8);
  }, 30000);

  it('processes 9 subfolders', async () => {
    await testFolderCount(9);
  }, 30000);

  it('processes 10 subfolders', async () => {
    await testFolderCount(10);
  }, 30000);
});
