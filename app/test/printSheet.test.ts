// The print laid out as a sheet (fix before task 12; criteria 4.1, 4.4, 4.5). The main example's
// print ran to three pages: "QUICKENED" twice at the top, section heads wrapped a word to a line,
// each field on two lines, the drawing on page 2. Now: one header line, the drawing near the top,
// inputs and outputs side by side with label and value on one row, then the ground points, flags
// and the notice; an example's sources on a page of their own, under their own head. The browser's
// page count is checked by the Playwright run; this test checks the order and the styles.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify, runJob, type ShownState } from '../src/ui/state.ts';
import { exampleJob } from '../src/ui/views/example.ts';
import { NOTICE } from '../src/ui/views/notice.ts';
import { printModel, printView } from '../src/ui/views/print.ts';
import { CUT_OFF_LINE } from '../src/ui/views/results.ts';
import { findAll, textOf, type Child, type VNode } from '../src/ui/vnode.ts';
import type { AppJob } from '../src/ui/job.ts';

const STYLES = join(import.meta.dirname, '..', 'src', 'ui', 'styles');
const APP_CSS = readFileSync(join(STYLES, 'app.css'), 'utf-8');
const PRINT_CSS = readFileSync(join(STYLES, 'print.css'), 'utf-8');
const DATE = new Date(2026, 10, 27, 9, 5);

function printed(job: AppJob): VNode {
  const s = classify(job, runJob(job)) as Extract<ShownState, { kind: 'result' }>;
  return printView(printModel(job, s, DATE));
}
/** Every node in document order, so parts can be compared by where they come. */
function order(node: Child, out: VNode[] = []): VNode[] {
  if (typeof node === 'string') return out;
  out.push(node);
  for (const c of node.children) order(c, out);
  return out;
}
const at = (all: VNode[], test: (n: VNode) => boolean): number => all.findIndex(test);
const cls = (name: string) => (n: VNode) => String(n.attrs.class ?? '').split(' ').includes(name);

describe('the print sheet', () => {
  for (const which of ['main_example', 'cutoff_example'] as const) {
    const view = printed(exampleJob(which));
    const all = order(view);
    it(`${which}: one header line, with the name once`, () => {
      const headers = findAll(view, (n) => n.tag === 'header');
      expect(headers).toHaveLength(1);
      expect(headers[0]!.children.filter((c) => typeof c !== 'string')).toHaveLength(1);
      expect(textOf(headers[0]!).match(/Quickened/g)).toHaveLength(1);
    });
    it(`${which}: the drawing near the top, then inputs and outputs side by side, then ground points, flags and the notice`, () => {
      const header = at(all, (n) => n.tag === 'header');
      const drawing = at(all, (n) => n.tag === 'svg' && n.attrs.class === 'section-drawing');
      const fields = at(all, cls('print-fields'));
      const ground = at(all, cls('ground-print'));
      const flags = at(all, cls('flags'));
      const notice = at(all, cls('notice'));
      const sources = at(all, cls('print-sources'));
      const required = [header, drawing, fields, ground, notice, sources];
      expect(required.every((i) => i >= 0), String(required)).toBe(true);
      // Flags print only when the result has some.
      const parts = flags >= 0 ? [header, drawing, fields, ground, flags, notice, sources] : required;
      expect(parts).toEqual([...parts].sort((a, b) => a - b));
      const block = all[fields]!;
      const sides = block.children.filter((c): c is VNode => typeof c !== 'string');
      expect(sides.map((s) => s.attrs.class)).toEqual(['print-inputs', 'print-outputs']);
      expect(textOf(all[notice]!)).toBe(NOTICE);
    });
    it(`${which}: each field is one row, label and value side by side`, () => {
      const rows = findAll(all[at(all, cls('print-fields'))]!, (n) => n.tag === 'tr');
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const cells = r.children.filter((c): c is VNode => typeof c !== 'string');
        expect(cells[0]!.tag).toBe('th');
        expect(cells[1]!.tag).toBe('td');
        expect(textOf(cells[1]!)).not.toBe('');
      }
    });
    it(`${which}: the sources under their own head`, () => {
      const s = all[at(all, cls('print-sources'))]!;
      expect(s.children.find((c): c is VNode => typeof c !== 'string')!.tag).toBe('h2');
    });
  }
  it('names the cut-off line once, as a numbered note the rows point to', () => {
    const view = printed(exampleJob('cutoff_example'));
    expect(textOf(view).split(CUT_OFF_LINE).length - 1).toBe(1);
    const rows = findAll(view, (n) => n.tag === 'tr' && textOf(n).includes('Note 1'));
    expect(rows.length).toBeGreaterThan(1);
  });
  it('the print stylesheet lays out the sheet and outranks app.css', () => {
    // app.css's own .top-line rule comes after the imported print.css, so a plain .top-line lost.
    expect(PRINT_CSS).toMatch(/body \.top-line[^{]*\{[^}]*display:\s*none/);
    expect(PRINT_CSS).toMatch(/\.print-fields\s*\{[^}]*grid-template-columns/);
    expect(PRINT_CSS).toMatch(/\.print-sources\s*\{[^}]*break-before:\s*page/);
    // The print's own classes are not styled by the screen's stylesheet (its phone rules made each field two lines).
    for (const c of ['print-fields', 'print-table', 'print-inputs', 'print-outputs']) expect(APP_CSS).not.toContain(c);
    expect(PRINT_CSS).not.toMatch(/print-table[^{]*\{[^}]*display:\s*block/);
  });
});
