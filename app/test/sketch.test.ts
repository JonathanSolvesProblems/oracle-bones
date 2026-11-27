// No empty ruled notepad (criterion 10.3, replacing the empty sketch page of fix 4 before task 12):
// before a calculation the right page is empty and hidden, and no stylesheet draws ruled lines.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculatePage } from '../src/ui/views/calculate.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const styles = join(ROOT, 'app', 'src', 'ui', 'styles');
const CSS = ['app.css', 'tokens.css', 'print.css'].map((f) => readFileSync(join(styles, f), 'utf-8')).join('\n');

describe('no empty ruled notepad', () => {
  it('before a calculation the results section holds nothing, and the page carries no sketch-empty block or line of text for it', () => {
    const page = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() }, {});
    const sketch = findAll(page, (n) => n.attrs.id === 'results')[0]!;
    expect(sketch.children).toHaveLength(0);
    expect(findAll(page, (n) => n.attrs.class === 'sketch-empty')).toHaveLength(0);
    expect(textOf(page)).not.toContain('appear here');
  });
  it('the form has the width of a form until there is a result to put beside it', () => {
    const page = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() }, {});
    expect(findAll(page, (n) => n.attrs.class === 'spread solo')).toHaveLength(1);
    const withResult = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() }, { results: 'x' });
    expect(findAll(withResult, (n) => n.attrs.class === 'spread')).toHaveLength(1);
  });
  it('no stylesheet rules lines on the page: no sketch-empty rule, no repeating gradient, no sketch-lines token', () => {
    expect(CSS).not.toMatch(/sketch-empty|sketch-lines|repeating-linear-gradient/);
  });
});
