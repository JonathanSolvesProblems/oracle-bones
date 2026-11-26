// Screen states (quickened-app criteria 6.1 to 6.6, 6.9, 1.2; design: Screen states).
// Property 2: every Result has exactly one state, the one the classification rule gives. And
// over every golden, classify gives the state the Result's outcome, held prompt and message
// call for, with the fallback reached by none.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { NOT_BUILT, type Flag, type FlagCode, type Mode, type Result, type Shape } from '../src/solver/index.ts';
import { FLAG_TEXT } from '../src/solver/flags.ts';
import { stationError } from '../src/solver/groundPoints.ts';
import type { AppJob } from '../src/ui/job.ts';
import { UNPLACED, calculate, classify, runJob, type ScreenState } from '../src/ui/state.ts';
import { goldens } from './golden.ts';

/** The classification rule of the design, in its order. */
function expectedKind(r: Result): ScreenState['kind'] {
  if (r.outcome === 'result') return 'result';
  if (r.outcome === 'rejected' && r.held !== null) return 'held';
  if (r.outcome === 'rejected' && r.message !== null) return 'rejected';
  if (r.outcome === 'error' && r.flags.length > 0) return 'stopped';
  if (r.outcome === 'error' && r.message === NOT_BUILT) return 'not_built';
  return 'failed';
}

const job = (mode: Mode = 'normal_depth', shape: Shape = 'irregular', inputs: Record<string, string> = {}): AppJob =>
  ({ mode, shape, inputs, origin: 'typed' });

const codes = Object.keys(FLAG_TEXT) as FlagCode[];
const flagArb: fc.Arbitrary<Flag> = fc.record({
  code: fc.constantFrom(...codes),
  fields: fc.subarray(['depth', 'area', 'top_width', 'ws_elev', 'discharge']),
}).map(({ code, fields }) => ({ code, text: FLAG_TEXT[code], fields }));
const resultArb: fc.Arbitrary<Result> = fc.record({
  outcome: fc.constantFrom('result' as const, 'rejected' as const, 'error' as const),
  printed: fc.constantFrom({}, { depth: '    1.25 ' }),
  message: fc.constantFrom(null, NOT_BUILT, 'DEPTH is Greater than the DIAMETER  ', stationError(35, 35), 'ground-point entry did not end'),
  held: fc.constantFrom(null, 'n', 'diameter'),
  flags: fc.array(flagArb, { maxLength: 3 }),
  raw: fc.constant({}),
});

describe('Property 2: every Result has exactly one state', () => {
  it('classify returns the state the rule gives, and only it', () => {
    fc.assert(fc.property(resultArb, (r) => {
      const s = classify(job(), r);
      expect(s.kind).toBe(expectedKind(r));
      if (s.kind !== 'idle' && s.kind !== 'invalid') expect(s.result).toBe(r);
      if (s.kind === 'held') { expect(s.prompt).toBe(r.held); expect(s.message).toBe(r.message); }
      if (s.kind === 'stopped') expect(s.flags).toEqual(r.flags);
      if (s.kind === 'failed') expect(s.message.length).toBeGreaterThan(0);
    }), { numRuns: 1000 });
  });

  it('a Result that fits no rule is failed, with a sentence that says so', () => {
    const s = classify(job(), { outcome: 'rejected', printed: {}, message: null, held: null, flags: [], raw: {} });
    expect(s.kind).toBe('failed');
    if (s.kind === 'failed') expect(s.message).toBe(UNPLACED);
  });

  it('a field that is not a plain decimal gives the invalid state, and no Result', () => {
    const s = calculate(job('normal_depth', 'trapezoid', { left_slope: '2', right_slope: '', bottom_width: 'x', n: '.035', discharge: '100', slope: '.001' }));
    expect(s).toEqual({ kind: 'invalid', fields: ['right_slope', 'bottom_width'] });
  });
});

describe('classify over every golden', () => {
  const compared = goldens().filter((g) => g.outcome !== 'observed');
  const states = compared.map((g) => {
    const j = job(g.mode as Mode, g.shape as Shape, g.inputs);
    const r = runJob(j);
    return { g, r, s: classify(j, r) };
  });

  it(`gives each of the ${compared.length} goldens the state its Result calls for, and never the fallback`, () => {
    for (const { g, r, s } of states) {
      expect(s.kind, g.id).toBe(expectedKind(r));
      if (s.kind === 'failed') expect(s.message, g.id).not.toBe(UNPLACED);
    }
  });

  it('where the solver\'s outcome is the golden\'s, the held prompt and message are the golden\'s', () => {
    let agree = 0;
    for (const { g, r, s } of states) {
      if (r.outcome !== g.outcome) continue;
      agree += 1;
      if (g.held_prompt) expect(s.kind === 'held' && s.prompt, g.id).toBe(g.held_prompt);
      if (g.outcome === 'rejected' && g.message) {
        expect(s.kind, g.id).toBe('rejected');
        // Shown trimmed (criterion 6.3); the comparator does not grade messages.
        if (s.kind === 'rejected') expect(s.result.message?.trim(), g.id).toBe(g.message.trim());
      }
      if (g.outcome === 'result') expect(s.kind, g.id).toBe('result');
    }
    expect(agree).toBeGreaterThan(0);
  });
});
