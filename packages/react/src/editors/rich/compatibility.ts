import { inspectMarkdownSource } from '@texion/core';

const sourceOnlyNodes = new Set([
  'yaml',
  'toml',
  'table',
  'footnoteDefinition',
  'footnoteReference',
  'definition',
  'linkReference',
  'imageReference',
  'taskList',
]);

export function richImportIssue(
  source: string,
  maxCharacters = 50_000,
): string | undefined {
  const features = inspectMarkdownSource(source, maxCharacters);

  if (features.limited) {
    return 'This content exceeds the rich editor complexity limits. Use source mode.';
  }
  if (features.nodeTypes.some((type) => sourceOnlyNodes.has(type))) {
    return 'This Markdown uses syntax that requires source mode to preserve its meaning.';
  }
  return undefined;
}
