// Task 17.5 (criterion 10.5): the phone. The result's heading is where the page scrolls to; the
// ground-point table collapses to a summary row once a section is pasted or loaded; on the proof
// page QUICK-2's recorded screens scale to fit the width and the field tables never break a word.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { formFor } from '../src/ui/forms.ts';
import { GROUND_TABLE_ID, groundAfter, groundSummary, type GroundView } from '../src/ui/ground.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { exampleForm, exampleJob } from '../src/ui/views/example.ts';
import { formView } from '../src/ui/views/form.ts';
import { proofModel, proofView } from '../src/ui/views/proof.ts';
import { screenView } from '../src/ui/views/screen.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const css = readFileSync(join(ROOT, 'app', 'src', 'ui', 'styles', 'app.css'), 'utf-8');
const tokens = readFileSync(join(ROOT, 'app', 'src', 'ui', 'styles', 'tokens.css'), 'utf-8');
const main = exampleJob('main_example');
const { rows, values } = exampleForm('main_example');
const form = formFor(main.mode, main.shape)!;
const view = (ground?: GroundView) => formView({ form, values, rows, marked: new Set(), ground });

describe('the ground-point table on a phone', () => {
  it('the summary row of the main example is "40 ground points, 0 to 500"', () => {
    expect(groundSummary(rows)).toBe('40 ground points, 0 to 500');
    expect(groundSummary([{ station: '5', elevation: '1' }])).toBe('1 ground point, 5 to 5');
  });
  it('collapsed: the summary row is a button that says it is closed, and the table and its row controls are not on the page', () => {
    const v = view('collapsed');
    const b = findAll(v, (n) => n.tag === 'button' && n.attrs.class === 'ground-summary');
    expect(b).toHaveLength(1);
    expect(textOf(b[0]!)).toBe(groundSummary(rows));
    expect(b[0]!.attrs['aria-expanded']).toBe('false');
    expect(b[0]!.attrs['aria-controls']).toBe(GROUND_TABLE_ID);
    expect(b[0]!.on.click?.type).toBe('ground-toggle');
    expect(findAll(v, (n) => n.tag === 'table')).toHaveLength(0);
    expect(findAll(v, (n) => n.attrs.class === 'row-controls')).toHaveLength(0);
  });
  it('open: the same button says it is open, with the table, each row an input', () => {
    const v = view('open');
    expect(findAll(v, (n) => n.tag === 'button' && n.attrs.class === 'ground-summary')[0]!.attrs['aria-expanded']).toBe('true');
    expect(findAll(v, (n) => n.tag === 'table' && n.attrs.id === GROUND_TABLE_ID)).toHaveLength(1);
    expect(findAll(v, (n) => n.tag === 'input' && String(n.attrs.id).startsWith('row-'))).toHaveLength(2 * rows.length);
  });
  it('typed by hand: the table alone, with no summary row', () => {
    const v = view(undefined);
    expect(findAll(v, (n) => n.attrs.class === 'ground-summary')).toHaveLength(0);
    expect(findAll(v, (n) => n.tag === 'table')).toHaveLength(1);
  });
  it('an example or a paste collapses it, the summary row opens and closes it, and nothing else changes it', () => {
    expect(groundAfter('typed', 'example')).toBe('collapsed');
    expect(groundAfter('open', 'paste-load')).toBe('collapsed');
    expect(groundAfter('collapsed', 'ground-toggle')).toBe('open');
    expect(groundAfter('open', 'ground-toggle')).toBe('collapsed');
    expect(groundAfter('typed', 'ground-toggle')).toBe('typed');
    for (const a of ['row', 'add-row', 'calculate', 'field']) expect(groundAfter('open', a)).toBe('open');
  });
});

describe('after an example or Calculate the page goes to the result\'s heading', () => {
  it('the heading of a result can take focus and is named for the scroll', () => {
    const job = exampleJob('main_example');
    const node = screenView(job, classify(job, runJob(job)))!.node;
    const h2 = findAll(node, (n) => n.tag === 'h2' && n.attrs.id === 'result-heading');
    expect(h2).toHaveLength(1);
    expect(h2[0]!.attrs.tabindex).toBe('-1');
    expect(css).toMatch(/#result-heading \{[^}]*scroll-margin-top/);
  });
  it('main.ts scrolls to that heading, from the top, and not to the section', () => {
    const src = readFileSync(join(ROOT, 'app', 'src', 'ui', 'main.ts'), 'utf-8');
    expect(src).toContain("getElementById('result-heading')");
    expect(src).toMatch(/scrollIntoView\(\{ block: 'start' \}\)/);
  });
});

describe('the proof page on a phone', () => {
  const model = proofModel(data.proof, data.headline);
  const page = proofView(model);
  const longest = Math.max(...model.cases.flatMap((c) => c.capture.split('\n').map((l) => l.length)));

  // Amended 2026-11-27 (criterion 10.5): scaled to fit, a phone's screens were 5 px. They keep 12 px there and scroll
  // sideways inside their own frame; the line height is 1, so the box-drawing characters join.
  it('QUICK-2\'s recorded screens scale to the width on a wider screen, keep 12 px and scroll sideways on a phone, at a line height of 1', () => {
    expect(css).toMatch(/\.quick2-screen \{[^}]*container-type: inline-size/);
    expect(css).toMatch(/\.quick2-screen pre \{[^}]*font: var\(--evidence-size\) var\(--font-evidence\); line-height: var\(--evidence-leading\);/);
    expect(tokens).toMatch(/--evidence-leading: 1;/);
    expect(css).not.toMatch(/\.quick2-screen pre \{[^}]*overflow-x: auto[^}]*\}\s*\.quick2-screen pre:focus/);
    expect(css).toMatch(/@media \(max-width: 559\.98px\) \{ \.quick2-screen pre \{ font-size: var\(--evidence-phone\); overflow-x: auto; \} \}/);
    expect(tokens).toMatch(/--evidence-phone: 12px;/);
    expect(tokens).toMatch(/--evidence-size: min\(var\(--evidence-max\), calc\(\(100cqw [^;]*var\(--screen-columns\)[^;]*\)\);/);
    const columns = Number(/--screen-columns:\s*(\d+)/.exec(tokens)![1]);
    expect(columns).toBeGreaterThanOrEqual(longest);
  });
  it('the field tables never break a word or a value: no break-anywhere rule, and each cell is labelled for the stacked phone layout', () => {
    const rule = /\.proof-table th, \.proof-table td \{([^}]*)\}/.exec(css)![1]!;
    expect(rule).not.toMatch(/overflow-wrap:\s*(anywhere|break-word)|word-break:\s*(break-all|break-word)/);
    for (const td of findAll(page, (n) => n.tag === 'td')) expect(typeof td.attrs['data-label'], textOf(td)).toBe('string');
    expect(css).toMatch(/\.proof-table td::before \{[^}]*content: attr\(data-label\)/);
  });
});
