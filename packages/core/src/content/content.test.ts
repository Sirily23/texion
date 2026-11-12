import { expect, it } from 'vitest';
import { createContent, isTexionContent } from './schema';
import {
  serializeContent,
  deserializeContent,
  exportMarkdown,
} from './serialization';

it('preserves normalized and original source independently without engine state', () => {
  const content = createContent('# Heading\n\n**edited**', {
    originalSource: '# Heading\n\n__original__\r\n',
  });
  expect(Object.isFrozen(content)).toBe(true);
  expect(deserializeContent(serializeContent(content))).toEqual(content);
  expect(exportMarkdown(content)).toBe('# Heading\n\n**edited**');
});

it.each([
  null,
  {},
  { version: 2, format: 'markdown', source: '' },
  { version: 1, format: 'auto', source: '{}' },
  { version: 1, format: 'markdown', source: {} },
])('rejects unsupported content schemas: %j', (value) => {
  expect(isTexionContent(value)).toBe(false);
  expect(() => deserializeContent(JSON.stringify(value))).toThrow(
    'Unsupported Texion content',
  );
});

it('serializes only portable content fields and retains custom format source', () => {
  const content = createContent('SELECT 1;', { format: 'query' });
  const runtime = {
    ...content,
    file: new Blob(['private runtime data']),
    temporary: 'blob:local',
  };
  expect(JSON.parse(serializeContent(runtime))).toEqual(content);
});
