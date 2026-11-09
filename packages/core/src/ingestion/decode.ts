import type { DocumentWarning } from '../errors/codes';

export interface DecodeResult {
  readonly text: string;
  readonly warnings: readonly DocumentWarning[];
}

export function decode(bytes: Uint8Array): DecodeResult {
  let encoding = 'utf-8';

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be';
  }
  try {
    return {
      text: new TextDecoder(encoding, { fatal: true }).decode(bytes),
      warnings: [],
    };
  } catch {
    return {
      text: new TextDecoder(encoding).decode(bytes),
      warnings: [
        {
          code: 'invalid-utf8',
          message: `Invalid ${encoding} bytes were replaced during decoding.`,
        },
      ],
    };
  }
}
