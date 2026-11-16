import { defineConfig, devices } from '@playwright/test';

/** Package root (`gssc5-web/apps/e2e`). */
const e2eRoot = __dirname;
const isCI = !!process.env.CI;

/**
 * Playwright integration harness (GSSC5-110 / #183).
 * Smokes hit the live Angular apps + backend; Vitest/bun unit suites stay separate.
 * Stack boot: `scripts/start-stack.sh` (sequenced; avoids prisma generate races).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'public',
      testMatch: /public\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4200',
      },
    },
    {
      name: 'members',
      testMatch: /members\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4201',
      },
    },
  ],
  webServer: {
    command: 'bash scripts/start-stack.sh',
    cwd: e2eRoot,
    url: 'http://127.0.0.1:4201/',
    reuseExistingServer: !isCI,
    timeout: 360_000,
  },
});
