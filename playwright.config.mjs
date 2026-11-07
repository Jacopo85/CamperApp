import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e.spec.mjs',
  timeout: 60000,
  expect: {timeout: 15000},
  retries: 0,
  workers: 1,
  use: {
    ...devices['Pixel 7'],
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:8765',
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: false,
    timeout: 30000
  }
});
