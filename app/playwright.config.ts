// The Playwright run (quickened-app design: Testing Strategy). It runs against `vite preview` of
// the production build, so the service worker, the base path and the Content Security Policy are
// the shipped ones. The browser is the Microsoft Edge installed on the machine (channel 'msedge',
// a Chromium browser); no browser is downloaded. Two projects: desktop at 1280 x 800 and phone at
// 375 x 812 with touch and the mobile viewport. The web server is started and stopped by
// Playwright, so no server is left running.
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: 'msedge',
    headless: true,
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'desktop', use: { channel: 'msedge', viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { channel: 'msedge', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
