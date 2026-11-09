import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
export default defineConfig({
  root: 'examples/chat-composer',
  resolve: {
    alias: [
      {
        find: '@texion/react/styles.css',
        replacement: fileURLToPath(
          new URL('./packages/react/src/styles/texion.css', import.meta.url),
        ),
      },
      {
        find: /^@texion\/core$/,
        replacement: fileURLToPath(
          new URL('./packages/core/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@texion\/react$/,
        replacement: fileURLToPath(
          new URL('./packages/react/src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  esbuild: { jsx: 'automatic' },
});
