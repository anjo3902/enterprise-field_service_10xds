// @ts-check
import { defineConfig } from '@playwright/test'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  globalTimeout: 600_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,           // run sequentially — tests share DB state
  workers: 1,
  retries: 0,
  globalSetup: './tests/e2e/setupTestData.cjs',
  globalTeardown: require.resolve('./tests/e2e/cleanupTestData.js'),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'uvicorn api_server:app --host 0.0.0.0 --port 8000',
      port: 8000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  /* Playwright will start backend and frontend if not already running. */
})
