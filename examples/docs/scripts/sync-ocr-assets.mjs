import { copyTesseractAssets } from '../../../packages/ocr-tesseract/src/assets.js';
import { createRequire } from 'node:module';
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(
  new URL('../../../package.json', import.meta.url),
);
const { langPath } = require('@tesseract.js-data/eng');
await copyTesseractAssets(
  fileURLToPath(new URL('../public/texion-ocr', import.meta.url)),
  langPath,
);
await mkdir(new URL('../public/samples/', import.meta.url), {
  recursive: true,
});
await copyFile(
  new URL('../../../tests/fixtures/ocr-scanned.pdf', import.meta.url),
  new URL('../public/samples/ocr-scanned.pdf', import.meta.url),
);
console.log('Copied local OCR worker, core and English language assets.');
