// Testing Strategy item 1, and the right page before a calculation (fix 4 before task 12).
import { expect, test } from '@playwright/test';
import { DATA, expectPrinted, golden, open } from './helpers.ts';

test('the right page before a calculation is the ruled sketch page with its one line', async ({ page }) => {
  await open(page);
  const empty = page.locator('#results .sketch-empty');
  await expect(empty).toBeVisible();
  await expect(empty).toHaveText('The result and the drawing appear here.');
  const bg = await empty.evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(bg).toContain('repeating-linear-gradient');
  const box = (await empty.boundingBox())!;
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
});

test('the worked examples: one click each, their goldens, sources, cut-off line and exact values; one edit drops them', async ({ page }) => {
  await open(page);
  const examples = page.locator('button.example');
  await expect(examples).toHaveCount(2);

  await examples.nth(0).click();
  const main = golden(DATA.examples.main.id);
  await expectPrinted(page, main);
  await expect(page.locator('#results [data-exact]')).toHaveCount(0);
  await expect(page.locator('#results svg.section-drawing')).toBeVisible();
  const sources = page.locator('.example-sources');
  for (const i of DATA.sources.items) await expect(sources).toContainText(i.text);
  await expect(sources).toContainText(DATA.sources.mainDischarge);

  await page.locator('button.example').nth(1).click();
  const cutoff = golden(DATA.examples.cutoff.id);
  await expectPrinted(page, cutoff);
  await expect(page.locator('#results')).toContainText('Includes low ground cut off from the channel, which QUICK-2 counts as flowing.');
  const line = DATA.hauntings.find((h) => h.id === 'H-001')!.exactByField.find((x) => x.caseId === cutoff.id)!;
  for (const [field, value] of Object.entries(line.values!)) {
    const row = page.locator('#results tr', { has: page.locator(`td[data-field="${field}"]`) });
    await expect(row.locator(`[data-exact="${field}"]`)).toContainText(value);
  }
  await expect(page.locator('.example-sources')).toContainText(DATA.sources.cutoffDischarge);

  await page.locator('#field-discharge').fill(`${cutoff.inputs.discharge}1`);
  await page.locator('button.calculate').click();
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  await expect(page.locator('#results [data-exact]')).toHaveCount(0);
  await expect(page.locator('.example-sources')).toContainText('no longer the recorded case');
});
