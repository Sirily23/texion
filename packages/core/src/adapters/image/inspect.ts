import type { ImageInfo } from '../../document/types';
import { IngestionError } from '../../errors/codes';

function invalid(): never {
  throw new IngestionError(
    'invalid-image',
    'The image header is invalid or incomplete.',
  );
}
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
export function readImageInfo(bytes: Uint8Array): ImageInfo | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') {
    if (
      bytes.length < 33 ||
      ascii(bytes, 0, 8) !== '\x89PNG\r\n\x1a\n' ||
      view.getUint32(8) !== 13 ||
      ascii(bytes, 12, 4) !== 'IHDR'
    ) {
      invalid();
    }
    let offset = 8;
    let hasData = false;
    let ended = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      const type = ascii(bytes, offset + 4, 4);
      if (offset + length + 12 > bytes.length) {
        invalid();
      }
      if (type === 'IDAT') {
        hasData = true;
      }
      if (type === 'IEND') {
        ended = length === 0;
        break;
      }
      offset += length + 12;
    }
    if (!hasData || !ended) {
      invalid();
    }
    return {
      mimeType: 'image/png',
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    if (bytes.length < 4 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
      invalid();
    }
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        invalid();
      }
      while (bytes[offset] === 0xff) {
        offset++;
      }
      const marker = bytes[offset++]!;
      if (marker === 0xda || marker === 0xd9) {
        break;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }
      if (offset + 2 > bytes.length) {
        invalid();
      }
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) {
        invalid();
      }
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        if (length < 8) {
          invalid();
        }
        return {
          mimeType: 'image/jpeg',
          width: view.getUint16(offset + 5),
          height: view.getUint16(offset + 3),
        };
      }
      offset += length;
    }
    invalid();
  }
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') {
    if (bytes.length < 14 || bytes.at(-1) !== 0x3b) {
      invalid();
    }
    return {
      mimeType: 'image/gif',
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
    };
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    if (bytes.length < 20 || view.getUint32(4, true) + 8 > bytes.length) {
      invalid();
    }
    const chunk = ascii(bytes, 12, 4);
    if (chunk === 'VP8X' && bytes.length >= 30) {
      const read24 = (offset: number) =>
        bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
      return {
        mimeType: 'image/webp',
        width: read24(24) + 1,
        height: read24(27) + 1,
      };
    }
    if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      return {
        mimeType: 'image/webp',
        width: 1 + (bytes[21]! | ((bytes[22]! & 0x3f) << 8)),
        height:
          1 +
          ((bytes[22]! >> 6) | (bytes[23]! << 2) | ((bytes[24]! & 0x0f) << 10)),
      };
    }
    if (
      chunk === 'VP8 ' &&
      bytes.length >= 30 &&
      ascii(bytes, 23, 3) === '\x9d\x01\x2a'
    ) {
      return {
        mimeType: 'image/webp',
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    invalid();
  }
  return undefined;
}
