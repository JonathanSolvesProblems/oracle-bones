// Criterion 11.3 (2026-11-27): a practitioner who tried the live site found some of its terms
// unclear. The calculate page, the results, the print view and the proof page's rule and rows use
// a floodplain reviewer's words; QUICK-2's own labels stay as they are, and "haunting" is defined
// and used on the limits page only.
import { describe, expect, it } from 'vitest';
import { data } from 'virtual:quickened/data';
import type { Mode, Shape } from '../src/solver/index.ts';
import type { AppJob } from '../src/ui/job.ts';
import { METHOD_HEADING } from '../src/ui/method.ts';
import cases from '../src/ui/proof/cases.json' with { type: 'json' };
import { calculate } from '../src/ui/state.ts';
import { exampleJob } from '../src/ui/views/example.ts';
import { LINKS_HEADING, limitsNote } from '../src/ui/views/hauntings.ts';
import { notBuiltModel, notBuiltView } from '../src/ui/views/notBuilt.ts';
import { printModel, printView } from '../src/ui/views/print.ts';
import { proofModel, proofView, RULE_SENTENCE, STOPPED_ROW } from '../src/ui/views/proof.ts';
import { EXACT_HEADER, exactCaptionWords } from '../src/ui/views/results.ts';
import { screenView } from '../src/ui/views/screen.ts';
import { HELD_HEADING } from '../src/ui/views/states.ts';
import { findAll, textOf, type VNode } from '../src/ui/vnode.ts';
import { goldens } from './golden.ts';

/** Words of the repository, or of this project, that a floodplain reviewer would not use. */
const JARGON = /\bhauntings?\b|\bpairs?\b|held prompt|holds a prompt|\bgoldens?\b|\boracle\b|\bharness\b|\bledger\b|\bcomparator\b|behaviou?r case/i;

const jobOf = (g: { id?: string; mode: string; shape: string; inputs: Readonly<Record<string, string>> }): AppJob =>
  ({ mode: g.mode as Mode, shape: g.shape as Shape, inputs: { ...g.inputs }, origin: 'typed' });
const screen = (job: AppJob): VNode => screenView(job, calculate(job))!.node;
const all = goldens();
const byId = (id: string) => all.find((g) => g.id === id)!;
/** Sentences without QUICK-2's own messages, which are quoted as printed. */
const ours = (v: VNode): string => textOf(v);

describe('a floodplain reviewer\'s words on the calculate page and the results (criterion 11.3)', () => {
  it('the headings read as the practitioner would say them', () => {
    expect(METHOD_HEADING).toBe('How QUICK-2 computes this');
    expect(LINKS_HEADING).toBe('Where QUICK-2 differs from the exact answer');
    expect(EXACT_HEADER).toBe('Exact answer');
    expect(HELD_HEADING).toBe('QUICK-2 stopped at this input');
    expect(limitsNote('H-001')).toBe('Limits, note H-001');
  });

  it('the main example\'s result has the method under its new heading and no jargon', () => {
    const t = ours(screen(exampleJob('main_example')));
    expect(t).toContain(METHOD_HEADING);
    expect(t).not.toMatch(JARGON);
  });

  it('the cut-off example puts the exact answer beside the printed one, in plain words, linked as "Limits, note H-001"', () => {
    const v = screen(exampleJob('cutoff_example'));
    const t = ours(v);
    expect(t).not.toMatch(JARGON);
    expect(t).toContain(LINKS_HEADING);
    const caption = findAll(v, (n) => n.attrs.class === 'exact-caption')[0]!;
    expect(textOf(caption)).toContain('the hydraulically exact value');
    expect(textOf(caption)).toContain('shown beside the value QUICK-2 prints, which stays the answer');
    expect(findAll(caption, (n) => n.tag === 'a').map(textOf)).toEqual(['Limits, note H-001']);
    expect(findAll(v, (n) => n.tag === 'th').map(textOf)).toContain(EXACT_HEADER);
  });

  it('the print view of the cut-off example says the same in plain words', () => {
    const job = exampleJob('cutoff_example');
    const state = calculate(job);
    if (state.kind !== 'result') throw new Error('not a result');
    const t = textOf(printView(printModel(job, state, new Date(2026, 10, 27))));
    expect(t).not.toMatch(JARGON);
    expect(t).toContain(exactCaptionWords(state.exact!.assumption));
    expect(t).toContain('Limits, note H-001');
  });

  it('a stop at an input (Diameter 0) is headed "QUICK-2 stopped at this input"', () => {
    const t = ours(screen(jobOf(byId('nd-circ-000008'))));
    expect(t).toContain(HELD_HEADING);
    expect(t).not.toMatch(JARGON);
  });

  it('every recorded result and refusal on the regular shapes, and the circle\'s drawing note, read without jargon', () => {
    for (const g of all.filter((x) => x.outcome !== 'observed' && x.shape !== 'irregular')) {
      const node = screenView(jobOf(g), calculate(jobOf(g)));
      if (node) expect(ours(node.node), g.id).not.toMatch(JARGON);
    }
  });

  it('the not-built view says "mode and shape", not "pair"', () => {
    for (const [mode, shape] of [['critical_depth', 'irregular'], ['step_backwater', 'irregular']] as const) {
      const t = textOf(notBuiltView(notBuiltModel(mode, shape)));
      expect(t).not.toMatch(JARGON);
    }
  });
});

describe('the proof page\'s rule and rows (criterion 11.3)', () => {
  it('the rule, the row of the input QUICK-2 stopped at and every case\'s reason read without jargon', () => {
    expect(RULE_SENTENCE).not.toMatch(JARGON);
    expect(STOPPED_ROW).toBe('Input QUICK-2 stopped at');
    for (const c of cases) expect(c.reason, c.id).not.toMatch(JARGON);
    const ths = findAll(proofView(proofModel(data.proof, data.headline)), (n) => n.tag === 'th').map(textOf);
    expect(ths).toContain(STOPPED_ROW);
    expect(ths.some((x) => JARGON.test(x))).toBe(false);
  });
});
