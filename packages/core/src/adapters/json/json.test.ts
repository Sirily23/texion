import { expect, it } from 'vitest';
import { processDocument } from '../../process';
import { createContent } from '../../content/schema';
import {
  serializeContent,
  deserializeContent,
} from '../../content/serialization';

it('detects JSON and preserves numeric literals, duplicate keys and original source', async () => {
  const source =
    '{ "n": 9007199254740993, "key": 1, "key": 2, "__proto__": {"polluted": true} }\r\n';
  const document = await processDocument(new File([source], 'data.json'));
  expect(document.status).toBe('ready');
  expect(document.format).toBe('json');
  expect(document.raw).toBe(source);
  expect(JSON.stringify(document.getPreview!())).toContain('9007199254740993');
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  expect(document.getPreview!()).toBe(document.getPreview!());
  expect((await processDocument(source)).format).toBe('json');
});
it.each(['{"a":}', '{"a":1,}', '{//comment\n"a":1}', '{"a":NaN}'])(
  'keeps invalid JSON attached with a predictable warning: %s',
  async (source) => {
    const document = await processDocument({ text: source, format: 'json' });
    expect(document.status).toBe('ready');
    expect(document.warnings[0]?.code).toBe('invalid-json');
    expect(document.raw).toBe(source);
    expect(document.getPreview!().nodes[0]?.type).toBe('code');
  },
);
it('supports explicitly selected scalar JSON without guessing ordinary chat is JSON', async () => {
  expect((await processDocument('true')).format).toBe('markdown');
  expect((await processDocument({ text: 'true', format: 'json' })).format).toBe(
    'json',
  );
  const content = createContent('true', { format: 'json' });
  expect(deserializeContent(serializeContent(content))).toEqual(content);
});
it('bounds JSON depth, source and node counts without changing the attachment', async () => {
  const deep = '['.repeat(1000) + '0' + ']'.repeat(1000);
  const document = await processDocument({ text: deep, format: 'json' });
  expect(document.status).toBe('ready');
  expect(document.warnings[0]?.code).toBe('too-complex');
  const large = await processDocument(
    { text: '[1,2,3,4,5]', format: 'json' },
    { maxPreviewNodes: 3 },
  );
  expect(large.getPreview!().truncated).toBe(true);
  const small = await processDocument(
    { text: '{"a":123}', format: 'json' },
    { maxPreviewCharacters: 4 },
  );
  expect(small.getPreview!().truncated).toBe(true);
  expect(small.raw).toBe('{"a":123}');
});
