import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  // Reporter is provided by the TCMS runner via --reporter CLI flag.
  // Falling back to 'list' so direct CLI runs are still readable.
  reporter: 'list',
  use: {
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
  },
  projects: [
    {
      name: 'ui',
      testMatch: /ui\/.*\.spec\.ts/,
      use: {
        baseURL: 'https://example.com',
      },
    },
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
    },
  ],
});
