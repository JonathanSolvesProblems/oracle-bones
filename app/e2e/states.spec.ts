// Testing Strategy item 2: one job for each screen state, from recorded cases.
import { expect, test } from '@playwright/test';
import { regularPrompts } from '../src/solver/forms.ts';
import { stationErrorText } from '../src/solver/groundPoints.ts';
import { calculate, expectPrinted, fieldInputs, fill, golden, groundTsv, open, paste, pick } from './helpers.ts';

test('a result: cd-vdit-000001', async ({ page }) => {
  const g = golden('cd-vdit-000001');
  await open(page);
  await pick(page, g.mode, g.shape);
  await fill(page, fieldInputs(g));
  await calculate(page);
  await expectPrinted(page, g);
});

test('a held prompt: Diameter 0, nd-circ-000008', async ({ page }) => {
  const g = golden('nd-circ-000008');
  await open(page);
  await pick(page, g.mode, g.shape);
  await fill(page, fieldInputs(g));
  await calculate(page);
  await expect(page.locator('#results .state-held')).toBeVisible();
  await expect(page.locator('#results td[data-field]')).toHaveCount(0);
});

test("QUICK-2's message: bank 230.8, nd-irr-000009", async ({ page }) => {
  const g = golden('nd-irr-000009');
  await open(page);
  await pick(page, g.mode, g.shape);
  await paste(page, groundTsv(g));
  await fill(page, fieldInputs(g));
  await calculate(page);
  const state = page.locator('#results .state-rejected');
  await expect(state.locator('.message')).toContainText(g.message!.trim());
});

test("a station error, 35 after 35: QUICK-2's text on the refused row, then Quickened's sentence; the job computes", async ({ page }) => {
  // obs-irrelev-000001's keys, two values to a row in typing order, as the grid test reads them.
  const values = golden('obs-irrelev-000001').transcript.filter((t) => t.expect === 'irr_editor')
    .flatMap((t) => [...t.keys.matchAll(/([^{]*)\{Enter\}/g)].map((m) => m[1]!));
  const rows: string[] = [];
  for (let i = 0; i < values.length; i += 2) rows.push(`${values[i]}\t${values[i + 1] ?? ''}`);
  expect(rows).toHaveLength(5);
  await open(page);
  await pick(page, 'normal_depth', 'irregular');
  await paste(page, rows.join('\n'));
  const note = page.locator('tr.row-note', { hasText: 'Row 5:' });
  await expect(note).toBeVisible();
  await expect(note.locator('.message-label')).toHaveText("QUICK-2's message:");
  await expect(note.locator('.figures')).toHaveText(`“${stationErrorText(35, 35).trim()}”`);
  await expect(note).toContainText('does not take');
  await expect(note).toContainText('goes on taking keys');
  await fill(page, { bank_left: '0', bank_right: '35', n_left: '.04', n_channel: '.04', n_right: '.04', discharge: '10', slope: '.001' });
  await calculate(page);
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  await expect(page.locator('#results .state-rejected')).toHaveCount(0);
});

test('an error with a flag: Discharge -1, obs-negreturn-000001', async ({ page }) => {
  const g = golden('obs-negreturn-000001');
  const typed = g.transcript.filter((s) => s.expect === 'nd_trap_form' && s.keys !== '{Enter}').map((s) => s.keys.replace('{Enter}', ''));
  const keys = regularPrompts('normal_depth', 'trapezoid');
  expect(typed.length).toBe(keys.length);
  await open(page);
  await pick(page, 'normal_depth', 'trapezoid');
  await fill(page, Object.fromEntries(keys.map((k, i) => [k, typed[i]!])));
  await calculate(page);
  const state = page.locator('#results .state-stopped');
  await expect(state).toBeVisible();
  await expect(state.locator('.flags li').first()).toBeVisible();
  await expect(page.locator('#results td[data-field]')).toHaveCount(0);
});

test('Step-Backwater: not built', async ({ page }) => {
  await open(page);
  await pick(page, 'step_backwater', null);
  await expect(page.locator('.not-built-view')).toBeVisible();
  await expect(page.locator('.not-built-view a[href="#/limits"]')).toBeVisible();
  await expect(page.locator('button.calculate')).toHaveCount(0);
});
