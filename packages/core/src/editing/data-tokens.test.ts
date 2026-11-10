import { expect, it } from 'vitest';
import { createHighlightModel } from './highlight-model';
import { detectTextFormat } from '../ingestion/text-format';

it('highlights JSON with UTF-16 offsets without rewriting numeric or string literals', () => {
  const source =
    '{"😀": "value", "n": 9007199254740993, "ok": true, "empty": null}';
  const model = createHighlightModel(source, { format: 'json' });
  expect(model.enabled).toBe(true);
  expect(
    model.tokens
      .filter((token) => token.kind === 'property')
      .map((token) => source.slice(token.start, token.end)),
  ).toEqual(['"😀"', '"n"', '"ok"', '"empty"']);
  expect(
    model.segments
      .map((segment) => source.slice(segment.start, segment.end))
      .join(''),
  ).toBe(source);
  expect(
    model.tokens.some(
      (token) =>
        token.kind === 'number' &&
        source.slice(token.start, token.end) === '9007199254740993',
    ),
  ).toBe(true);
});
it('highlights malformed editing input and falls back at resource limits', () => {
  expect(createHighlightModel('{"partial":', { format: 'json' }).enabled).toBe(
    true,
  );
  expect(
    createHighlightModel('[[[[0]]]]', { format: 'json', maxDepth: 2 }).enabled,
  ).toBe(false);
  expect(
    createHighlightModel('[1,2,3]', { format: 'json', maxTokens: 2 }).enabled,
  ).toBe(false);
});
it('keeps CSV quote escaping, newlines and original segments intact', () => {
  const source = 'a,b\r\n"one, two","a ""quote""\nand a newline"';
  const model = createHighlightModel(source, { format: 'csv' });
  expect(model.tokens.filter((token) => token.kind === 'string')).toHaveLength(
    2,
  );
  expect(
    model.segments
      .map((segment) => source.slice(segment.start, segment.end))
      .join(''),
  ).toBe(source);
});
it('recognizes bounded inline content while keeping ordinary chat as Markdown', () => {
  expect(detectTextFormat('{"a":')).toBe('json');
  expect(detectTextFormat('name,value\nAda,001')).toBe('csv');
  expect(detectTextFormat('[link](https://example.com)')).toBe('markdown');
  expect(detectTextFormat('hello, world')).toBe('markdown');
  expect(detectTextFormat('{"a":1}', ['markdown'])).toBe('markdown');
});
