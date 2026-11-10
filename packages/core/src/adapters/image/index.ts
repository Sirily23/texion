import type { BinaryFormatAdapter } from '../contract';
import type { ImageInfo } from '../../document/types';
import { IngestionError } from '../../errors/codes';
import { readImageInfo } from './inspect';

const extensionMime: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};
export const imageAdapter: BinaryFormatAdapter = {
  kind: 'binary',
  format: 'image',
  extensions: Object.keys(extensionMime),
  mimeTypes: Object.values(extensionMime),
  detectBytes(bytes) {
    try {
      return !!readImageInfo(bytes);
    } catch {
      return false;
    }
  },
  inspect(bytes, limits, source) {
    const image = readImageInfo(bytes);
    if (!image || !image.width || !image.height) {
      throw new IngestionError(
        'invalid-image',
        'The file is not a supported raster image.',
      );
    }
    const extension = source.name.includes('.')
      ? source.name.split('.').at(-1)!.toLowerCase()
      : '';
    const expected =
      extensionMime[extension] ??
      (this.mimeTypes.includes(source.mime) ? source.mime : undefined);
    if (expected && expected !== image.mimeType) {
      throw new IngestionError(
        'invalid-image',
        'Image bytes do not match the declared image type.',
      );
    }
    if (image.width * image.height > limits.maxImagePixels) {
      throw new IngestionError(
        'too-large',
        `Image dimensions exceed ${limits.maxImagePixels} pixels.`,
      );
    }
    return { metadata: { image }, warnings: [] };
  },
  parse(_bytes, _limits, metadata) {
    return {
      nodes: [],
      image: metadata.image as ImageInfo,
      truncated: false,
      warnings: [],
    };
  },
};
