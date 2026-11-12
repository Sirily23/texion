import { defineConfig } from '@playwright/test';

const devURL = process.env.DOCS_BASE_URL;

export default defineConfig({
  testDir: './tests/docs-e2e',
  workers: 1,
  timeout: devURL ? 120_000 : 45_000,
  use: {
    baseURL: devURL ?? 'http://127.0.0.1:4110',
    headless: true,
    browserName: 'chromium',
    channel: 'chromium',
  },
  webServer: devURL
    ? undefined
    : {
        command:
          'python3 -m http.server 4110 --bind 127.0.0.1 --directory examples/docs/out',
        url: 'http://127.0.0.1:4110',
        reuseExistingServer: false,
      },
});
