import type { TexionContent } from './types';

export function isTexionContent(value: unknown): value is TexionContent {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const content = value as Record<string, unknown>;

  return (
    content.version === 1 &&
    content.format === 'markdown' &&
    typeof content.source === 'string' &&
    (content.originalSource === undefined ||
      typeof content.originalSource === 'string')
  );
}

export function createContent(
  source: string,
  options: { readonly originalSource?: string } = {},
): TexionContent {
  if (
    typeof source !== 'string' ||
    (options.originalSource !== undefined &&
      typeof options.originalSource !== 'string')
  ) {
    throw new TypeError('Content source must be a string.');
  }
  return Object.freeze({
    version: 1,
    format: 'markdown',
    source,
    ...(options.originalSource === undefined
      ? {}
      : { originalSource: options.originalSource }),
  });
}
