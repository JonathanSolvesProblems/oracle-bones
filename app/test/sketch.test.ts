// The right page before a calculation (fix before task 12, item 4): the ruled sketch page and its
// one line, at both widths. The view gives the page and the line (notBuilt.test.ts); this checks
// that the stylesheet rules the page at every width and hides it at none. The Playwright run sees
// it drawn at 1280 and 375 px.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculatePage, SKETCH_EMPTY } from '../src/ui/views/calculate.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';

const CSS = readFileSync(join(import.meta.dirname, '..', 'src', 'ui', 'styles', 'app.css'), 'utf-8');

/** The stylesheet's rules outside any @media block, and those inside each block, by its query. */
function blocks(css: string): { media: string | null; body: string }[] {
  const out: { media: string | null; body: string }[] = [];
  const top: string[] = [];
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media', i);
    if (at < 0) { top.push(css.slice(i)); break; }
    top.push(css.slice(i, at));
    const open = css.indexOf('{', at);
    let depth = 1;
    let j = open + 1;
    for (; j < css.length && depth > 0; j++) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0;
    out.push({ media: css.slice(at + 6, open).trim(), body: css.slice(open + 1, j - 1) });
    i = j;
  }
  out.unshift({ media: null, body: top.join('') });
  return out;
}

describe('the empty sketch page', () => {
  it('is the right page before a calculation, with its one line', () => {
    const page = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() }, {});
    const sketch = findAll(page, (n) => n.attrs.id === 'results')[0]!;
    expect(findAll(sketch, (n) => n.attrs.class === 'sketch-empty')).toHaveLength(1);
    expect(textOf(sketch)).toBe(SKETCH_EMPTY);
  });
  it('is ruled at every width: the ruled background is outside any @media block', () => {
    const top = blocks(CSS)[0]!.body;
    expect(top).toMatch(/\.sketch-empty\s*\{[^}]*repeating-linear-gradient/);
  });
  it('is hidden at no width', () => {
    for (const b of blocks(CSS)) {
      if (b.media === 'print') continue;
      expect(b.body, b.media ?? 'all widths').not.toMatch(/\.sketch-empty[^{]*\{[^}]*display:\s*none/);
      expect(b.body, b.media ?? 'all widths').not.toMatch(/\.sketch(?![-:\w])[^{]*\{[^}]*display:\s*none/);
    }
  });
});
