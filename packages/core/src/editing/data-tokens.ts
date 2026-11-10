import { createScanner } from 'jsonc-parser';
import { resolveHighlightLimits } from './markdown-tokens';
import type {
  HighlightKind,
  HighlightLimits,
  HighlightToken,
} from './markdown-tokens';

export function tokenizeDataSource(
  source: string,
  format: 'json' | 'csv',
  options: HighlightLimits = {},
) {
  const limits = resolveHighlightLimits(options);
  const tokens: HighlightToken[] = [];
  const finish = (limited: boolean) => ({
    tokens: Object.freeze(limited ? [] : tokens),
    limited,
  });
  if (source.length > limits.maxCharacters) {
    return finish(true);
  }
  if (format === 'json') {
    const scanner = createScanner(source, true);
    let depth = 0;
    scanner.scan();
    while (scanner.getTokenLength() > 0) {
      const start = scanner.getTokenOffset();
      const end = start + scanner.getTokenLength();
      const token = source.slice(start, end);
      let highlight: HighlightKind = 'punctuation';
      if (token.startsWith('"')) {
        highlight = /^\s*:/.test(source.slice(end)) ? 'property' : 'string';
      } else if (/^-?\d/.test(token)) {
        highlight = 'number';
      } else if (token === 'true' || token === 'false') {
        highlight = 'boolean';
      } else if (token === 'null') {
        highlight = 'null';
      }
      if (token === '{' || token === '[') {
        depth++;
      }
      if (token === '}' || token === ']') {
        depth--;
      }
      if (depth > limits.maxDepth || tokens.length >= limits.maxTokens) {
        return finish(true);
      }
      tokens.push(Object.freeze({ start, end, kind: highlight }));
      scanner.scan();
    }
  } else {
    let index = 0;
    while (index < source.length) {
      const start = index;
      if (source[index] === '"') {
        index++;
        while (index < source.length) {
          if (source[index++] === '"') {
            if (source[index] === '"') {
              index++;
            } else {
              break;
            }
          }
        }
        tokens.push(Object.freeze({ start, end: index, kind: 'string' }));
      } else {
        if ([',', ';', '\t', '|'].includes(source[index]!)) {
          tokens.push(
            Object.freeze({ start, end: index + 1, kind: 'punctuation' }),
          );
        }
        index++;
      }
      if (tokens.length > limits.maxTokens) {
        return finish(true);
      }
    }
  }
  return finish(false);
}
