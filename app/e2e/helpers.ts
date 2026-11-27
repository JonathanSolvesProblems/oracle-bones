// Shared steps of the Playwright specs: reading goldens read-only, entering a recorded job into
// the form, and the texts the pages are built from. No spec types a value QUICK-2 printed: each
// expected text comes from a golden or from the files the pages are built from.
import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildData } from '../build/data.ts';
import { golden, ROOT, type Golden } from '../test/golden.ts';

export { golden, ROOT };
export type { Golden };

/** The data the pages are built from, read the way the build reads it. */
export const DATA = buildData(ROOT);

export const HUNTINGTON_TSV = readFileSync(join(ROOT, 'realdata', 'huntington-section-01.tsv'), 'utf-8');

export async function open(page: Page, hash = '#/'): Promise<void> {
  await page.goto(`./${hash}`);
  await expect(page.locator('main#main')).toBeVisible();
}

export async function pick(page: Page, mode: string, shape: string | null): Promise<void> {
  await page.locator(`label[for="mode-${mode}"]`).click();
  if (shape && mode !== 'step_backwater') await page.locator(`label[for="shape-${shape}"]`).click();
}

export async function fill(page: Page, values: Record<string, string>): Promise<void> {
  for (const [k, v] of Object.entries(values)) await page.locator(`#field-${k}`).fill(v);
}

export async function paste(page: Page, text: string): Promise<void> {
  await page.locator('#paste-open').click();
  await page.locator('#paste-text').fill(text);
  await page.getByRole('button', { name: 'Load rows' }).click();
  await openGround(page);
}
/** A pasted or loaded section is one summary row (criterion 10.5); the reader opens it to see the rows. */
export async function openGround(page: Page): Promise<void> {
  const summary = page.locator('button.ground-summary');
  // A paste that was refused loads nothing, so there is no summary row and the table is as it was.
  if ((await summary.count()) > 0 && (await summary.getAttribute('aria-expanded')) === 'false') await summary.click();
  await expect(page.locator('table.grid')).toBeVisible();
}

/** A golden's ground points as tab-delimited rows, as a spreadsheet copies them. */
export function groundTsv(g: Golden): string {
  const rows: string[] = [];
  for (let i = 1; `sta_${String(i).padStart(2, '0')}` in g.inputs; i++) {
    const n = String(i).padStart(2, '0');
    rows.push(`${g.inputs[`sta_${n}`]}\t${g.inputs[`elev_${n}`]}`);
  }
  return rows.join('\n');
}

/** A golden's form fields: its inputs that are not ground points. */
export function fieldInputs(g: Golden): Record<string, string> {
  return Object.fromEntries(Object.entries(g.inputs).filter(([k]) => !/^(sta|elev)_\d+$/.test(k)));
}

export async function calculate(page: Page): Promise<void> {
  await page.locator('button.calculate').click();
}

/** Each printed field of the golden is shown, trimmed, on its row of the results. */
export async function expectPrinted(page: Page, g: Golden): Promise<void> {
  for (const [k, v] of Object.entries(g.printed)) {
    await expect(page.locator(`#results td[data-field="${k}"]`), `${g.id} ${k}`).toHaveText(v.trim());
  }
}
