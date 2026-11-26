// Testing Strategy item 5: the limits page and the proof page, fed from the files.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, open, ROOT } from './helpers.ts';

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
const KNOWN_DIFFERENCES = ['cc-circ-000035', 'nd-circ-000020'];

test('the limits page: every haunting, every Limits paragraph, each open question plain first', async ({ page }) => {
  await open(page, '#/limits');
  const ids = readFileSync(join(ROOT, 'results', 'hauntings.md'), 'utf-8').split(/\r?\n/)
    .map((l) => /^## (H-\d{3}):/.exec(l)?.[1]).filter((x): x is string => !!x);
  for (const id of ids) await expect(page.locator(`#haunting-${id}`)).toBeVisible();
  for (const l of DATA.limits) await expect(page.locator('#no-answer')).toContainText(collapse(l.paragraph));
  for (const q of DATA.openQuestions) {
    const block = page.locator(`#question-${q.id}`);
    const plain = block.locator('> p');
    const wording = block.locator('.ledger-wording');
    await expect(plain).toHaveText(q.plain!);
    await expect(wording).toContainText(q.id);
    await expect(wording).toContainText(collapse(q.question));
    expect((await plain.boundingBox())!.y).toBeLessThan((await wording.boundingBox())!.y);
  }
});

test('the proof page: each listed case, the known differences as different, the headline sentence', async ({ page }) => {
  await open(page, '#/proof');
  await expect(page.locator('.proof-page')).toContainText(DATA.headline ? `${DATA.headline.matched} of ${DATA.headline.total}` : 'No headline run has been recorded yet.');
  for (const c of DATA.proof) {
    await expect(page.locator(`#case-${c.id} pre`)).toHaveText(c.capture);
  }
  for (const id of KNOWN_DIFFERENCES) await expect(page.locator(`#case-${id} h2`)).toContainText('different');
});
