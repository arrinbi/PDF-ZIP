import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import type { ProtectPdfResult } from '../types';
import { sanitizeFilename } from './fileNaming';

/**
 * Protects a PDF file with a user password using client-side encryption.
 * The process runs 100% locally in the browser without server uploads.
 */
export async function protectPdfWithPassword(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  userPassword: string,
  rawBaseFilename: string = 'protected_document'
): Promise<ProtectPdfResult> {
  if (!userPassword || userPassword.trim().length === 0) {
    throw new Error('Password cannot be empty.');
  }

  const uint8Buffer =
    fileOrBuffer instanceof File
      ? new Uint8Array(await fileOrBuffer.arrayBuffer())
      : fileOrBuffer instanceof ArrayBuffer
      ? new Uint8Array(fileOrBuffer)
      : fileOrBuffer;

  let encryptedBytes: Uint8Array;
  try {
    encryptedBytes = await encryptPDF(uint8Buffer, userPassword, {
      ownerPassword: userPassword,
    });
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to encrypt PDF file. Ensure the PDF is valid and not already protected.');
  }

  const blob = new Blob([encryptedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  let cleanName = sanitizeFilename(rawBaseFilename, 'protected_document');
  if (!cleanName.toLowerCase().endsWith('.pdf')) {
    cleanName += '.pdf';
  }

  return {
    blob,
    url,
    sizeBytes: encryptedBytes.byteLength,
    filename: cleanName,
  };
}
