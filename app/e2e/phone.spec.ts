// Task 17.5 (criterion 10.5): the phone. After an example or Calculate the page is at the result's
// heading; a loaded section's ground points are a summary row; the proof page fits the width.
import { expect, test } from '@playwright/test';
import { calculate, open } from './helpers.ts';

test.beforeEach(({}, info) => { test.skip(info.project.name !== 'phone', 'the phone width only'); });

const headingTop = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.getElementById('result-heading')!.getBoundingClientRect().top);

test('after an example the page is at the result\'s heading, not past it; the same after Calculate', async ({ page }) => {
  await open(page, '#/');
  await page.locator('button.example').first().click();
  await expect(page.locator('#result-heading')).toBeVisible();
  await expect.poll(() => headingTop(page)).toBeGreaterThanOrEqual(0);
  expect(await headingTop(page)).toBeLessThan(120);
  await page.evaluate(() => window.scrollTo(0, 0));
  await calculate(page);
  await expect(page.locator('#result-heading')).toBeVisible();
  await expect.poll(() => headingTop(page)).toBeGreaterThanOrEqual(0);
  expect(await headingTop(page)).toBeLessThan(120);
});

test('a loaded section is one summary row that opens on demand and closes again', async ({ page }) => {
  await open(page, '#/');
  await page.locator('button.example').first().click();
  const summary = page.locator('button.ground-summary');
  await expect(summary).toHaveText(/^40 ground points, 0 to 500/);
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('table.grid')).toHaveCount(0);
  await summary.click();
  await expect(page.locator('table.grid')).toBeVisible();
  await expect(page.locator('table.grid tbody input')).toHaveCount(80);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await summary.click();
  await expect(page.locator('table.grid')).toHaveCount(0);
});

// Amended 2026-11-27 (criterion 10.5): on a phone the screens keep 12 px and scroll sideways inside their own frame,
// which can be reached by keyboard; the page itself never scrolls sideways.
test('on the proof page the recorded screens are 12 px and scroll inside their frame, and no field table breaks a word or a value', async ({ page }) => {
  await open(page, '#/proof');
  const m = await page.evaluate(() => {
    const over = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${sel}: ${e.textContent!.slice(0, 40)}`);
    const pre = document.querySelector<HTMLElement>('.quick2-screen pre')!;
    const style = getComputedStyle(pre);
    return {
      wide: document.documentElement.scrollWidth,
      cells: [...over('.proof-table td'), ...over('.proof-table th')],
      size: parseFloat(style.fontSize),
      lineHeight: style.lineHeight,
      overflow: style.overflowX,
      focusable: pre.tabIndex >= 0,
    };
  });
  expect(m.wide).toBeLessThanOrEqual(375);
  expect(m.cells).toEqual([]);
  expect(m.size).toBe(12);
  expect(m.lineHeight).toBe('12px');
  expect(m.overflow).toBe('auto');
  expect(m.focusable).toBe(true);
  // Each value is on a line of its own width: no word of a cell is wider than the cell.
  const broken = await page.evaluate(() => {
    const out: string[] = [];
    for (const td of document.querySelectorAll<HTMLElement>('.proof-table td.figures')) {
      for (const w of (td.textContent ?? '').split(/\s+/).filter(Boolean)) {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
        probe.style.font = getComputedStyle(td).font;
        probe.textContent = w;
        document.body.appendChild(probe);
        if (probe.getBoundingClientRect().width > td.getBoundingClientRect().width + 1) out.push(w);
        probe.remove();
      }
    }
    return out;
  });
  expect(broken).toEqual([]);
});
