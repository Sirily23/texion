import { fileURLToPath } from 'node:url';
import { defineWorkspace } from 'vitest/config';
const alias = {
  '@texion/core': fileURLToPath(
    new URL('./packages/core/src/index.ts', import.meta.url),
  ),
  '@texion/react': fileURLToPath(
    new URL('./packages/react/src/index.ts', import.meta.url),
  ),
};
export default defineWorkspace([
  {
    resolve: { alias },
    test: {
      name: 'ocr',
      environment: 'node',
      include: ['packages/ocr-*/src/**/*.test.ts'],
    },
  },
  {
    resolve: { alias },
    esbuild: { jsx: 'automatic' },
    test: {
      name: 'core',
      environment: 'node',
      include: ['packages/core/src/**/*.test.ts'],
    },
  },
  {
    resolve: { alias },
    esbuild: { jsx: 'automatic' },
    test: {
      name: 'react',
      environment: 'jsdom',
      include: ['packages/react/src/**/*.test.{ts,tsx}'],
    },
  },
  {
    resolve: { alias },
    esbuild: { jsx: 'automatic' },
    test: {
      name: 'cross-package',
      environment: 'node',
      include: ['tests/{integration,security}/**/*.test.{ts,tsx}'],
    },
  },
]);
