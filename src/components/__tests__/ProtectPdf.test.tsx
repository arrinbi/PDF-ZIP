import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProtectPdf } from '../ProtectPdf';
import * as pdfProtector from '../../utils/pdfProtector';
import * as pdfSplitter from '../../utils/pdfSplitter';

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-protect-url');
}

describe('ProtectPdf Component', () => {
  beforeEach(() => {
    vi.spyOn(pdfSplitter, 'getPdfPageCount').mockResolvedValue(3);
    vi.spyOn(pdfProtector, 'protectPdfWithPassword').mockImplementation(
      async (file, password, filename) => {
        return {
          blob: new Blob(['protected content']),
          url: 'blob:mock-protect-url',
          sizeBytes: 1024,
          filename: `${filename}.pdf`,
        };
      }
    );
  });

  it('renders initial dropzone state', () => {
    render(<ProtectPdf />);
    expect(screen.getByText(/Upload PDF Files to Protect/i)).toBeDefined();
  });

  it('allows single file selection and protection with password matching', async () => {
    render(<ProtectPdf />);

    const pdfFile = new File(['fake pdf content'], 'doc1.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText(/1. doc1.pdf/i)).toBeDefined();
    });

    const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
    const confirmInput = screen.getByPlaceholderText('Confirm password') as HTMLInputElement;

    // Password mismatch test
    fireEvent.change(passwordInput, { target: { value: 'pass123' } });
    fireEvent.change(confirmInput, { target: { value: 'pass456' } });

    const submitBtn = screen.getByRole('button', { name: /Protect 1 PDF/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeDefined();
    });

    // Fix password confirmation match
    fireEvent.change(confirmInput, { target: { value: 'pass123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/PDF Protection Complete/i)).toBeDefined();
      expect(screen.getByText(/doc1_protected.pdf/i)).toBeDefined();
    });
  });

  it('allows selecting and protecting multiple PDF files with independent passwords', async () => {
    render(<ProtectPdf />);

    const file1 = new File(['fake pdf 1'], 'doc1.pdf', { type: 'application/pdf' });
    const file2 = new File(['fake pdf 2'], 'doc2.pdf', { type: 'application/pdf' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(screen.getByText(/Selected PDF Files \(2\)/i)).toBeDefined();
      expect(screen.getByText(/1. doc1.pdf/i)).toBeDefined();
      expect(screen.getByText(/2. doc2.pdf/i)).toBeDefined();
    });

    const pwdInputs = screen.getAllByPlaceholderText('Enter password');
    const confirmInputs = screen.getAllByPlaceholderText('Confirm password');

    expect(pwdInputs.length).toBe(2);
    expect(confirmInputs.length).toBe(2);

    // Assign different passwords to file 1 and file 2
    fireEvent.change(pwdInputs[0], { target: { value: 'abc123' } });
    fireEvent.change(confirmInputs[0], { target: { value: 'abc123' } });

    fireEvent.change(pwdInputs[1], { target: { value: 'xyz789' } });
    fireEvent.change(confirmInputs[1], { target: { value: 'xyz789' } });

    const submitBtn = screen.getByRole('button', { name: /Protect 2 PDFs/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/PDF Protection Complete/i)).toBeDefined();
      expect(screen.getByText(/doc1_protected.pdf/i)).toBeDefined();
      expect(screen.getByText(/doc2_protected.pdf/i)).toBeDefined();
      expect(screen.getByText(/Download All \(2\)/i)).toBeDefined();
    });

    // Verify spy was called twice with respective independent passwords
    expect(pdfProtector.protectPdfWithPassword).toHaveBeenCalledTimes(2);
    expect(pdfProtector.protectPdfWithPassword).toHaveBeenNthCalledWith(1, file1, 'abc123', 'doc1_protected');
    expect(pdfProtector.protectPdfWithPassword).toHaveBeenNthCalledWith(2, file2, 'xyz789', 'doc2_protected');
  });

  it('rejects submission if one file in multi-file batch fails validation', async () => {
    render(<ProtectPdf />);

    const file1 = new File(['fake pdf 1'], 'doc1.pdf', { type: 'application/pdf' });
    const file2 = new File(['fake pdf 2'], 'doc2.pdf', { type: 'application/pdf' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(screen.getByText(/Selected PDF Files \(2\)/i)).toBeDefined();
    });

    const pwdInputs = screen.getAllByPlaceholderText('Enter password');
    const confirmInputs = screen.getAllByPlaceholderText('Confirm password');

    // File 1 valid
    fireEvent.change(pwdInputs[0], { target: { value: 'pass1' } });
    fireEvent.change(confirmInputs[0], { target: { value: 'pass1' } });

    // File 2 password missing or mismatched
    fireEvent.change(pwdInputs[1], { target: { value: 'pass2' } });
    fireEvent.change(confirmInputs[1], { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: /Protect 2 PDFs/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Validation failed for one or more files/i)).toBeDefined();
      expect(screen.getByText(/Passwords do not match/i)).toBeDefined();
    });

    expect(pdfProtector.protectPdfWithPassword).not.toHaveBeenCalled();
  });
});
