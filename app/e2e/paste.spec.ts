// Testing Strategy item 3: the Huntington section pastes as its rows; 41 rows load nothing.
import { expect, test } from '@playwright/test';
import { HUNTINGTON_TSV, open, paste, pick } from './helpers.ts';

const rows = HUNTINGTON_TSV.split(/\r?\n/).filter((l) => l.trim() !== '');

test('a paste of realdata/huntington-section-01.tsv fills the ground points', async ({ page }) => {
  await open(page);
  await pick(page, 'normal_depth', 'irregular');
  await paste(page, HUNTINGTON_TSV);
  expect(rows.length).toBe(40);
  await expect(page.locator(`#row-${rows.length}-station`)).toHaveValue(rows.at(-1)!.split('\t')[0]!.trim());
  await expect(page.locator(`#row-${rows.length + 1}-station`)).toHaveCount(0);
});

test('a paste of 41 rows loads nothing', async ({ page }) => {
  await open(page);
  await pick(page, 'normal_depth', 'irregular');
  await paste(page, [...rows, rows.at(-1)!].join('\n'));
  await expect(page.locator('.paste-error')).toBeVisible();
  await expect(page.locator('#row-2-station')).toHaveCount(0);
});
