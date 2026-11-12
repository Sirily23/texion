import { createHighlightModel } from './highlight-model';
import { tokenizeDataSource } from './data-tokens';
import { resolveHighlightLimits } from './markdown-tokens';
import type { HighlightLimits, HighlightToken } from './markdown-tokens';
import { sourceWarnings } from '../ingestion/text-format';
import type { DocumentWarning } from '../errors/codes';

const keywords = new Set(
  'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL ON AS AND OR NOT NULL IS IN EXISTS BETWEEN LIKE ORDER BY GROUP HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP DISTINCT UNION ALL WITH CASE WHEN THEN ELSE END ASC DESC RETURNING TRUE FALSE'.split(
    ' ',
  ),
);

/** Bounded lexical highlighting; SQL is highlighted, never executed or syntax-validated. */
export function inspectCodeBlock(
  source: string,
  language = 'text',
  options: HighlightLimits = {},
) {
  const limits = resolveHighlightLimits(options);
  const label = language.toLowerCase();
  const normalized =
    label === 'md'
      ? 'markdown'
      : ['postgres', 'postgresql', 'mysql', 'sqlite'].includes(label)
        ? 'sql'
        : label === 'tsv'
          ? 'csv'
          : label;
  let tokens: readonly HighlightToken[] = [];
  let warnings: readonly DocumentWarning[] = [];
  let limited = source.length > limits.maxCharacters;
  if (!limited && (normalized === 'json' || normalized === 'csv')) {
    const result = tokenizeDataSource(source, normalized, limits);
    tokens = result.tokens;
    limited = result.limited;
    warnings = sourceWarnings(source, normalized, limits.maxCharacters);
  } else if (!limited && normalized === 'markdown') {
    const result = createHighlightModel(source, {
      ...limits,
      format: 'markdown',
    });
    tokens = result.segments.flatMap((segment) =>
      segment.kind ? [{ ...segment, kind: segment.kind }] : [],
    );
    limited = !result.enabled;
  } else if (!limited && normalized === 'sql') {
    const output: HighlightToken[] = [];
    const pattern =
      /--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|'(?:''|[^'])*'?|"(?:""|[^"])*"?|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w$]*\b|[(),;.*=<>!+\/-]/g;
    for (const match of source.matchAll(pattern)) {
      if (output.length >= limits.maxTokens) {
        limited = true;
        break;
      }
      const value = match[0];
      const kind =
        value.startsWith('--') || value.startsWith('/*')
          ? 'comment'
          : value.startsWith("'") || value.startsWith('"')
            ? 'string'
            : /^\d/.test(value)
              ? 'number'
              : keywords.has(value.toUpperCase())
                ? 'keyword'
                : /^[(),;.*=<>!+\/-]$/.test(value)
                  ? 'punctuation'
                  : undefined;
      if (kind)
        output.push(
          Object.freeze({
            start: match.index,
            end: match.index + value.length,
            kind,
          }),
        );
    }
    tokens = Object.freeze(limited ? [] : output);
  }
  return Object.freeze({ language: normalized, tokens, warnings, limited });
}
