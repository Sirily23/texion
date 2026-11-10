import { expect, it, vi } from 'vitest';
import { processDocument } from '../process';
import type { FormatAdapter } from './contract';

it('supports a dummy adapter without changing the input API and caches lazy parsing', async () => {
  const parse = vi.fn(() => ({
    nodes: [{ type: 'text', value: 'dummy' }],
    truncated: false,
    warnings: [],
  }));
  const adapter: FormatAdapter = {
    format: 'dummy',
    extensions: ['dummy'],
    mimeTypes: ['text/dummy'],
    detect: (text) => text.startsWith('dummy'),
    parse,
  };
  const doc = await processDocument(new File(['anything'], 'test.dummy'), {
    adapters: [adapter],
  });
  expect(doc.format).toBe('dummy');
  expect(parse).not.toHaveBeenCalled();
  expect(doc.getPreview?.()).toBe(doc.getPreview?.());
  expect(parse).toHaveBeenCalledTimes(1);
  expect(
    (
      await processDocument('dummy', {
        adapters: [adapter],
        acceptedFormats: ['markdown'],
      })
    ).error?.code,
  ).toBe('unsupported');
});

it('retains a document when a trusted adapter fails to parse', async () => {
  const adapter: FormatAdapter = {
    format: 'bad',
    extensions: [],
    mimeTypes: [],
    detect: () => true,
    parse() {
      throw new Error('broken');
    },
  };
  const doc = await processDocument('text', { adapters: [adapter] });
  expect(doc.status).toBe('ready');
  expect(doc.getPreview?.().warnings[0]?.code).toBe('parse-failed');
});

it('supports trusted binary adapters on the same lifecycle and catches preview failures', async () => {
  const document = await processDocument(
    new File([new Uint8Array([0, 1, 2])], 'example.bin'),
    {
      adapters: [
        {
          kind: 'binary',
          format: 'demo',
          extensions: ['bin'],
          mimeTypes: [],
          detectBytes: () => true,
          inspect: () => ({ metadata: { valid: true } }),
          parse() {
            throw new Error('bad preview');
          },
        },
      ],
    },
  );
  expect(document.status).toBe('ready');
  expect(document.raw).toBeUndefined();
  expect(document.metadata.valid).toBe(true);
  expect(document.getPreview!().warnings[0]?.code).toBe('parse-failed');
  expect(document.getPreview!()).toBe(document.getPreview!());
});
