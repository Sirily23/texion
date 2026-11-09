import { expect, it } from 'vitest';
import { processDocument, safeUrl } from '../../packages/core/src';

it.each([
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'java\tscript:alert(1)',
  'data:text/html,hello',
  '//evil.com',
  '\\evil.com',
  'file:///etc/passwd',
  'vbscript:hello',
])('rejects dangerous URL %s', (url) => {
  expect(safeUrl(url)).toBeUndefined();
});

it('resolves references under the same output policy', async () => {
  const document = await processDocument(
    '[safe][s] [bad][b] ![remote][i]\n\n[s]: https://example.com\n[b]: javascript:alert(1)\n[i]: https://evil.com/a.png',
  );
  const output = JSON.stringify(document.getPreview!());
  expect(output).toContain('https://example.com');
  expect(output).not.toContain('javascript:');
  expect(output).not.toContain('https://evil.com');
});
