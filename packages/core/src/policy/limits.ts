export interface Limits {
  readonly maxExtractedCharacters: number;
  readonly maxDocumentPages: number;
  readonly maxArchiveBytes: number;
  readonly maxImagePixels: number;
  readonly maxFiles: number;
  readonly maxFileSize: number;
  readonly maxPreviewCharacters: number;
  readonly maxPreviewNodes: number;
  readonly maxPreviewDepth: number;
}

export const defaultLimits: Limits = Object.freeze({
  maxExtractedCharacters: 1_000_000,
  maxDocumentPages: 200,
  maxArchiveBytes: 20_000_000,
  maxImagePixels: 40_000_000,
  maxFiles: 5,
  maxFileSize: 2_000_000,
  maxPreviewCharacters: 50_000,
  maxPreviewNodes: 5_000,
  maxPreviewDepth: 64,
});

export function resolveLimits(options: Partial<Limits>): Limits {
  const limits = { ...defaultLimits, ...options };

  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive safe integer`);
    }
  }

  return Object.freeze(limits);
}
