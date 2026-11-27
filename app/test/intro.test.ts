// The first screen (quickened-app tasks 16.1 and 17.3; criteria 8.10 and 10.3). One object, the
// main example's reach block computed live on load, beside a short opening; then the two examples;
// then the calculator; no ruled notepad; a footer on every page. Every number in the opening is
// read from a file: the expected values are read here from the same files.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { parseHeadline } from '../build/headline.ts';
import { runJob } from '../src/ui/state.ts';
import { calculatePage } from '../src/ui/views/calculate.ts';
import { exampleJob, examplesView } from '../src/ui/views/example.ts';
import { heroView } from '../src/ui/views/hero.ts';
import { FEMA_LIST_URL, INTRO_FEMA_PIECES, INTRO_TITLE, introView } from '../src/ui/views/intro.ts';
import { NOTICE } from '../src/ui/views/notice.ts';
import { NO_HEADLINE } from '../src/ui/views/proof.ts';
import { REPOSITORY_URL, ROUTES, shell } from '../src/ui/views/shell.ts';
import { findAll, textOf, type VNode } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const headline = parseHeadline(readFileSync(join(ROOT, 'results', 'headline.md'), 'utf-8'));
const purpose = (JSON.parse(readFileSync(join(ROOT, 'realdata', 'huntington-section-01.json'), 'utf-8')) as { purpose: string }).purpose;
const year = /QUICK-2 \((\d{4})\)/.exec(purpose)![1]!;
const view = introView(data.headline, data.program);
const text = textOf(view);
const idle = { mode: null, shape: null, values: {}, rows: [], marked: new Set<string>() };
const classOf = (c: unknown): string => (typeof c === 'string' ? '' : String((c as VNode).attrs.class ?? ''));

describe('the opening of the first screen', () => {
  it('says what QUICK-2 is: FEMA\'s DOS program of the year in the file, on FEMA\'s list for one cross section in Zone A, linked', () => {
    expect(data.program.year).toBe(year);
    expect(text).toContain(`QUICK-2 is FEMA's ${year} DOS program`);
    expect(text).toContain("still on FEMA's list of accepted models for one cross section in Zone A");
    const list = findAll(view, (n) => n.tag === 'a' && n.attrs.href === FEMA_LIST_URL);
    expect(list).toHaveLength(1);
    expect(FEMA_LIST_URL).toBe('https://www.fema.gov/flood-maps/products-tools/numerical-models/hydraulic');
    expect(textOf(list[0]!)).toBe("FEMA's list of accepted models");
    expect(INTRO_FEMA_PIECES.every((p) => text.includes(p.trim()))).toBe(true);
  });
  it('says it does not start on a locked-down modern computer', () => {
    expect(text).toContain('does not start on a locked-down modern computer');
  });
  it('says Quickened gives its answers in a browser, checked against the original, with the count from results/headline.md linked to the proof page', () => {
    expect(text).toContain('Quickened gives its answers in a browser, checked against the original.');
    expect(text).toContain(`${headline.matched} of ${headline.total} cases`);
    expect(findAll(view, (n) => n.tag === 'a' && n.attrs.href === '#/proof')).toHaveLength(1);
  });
  it('links the limits page; the notice is in the footer, not here', () => {
    expect(findAll(view, (n) => n.tag === 'a' && n.attrs.href === '#/limits')).toHaveLength(1);
    expect(text).not.toContain(NOTICE);
  });
  it('has a title in sentence case with no full stop', () => {
    expect(textOf(findAll(view, (n) => n.tag === 'h1')[0]!)).toBe(INTRO_TITLE);
    expect(INTRO_TITLE).not.toMatch(/\.$/);
  });
  it('types no number: every digit outside the name QUICK-2 is a value read from a file', () => {
    let rest = text.replace(/QUICK-2/g, '');
    for (const v of [String(headline.matched), String(headline.total), year]) rest = rest.replace(v, '');
    expect(rest).not.toMatch(/\d/);
  });
  it('says that no headline run has been recorded, with no count, when there is none', () => {
    const t = textOf(introView(null, data.program));
    expect(t).toContain(NO_HEADLINE);
    expect(t).not.toContain(`${headline.matched} of`);
  });
});

describe('the first screen is one object, then the examples, then the calculator', () => {
  const page = calculatePage(idle, { hero: heroView(), examples: examplesView() });

  it('in that order, with no empty ruled page', () => {
    expect(page.children.map(classOf)).toEqual(['hero', 'examples', 'spread solo']);
    expect(findAll(page, (n) => n.attrs.class === 'sketch-empty')).toHaveLength(0);
    const results = findAll(page, (n) => n.attrs.id === 'results')[0]!;
    expect(results.children).toHaveLength(0);
  });
  it('the object is the main example\'s reach block, computed live: its water figure is the solver\'s printed WS ELEV', () => {
    const hero = page.children[0] as VNode;
    const svg = findAll(hero, (n) => n.tag === 'svg' && n.attrs.class === 'section-drawing reach-block');
    expect(svg).toHaveLength(1);
    const printed = runJob(exampleJob('main_example')).printed.ws_elev!.trim();
    const mark = findAll(svg[0]!, (n) => n.attrs.class === 'hwm-figure')[0]!;
    expect(textOf(mark)).toBe(printed);
    expect(findAll(hero, (n) => n.tag === 'section' && n.attrs.class === 'intro')).toHaveLength(1);
  });
  it('a result brings its own block, so the opening stands alone then', () => {
    const alone = heroView({ block: false });
    expect(findAll(alone, (n) => n.tag === 'svg' && String(n.attrs.class ?? '').includes('reach-block'))).toHaveLength(0);
    expect(findAll(alone, (n) => n.attrs.class === 'intro')).toHaveLength(1);
  });
  it('the calculator\'s own heading is a heading, not hidden text', () => {
    const h2 = findAll(page, (n) => n.tag === 'h2' && n.attrs.class === 'calculate-heading')[0]!;
    expect(textOf(h2)).toBe('Calculate a section of your own');
    expect(findAll(page, (n) => n.tag === 'h1')).toHaveLength(1);
  });
});

describe('the footer of every page', () => {
  for (const r of ROUTES) {
    it(`${r.route}: the source repository, the limits, proof and story pages, and the notice`, () => {
      const f = findAll(shell(r.route, 'x'), (n) => n.tag === 'footer')[0]!;
      const hrefs = findAll(f, (n) => n.tag === 'a').map((a) => a.attrs.href);
      expect(hrefs).toEqual([REPOSITORY_URL, '#/limits', '#/proof', '#/story']);
      expect(REPOSITORY_URL).toBe('https://github.com/JonathanSolvesProblems/oracle-bones');
      expect(textOf(f)).toContain(NOTICE);
    });
  }
});
