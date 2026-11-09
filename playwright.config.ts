import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1, // Clipboard tests share the browser's system clipboard.
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: {
    command: 'pnpm dev --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } },
  ],
});
