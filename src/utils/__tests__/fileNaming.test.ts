import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../fileNaming';

describe('sanitizeFilename', () => {
  it('returns original string if valid', () => {
    expect(sanitizeFilename('Love Comes on a Moonlit Night Ch.2')).toBe('Love Comes on a Moonlit Night Ch.2');
  });

  it('sanitizes invalid characters like / \\ : * ? " < > |', () => {
    expect(sanitizeFilename('Folder/Name: Test? *Illegal*')).toBe('FolderName Test Illegal');
  });

  it('trims spaces and trailing dots', () => {
    expect(sanitizeFilename('  My Chapter Name...  ')).toBe('My Chapter Name');
  });

  it('falls back to fallbackName if provided when name is empty/invalid', () => {
    expect(sanitizeFilename('???', 'Original Subfolder')).toBe('Original Subfolder');
  });

  it('falls back to "document" if fallbackName is empty or invalid', () => {
    expect(sanitizeFilename('   ')).toBe('document');
  });
});
