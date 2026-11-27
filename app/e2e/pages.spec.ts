// Testing Strategy item 5: the limits page and the proof page, fed from the files.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, open, ROOT } from './helpers.ts';

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
/** A text as the page shows it: each code span's value without its marks (criterion 5.8). */
const unmarked = (s: string): string => collapse(s.replace(/`([^`]+)`/g, '$1'));
// The comparator's known misses, by case id (results/known-misses.json), never typed here.
const KNOWN_MISSES = new Set((JSON.parse(readFileSync(join(ROOT, 'results', 'known-misses.json'), 'utf-8')) as
  { classes: { cases: Record<string, string[]> }[] }).classes.flatMap((c) => Object.keys(c.cases)));

test('the limits page: every haunting, every Limits paragraph, each open question plain first', async ({ page }) => {
  await open(page, '#/limits');
  const ids = readFileSync(join(ROOT, 'results', 'hauntings.md'), 'utf-8').split(/\r?\n/)
    .map((l) => /^## (H-\d{3}):/.exec(l)?.[1]).filter((x): x is string => !!x);
  for (const id of ids) await expect(page.locator(`#haunting-${id}`)).toBeVisible();
  // A known-miss class's entry is under its own heading (criterion 5.9); code marks are not shown (5.8).
  const misses = new Set(DATA.knownMisses.map((c) => c.title));
  for (const l of DATA.limits) {
    await expect(page.locator(misses.has(l.title) ? '#known-misses' : '#no-answer')).toContainText(unmarked(l.paragraph));
  }
  await expect(page.locator('.limits-page')).not.toContainText('`');
  for (const q of DATA.openQuestions) {
    const block = page.locator(`#question-${q.id}`);
    const plain = block.locator('> p');
    const wording = block.locator('.ledger-wording');
    await expect(plain).toHaveText(unmarked(q.plain!));
    await expect(wording).toContainText(q.id);
    await expect(wording).toContainText(unmarked(q.question));
    expect((await plain.boundingBox())!.y).toBeLessThan((await wording.boundingBox())!.y);
  }
});

test('the proof page: each listed case, the known differences as different, the headline sentence', async ({ page }) => {
  await open(page, '#/proof');
  await expect(page.locator('.proof-page')).toContainText(DATA.headline ? `${DATA.headline.matched} of ${DATA.headline.total}` : 'No headline run has been recorded yet.');
  for (const c of DATA.proof) {
    await expect(page.locator(`#case-${c.id} pre`)).toHaveText(c.capture);
  }
  const listed = DATA.proof.filter((c) => KNOWN_MISSES.has(c.id));
  expect(listed.length).toBeGreaterThan(0);
  for (const c of listed) await expect(page.locator(`#case-${c.id} h2`)).toContainText('different');
});

// Criterion 11.4 (2026-11-27): the story is part of the result, reached from the top line.
test('the story page: reached from the top line, with the headline and the comparison read from the files', async ({ page }) => {
  await open(page, '#/');
  await page.locator('nav a[href="#/story"]').click();
  await expect(page.locator('h1')).toHaveText('How Quickened was made');
  await expect(page.locator('.story-page')).toContainText(`on ${DATA.headline!.matched} of them`);
  await expect(page.locator('.story-page')).toContainText(`matches ${DATA.story.baseline.matched} of ${DATA.story.baseline.total}`);
  await expect(page.locator('.story-page a[href$="docs/prompts.md"]')).toHaveCount(1);
});

test('the proof page: the headline of results/headline.md, and the count at the top links to each case', async ({ page }) => {
  const file = readFileSync(join(ROOT, 'results', 'headline.md'), 'utf-8');
  const cases = /^Cases:\s*(\d+)\s+of\s+(\d+)\s*$/m.exec(file)!;
  const run = /^Run:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(file)!;
  await open(page, '#/proof');
  await expect(page.locator('.proof-page')).toContainText(`${cases[1]} of ${cases[2]} cases matched in the headline run of ${run[1]}.`);
  const summary = page.locator('#proof-summary');
  await expect(summary).toContainText(`Of the ${DATA.proof.length} cases on this page`);
  const links = summary.locator('a');
  await expect(links).toHaveCount(DATA.proof.length);
  const last = DATA.proof[DATA.proof.length - 1]!.id;
  const link = summary.locator(`a[href="#/proof/${last}"]`);
  await expect(link).toHaveCount(1);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`#/proof/${last}$`));
  await expect(page.locator(`#case-${last}`)).toBeInViewport();
});
