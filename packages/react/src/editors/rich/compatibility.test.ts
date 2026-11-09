import { expect, it } from 'vitest';
import { richImportIssue } from './compatibility';

it('keeps unsupported structured Markdown in source mode instead of flattening it', () => {
  expect(richImportIssue('---\ntitle: Hello\n---\n# Hi')).toContain(
    'source mode',
  );
  expect(richImportIssue('| A | B |\n| - | - |\n| one | two |')).toContain(
    'source mode',
  );
  expect(
    richImportIssue('[reference][id]\n\n[id]: https://example.com'),
  ).toContain('source mode');
  expect(richImportIssue('- [x] task')).toContain('source mode');
  expect(
    richImportIssue(
      '# Heading\n\n**bold**\n\n- item\n\n```sql\nSELECT 1;\n```',
    ),
  ).toBeUndefined();
});
