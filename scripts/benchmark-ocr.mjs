// A reproducible smoke benchmark, not evidence of general document extraction quality.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import {
  createPdfAdapter,
  processDocument,
} from '../packages/core/dist/index.js';
import { createTesseractEngine } from '../packages/ocr-tesseract/dist/node.js';
const require = createRequire(import.meta.url);
const { langPath } = require('@tesseract.js-data/eng');
const cases = [
  { file: 'document.pdf', mode: 'native', expected: 'Hello from PDF' },
  { file: 'ocr-scanned.pdf', mode: 'native', expected: 'HELLO WORLD 123' },
  { file: 'ocr-scanned.pdf', mode: 'ocr', expected: 'HELLO WORLD 123' },
];
const results = [];
for (const item of cases) {
  const file = new File(
    [
      await readFile(
        new URL(`../tests/fixtures/${item.file}`, import.meta.url),
      ),
    ],
    item.file,
  );
  const adapters =
    item.mode === 'ocr'
      ? [
          createPdfAdapter({
            canvasImport: () => import('@napi-rs/canvas'),
            ocr: {
              engine: createTesseractEngine({ langPath }),
              pageTimeoutMs: 60_000,
            },
          }),
        ]
      : undefined;
  const start = performance.now();
  const document = await processDocument(file, adapters ? { adapters } : {});
  const durationMs = Math.round(performance.now() - start);
  const text = document.raw?.replace(/\s+/g, ' ').trim() ?? '';
  results.push({
    ...item,
    status: document.status,
    durationMs,
    text,
    exactMatch: text === item.expected,
    warnings: document.warnings,
    ocr: document.ocr,
    processRssBytes: process.memoryUsage().rss,
  });
}
console.log(
  JSON.stringify(
    {
      scope:
        'Two authored synthetic fixtures; each mode measured once. Includes initialization/model loading; no peak-memory claim or representative accuracy claim.',
      runtime: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpu: cpus()[0]?.model,
      unpdf: '1.3.2',
      tesseract: '6.0.1',
      englishModelPackage: '1.0.0',
      results,
    },
    null,
    2,
  ),
);
