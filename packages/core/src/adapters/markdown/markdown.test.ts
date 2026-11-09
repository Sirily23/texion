import { expect, it } from 'vitest';
import { processDocument } from '../../process';

it('parses GFM using a bounded, immutable preview', async () => {
  const source =
    '# Hi\n\n| A | B |\n| - | - |\n| a | b |\n\n- [x] done\n\n~~removed~~';
  const doc = await processDocument(source);
  const preview = doc.getPreview!();
  expect(preview.nodes.map((node) => node.type)).toEqual([
    'heading',
    'table',
    'list',
    'paragraph',
  ]);
  expect(Object.isFrozen(preview.nodes)).toBe(true);
  const small = await processDocument(source, {
    maxPreviewCharacters: 10,
    maxPreviewNodes: 2,
  });
  expect(small.getPreview!().truncated).toBe(true);
  expect(small.raw).toBe(source);
});
