// Testing Strategy item 3: the Huntington section pastes as its rows; 41 rows load nothing.
// Criteria 11.1 and 11.2 (2026-11-27, the practitioner on his phone): at 390 px the paste panel is
// the first thing under the section's heading, and the 40 stations load from the box, from the
// clipboard button, from a paste into the first station cell, and as comma-separated values with
// a header.
import { expect, test, type Page } from '@playwright/test';
import { HUNTINGTON_TSV, open, paste, pick } from './helpers.ts';

const rows = HUNTINGTON_TSV.split(/\r?\n/).filter((l) => l.trim() !== '');
const last = rows.at(-1)!.trim().split('\t');
const CSV = ['Distance,Elevation', ...rows.map((l) => l.trim().replace('\t', ','))].join('\r\n');

async function expectForty(page: Page): Promise<void> {
  const summary = page.locator('button.ground-summary');
  if ((await summary.count()) > 0 && (await summary.getAttribute('aria-expanded')) === 'false') await summary.click();
  await expect(page.locator(`#row-${rows.length}-station`)).toHaveValue(last[0]!);
  await expect(page.locator(`#row-${rows.length}-elevation`)).toHaveValue(last[1]!);
  await expect(page.locator(`#row-${rows.length + 1}-station`)).toHaveCount(0);
}

test('a paste of realdata/huntington-section-01.tsv fills the ground points', async ({ page }) => {
  await open(page);
  await pick(page, 'normal_depth', 'irregular');
  await paste(page, HUNTINGTON_TSV);
  expect(rows.length).toBe(40);
  await expectForty(page);
});

test('a paste of 41 rows loads nothing', async ({ page }) => {
  await open(page);
  await pick(page, 'normal_depth', 'irregular');
  await paste(page, [...rows, rows.at(-1)!].join('\n'));
  await expect(page.locator('.paste-error')).toBeVisible();
  await expect(page.locator('#row-2-station')).toHaveCount(0);
});

test.describe('on a 390 px phone (criteria 11.1, 11.2)', () => {
  test.use({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });

  test.beforeEach(async ({ page }) => {
    await open(page);
    await pick(page, 'normal_depth', 'irregular');
  });

  test('the paste panel is open and is the first thing under "The section", above the table', async ({ page }) => {
    const panel = page.locator('.paste.open');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Paste the section')).toBeVisible();
    await expect(panel.getByText('Up to 40 stations, distance then elevation, as copied from a profile tool, Excel or HEC-RAS.')).toBeVisible();
    const legend = await page.locator('.part-section legend').boundingBox();
    const box = await panel.boundingBox();
    const table = await page.locator('table.grid').boundingBox();
    expect(box!.y).toBeGreaterThan(legend!.y);
    expect(box!.y + box!.height).toBeLessThanOrEqual(table!.y);
    // Nothing else of the form sits between the section's heading and the panel.
    const between = await page.evaluate(() => {
      const fs = document.querySelector('.part-section')!;
      const first = [...fs.children].find((c) => c.tagName !== 'LEGEND')!;
      return first.querySelector(':scope > .paste.open') !== null || first.classList.contains('paste');
    });
    expect(between).toBe(true);
  });

  test('40 stations pasted into the box load 40 rows, and the panel closes to "Paste again"', async ({ page }) => {
    await page.locator('#paste-text').fill(HUNTINGTON_TSV);
    await page.getByRole('button', { name: 'Load stations' }).click();
    await expect(page.getByRole('button', { name: 'Paste again' })).toBeVisible();
    await expect(page.locator('button.ground-summary')).toHaveText('40 ground points, 0.00 to 500.00');
    await expectForty(page);
  });

  test('"Paste from clipboard" reads the clipboard and loads 40 rows in one tap', async ({ page }) => {
    await page.evaluate((t) => navigator.clipboard.writeText(t), HUNTINGTON_TSV);
    await page.getByRole('button', { name: 'Paste from clipboard' }).click();
    await expect(page.getByRole('button', { name: 'Paste again' })).toBeVisible();
    await expectForty(page);
  });

  test('40 stations pasted into the first station cell load 40 rows', async ({ page }) => {
    await page.evaluate((t) => navigator.clipboard.writeText(t), HUNTINGTON_TSV);
    await page.locator('#row-1-station').focus();
    await page.keyboard.press('Control+V');
    await expectForty(page);
    await expect(page.locator('#row-1-station')).toHaveValue(rows[0]!.trim().split('\t')[0]!);
  });

  test('the same section as comma-separated values with a "Distance,Elevation" header loads 40 rows', async ({ page }) => {
    await page.locator('#paste-text').fill(CSV);
    await page.getByRole('button', { name: 'Load stations' }).click();
    await expectForty(page);
  });
});
