import { copyFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    markdown: 'src/markdown.ts',
    rich: 'src/rich.ts',
  },
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  external: ['react', 'react-dom', '@texion/core'],
  onSuccess: async () => {
    copyFileSync('src/styles/texion.css', 'dist/styles.css');
  },
});
