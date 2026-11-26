// Criterion 1.13 (2026-11-26): the worker serves the cache first, so after a deploy an open page is
// the previous build's. Two real builds of the same source, the second with one marker in its
// page, are served in turn from one folder by a server of this spec's own. When the second
// build's worker takes over the open page, the page says so in one line with a reload control,
// keeps what was typed and does not reload by itself; the control loads the second build.
import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { build } from 'vite';
import { fieldInputs, golden, pick } from './helpers.ts';

const APP = join(import.meta.dirname, '..');
const PORT = 4191;
const URL0 = `http://localhost:${PORT}/`;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
};

/** A production build into a temporary folder, its page carrying `marker`. */
async function buildTo(marker: string): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), `quickened-${marker}-`));
  await build({
    root: APP, configFile: join(APP, 'vite.config.ts'), logLevel: 'silent', build: { outDir, emptyOutDir: true },
    plugins: [{ name: 'test-build-marker', transformIndexHtml: (html: string) => html.replace('</head>', `<meta name="quickened-test-build" content="${marker}">\n</head>`) }],
  });
  return outDir;
}

let root = '';
let server: Server | null = null;

function serve(): Promise<void> {
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', URL0).pathname);
    const file = normalize(join(root, path === '/' ? 'index.html' : path));
    if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server!.listen(PORT, ok));
}

test.afterAll(async () => {
  await new Promise<void>((ok) => (server ? server.close(() => ok()) : ok()));
});

test('a newer build that takes over the open page is announced in one line, and the page never reloads by itself', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the worker does not depend on the width');
  test.setTimeout(300_000);
  const a = await buildTo('A');
  const b = await buildTo('B');
  root = a;
  await serve();

  await page.goto(URL0);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 30_000 }).toBe(true);
  // The first worker taking over the first visit is not a newer build.
  await expect(page.locator('#update-line')).toHaveCount(0);
  await expect(page.locator('meta[name="quickened-test-build"]')).toHaveAttribute('content', 'A');

  const g = golden('nd-trap-000001');
  await pick(page, g.mode, g.shape);
  const [key, value] = Object.entries(fieldInputs(g))[0]!;
  await page.locator(`#field-${key}`).fill(value);

  let navigations = 0;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations++; });
  root = b; // the deploy
  // The browser's own update check, as it makes on a later navigation.
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });

  const line = page.locator('#update-line');
  await expect(line).toBeVisible({ timeout: 30_000 });
  await expect(line).toContainText('A newer build of Quickened');
  await expect(line.getByRole('button', { name: 'Reload' })).toBeVisible();
  await page.waitForTimeout(2000);
  expect(navigations, 'the page reloaded by itself').toBe(0);
  await expect(page.locator(`#field-${key}`)).toHaveValue(value);
  await expect(page.locator('meta[name="quickened-test-build"]')).toHaveAttribute('content', 'A');

  await line.getByRole('button', { name: 'Reload' }).click();
  await expect(page.locator('meta[name="quickened-test-build"]')).toHaveAttribute('content', 'B');
  await expect(page.locator('#update-line')).toHaveCount(0);
});
