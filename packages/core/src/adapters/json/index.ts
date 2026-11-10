import { parseTree } from 'jsonc-parser';
import type { Node } from 'jsonc-parser';
import type { TextFormatAdapter } from '../contract';
import type { DocumentWarning } from '../../errors/codes';
import type { Limits } from '../../policy/limits';
import type { PreviewNode } from '../../policy/output';

export function jsonDepthAllowed(source: string, maxDepth: number): boolean {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const character of source) {
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        quoted = false;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === '{' || character === '[') {
      depth++;
      if (depth > maxDepth) {
        return false;
      }
    } else if (character === '}' || character === ']') {
      depth--;
    }
  }
  return true;
}
function inspectJson(source: string, limits: Limits) {
  if (!jsonDepthAllowed(source, limits.maxPreviewDepth)) {
    return {
      metadata: { validation: 'limited' },
      warnings: [
        {
          code: 'too-complex',
          message:
            'JSON nesting exceeds the configured depth. Original source is preserved.',
        },
      ] as DocumentWarning[],
    };
  }
  try {
    const value: unknown = JSON.parse(source);
    const rootType =
      value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    return { metadata: { validation: 'valid', rootType }, warnings: [] };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Invalid JSON syntax.';
    return {
      metadata: { validation: 'invalid' },
      warnings: [
        { code: 'invalid-json', message: `Invalid JSON: ${detail}` },
      ] as DocumentWarning[],
    };
  }
}
function parseJson(source: string, limits: Limits) {
  const inspection = inspectJson(source, limits);
  if (
    source.length > limits.maxPreviewCharacters ||
    inspection.warnings.length
  ) {
    const truncated = source.length > limits.maxPreviewCharacters;
    return {
      nodes: [
        { type: 'code', value: source.slice(0, limits.maxPreviewCharacters) },
      ],
      truncated,
      warnings: truncated
        ? ([
            {
              code: 'truncated',
              message: 'JSON preview truncated. Original source is preserved.',
            },
          ] as DocumentWarning[])
        : inspection.warnings,
    };
  }
  const root = parseTree(source, [], {
    disallowComments: true,
    allowTrailingComma: false,
  });
  if (!root) {
    throw new Error('JSON has no root value.');
  }
  let remaining = limits.maxPreviewNodes;
  let truncated = false;
  function convert(node: Node, depth: number): PreviewNode | undefined {
    if (remaining <= 0 || depth > limits.maxPreviewDepth) {
      truncated = true;
      return;
    }
    remaining--;
    const children: PreviewNode[] = [];
    if (node.type === 'property') {
      const key = node.children?.[0];
      const value = node.children?.[1];
      const converted = value ? convert(value, depth + 1) : undefined;
      return {
        type: 'json-property',
        value: key ? source.slice(key.offset, key.offset + key.length) : '',
        children: converted ? [converted] : [],
      };
    }
    if (node.type === 'object' || node.type === 'array') {
      for (const child of node.children ?? []) {
        const converted = convert(child, depth + 1);
        if (!converted) {
          break;
        }
        children.push(converted);
      }
      return { type: `json-${node.type}`, children };
    }
    return {
      type: `json-${node.type}`,
      value: source.slice(node.offset, node.offset + node.length),
    };
  }
  const converted = convert(root, 0);
  return {
    nodes: converted ? [converted] : [],
    truncated,
    warnings: truncated
      ? ([
          {
            code: 'truncated',
            message:
              'JSON preview truncated to its node or depth limit. Original source is preserved.',
          },
        ] as DocumentWarning[])
      : [],
  };
}
export const jsonAdapter: TextFormatAdapter = {
  format: 'json',
  extensions: ['json'],
  mimeTypes: ['application/json', 'text/json'],
  detect(source) {
    const trimmed = source.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }
    if (!jsonDepthAllowed(trimmed, 64)) {
      return false;
    }
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  },
  inspect: inspectJson,
  parse: parseJson,
};
