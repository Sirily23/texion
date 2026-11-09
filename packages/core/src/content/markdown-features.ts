import { parseMarkdown } from '../adapters/markdown/parser';

/** Inspect bounded Markdown syntax without rendering HTML or changing the source. */
export function inspectMarkdownSource(
  source: string,
  maxCharacters = 50_000,
): { readonly nodeTypes: readonly string[]; readonly limited: boolean } {
  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1) {
    throw new RangeError('maxCharacters must be a positive safe integer');
  }
  if (source.length > maxCharacters) {
    return Object.freeze({ nodeTypes: Object.freeze([]), limited: true });
  }
  try {
    const types = new Set<string>();
    const stack = [{ node: parseMarkdown(source), depth: 0 }];
    let visited = 0;

    while (stack.length) {
      const { node, depth } = stack.pop()!;

      if (++visited > 10_000 || depth > 64) {
        return Object.freeze({
          nodeTypes: Object.freeze([...types]),
          limited: true,
        });
      }
      types.add(node.type);

      if (node.type === 'listItem' && node.checked != null) {
        types.add('taskList');
      }
      node.children?.forEach((child) =>
        stack.push({ node: child, depth: depth + 1 }),
      );
    }

    return Object.freeze({
      nodeTypes: Object.freeze([...types]),
      limited: false,
    });
  } catch {
    return Object.freeze({ nodeTypes: Object.freeze([]), limited: true });
  }
}
