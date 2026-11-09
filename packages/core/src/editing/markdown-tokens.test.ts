import { describe, expect, it } from 'vitest';
import { tokenizeMarkdownSource } from './markdown-tokens';
import { createHighlightModel } from './highlight-model';

describe('Markdown editing ranges', () => {
  it('keeps source offsets in UTF-16 units, including markers and emoji', () => {
    const text =
      '😀 **bold** and *italic* with `code` and [link](https://example.com)';
    const { tokens } = tokenizeMarkdownSource(text);
    expect(
      tokens.map((token) => [token.kind, text.slice(token.start, token.end)]),
    ).toEqual([
      ['bold', '**bold**'],
      ['italic', '*italic*'],
      ['code', '`code`'],
      ['link', '[link](https://example.com)'],
    ]);
    expect(tokens[0]?.start).toBe(3);
  });
  it('uses CommonMark parsing for escaped syntax, code fences and incomplete source', () => {
    const text = '\\*not italic\\*\n\n```md\n**not bold**\n```\n\n**unfinished';
    const { tokens } = tokenizeMarkdownSource(text);
    expect(tokens.map((token) => token.kind)).toEqual(['code']);
    expect(text.slice(tokens[0]!.start, tokens[0]!.end)).toContain(
      '**not bold**',
    );
  });
  it('covers headings, front matter, lists, quotes and GFM syntax', () => {
    const text =
      '---\ntitle: Hello\n---\n# Heading\n\n- [x] ~~done~~\n\n> quote';
    expect(
      tokenizeMarkdownSource(text).tokens.map((token) => token.kind),
    ).toEqual([
      'frontmatter',
      'heading',
      'list-marker',
      'strikethrough',
      'blockquote',
    ]);
  });
  it('segments nested ranges without changing a single character', () => {
    const text = '# 😀 **bold *nested***\r\n\t[link](https://example.com)\n';
    const model = createHighlightModel(text);
    expect(model.enabled).toBe(true);
    expect(
      model.segments
        .map((segment) => text.slice(segment.start, segment.end))
        .join(''),
    ).toBe(text);
    expect(model.segments.some((segment) => segment.kind === 'italic')).toBe(
      true,
    );
    expect(Object.isFrozen(model.segments)).toBe(true);
    expect(Object.isFrozen(model.tokens[0])).toBe(true);
  });
  it('skips highlighting completely above the character or complexity limits', () => {
    expect(createHighlightModel('# long', { maxCharacters: 3 })).toMatchObject({
      enabled: false,
      reason: 'too-large',
      tokens: [],
    });
    expect(createHighlightModel('**a** **b**', { maxTokens: 1 })).toMatchObject(
      {
        enabled: false,
        reason: 'too-complex',
        tokens: [],
      },
    );
    expect(
      createHighlightModel('> > > **deep**', { maxDepth: 1 }).enabled,
    ).toBe(false);
    expect(createHighlightModel('# text', { enabled: false }).tokens).toEqual(
      [],
    );
  });
  it('renders hostile markup as source text without producing HTML', () => {
    const text = '<img src=x onerror=alert(1)> **visible**';
    const model = createHighlightModel(text);
    expect(model.text).toBe(text);
    expect(model.tokens.map((token) => token.kind)).toEqual(['bold']);
  });
});
