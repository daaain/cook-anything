import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3421',
  },
  webServer: {
    command: 'bun --bun next dev --webpack --port 3421',
    port: 3421,
    reuseExistingServer: true,
  },
});
