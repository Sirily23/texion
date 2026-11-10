import { expect, it } from 'vitest';
import { processDocument } from '../../process';

it('preserves quoted commas, escaped quotes, embedded newlines and empty cells', async () => {
  const source =
    'name,note,last\r\nAda,"hello, world",\r\nGrace,"a ""quote""\nand a newline",001\r\n';
  const document = await processDocument(new File([source], 'data.csv'));
  expect(document.format).toBe('csv');
  expect(document.raw).toBe(source);
  expect(document.warnings).toEqual([]);
  const rows = document.getPreview!().nodes[0]!.children!;
  expect(rows).toHaveLength(3);
  expect(rows[1]?.children?.[1]?.children?.[0]?.value).toBe('hello, world');
  expect(rows[1]?.children?.[2]?.children?.[0]?.value).toBe('');
  expect(rows[2]?.children?.[1]?.children?.[0]?.value).toBe(
    'a "quote"\nand a newline',
  );
  expect(rows[2]?.children?.[2]?.children?.[0]?.value).toBe('001');
});
it.each([',', ';', '\t'])(
  'recognizes delimiter %j without numeric coercion',
  async (delimiter) => {
    const source =
      ['name', 'value'].join(delimiter) + '\n' + ['Ada', '001'].join(delimiter);
    const document = await processDocument(source);
    expect(document.format).toBe('csv');
    expect(document.metadata.delimiter).toBe(delimiter);
  },
);
it('warns on malformed quotes and inconsistent rows while retaining source', async () => {
  for (const source of ['a,b\n"unterminated,b', 'a,b\n1,2,3']) {
    const document = await processDocument({ text: source, format: 'csv' });
    expect(document.status).toBe('ready');
    expect(document.raw).toBe(source);
    expect(document.warnings[0]?.code).toBe('invalid-csv');
  }
});
it('shows formulas as data and respects the total preview-node budget', async () => {
  const document = await processDocument(
    { text: 'a,b\n=1+1,<script>alert(1)</script>\nx,y', format: 'csv' },
    { maxPreviewNodes: 6 },
  );
  const preview = document.getPreview!();
  function count(nodes: typeof preview.nodes): number {
    return nodes.reduce(
      (total, node) => total + 1 + count(node.children ?? []),
      0,
    );
  }
  expect(count(preview.nodes)).toBeLessThanOrEqual(6);
  expect(preview.truncated).toBe(true);
  expect(document.raw).toContain('=1+1');
});

it('falls back to source when the allowed preview depth cannot contain a table', async () => {
  const document = await processDocument(
    { text: 'a,b\n1,2', format: 'csv' },
    { maxPreviewDepth: 1 },
  );
  expect(document.getPreview!().nodes[0]?.type).toBe('code');
  expect(document.getPreview!().truncated).toBe(true);
});
