// The first screen's opening (quickened-app task 16.1; criterion 8.10). Above the worked examples:
// what the page does and for whom, how Quickened was rebuilt, the headline count from
// results/headline.md linked to the proof page, a link to the limits page, and the notice. Every
// number in it is read from a file: the expected values are read here from the same files.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { parseHeadline } from '../build/headline.ts';
import { calculatePage } from '../src/ui/views/calculate.ts';
import { examplesView } from '../src/ui/views/example.ts';
import { INTRO_LEAD, introView } from '../src/ui/views/intro.ts';
import { NOTICE } from '../src/ui/views/notice.ts';
import { NO_HEADLINE } from '../src/ui/views/proof.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const headline = parseHeadline(readFileSync(join(ROOT, 'results', 'headline.md'), 'utf-8'));
const purpose = (JSON.parse(readFileSync(join(ROOT, 'realdata', 'huntington-section-01.json'), 'utf-8')) as { purpose: string }).purpose;
const year = /QUICK-2 \((\d{4})\)/.exec(purpose)![1]!;
const view = introView(data.headline, data.program);
const text = textOf(view);

describe('the opening of the first screen', () => {
  it('says what the page does and for whom, and that it was rebuilt from the running program, not its source', () => {
    expect(text).toContain(INTRO_LEAD);
    expect(INTRO_LEAD).toMatch(/floodplain reviewer/);
    expect(INTRO_LEAD).toMatch(/one cross section/);
    expect(text).toContain(`rebuilt from the running ${year} program`);
    expect(text).toMatch(/not from its source/);
  });
  it('states the headline count read from results/headline.md, with a link to the proof page', () => {
    expect(data.program.year).toBe(year);
    expect(text).toContain(`${headline.matched} of ${headline.total} cases`);
    const proof = findAll(view, (n) => n.tag === 'a' && n.attrs.href === '#/proof');
    expect(proof.length).toBe(1);
  });
  it('links the limits page and carries the notice of criterion 2.3', () => {
    expect(findAll(view, (n) => n.tag === 'a' && n.attrs.href === '#/limits').length).toBe(1);
    expect(text).toContain(NOTICE);
  });
  it('types no number: every digit outside the notice and the name QUICK-2 is a value read from a file', () => {
    let rest = text.replace(NOTICE, '').replace(/QUICK-2/g, '');
    for (const v of [String(headline.matched), String(headline.total), year]) rest = rest.replace(v, '');
    expect(rest).not.toMatch(/\d/);
  });
  it('says that no headline run has been recorded, with no count, when there is none', () => {
    const t = textOf(introView(null, data.program));
    expect(t).toContain(NO_HEADLINE);
    expect(t).not.toContain(`${headline.matched} of`);
  });
  it('comes above the worked examples on the calculator page', () => {
    const page = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() }, { intro: view, examples: examplesView() });
    const notes = findAll(page, (n) => n.attrs.class === 'field-notes')[0]!;
    const order = notes.children.map((c) => (typeof c === 'string' ? '' : String(c.attrs.class ?? '')));
    expect(order.indexOf('intro')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('intro')).toBeLessThan(order.indexOf('examples'));
  });
});
