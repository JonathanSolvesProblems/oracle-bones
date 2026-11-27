// The limits page (quickened-app tasks 9.3, 16.2, 16.3; criteria 5.3, 5.4, 5.8, 5.9, 7.3). Its data
// holds every haunting, every Limits paragraph verbatim, every pair isBuilt calls not built, and
// every open question with its plain sentences before the ledger's wording. A markdown code span
// is shown as its value in the figures face, with no backquote left. The known-miss classes have
// their own section, between the hauntings and the no-answer entries, with the headline run's
// cases each holds. The expected entries are read here from the real files, so an entry missing
// from the page fails the test.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { KNOWN_MISSES_HEADING, LEDGER_WORDING, limitsModel, limitsView, NOT_OBSERVED_HEADING, parseTable } from '../src/ui/views/limits.ts';
import { sentences, splitRepo } from '../src/ui/views/repo.ts';
import { inline } from '../src/ui/views/inline.ts';
import { notBuiltModel } from '../src/ui/views/notBuilt.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from '../src/ui/views/picker.ts';
import { findAll, h, textOf, type VNode } from '../src/ui/vnode.ts';
import { golden, ROOT } from './golden.ts';
import { HEADLINE_SEED, KNOWN_MISS_CLASSES } from './knownMisses.ts';

const read = (f: string): string => readFileSync(join(ROOT, 'results', f), 'utf-8').replace(/\r\n/g, '\n');
const HAUNTINGS = read('hauntings.md').split('\n');
const headingIds = HAUNTINGS.map((l) => /^## (H-\d{3}):/.exec(l)?.[1]).filter((x): x is string => !!x);
const limitTitles = HAUNTINGS.slice(HAUNTINGS.indexOf('# Limits')).map((l) => /^### (.+)$/.exec(l)?.[1]).filter((x): x is string => !!x);
const openIds = (JSON.parse(read('ledger.json')) as { open_questions: { id: string; status: string }[] }).open_questions
  .filter((q) => q.status === 'open').map((q) => q.id);
const PAIRS: { mode: Mode; shape: Shape }[] = MODES.flatMap((m) => (shapeChoice(m.mode)
  ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]));
/** Text as shown: the code marks gone and no whitespace, since the page's spacing is not the file's. */
const squash = (s: string): string => s.replace(/`/g, '').replace(/\s+/g, '');
/** The values of a text's code spans, as markdown writes them. */
const spans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]!.replace(/\s+/g, ' '));
const codes = (n: VNode): string[] => findAll(n, (x) => x.tag === 'code').map(textOf);
const byId = (n: VNode, id: string): VNode => findAll(n, (x) => x.attrs.id === id)[0]!;

const model = limitsModel(data);
const view = limitsView(model);
const text = textOf(view);
const known = KNOWN_MISS_CLASSES.filter((c) => c.limits !== null);
const missTitles = new Set(known.map((c) => c.limits!));

describe('the limits page data', () => {
  it('has every haunting of the file, with its title, cases, printed, exact answer and difference', () => {
    expect(model.hauntings.map((h) => h.id)).toEqual(headingIds);
    for (const h of model.hauntings) {
      const block = byId(view, `haunting-${h.id}`);
      // Criterion 10.6: a sentence for the repository is in the entry's details, so each sentence is checked, not the run of them.
      expect(squash(textOf(block)), h.id).toContain(squash(h.title));
      for (const part of [h.caseText, h.printed, h.difference]) for (const s of sentences(part)) expect(squash(textOf(block)), h.id).toContain(squash(s));
      if (!parseTable(h.exactAnswer)) for (const s of sentences(h.exactAnswer)) expect(squash(textOf(block)), h.id).toContain(squash(s));
    }
  });
  it('has every Limits entry by its Limits page paragraph, verbatim', () => {
    expect([...model.misses.map((m) => m.title), ...model.limits.map((l) => l.title)].sort()).toEqual([...limitTitles].sort());
    for (const l of [...model.misses, ...model.limits]) {
      expect(read('hauntings.md').replace(/\s+/g, ' ')).toContain(l.paragraph.replace(/\s+/g, ' ').trim());
      for (const s of sentences(l.paragraph)) expect(squash(text), l.title).toContain(squash(s));
    }
  });
  it('has every pair isBuilt calls not built, with the sentence of criterion 7.3', () => {
    const expected = PAIRS.filter((p) => !isBuilt(p.mode, p.shape));
    expect(expected.length).toBeGreaterThan(0);
    expect(model.notBuilt.map((p) => `${p.mode}/${p.shape}`)).toEqual(expected.map((p) => `${p.mode}/${p.shape}`));
    for (const p of expected) for (const s of notBuiltModel(p.mode, p.shape).sentences) expect(squash(text)).toContain(squash(s));
  });
  it('has every open question, its plain sentences before the ledger id and wording, under the not-observed heading', () => {
    expect(model.openQuestions.map((q) => q.id)).toEqual(openIds);
    const section = byId(view, 'not-observed');
    expect(textOf(section)).toContain(NOT_OBSERVED_HEADING);
    for (const q of model.openQuestions) {
      expect(q.plain, q.id).toBeTruthy();
      const block = squash(textOf(byId(section, `question-${q.id}`)));
      const wordingAt = block.indexOf(squash(LEDGER_WORDING));
      expect(wordingAt, q.id).toBeGreaterThanOrEqual(0);
      // The plain sentences come first; a sentence of the plain text that holds repository wording is in the details, after the wording.
      const { plain, repo } = splitRepo(q.plain!);
      if (plain) expect(block.indexOf(squash(plain)), q.id).toBeGreaterThanOrEqual(0);
      if (plain) expect(block.indexOf(squash(plain)), q.id).toBeLessThan(wordingAt);
      for (const s of repo) expect(block.indexOf(squash(s)), q.id).toBeGreaterThan(wordingAt);
      expect(block.indexOf(q.id, wordingAt), q.id).toBeGreaterThan(wordingAt);
      expect(block.indexOf(squash(q.question), wordingAt), q.id).toBeGreaterThan(wordingAt);
    }
  });
  it('fails when an entry of the real files is missing from it', () => {
    const short = limitsModel({ ...data, hauntings: data.hauntings.slice(1), limits: data.limits.slice(1), openQuestions: data.openQuestions.slice(1) });
    expect(short.hauntings.map((h) => h.id)).not.toEqual(headingIds);
    expect([...short.misses, ...short.limits].map((l) => l.title)).not.toEqual(limitTitles);
    expect(short.openQuestions.map((q) => q.id)).not.toEqual(openIds);
  });
});

// Criterion 5.8 (2026-11-26): the page showed `596.37` with its marks, and H-008 a mark after
// SUBCRITICAL, where the file breaks a line inside the bullet.
describe('code marks on the limits page', () => {
  it('leaves no backquote anywhere on the page', () => {
    expect(text.includes('`'), text.slice(Math.max(0, text.indexOf('`') - 60), text.indexOf('`') + 60)).toBe(false);
  });
  it("shows each haunting's code spans as values in the figures face", () => {
    for (const h of model.hauntings) {
      const block = byId(view, `haunting-${h.id}`);
      const want = [h.title, h.caseText, h.printed, h.assumption, h.exactAnswer, h.difference].flatMap(spans);
      for (const v of want) expect(codes(block), `${h.id} ${v}`).toContain(v);
    }
    expect(codes(byId(view, 'haunting-H-001'))).toContain('596.37');
    expect(codes(byId(view, 'haunting-H-008'))).toContain('SUBCRITICAL');
  });
  it("shows the Limits paragraphs' and the ledger's code spans the same way", () => {
    for (const l of [...model.misses, ...model.limits]) for (const v of spans(l.paragraph)) expect(codes(view), `${l.title} ${v}`).toContain(v);
    for (const q of model.openQuestions) {
      const block = byId(view, `question-${q.id}`);
      for (const v of [...spans(q.plain ?? ''), ...spans(q.question)]) expect(codes(block), `${q.id} ${v}`).toContain(v);
    }
  });
  it('reads a code span across a line break, and leaves an unpaired mark for the test above to find', () => {
    const n = h('p', {}, inline('Flow Type\n`SUBCRITICAL`, Area `%21069`.'));
    expect(codes(n)).toEqual(['SUBCRITICAL', '%21069']);
    expect(findAll(n, (x) => x.tag === 'code').every((c) => String(c.attrs.class).includes('figures'))).toBe(true);
    expect(textOf(h('p', {}, inline('one ` two')))).toContain('`');
  });
});

