import type { TexionContent, ContentFormat } from './types';

export function isTexionContent(value: unknown): value is TexionContent {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const content = value as Record<string, unknown>;

  return (
    content.version === 1 &&
    typeof content.format === 'string' &&
    isContentFormat(content.format) &&
    typeof content.source === 'string' &&
    (content.originalSource === undefined ||
      typeof content.originalSource === 'string')
  );
}

export function createContent(
  source: string,
  options: {
    readonly originalSource?: string;
    readonly format?: ContentFormat;
  } = {},
): TexionContent {
  if (
    typeof source !== 'string' ||
    (options.originalSource !== undefined &&
      typeof options.originalSource !== 'string')
  ) {
    throw new TypeError('Content source must be a string.');
  }
  if (options.format !== undefined && !isContentFormat(options.format)) {
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

export function isContentFormat(value: unknown): value is ContentFormat {
  return (
    typeof value === 'string' &&
    !!value.trim() &&
    value === value.trim() &&
    value !== 'auto'
  );
}
