import { parseMarkdown } from './parser';
import type { MarkdownSyntaxNode } from './parser';
import type { TextFormatAdapter } from '../contract';
import type { PreviewNode } from '../../policy/output';
import { safeUrl } from '../../policy/output';
import { markdownExtensions, markdownMimeTypes } from '../../policy/formats';
import { deepFreeze } from '../../lifecycle/snapshot';
import type { Limits } from '../../policy/limits';
import type { DocumentPreview } from '../../document/types';

export function detectMarkdown(text: string): boolean {
  return /(^|\n)(?:#{1,6} |[-*+] |\d+\. |>|```|~~~|---\s*$)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*/m.test(
    text.slice(0, 8192),
  );
}

export function frontMatter(text: string): Readonly<Record<string, unknown>> {
  const match =
    /^(?:---|\+\+\+)\r?\n([\s\S]*?)\r?\n(?:---|\+\+\+)(?:\r?\n|$)/.exec(text);

  // Preserve front matter as data; never evaluate YAML or TOML.
  return match ? { frontMatter: match[1] ?? '' } : {};
}

export function tokenizeMarkdown(
  text: string,
  limits: Limits,
): DocumentPreview {
  let truncated = text.length > limits.maxPreviewCharacters;
  const tree = parseMarkdown(text.slice(0, limits.maxPreviewCharacters));
  const definitions = new Map<string, string>();
  const collect = (node: MarkdownSyntaxNode, depth: number): void => {
    if (depth > limits.maxPreviewDepth) {
      return;
    }
    if (node.type === 'definition' && node.identifier && node.url) {
      definitions.set(node.identifier.toUpperCase(), node.url);
    }
    node.children?.forEach((child) => collect(child, depth + 1));
  };
  collect(tree, 0);
  let remaining = limits.maxPreviewNodes;

  function convert(node: MarkdownSyntaxNode, depth: number): PreviewNode[] {
    if (remaining <= 0 || depth > limits.maxPreviewDepth) {
      truncated = true;

      return [];
    }

    remaining--;

    if (['html', 'yaml', 'toml', 'definition'].includes(node.type)) {
      return [];
    }
    if (node.type === 'image' || node.type === 'imageReference') {
      return [
        {
          type: 'text',
          value:
            'alt' in node && typeof node.alt === 'string'
              ? node.alt
              : '[image blocked]',
        },
      ];
    }
    const children = node.children?.flatMap((child) =>
      convert(child, depth + 1),
    );

    if (node.type === 'link' || node.type === 'linkReference') {
      const url = safeUrl(
        node.url ?? definitions.get(node.identifier?.toUpperCase() ?? '') ?? '',
      );

      return url
        ? [{ type: 'link', url, children: children ?? [] }]
        : (children ?? []);
    }

    const output: {
      type: string;
      value?: string;
      children?: PreviewNode[];
      depth?: number;
      ordered?: boolean;
      start?: number;
      checked?: boolean;
    } = { type: node.type };

    if (node.value !== undefined) {
      output.value = node.value;
    }
    if (children) {
      output.children = children;
    }
    if (node.depth !== undefined) {
      output.depth = node.depth;
    }
    if (node.ordered !== undefined) {
      output.ordered = node.ordered;
    }
    if (node.start != null) {
      output.start = node.start;
    }
    if (node.checked != null) {
      output.checked = node.checked;
    }
    return [output];
  }

  const nodes = tree.children?.flatMap((node) => convert(node, 0)) ?? [];

  return deepFreeze({
    nodes,
    truncated,
    warnings: truncated
      ? [
          {
            code: 'truncated',
            message:
              'Preview truncated to the configured limits. Original content is preserved.',
          },
        ]
      : [],
  });
}

export const markdownAdapter: TextFormatAdapter = Object.freeze({
  format: 'markdown',
  extensions: markdownExtensions,
  mimeTypes: markdownMimeTypes,
  detect: detectMarkdown,
  metadata: frontMatter,
  parse: tokenizeMarkdown,
});
