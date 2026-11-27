// Criterion 1.13 (2026-11-26): the worker serves the cache first, so after a deploy an open page is
// the previous build's. Two real builds of the same source, the second with one marker in its
// page, are served in turn from one folder by a server of this spec's own. When the second
// build's worker takes over the open page, the page says so in one line with a reload control,
// keeps what was typed and does not reload by itself; the control loads the second build.
// Amended 2026-11-27: a page where nothing was typed reloads by itself, and a page of a build from
// before the amendment is reloaded by the newer build's worker.
import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { cpSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
let builds: { a: string; b: string } | null = null;

/** The two builds, made once for the file, and the server, started once. */
async function ready(): Promise<{ a: string; b: string }> {
  if (!builds) {
    builds = { a: await buildTo('A'), b: await buildTo('B') };
    await serve();
  }
  return builds;
}

function serve(): Promise<void> {
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', URL0).pathname);
    const file = normalize(join(root, path === '/' ? 'index.html' : path));
    if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    // GitHub Pages' header: a browser may keep each file ten minutes. With it, a worker that filled
    // its cache through the browser's cache would keep the first build's page (seen live, 2026-11-27).
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'max-age=600' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server!.listen(PORT, ok));
}

test.afterAll(async () => {
  await new Promise<void>((ok) => (server ? server.close(() => ok()) : ok()));
});

test('a newer build that takes over a page holding typed values is announced in one line, and that page never reloads by itself', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the worker does not depend on the width');
  test.setTimeout(300_000);
  const { a, b } = await ready();
  root = a;

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

// Amended 2026-11-27: a returning visitor who has only opened a page gets the newer build without
// a tap, on the page the link pointed at.
test('a page where nothing was typed reloads into the newer build by itself, on the same page', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the worker does not depend on the width');
  test.setTimeout(300_000);
  const { a, b } = await ready();
  root = a;

  await page.goto(`${URL0}#/story`);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 30_000 }).toBe(true);
  await expect(page.locator('meta[name="quickened-test-build"]')).toHaveAttribute('content', 'A');

  root = b;
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  await expect(page.locator('meta[name="quickened-test-build"]')).toHaveAttribute('content', 'B', { timeout: 30_000 });
  expect(new URL(page.url()).hash).toBe('#/story');
  await expect(page.locator('.story-page')).toBeVisible();
  await expect(page.locator('#update-line')).toHaveCount(0);
});

// Pages of the builds deployed before the amendment only show the line. When the newer build's
// worker replaces such a build (its cache is named without "quickened-3-"), the worker reloads
// those pages itself. Here the page holds a typed value, so the reload can only be the worker's.
test('a page of a build from before the amendment is reloaded into the newer build by its worker', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the worker does not depend on the width');
  test.setTimeout(300_000);
  const { a, b } = await ready();
  const before = mkdtempSync(join(tmpdir(), 'quickened-A0-'));
  cpSync(a, before, { recursive: true });
  const sw = join(before, 'sw.js');
  expect(readFileSync(sw, 'utf-8')).toContain('quickened-3-');
  writeFileSync(sw, readFileSync(sw, 'utf-8').replaceAll('quickened-3-', 'quickened-'));
  root = before;

  await page.goto(URL0);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 30_000 }).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('quickened-')).join())).toMatch(/^quickened-[0-9a-f]{16}$/);
  const g = golden('nd-trap-000001');
  await pick(page, g.mode, g.shape);
  const [key, value] = Object.entries(fieldInputs(g))[0]!;
  await page.locator(`#field-${key}`).fill(value);

  root = b;
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  await expect(page.locator('meta[name="quickened-test-build"]')).toHaveAttribute('content', 'B', { timeout: 30_000 });
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('quickened-')).join())).toMatch(/^quickened-3-[0-9a-f]{16}$/);
});
