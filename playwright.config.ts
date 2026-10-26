import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 40_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  reporter: 'list',
  outputDir: join(tmpdir(), 'assetshrink-playwright'),
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1100 } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 1100 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1100 } } },
  ],
  webServer: {
    command: 'npm start', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI,
  },
});
