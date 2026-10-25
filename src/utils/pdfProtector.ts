import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';
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

/**
 * Unlocks a password-protected PDF file using client-side decryption.
 * If the PDF is not encrypted, returns the original document safely.
 * The process runs 100% locally in the browser without server uploads.
 */
export async function unlockPdfWithPassword(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  userPassword: string,
  rawBaseFilename: string = 'unlocked_document'
): Promise<ProtectPdfResult> {
  const uint8Buffer =
    fileOrBuffer instanceof File
      ? new Uint8Array(await fileOrBuffer.arrayBuffer())
      : fileOrBuffer instanceof ArrayBuffer
      ? new Uint8Array(fileOrBuffer)
      : fileOrBuffer;

  let unlockedBytes: Uint8Array;

  try {
    const encInfo = await isEncrypted(uint8Buffer);
    if (!encInfo.encrypted) {
      unlockedBytes = uint8Buffer;
    } else {
      if (!userPassword || userPassword.trim().length === 0) {
        throw new Error('Password is required to unlock this PDF.');
      }
      unlockedBytes = await decryptPDF(uint8Buffer, userPassword);
    }
  } catch (err: any) {
    if (err?.message?.includes('Password is required')) {
      throw err;
    }
    const msg = err?.message || '';
    if (msg.includes('Incorrect password') || msg.includes('does not match')) {
      throw new Error('Incorrect password. Please verify the password and try again.');
    }
    throw new Error(msg || 'Failed to unlock PDF file. Ensure the password is correct and file is valid.');
  }

  const blob = new Blob([unlockedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  let cleanName = sanitizeFilename(rawBaseFilename, 'unlocked_document');
  if (!cleanName.toLowerCase().endsWith('.pdf')) {
    cleanName += '.pdf';
  }

  return {
    blob,
    url,
    sizeBytes: unlockedBytes.byteLength,
    filename: cleanName,
  };
}
