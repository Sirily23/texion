import { expect, it } from 'vitest';
import { processDocument } from '../process';

it('identifies by extension, MIME, then content', async () => {
  expect(
    (
      await processDocument(
        new File(['plain paragraph'], 'a.MD', {
          type: 'application/octet-stream',
        }),
      )
    ).status,
  ).toBe('ready');
  expect(
    (await processDocument(new Blob(['paragraph'], { type: 'text/markdown' })))
      .status,
  ).toBe('ready');
  expect((await processDocument(new Blob(['# Heading']))).status).toBe('ready');
  expect(
    (
      await processDocument(
        new File(['# Heading'], 'a.exe', { type: 'text/markdown' }),
      )
    ).error?.code,
  ).toBe('unsupported');
});
