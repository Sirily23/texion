import type { FormatAdapter } from '../adapters/contract';
import type { TextFormat, ContentFormat } from '../content/types';
import type { DocumentWarning } from '../errors/codes';
import { defaultLimits } from '../policy/limits';
import { markdownAdapter } from '../adapters/markdown';
import { jsonAdapter } from '../adapters/json';
import { csvAdapter } from '../adapters/csv';

export const textFormats: readonly TextFormat[] = [
  'markdown',
  'json',
  'csv',
  'text',
];
export function isTextFormat(value: string): value is TextFormat {
  return textFormats.includes(value as TextFormat);
}
export function detectTextFormat(
  source: string,
  allowed?: readonly TextFormat[],
): TextFormat;
export function detectTextFormat(
  source: string,
  allowed?: readonly string[],
  adapters?: readonly FormatAdapter[],
): ContentFormat;
export function detectTextFormat(
  source: string,
  allowed: readonly string[] = textFormats,
  adapters: readonly FormatAdapter[] = [],
): ContentFormat {
  const prefix = source.slice(0, 8192);
  const firstSource = allowed[0] ?? 'markdown';
  const trimmed = prefix.trimStart();
  const looksJson =
    trimmed.startsWith('{') ||
    /^\[\s*(?:[\[{"\d\]-]|true|false|null)/.test(trimmed);
  if (allowed.includes('json') && looksJson) {
    return 'json';
  }
  if (allowed.includes('markdown') && markdownAdapter.detect(prefix)) {
    return 'markdown';
  }
  if (allowed.includes('csv') && csvAdapter.detect(prefix)) {
    return 'csv';
  }
  for (const adapter of adapters) {
    if (
      adapter.kind === 'binary' ||
      isTextFormat(adapter.format) ||
      !allowed.includes(adapter.format)
    )
      continue;
    try {
      if (adapter.detect(prefix)) return adapter.format;
    } catch {
      /* Final processing reports trusted-adapter failures. */
    }
  }
  return firstSource;
}
export function sourceWarnings(
  source: string,
  format: ContentFormat,
  maxCharacters = 20_000,
): readonly DocumentWarning[] {
  if (!source.trim() || (format !== 'json' && format !== 'csv')) {
    return [];
  }
  if (source.length > maxCharacters) {
    return [
      {
        code: 'too-complex',
        message:
          'Live validation is paused for this input size. The full source is checked on submission.',
      },
    ];
  }
  const adapter = format === 'json' ? jsonAdapter : csvAdapter;
  return adapter.inspect?.(source, defaultLimits).warnings ?? [];
}
