import { createContent, isTexionContent } from './schema';
import type { TexionContent } from './types';

export function serializeContent(content: TexionContent): string {
  if (!isTexionContent(content)) {
    throw new TypeError('Unsupported Texion content.');
  }
  return JSON.stringify(
    createContent(content.source, {
      format: content.format,
      ...(content.originalSource === undefined
        ? {}
        : { originalSource: content.originalSource }),
    }),
  );
}

export function deserializeContent(serialized: string): TexionContent {
  const value: unknown = JSON.parse(serialized);

  if (!isTexionContent(value)) {
    throw new TypeError('Unsupported Texion content.');
  }
  return createContent(value.source, {
    format: value.format,
    ...(value.originalSource === undefined
      ? {}
      : { originalSource: value.originalSource }),
  });
}

export function exportMarkdown(content: TexionContent): string {
  if (!isTexionContent(content) || content.format !== 'markdown') {
    throw new TypeError('Unsupported Texion content.');
  }
  return content.source;
}

export function exportSource(content: TexionContent): string {
  if (!isTexionContent(content)) {
    throw new TypeError('Unsupported Texion content.');
  }
  return content.source;
}
