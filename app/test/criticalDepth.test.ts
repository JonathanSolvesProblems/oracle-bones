// Critical Depth on the V-ditch, rectangle and trapezoid: Property 1, and the entered slope
// changing nothing but its echo.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { readRegularForm } from '../src/solver/forms.ts';
import { criticalDischarge } from '../src/solver/modes/criticalDepth.ts';
import { prismOf } from '../src/solver/modes/normalDepth.ts';
import type { RegularShape } from '../src/solver/types.ts';

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

describe('Property 1, prismatic Critical Depth', () => {
  it('the search stops within 1% of the discharge', () => {
    fc.assert(fc.property(prismaticArb, ({ shape, ...inputs }) => {
      const r = solve({ mode: 'critical_depth', shape, inputs });
      // A narrow channel can need a depth past the rebuild's 100,000 ft limit.
      fc.pre(r.outcome === 'result');
      const read = readRegularForm('critical_depth', shape, inputs);
      if (!read.ok) throw new Error('held');
      const v = read.values;
      const got = Math.fround(criticalDischarge(prismOf(v))(r.raw.depth!));
      expect(Math.abs(got - v.discharge!)).toBeLessThanOrEqual(0.01 * v.discharge! * (1 + 1e-6));
    }), { numRuns: 300 });
  });
  it('the entered slope changes only its echo (criterion 5.1: used for nothing else)', () => {
    fc.assert(fc.property(prismaticArb, decimal(1, 99999, 4), ({ shape, ...inputs }, other) => {
      const a = solve({ mode: 'critical_depth', shape, inputs });
      const b = solve({ mode: 'critical_depth', shape, inputs: { ...inputs, slope: other } });
      fc.pre(a.outcome === 'result');
      const { in_slope: _a, ...restA } = a.printed;
      const { in_slope: _b, ...restB } = b.printed;
      expect(restB).toEqual(restA);
    }), { numRuns: 200 });
  });
});
