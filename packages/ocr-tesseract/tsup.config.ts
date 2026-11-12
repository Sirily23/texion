import { defineConfig } from 'tsup';
export default defineConfig({
  entry: {
    browser: 'src/browser.ts',
    node: 'src/node.ts',
    assets: 'src/assets.js',
  },
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    '@texion/core',
    'tesseract.js',
    'node:worker_threads',
    'node:module',
  ],
});
