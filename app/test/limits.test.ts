// The limits page (quickened-app task 9.3; criteria 5.3, 5.4, 7.3). Its data holds every haunting,
// every Limits paragraph verbatim, every pair isBuilt calls not built, and every open question
// with its plain sentences before the ledger's wording. The expected entries are read here from
// the real files, so an entry missing from the page fails the test.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { isBuilt, type Mode, type Shape } from '../src/solver/index.ts';
import { LEDGER_WORDING, limitsModel, limitsView, NOT_OBSERVED_HEADING } from '../src/ui/views/limits.ts';
import { notBuiltModel } from '../src/ui/views/notBuilt.ts';
import { MODES, SHAPES, shapeChoice, STEP_BACKWATER_SHAPE } from '../src/ui/views/picker.ts';
import { findAll, textOf } from '../src/ui/vnode.ts';
import { ROOT } from './golden.ts';

const read = (f: string): string => readFileSync(join(ROOT, 'results', f), 'utf-8').replace(/\r\n/g, '\n');
const HAUNTINGS = read('hauntings.md').split('\n');
const headingIds = HAUNTINGS.map((l) => /^## (H-\d{3}):/.exec(l)?.[1]).filter((x): x is string => !!x);
const limitTitles = HAUNTINGS.slice(HAUNTINGS.indexOf('# Limits')).map((l) => /^### (.+)$/.exec(l)?.[1]).filter((x): x is string => !!x);
const openIds = (JSON.parse(read('ledger.json')) as { open_questions: { id: string; status: string }[] }).open_questions
  .filter((q) => q.status === 'open').map((q) => q.id);
const PAIRS: { mode: Mode; shape: Shape }[] = MODES.flatMap((m) => (shapeChoice(m.mode)
  ? SHAPES.map((s) => ({ mode: m.mode, shape: s.shape })) : [{ mode: m.mode, shape: STEP_BACKWATER_SHAPE }]));
const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

const model = limitsModel(data);
const view = limitsView(model);
const text = textOf(view);

describe('the limits page data', () => {
  it('has every haunting of the file, with its title, cases, printed, exact answer and difference', () => {
    expect(model.hauntings.map((h) => h.id)).toEqual(headingIds);
    for (const h of model.hauntings) {
      const block = textOf(findAll(view, (n) => n.attrs.id === `haunting-${h.id}`)[0]!);
      for (const part of [h.title, h.caseText, h.printed, h.exactAnswer, h.difference]) expect(block, h.id).toContain(collapse(part));
    }
  });
  it('has every Limits entry by its Limits page paragraph, verbatim', () => {
    expect(model.limits.map((l) => l.title)).toEqual(limitTitles);
    for (const l of model.limits) {
      expect(read('hauntings.md').replace(/\s+/g, ' ')).toContain(collapse(l.paragraph));
      expect(text).toContain(collapse(l.paragraph));
    }
  });
  it('has every pair isBuilt calls not built, with the sentence of criterion 7.3', () => {
    const expected = PAIRS.filter((p) => !isBuilt(p.mode, p.shape));
    expect(expected.length).toBeGreaterThan(0);
    expect(model.notBuilt.map((p) => `${p.mode}/${p.shape}`)).toEqual(expected.map((p) => `${p.mode}/${p.shape}`));
    for (const p of expected) for (const s of notBuiltModel(p.mode, p.shape).sentences) expect(text).toContain(collapse(s));
  });
  it('has every open question, its plain sentences before the ledger id and wording, under the not-observed heading', () => {
    expect(model.openQuestions.map((q) => q.id)).toEqual(openIds);
    const section = findAll(view, (n) => n.attrs.id === 'not-observed')[0]!;
    expect(textOf(section)).toContain(NOT_OBSERVED_HEADING);
    for (const q of model.openQuestions) {
      expect(q.plain, q.id).toBeTruthy();
      const block = textOf(findAll(section, (n) => n.attrs.id === `question-${q.id}`)[0]!);
      const plainAt = block.indexOf(collapse(q.plain!));
      const wordingAt = block.indexOf(LEDGER_WORDING);
      expect(plainAt, q.id).toBeGreaterThanOrEqual(0);
      expect(wordingAt, q.id).toBeGreaterThan(plainAt);
      expect(block.indexOf(`${q.id}`, wordingAt), q.id).toBeGreaterThan(wordingAt);
      expect(block.indexOf(collapse(q.question), wordingAt), q.id).toBeGreaterThan(wordingAt);
    }
  });
  it('fails when an entry of the real files is missing from it', () => {
    const short = limitsModel({ ...data, hauntings: data.hauntings.slice(1), limits: data.limits.slice(1), openQuestions: data.openQuestions.slice(1) });
    expect(short.hauntings.map((h) => h.id)).not.toEqual(headingIds);
    expect(short.limits.map((l) => l.title)).not.toEqual(limitTitles);
    expect(short.openQuestions.map((q) => q.id)).not.toEqual(openIds);
  });
});
