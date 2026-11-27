// Criteria 10.10 to 10.12 (2026-11-27, the second design round), measured in the browser.
import { expect, test } from '@playwright/test';
import { open } from './helpers.ts';

test('on a phone the result comes straight after the examples, the sources closed under it', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the phone order');
  await open(page);
  await page.locator('button.example').nth(0).click();
  await expect(page.locator('#results svg.section-drawing')).toBeVisible();
  const top = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
  const examples = await top('section.examples');
  const result = await top('#results');
  const form = await top('section.field-notes');
  expect(result).toBeGreaterThan(examples);
  expect(result).toBeLessThan(form);
  const sources = page.locator('#results .example-sources details');
  await expect(sources).toHaveCount(1);
  await expect(sources).not.toHaveAttribute('open', /.*/);
  await expect(page.locator('#results .example-sources summary')).toBeVisible();
});

test('the loaded example is pressed and shows its section', async ({ page }) => {
  await open(page);
  const buttons = page.locator('button.example');
  await expect(buttons.locator('svg.thumb')).toHaveCount(2);
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#field-discharge').fill('3001');
  await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'false');
});

test('on a desktop the four modes are one row, each on one line, inside the left page', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the desktop row');
  await open(page);
  const notes = (await page.locator('section.field-notes').boundingBox())!;
  const boxes = await page.locator('.modes .choice').evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    const label = e.querySelector('span, label') ?? e;
    return { top: r.top, right: r.right, labelHeight: label.getBoundingClientRect().height };
  }));
  expect(boxes).toHaveLength(4);
  for (const b of boxes) {
    expect(Math.abs(b.top - boxes[0]!.top)).toBeLessThan(1);
    expect(b.right).toBeLessThanOrEqual(notes.x + notes.width + 1);
  }
  const notBuilt = await page.locator('.modes .not-built').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(notBuilt).toBeGreaterThanOrEqual(12);
});

test('on a desktop both results tables share one column grid, QUICK-2\'s labels on one line, and the cut-off line is written once', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the desktop tables');
  await open(page);
  await page.locator('button.example').nth(1).click();
  await expect(page.locator('#results table.printed')).toHaveCount(2);
  const grid = await page.locator('#results table.printed').evaluateAll((tables) => tables.map((t) => {
    const row = t.querySelector('tbody tr')!;
    const th = row.querySelector('th')!.getBoundingClientRect();
    const td = row.querySelector('td[data-field]')!.getBoundingClientRect();
    // A label on one line: it does not wrap, and nothing of it is cut off.
    const wrapped = [...t.querySelectorAll<HTMLElement>('tbody th')].filter((x) => getComputedStyle(x).whiteSpace !== 'nowrap' || x.scrollWidth > x.clientWidth + 1)
      .map((x) => x.textContent);
    return { value: td.left, labelRight: th.right, wrapped };
  }));
  expect(Math.abs(grid[0]!.value - grid[1]!.value)).toBeLessThan(1);
  for (const g of grid) expect(g.wrapped).toEqual([]);
  const text = await page.locator('#results').innerText();
  expect(text.split('Includes low ground cut off from the channel, which QUICK-2 counts as flowing.').length - 1).toBe(1);
});
