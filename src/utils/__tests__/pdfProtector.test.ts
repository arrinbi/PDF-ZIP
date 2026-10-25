import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { protectPdfWithPassword, unlockPdfWithPassword } from '../pdfProtector';

describe('pdfProtector utility', () => {
  let samplePdfBytes: Uint8Array;

  beforeEach(async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([200, 200]);
    samplePdfBytes = await pdfDoc.save();
  });

  it('encrypts PDF and returns valid ProtectPdfResult', async () => {
    const result = await protectPdfWithPassword(samplePdfBytes, 'mySecret123', 'my_protected');

    expect(result.filename).toBe('my_protected.pdf');
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.blob).toBeInstanceOf(Blob);

    const buffer = await result.blob.arrayBuffer();

    // pdf-lib without ignoreEncryption should fail to parse encrypted PDF
    await expect(PDFDocument.load(buffer)).rejects.toThrow();
  });

  it('throws error when password is empty on encryption', async () => {
    await expect(protectPdfWithPassword(samplePdfBytes, '', 'test')).rejects.toThrow('Password cannot be empty.');
    await expect(protectPdfWithPassword(samplePdfBytes, '   ', 'test')).rejects.toThrow('Password cannot be empty.');
  });

  describe('unlockPdfWithPassword', () => {
    it('unlocks encrypted PDF with correct password and produces valid unencrypted PDF', async () => {
      const protectedResult = await protectPdfWithPassword(samplePdfBytes, 'secret123', 'protected_doc');
      const protectedBuffer = await protectedResult.blob.arrayBuffer();

      const unlockedResult = await unlockPdfWithPassword(protectedBuffer, 'secret123', 'unlocked_doc');

      expect(unlockedResult.filename).toBe('unlocked_doc.pdf');
      expect(unlockedResult.sizeBytes).toBeGreaterThan(0);
      expect(unlockedResult.blob).toBeInstanceOf(Blob);

      const unlockedBuffer = await unlockedResult.blob.arrayBuffer();
      // Should load smoothly with PDFDocument.load without needing ignoreEncryption
      const loadedDoc = await PDFDocument.load(unlockedBuffer);
      expect(loadedDoc.getPageCount()).toBe(1);
    });

    it('rejects with error when unlocking encrypted PDF with incorrect password', async () => {
      const protectedResult = await protectPdfWithPassword(samplePdfBytes, 'secret123', 'protected_doc');
      const protectedBuffer = await protectedResult.blob.arrayBuffer();

      await expect(unlockPdfWithPassword(protectedBuffer, 'wrong_password', 'unlocked_doc')).rejects.toThrow(
        /Incorrect password/i
      );
    });

    it('rejects with error when password is empty on encrypted PDF', async () => {
      const protectedResult = await protectPdfWithPassword(samplePdfBytes, 'secret123', 'protected_doc');
      const protectedBuffer = await protectedResult.blob.arrayBuffer();

      await expect(unlockPdfWithPassword(protectedBuffer, '', 'unlocked_doc')).rejects.toThrow(
        'Password is required to unlock this PDF.'
      );
    });

    it('handles already-unencrypted PDFs gracefully', async () => {
      const result = await unlockPdfWithPassword(samplePdfBytes, '', 'already_unencrypted');

      expect(result.filename).toBe('already_unencrypted.pdf');
      expect(result.sizeBytes).toBeGreaterThan(0);

      const buffer = await result.blob.arrayBuffer();
      const loadedDoc = await PDFDocument.load(buffer);
      expect(loadedDoc.getPageCount()).toBe(1);
    });
  });
});
