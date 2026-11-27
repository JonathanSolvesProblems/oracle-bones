// Criteria 10.10 and 10.12 (2026-11-27, the second design round): the shell around the drawing.
// The stylesheet rules are read here; the Playwright run measures the same things in the browser.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './golden.ts';

const css = readFileSync(join(ROOT, 'app', 'src', 'ui', 'styles', 'app.css'), 'utf-8');
const tokens = readFileSync(join(ROOT, 'app', 'src', 'ui', 'styles', 'tokens.css'), 'utf-8');
/** The bodies of every @media block whose condition is `cond`, one after the other. */
const media = (cond: string): string => {
  const out: string[] = [];
  for (let start = css.indexOf(`@media (${cond}) {`); start >= 0; start = css.indexOf(`@media (${cond}) {`, start + 1)) {
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) { out.push(css.slice(start, i)); break; }
    }
  }
  expect(out.length, cond).toBeGreaterThan(0);
  return out.join('\n');
};

describe('the shell (criterion 10.12)', () => {
  it('on a phone the result comes straight after the examples (10.10)', () => {
    expect(media('max-width: 959.98px')).toMatch(/\.spread:not\(\.solo\) \.sketch \{ order: -1; \}/);
  });

  it('the four modes stay on one row wherever 480 px allow, "not built yet" under its mode at the 12 px type', () => {
    const wide = media('min-width: 480px');
    expect(wide).toMatch(/\.modes \{ display: flex; flex-wrap: nowrap; \}/);
    expect(wide).toMatch(/\.modes \.choice \{[^}]*white-space: nowrap/);
    // Each name at the top of its tab, so the names line up and "not built yet" sits under its own.
    expect(wide).toMatch(/\.modes \.choice \{[^}]*flex-direction: column; align-items: flex-start; justify-content: flex-start/);
    expect(css).toMatch(/\.choice \.not-built \{ font: var\(--text-xs\)/);
    expect(tokens).toMatch(/--text-xs: 12px/);
  });

  it('both results tables share one column grid on a desktop, QUICK-2\'s labels on one line', () => {
    const desk = media('min-width: 960px');
    expect(desk).toMatch(/table\.printed \{ table-layout: fixed; \}/);
    expect(desk).toMatch(/table\.printed tbody th\[scope='row'\], table\.printed thead th:first-child \{ width: var\(--label-column\); white-space: nowrap; \}/);
    expect(desk).toMatch(/table\.printed td\[data-field\], table\.printed thead th:nth-child\(2\) \{ width: var\(--figure-column\); \}/);
  });

  it('running text on the limits and proof pages is at most 72 characters a line', () => {
    expect(tokens).toMatch(/--reading: 72ch;/);
    expect(css).toMatch(/\.limits-page p, \.limits-page li, \.limits-page dd, \.proof-page p \{ max-width: var\(--reading\); \}/);
  });

  it('the water-surface symbol stands on the main figure\'s baseline', () => {
    expect(css).toMatch(/\.ws-mark \{[^}]*align-self: baseline;/);
    expect(css).toMatch(/\.main-figure \{[^}]*align-items: baseline/);
  });
});
