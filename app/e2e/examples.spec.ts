// Testing Strategy item 1, and the right page before a calculation (fix 4 before task 12).
import { expect, test } from '@playwright/test';
import { DATA, expectPrinted, golden, open } from './helpers.ts';

test('before a calculation there is no empty ruled page: the first screen is the main example\'s block, drawn live', async ({ page }) => {
  await open(page);
  await expect(page.locator('.sketch-empty')).toHaveCount(0);
  await expect(page.locator('#results')).toBeHidden();
  const block = page.locator('.hero svg.reach-block');
  await expect(block).toBeVisible();
  await expect(block.locator('text.hwm-figure')).toHaveText(golden(DATA.examples.main.id).printed.ws_elev!.trim());
});

test('the block is laid out in the width it has: every label is 13 px, the front face fills the frame', async ({ page }) => {
  await open(page);
  const block = page.locator('.hero svg.reach-block');
  await expect(block).toBeVisible();
  // The first measure redraws the drawing at its container's width, so the viewBox is as wide as the svg.
  await expect.poll(async () => {
    const box = (await block.boundingBox())!;
    const vb = (await block.getAttribute('viewBox'))!.split(' ').map(Number);
    return Math.abs(vb[2]! - box.width) < 1.5;
  }).toBe(true);
  const sizeOf = (els: Element[]) => els.map((e) => {
    const svg = (e as SVGTextElement).ownerSVGElement!;
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    return parseFloat(getComputedStyle(e).fontSize) * scale;
  });
  const sizes = await block.locator('text:not(.hwm-figure)').evaluateAll(sizeOf);
  expect(sizes.length).toBeGreaterThan(4);
  for (const px of sizes) {
    expect(px).toBeGreaterThanOrEqual(12);
    expect(px).toBeLessThanOrEqual(14);
  }
  // The painted mark's figure is larger (criterion 10.8): 18 px on a desktop, 14 on a phone.
  const [figure] = await block.locator('text.hwm-figure').evaluateAll(sizeOf);
  const wide = (await block.boundingBox())!.width >= 560;
  expect(figure!).toBeGreaterThanOrEqual(wide ? 17.5 : 13.5);
  expect(figure!).toBeLessThanOrEqual(wide ? 18.5 : 14.5);
  const box = (await block.boundingBox())!;
  const frame = box.width * (box.width >= 560 ? 0.6 : 0.75);
  expect(box.height, 'no empty band: the block is no taller than its frame, a little over').toBeLessThanOrEqual(frame + 14);
  expect(box.height).toBeGreaterThan(frame * 0.7);
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
