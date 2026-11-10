import type { TexionContent, TextFormat } from './types';

export function isTexionContent(value: unknown): value is TexionContent {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const content = value as Record<string, unknown>;

  return (
    content.version === 1 &&
    typeof content.format === 'string' &&
    ['markdown', 'json', 'csv'].includes(content.format) &&
    typeof content.source === 'string' &&
    (content.originalSource === undefined ||
      typeof content.originalSource === 'string')
  );
}

export function createContent(
  source: string,
  options: {
    readonly originalSource?: string;
    readonly format?: TextFormat;
  } = {},
): TexionContent {
  if (
    typeof source !== 'string' ||
    (options.originalSource !== undefined &&
      typeof options.originalSource !== 'string')
  ) {
    throw new TypeError('Content source must be a string.');
  }
  if (options.format && !['markdown', 'json', 'csv'].includes(options.format)) {
    throw new TypeError('Unsupported content format.');
  }
  return Object.freeze({
    version: 1,
    format: options.format ?? 'markdown',
    source,
    ...(options.originalSource === undefined
      ? {}
      : { originalSource: options.originalSource }),
  });
}
