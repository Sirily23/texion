import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createTesseractEngine } from './node';
import { createPdfAdapter, processDocument } from '@texion/core';
const require = createRequire(import.meta.url);
const assets = require('@tesseract.js-data/eng') as { langPath: string };

it('recognizes authored raster text with real local models and no hosted OCR', async () => {
  const session = createTesseractEngine({
    langPath: assets.langPath,
  }).createSession();
  try {
    const bytes = new Uint8Array(
      await readFile(
        new URL('../../../tests/fixtures/ocr-page.png', import.meta.url),
      ),
    );
    const result = await session.recognize({
      encoding: 'png',
      bytes,
      width: 1200,
      height: 240,
      dpi: 200,
      pageNumber: 1,
      signal: new AbortController().signal,
    });
    expect(result.text.replace(/\s+/g, ' ').trim()).toBe('HELLO WORLD 123');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  } finally {
    await session.terminate();
  }
}, 30_000);

it('renders and recognizes a scanned PDF through the real document lifecycle', async () => {
  const original = new File(
    [
      await readFile(
        new URL('../../../tests/fixtures/ocr-scanned.pdf', import.meta.url),
      ),
    ],
    'scan.pdf',
  );
  const adapter = createPdfAdapter({
    canvasImport: () => import('@napi-rs/canvas'),
    ocr: {
      engine: createTesseractEngine({ langPath: assets.langPath }),
      pageTimeoutMs: 30_000,
    },
  });
  const document = await processDocument(original, { adapters: [adapter] });
  expect(document.status).toBe('ready');
  expect(document.raw).toContain('HELLO WORLD 123');
  expect(document.pages?.[0]?.source).toBe('ocr:tesseract-js');
  expect(document.ocr?.state).toBe('done');
  expect(document.file).toBe(original);
  expect(Object.isFrozen(document.pages?.[0])).toBe(true);
}, 30_000);

it('terminates even while the native worker is initializing', async () => {
  const session = createTesseractEngine({
    langPath: assets.langPath,
  }).createSession();
  const signal = new AbortController();
  const result = session.recognize({
    encoding: 'png',
    bytes: new Uint8Array([1]),
    width: 1,
    height: 1,
    dpi: 200,
    pageNumber: 1,
    signal: signal.signal,
  });
  signal.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await session.terminate();
});