// Criterion 5.9 (2026-11-26): the known-miss classes are answers that differ, not entries where
// Quickened gives no answer.
describe('the known-miss classes on the limits page', () => {
  const inBatch = (ids: string[]) => ids.filter((id) => golden(id).seed === HEADLINE_SEED).length;
  it('sit in their own section, between the hauntings and the no-answer entries', () => {
    const sections = findAll(view, (n) => n.tag === 'section' && n.attrs.id !== undefined).map((n) => n.attrs.id);
    expect(sections).toEqual(['hauntings', 'known-misses', 'no-answer', 'not-built', 'not-observed']);
    expect(textOf(byId(view, 'known-misses'))).toContain(KNOWN_MISSES_HEADING);
  });
  it('hold each class of results/known-misses.json that has a Limits entry, in the file order of hauntings.md, and no other entry', () => {
    expect(model.misses.map((m) => m.title)).toEqual(limitTitles.filter((t) => missTitles.has(t)));
    expect(model.misses.map((m) => m.title).sort()).toEqual([...missTitles].sort());
    expect(model.limits.some((l) => missTitles.has(l.title))).toBe(false);
    const noAnswer = textOf(byId(view, 'no-answer'));
    for (const t of missTitles) expect(noAnswer).not.toContain(t);
  });
  it("say how many of the headline run's cases each class holds, read from the goldens' seed", () => {
    const head = data.headline!;
    expect(head.seed).toBe(HEADLINE_SEED);
    const section = byId(view, 'known-misses');
    for (const c of known) {
      const m = model.misses.find((x) => x.title === c.limits)!;
      expect(m.inHeadline, c.id).toBe(inBatch(Object.keys(c.cases)));
      expect(textOf(section), c.id).toContain(`${m.inHeadline} of the headline run's ${head.total} cases`);
    }
    const sum = model.misses.reduce((s, m) => s + m.inHeadline!, 0);
    expect(sum).toBe(head.total - head.matched);
    expect(textOf(section)).toContain(`Of the ${head.total} cases of the headline run, Quickened prints what QUICK-2 printed in ${head.matched}; the other ${sum} are in these classes.`);
  });
});
