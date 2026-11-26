// Task 13's deploy check (quickened-app design: Deploy): the production build under
// `vite preview`, in a fresh Microsoft Edge context, which has no profile and no account signed
// in, as a private window. It loads the site, runs both worked examples, prints the main one,
// goes offline, reloads and runs the main example again, at both widths, and writes what it saw
// and its screenshots to tmp/deploy-shots/. Nothing is published. Run with
// `npx playwright test --config deploy/deploy.config.ts`; the server is started and stopped by
// Playwright.
import { defineConfig } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: '.',
  testMatch: 'deploy.check.ts',
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}/`, channel: 'msedge', headless: true, serviceWorkers: 'allow' },
  projects: [
    { name: 'desktop', use: { channel: 'msedge', viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { channel: 'msedge', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
