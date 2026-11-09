import { parseMarkdown } from '../adapters/markdown/parser';
import type { MarkdownSyntaxNode } from '../adapters/markdown/parser';

export type HighlightKind =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'strikethrough'
  | 'list-marker'
  | 'blockquote'
  | 'frontmatter'
  | 'thematic-break';

/** Half-open offsets measured in JavaScript UTF-16 code units, including Markdown markers. */
export interface HighlightToken {
  readonly start: number;
  readonly end: number;
  readonly kind: HighlightKind;
}

export interface HighlightLimits {
  readonly maxCharacters?: number;
  readonly maxTokens?: number;
  readonly maxDepth?: number;
}

export const defaultHighlightLimits = Object.freeze({
  maxCharacters: 20_000,
  maxTokens: 2_000,
  maxDepth: 64,
});

const kinds: Readonly<Record<string, HighlightKind>> = {
  heading: 'heading',
  strong: 'bold',
  emphasis: 'italic',
  inlineCode: 'code',
  code: 'code',
  link: 'link',
  linkReference: 'link',
  image: 'link',
  imageReference: 'link',
  delete: 'strikethrough',
  blockquote: 'blockquote',
  yaml: 'frontmatter',
  toml: 'frontmatter',
  thematicBreak: 'thematic-break',
};

export function resolveHighlightLimits(options: HighlightLimits) {
  const limits = { ...defaultHighlightLimits, ...options };

  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive safe integer`);
    }
  }

  return limits;
}

export function tokenizeMarkdownSource(
  text: string,
  options: HighlightLimits = {},
): { readonly tokens: readonly HighlightToken[]; readonly limited: boolean } {
  const limits = resolveHighlightLimits(options);
  const empty = (limited: boolean) =>
    Object.freeze({
      tokens: Object.freeze([]) as readonly HighlightToken[],
      limited,
    });

  if (text.length > limits.maxCharacters) {
    return empty(true);
  }
  const tokens: HighlightToken[] = [];
  const stack: { node: MarkdownSyntaxNode; depth: number }[] = [
    { node: parseMarkdown(text), depth: 0 },
  ];
  let visited = 0;

  while (stack.length) {
    const { node, depth } = stack.pop()!;

    if (++visited > limits.maxTokens * 4 || depth > limits.maxDepth) {
      return empty(true);
    }
    const start = node.position?.start.offset;
    let end = node.position?.end.offset;
    let kind = kinds[node.type];

    if (node.type === 'listItem' && start !== undefined && end !== undefined) {
      const marker = /^(?:[-+*]|\d{1,9}[.)])(?:[ \t]+\[[ xX]\])?/.exec(
        text.slice(start, Math.min(end, start + 32)),
      );

      if (marker) {
        kind = 'list-marker';
        end = start + marker[0].length;
      }
    }

    if (kind && start !== undefined && end !== undefined && end > start) {
      if (tokens.length >= limits.maxTokens) {
        return empty(true);
      }
      tokens.push(Object.freeze({ start, end, kind }));
    }

    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i]!, depth: depth + 1 });
      }
    }
  }

  tokens.sort((a, b) => a.start - b.start || b.end - a.end);

  return Object.freeze({ tokens: Object.freeze(tokens), limited: false });
}
