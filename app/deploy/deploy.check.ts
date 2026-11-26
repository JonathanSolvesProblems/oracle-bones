// Task 13: load, run both worked examples, print the main one, go offline, reload, run the main
// example again. Each step writes what the page showed; a screenshot of each is kept, with the
// main example's PDF, under tmp/deploy-shots/ (not committed).
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', '..', 'tmp', 'deploy-shots');
const pagesOf = (pdf: Buffer): number => (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

test('deploy check', async ({ page, context, browser }, info) => {
  mkdirSync(OUT, { recursive: true });
  const w = info.project.name;
  const seen: string[] = [`browser: Edge ${browser.version()}, a fresh context with no profile and no account`];
  const shot = (n: string) => page.screenshot({ path: join(OUT, `${w}-${n}.png`) });
  const figure = async () => (await page.locator('#results .main-figure').textContent())?.replace(/\s+/g, ' ').trim();
  const origins = new Set<string>();
  page.on('request', (r) => { if (!r.url().startsWith('data:')) origins.add(new URL(r.url()).origin); });

  await page.goto('./#/');
  await expect(page.locator('button.example')).toHaveCount(2);
  seen.push(`load: title "${await page.title()}", 2 example controls, the sketch page reads "${await page.locator('.sketch-empty').textContent()}"`);
  await shot('1-load');

  await page.locator('button.example').nth(0).click();
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  seen.push(`main example: "${await figure()}", ${await page.locator('#results td[data-field]').count()} printed fields, ${await page.locator('#results [data-exact]').count()} exact values, ${await page.locator('#results svg.section-drawing').count()} drawing`);
  await shot('2-main');

  await page.locator('button.example').nth(1).click();
  await expect(page.locator('#results [data-exact]').first()).toBeVisible();
  const cut = await page.locator('#results').textContent();
  seen.push(`cut-off example: "${await figure()}", ${await page.locator('#results [data-exact]').count()} exact values, cut-off line ${cut?.includes('cut off from the channel') ? 'shown' : 'missing'}`);
  await shot('3-cutoff');

  await page.locator('button.example').nth(0).click();
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.print-view')).toBeVisible();
  const header = (await page.locator('.print-header').textContent())?.trim();
  const pdf = await page.pdf({ format: 'Letter', preferCSSPageSize: true, path: join(OUT, `${w}-main-print.pdf`) });
  seen.push(`print of the main example: header "${header}", ${pagesOf(pdf)} PDF pages`);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.locator('button.example').nth(0).click();
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  seen.push(`offline, reloaded, main example again: "${await figure()}", ${await page.locator('#results td[data-field]').count()} printed fields`);
  await shot('4-offline-main');
  await context.setOffline(false);

  seen.push(`origins requested: ${[...origins].join(', ')}`);
  seen.push(`page scroll width ${await page.evaluate(() => document.documentElement.scrollWidth)} px in a ${page.viewportSize()!.width} px window`);
  writeFileSync(join(OUT, `${w}-seen.txt`), `${seen.join('\n')}\n`);
});
