import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { protectPdfWithPassword } from '../pdfProtector';

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

    // pdf-lib without ignoreEncryption should fail to parse encrypted PDF or report encrypted status
    await expect(PDFDocument.load(buffer)).rejects.toThrow();
  });

  it('throws error when password is empty', async () => {
    await expect(protectPdfWithPassword(samplePdfBytes, '', 'test')).rejects.toThrow('Password cannot be empty.');
    await expect(protectPdfWithPassword(samplePdfBytes, '   ', 'test')).rejects.toThrow('Password cannot be empty.');
  });
});
