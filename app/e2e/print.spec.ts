// Testing Strategy item 4: the print view. The job prints on one US Letter page, for a 40-point
// section and for a regular shape; a worked example's sources follow on a second page under their
// own head (criteria 4.4 and 4.5, amended 2026-11-26). The date, the version, the notice, no control.
import { expect, test, type Page } from '@playwright/test';
import { calculate, DATA, fieldInputs, fill, golden, HUNTINGTON_TSV, open, paste, pick } from './helpers.ts';

const pagesOf = (pdf: Buffer): number => (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

async function printNow(page: Page): Promise<void> {
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.print-view')).toBeVisible();
}

async function checkSheet(page: Page): Promise<void> {
  const view = page.locator('.print-view');
  await expect(view.locator('.print-header')).toContainText(DATA.build.version);
  await expect(view.locator('.print-header')).toContainText(DATA.build.commit);
  await expect(view.locator('.print-header')).toHaveText(/Printed \d{4}-\d{2}-\d{2}/);
  await expect(view.locator('.notice')).toBeVisible();
  for (const sel of ['button', 'input', 'select', 'textarea', 'nav', '.top-line']) {
    expect(await page.locator(sel).evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length), sel).toBe(0);
  }
}

/**
 * Whether the job, the sources left aside, fits one page: laid out in print media at the page's
 * content width (8.5 in less two 0.5 in margins, 720 CSS px), its height is at most the content
 * height (11 in less the margins, 960 CSS px). A PDF of the job alone is not possible: printing
 * redraws the view, so a style set on the sources would not last into the PDF.
 */
async function jobFitsOnePage(page: Page): Promise<boolean> {
  const before = page.viewportSize()!;
  await page.setViewportSize({ width: 720, height: 960 });
  const h = await page.locator('.print-job').evaluate((e) => e.getBoundingClientRect().height);
  await page.setViewportSize(before);
  return h <= 960;
}

test('a regular shape prints on one page', async ({ page }) => {
  const g = golden('cd-vdit-000001');
  await open(page);
  await pick(page, g.mode, g.shape);
  await fill(page, fieldInputs(g));
  await calculate(page);
  await printNow(page);
  await checkSheet(page);
  expect(pagesOf(await page.pdf({ format: 'Letter', preferCSSPageSize: true }))).toBe(1);
});

test('a 40-point section prints on one page', async ({ page }) => {
  const g = golden(DATA.examples.main.id);
  await open(page);
  await pick(page, 'normal_depth', 'irregular');
  await paste(page, HUNTINGTON_TSV);
  await fill(page, fieldInputs(g));
  await calculate(page);
  await printNow(page);
  await checkSheet(page);
  await expect(page.locator('.ground-print tbody tr')).toHaveCount(10);
  expect(pagesOf(await page.pdf({ format: 'Letter', preferCSSPageSize: true }))).toBe(1);
});

test('the main example: the job on one page, its sources on the next under their own head', async ({ page }) => {
  await open(page);
  await page.locator('button.example').first().click();
  await expect(page.locator('#results td[data-field]').first()).toBeVisible();
  await printNow(page);
  await checkSheet(page);
  await expect(page.locator('.print-sources h2')).toHaveText('Where this example comes from');
  await expect(page.locator('.print-sources')).toContainText(DATA.sources.mainDischarge);
  expect(await jobFitsOnePage(page)).toBe(true);
  expect(pagesOf(await page.pdf({ format: 'Letter', preferCSSPageSize: true }))).toBe(2);
});
