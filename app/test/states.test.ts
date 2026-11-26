// Each screen state's view has its text (quickened-app criteria 1.2, 2.3, 6.2 to 6.7, 6.9;
// design: Screen states), and Property 2's view clause: the view of any state contains every
// flag sentence verbatim and the notice.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { NOT_BUILT, type Flag, type FlagCode, type Mode, type Result, type Shape } from '../src/solver/index.ts';
import { FLAG_TEXT } from '../src/solver/flags.ts';
import { screenLabel } from '../src/ui/forms.ts';
import type { AppJob } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { NOTICE } from '../src/ui/views/notice.ts';
import { HELD_SENTENCE, INVALID_SENTENCE, NO_RESULT, QUICK2_MESSAGE, QUICKENED_MESSAGE, stateModel, stateView } from '../src/ui/views/states.ts';
import { textOf } from '../src/ui/vnode.ts';
import { golden, goldens } from './golden.ts';

const job = (mode: Mode, shape: Shape, inputs: Record<string, string> = {}): AppJob => ({ mode, shape, inputs, origin: 'typed' });
const viewText = (j: AppJob, r: Result) => textOf(stateView(stateModel(j, classify(j, r))));
const flagOf = (code: FlagCode, fields: string[]): Flag => ({ code, text: FLAG_TEXT[code], fields });
const failedResult = (message: string | null, flags: Flag[] = []): Result => ({ outcome: 'error', printed: {}, message, held: null, flags, raw: {} });

describe('the screen states\' views', () => {
  it('held: the held prompt named by QUICK-2\'s label, with the sentence of 1.2, that field marked, no result', () => {
    const g = goldens().find((x) => x.outcome === 'rejected' && x.held_prompt === 'diameter' && x.mode === 'normal_depth')!;
    const j = job(g.mode as Mode, g.shape as Shape, g.inputs);
    const m = stateModel(j, classify(j, runJob(j)));
    expect(m.kind).toBe('held');
    expect(m.marked).toEqual(['diameter']);
    const text = textOf(stateView(m));
    expect(text).toContain(screenLabel(j.mode, j.shape, 'diameter')!);
    expect(text).toContain(HELD_SENTENCE);
    expect(text).toContain(NO_RESULT);
    expect(text).toContain(NOTICE);
  });

  it('a held prompt that carries a message shows both', () => {
    const j = job('normal_depth', 'circle');
    const text = viewText(j, { outcome: 'rejected', printed: {}, message: 'A MESSAGE  ', held: 'n', flags: [], raw: {} });
    expect(text).toContain(HELD_SENTENCE);
    expect(text).toContain(`${QUICK2_MESSAGE} “A MESSAGE”`);
  });

  it('rejected: QUICK-2\'s message, trimmed and otherwise as returned, labelled as QUICK-2\'s, no result', () => {
    const g = golden('nd-irr-000009');
    const j = job('normal_depth', 'irregular', g.inputs);
    const r = runJob(j);
    expect(r.outcome).toBe('rejected');
    const m = stateModel(j, classify(j, r));
    const text = textOf(stateView(m));
    expect(m.quick2Message).toBe(r.message!.trim());
    expect(text).toContain(`${QUICK2_MESSAGE} “${r.message!.trim()}”`);
    expect(text).toContain(NO_RESULT);
    expect(text).toContain(NOTICE);
  });

  it('stopped: each flag sentence verbatim, in the solver\'s order, its fields marked and named, no result', () => {
    const j = job('normal_depth', 'trapezoid');
    const flags = [flagOf('negative_input', ['discharge']), flagOf('never_finishes', [])];
    const m = stateModel(j, classify(j, failedResult(null, flags)));
    const text = textOf(stateView(m));
    expect(m.kind).toBe('stopped');
    const at = flags.map((f) => text.indexOf(f.text));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(m.marked).toEqual(['discharge']);
    expect(text).toContain(screenLabel('normal_depth', 'trapezoid', 'discharge')!);
    expect(text).toContain(NO_RESULT);
  });

  it('failed: the message labelled as Quickened\'s, no result', () => {
    const j = job('normal_depth', 'irregular');
    const text = viewText(j, failedResult('ground-point entry did not end'));
    expect(text).toContain(`${QUICKENED_MESSAGE} ground-point entry did not end`);
    expect(text).not.toContain(QUICK2_MESSAGE);
    expect(text).toContain(NO_RESULT);
  });

  it('invalid: the fields named by label and marked, the unobserved sentence, the notice', () => {
    const j = job('normal_depth', 'trapezoid');
    const m = stateModel(j, { kind: 'invalid', fields: ['n', 'slope'] });
    const text = textOf(stateView(m));
    expect(m.marked).toEqual(['n', 'slope']);
    expect(text).toContain(INVALID_SENTENCE);
    for (const f of ['n', 'slope']) expect(text).toContain(screenLabel('normal_depth', 'trapezoid', f)!);
    expect(text).toContain(NOTICE);
  });
});

describe('Property 2, the view: every flag sentence verbatim and the notice', () => {
  const codes = Object.keys(FLAG_TEXT) as FlagCode[];
  const flagArb = fc.record({ code: fc.constantFrom(...codes), fields: fc.subarray(['discharge', 'area', 'top_width']) })
    .map(({ code, fields }) => flagOf(code, fields));
  const resultArb: fc.Arbitrary<Result> = fc.record({
    outcome: fc.constantFrom('result' as const, 'rejected' as const, 'error' as const),
    printed: fc.constant({}),
    message: fc.constantFrom(null, NOT_BUILT, 'DEPTH is Greater than the DIAMETER  ', 'other'),
    held: fc.constantFrom(null, 'n'),
    flags: fc.array(flagArb, { maxLength: 3 }),
    raw: fc.constant({}),
  });

  it('for any Result', () => {
    fc.assert(fc.property(resultArb, fc.constantFrom<[Mode, Shape]>(['normal_depth', 'irregular'], ['critical_depth', 'circle'], ['step_backwater', 'irregular']), (r, [mode, shape]) => {
      const text = viewText(job(mode, shape), r);
      expect(text).toContain(NOTICE);
      for (const f of r.flags) expect(text).toContain(f.text);
    }), { numRuns: 500 });
  });
});
