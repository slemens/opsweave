import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for OpsWeave.
 *
 * Backend: Express on port 3000
 * Frontend: Vite dev server on port 5173
 * Auth: httpOnly cookie (opsweave_token) + CSRF double-submit (opsweave_csrf / X-CSRF-Token)
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'e2e/report' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 10_000,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev:backend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      command: 'npm run dev:frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],

  outputDir: 'e2e/results',
});
