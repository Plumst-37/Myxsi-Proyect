const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e-tests',
  testMatch: '**/*.spec.cjs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'python3 server.py',
    port: 8080,
    reuseExistingServer: true,
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox']
        }
      },
    },
  ],
});
