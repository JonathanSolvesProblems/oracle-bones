// Testing Strategy items 6 to 9: offline, no other origin, axe on every page and state, and at
// the phone width no horizontal scroll and every control at least 44px.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { calculate, DATA, expectPrinted, fieldInputs, fill, golden, open, pick } from './helpers.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axe(page: Page, what: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), what).toEqual([]);
}

/** Each page and state the axe check and the phone check visit. */
async function* visits(page: Page): AsyncGenerator<string> {
  await open(page, '#/');
  yield 'the first screen';
  await page.locator('button.example').first().click();
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  yield 'the main example';
  await page.locator('button.example').nth(1).click();
  await expect(page.locator('#results [data-exact]').first()).toBeVisible();
  yield 'the cut-off example';
  const held = golden('nd-circ-000008');
  await pick(page, held.mode, held.shape);
  await fill(page, fieldInputs(held));
  await calculate(page);
  await expect(page.locator('#results .state-held')).toBeVisible();
  yield 'a held prompt';
  await pick(page, 'step_backwater', null);
  yield 'Step-Backwater not built';
  await open(page, '#/limits');
  yield 'the limits page';
  await open(page, '#/proof');
  yield 'the proof page';
}

test('offline: load, wait for the service worker, go offline, reload, run the main example', async ({ page, context }) => {
  await open(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.locator('button.example').first().click();
  await expectPrinted(page, golden(DATA.examples.main.id));
  await context.setOffline(false);
});

test('no request goes to another origin, on any page', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const other: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('data:') && new URL(r.url()).origin !== origin) other.push(r.url()); });
  for await (const _ of visits(page)) { /* each page loads what it needs */ }
  expect(other).toEqual([]);
});

test('axe finds no WCAG 2.2 A or AA violation on any page or state', async ({ page }) => {
  for await (const what of visits(page)) await axe(page, what);
});

test('at the phone width: no horizontal scroll, every control at least 44px', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the phone width only');
  for await (const what of visits(page)) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth), what).toBeLessThanOrEqual(375);
    // Controls: buttons, text fields, the navigation links, and each radio by its label. A link
    // inside a sentence is exempt from the target size (WCAG 2.5.8, inline).
    const small = await page.evaluate(() => {
      const out: string[] = [];
      const els = [...document.querySelectorAll<HTMLElement>('button, input:not([type=radio]), textarea, select, nav a, label.choice')];
      for (const e of els) {
        if (e.offsetParent === null) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 44 || r.height < 44) out.push(`${e.tagName.toLowerCase()}#${e.id || ''}.${e.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    });
    expect(small, what).toEqual([]);
  }
});
