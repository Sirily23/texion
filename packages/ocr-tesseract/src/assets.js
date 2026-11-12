import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Build-time helper: copies installed assets without downloading anything.
 * @param {string} destination
 * @param {string} languageDirectory
 */
export async function copyTesseractAssets(destination, languageDirectory) {
  const require = createRequire(import.meta.url);
  const tesseractRoot = path.dirname(
    require.resolve('tesseract.js/package.json'),
  );
  const tesseractRequire = createRequire(
    path.join(tesseractRoot, 'package.json'),
  );
  const coreRoot = path.dirname(
    tesseractRequire.resolve('tesseract.js-core/package.json'),
  );
  const root = path.resolve(destination);
  await mkdir(path.join(root, 'core'), { recursive: true });
  await mkdir(path.join(root, 'lang'), { recursive: true });
  await copyFile(
    path.join(tesseractRoot, 'dist/worker.min.js'),
    path.join(root, 'worker.min.js'),
  );
  const coreFiles = (await readdir(coreRoot)).filter((name) =>
    /^tesseract-core[\w.-]*\.(js|wasm)$/.test(name),
  );
  await Promise.all(
    coreFiles.map((name) =>
      copyFile(path.join(coreRoot, name), path.join(root, 'core', name)),
    ),
  );
  const languageFiles = (await readdir(languageDirectory)).filter((name) =>
    /^[A-Za-z0-9_]+\.traineddata(?:\.gz)?$/.test(name),
  );
  if (!languageFiles.length)
    throw new Error(
      'The OCR language directory contains no traineddata files.',
    );
  await Promise.all(
    languageFiles.map((name) =>
      copyFile(
        path.join(languageDirectory, name),
        path.join(root, 'lang', name),
      ),
    ),
  );
  return { root, coreFiles, languageFiles };
}
