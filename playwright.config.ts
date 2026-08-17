import { defineConfig, devices } from '@playwright/test';

// iPhone 17 Pro Max — not yet in Playwright's built-in device list, so we
// define it with the published specs (440×956 CSS px, 3x DPR, iOS 26 UA).
const iPhone17ProMax = {
  ...devices['iPhone 15 Pro Max'],
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14 Pro'] },
    },
    {
      name: 'webkit-iphone-17-pro-max',
      use: iPhone17ProMax,
    },
    {
      name: 'webkit-ipad',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
