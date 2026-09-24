/**
 * Sanitizes a filename string by removing invalid characters (/ \ : * ? " < > |)
 * and control characters, trimming whitespace, and stripping trailing dots/spaces.
 * If the resulting filename is empty, it returns the provided fallbackName (or 'document').
 */
export function sanitizeFilename(name?: string, fallbackName?: string): string {
  const fallback = fallbackName && fallbackName.trim()
    ? fallbackName.trim().replace(/[\/\?:*<>|"\x00-\x1F]/g, '').trim().replace(/[\s.]+$/, '') || 'document'
    : 'document';

  if (!name || typeof name !== 'string') {
    return fallback;
  }

  // Remove invalid characters / \ : * ? " < > | and control chars
  let sanitized = name.replace(/[\/\?:*<>|"\x00-\x1F]/g, '');

  // Trim leading/trailing whitespace and trailing dots
  sanitized = sanitized.trim().replace(/[\s.]+$/, '');

  if (!sanitized) {
    return fallback;
  }

  return sanitized;
}
