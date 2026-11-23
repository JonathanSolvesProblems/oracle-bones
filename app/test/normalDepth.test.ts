// Normal Depth on the V-ditch, rectangle and trapezoid: what the comparator does not grade
// (flags, the outcomes of the behaviour cases), the honest attempt's reproduction of the shallow
// mismatches, and Property 1.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { readRegularForm } from '../src/solver/forms.ts';
import { normalDischarge, prismOf } from '../src/solver/modes/normalDepth.ts';
import type { RegularShape } from '../src/solver/types.ts';
import { golden } from './golden.ts';

const TRAP_PROMPTS = ['left_slope', 'right_slope', 'bottom_width', 'n', 'discharge', 'slope'];

/** The inputs of a behaviour case, read from its transcript (behaviour goldens store none). */
function typedInputs(id: string): Record<string, string> {
  const values: string[] = [];
  for (const t of golden(id).transcript) {
    if (t.expect !== 'nd_trap_form') continue;
    for (const m of t.keys.matchAll(/([^{]*)\{Enter\}/g)) values.push(m[1]!);
  }
  return Object.fromEntries(TRAP_PROMPTS.map((p, i) => [p, values[i]!]));
}

const codes = (r: { flags: { code: string }[] }) => r.flags.map((f) => f.code);

describe('Normal Depth, prismatic: outcomes and flags', () => {
  it('raises negative_input on the -1 side slopes and width (nd-trap-000003 to 000005)', () => {
    for (const [id, field] of [['nd-trap-000003', 'in_left_slope'], ['nd-trap-000004', 'in_right_slope'], ['nd-trap-000005', 'in_bottom_width']] as const) {
      const r = solve({ mode: 'normal_depth', shape: 'trapezoid', inputs: golden(id).inputs });
      expect(r.outcome, id).toBe('result');
      expect(r.flags, id).toEqual([expect.objectContaining({ code: 'negative_input', fields: [field] })]);
    }
  });
  it('raises nothing on the control cases', () => {
    for (const id of ['nd-trap-000001', 'nd-trap-000002', 'nd-vdit-000001', 'nd-rect-000001']) {
      const g = golden(id);
      expect(solve({ mode: 'normal_depth', shape: g.shape as RegularShape, inputs: g.inputs }).flags, id).toEqual([]);
    }
  });
  it('never finishes with n of -1 (obs-negnstall-000001)', () => {
    const inputs = typedInputs('obs-negnstall-000001');
    expect(inputs.n).toBe('-1');
    const r = solve({ mode: 'normal_depth', shape: 'trapezoid', inputs });
    expect(r).toMatchObject({ outcome: 'error', printed: {}, message: null });
    expect(codes(r)).toEqual(['negative_input', 'never_finishes']);
  });
  it('returns to the menu with Discharge -1 or Slope -1 (obs-negreturn-000001, -000002)', () => {
    for (const [id, field] of [['obs-negreturn-000001', 'discharge'], ['obs-negreturn-000002', 'slope']] as const) {
      const inputs = typedInputs(id);
      expect(inputs[field], id).toBe('-1');
      const r = solve({ mode: 'normal_depth', shape: 'trapezoid', inputs });
      expect(r, id).toMatchObject({ outcome: 'error', printed: {}, message: null });
      expect(codes(r), id).toEqual(['negative_input', 'returns_to_menu']);
    }
  });
});

// The honest attempt at the second interpolation step (results/attempts.md, A-001) reproduces
// the six shallow mismatches here. This is the attempt's reproduction, not a second grader: the
// comparator still grades every field.
describe('A-001: the shallow cases that need a second interpolation', () => {
  for (const id of ['nd-rect-000002', 'nd-rect-000004', 'nd-rect-000007', 'nd-rect-000026', 'nd-trap-000009', 'nd-trap-000014']) {
    it(`${id} prints the oracle's area`, () => {
      const g = golden(id);
      const r = solve({ mode: 'normal_depth', shape: g.shape as RegularShape, inputs: g.inputs });
      expect(r.printed.area).toBe(g.printed.area);
      expect(r.printed.depth).toBe(g.printed.depth);
    });
  }
});

// Property 1 for prismatic Normal Depth: the search's own discharge at the returned depth is
// within 1% of the entered discharge.
const decimal = (lo: number, hi: number, d: number) => fc.integer({ min: lo, max: hi }).map((x) => (x / 10 ** d).toFixed(d));
const prismaticArb = fc.record({
  shape: fc.constantFrom<RegularShape>('trapezoid', 'v_ditch', 'rectangle'),
  left_slope: decimal(1, 999, 1),
  right_slope: decimal(1, 999, 1),
  bottom_width: decimal(1, 99999, 1),
  n: decimal(100, 99999, 4),
  discharge: fc.integer({ min: 1, max: 999999 }).map(String),
  slope: decimal(1, 99999, 4),
});

describe('Property 1, prismatic Normal Depth', () => {
  it('the search stops within 1% of the discharge', () => {
    fc.assert(fc.property(prismaticArb, ({ shape, ...inputs }) => {
      const r = solve({ mode: 'normal_depth', shape, inputs });
      // A narrow channel can need a depth past the rebuild's 100,000 ft limit.
      fc.pre(r.outcome === 'result');
      const read = readRegularForm('normal_depth', shape, inputs);
      if (!read.ok) throw new Error('held');
      const v = read.values;
      const got = Math.fround(normalDischarge(prismOf(v), v.n!, v.slope!)(r.raw.depth!));
      expect(Math.abs(got - v.discharge!)).toBeLessThanOrEqual(0.01 * v.discharge! * (1 + 1e-6));
    }), { numRuns: 300 });
  });
});
