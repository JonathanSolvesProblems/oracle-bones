// The circle: Property 6, the ceiling at the diameter, and Max Discharge's slope by mode.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { DEPTH_ABOVE_DIAMETER } from '../src/solver/modes/circle.ts';
import { golden } from './golden.ts';

const decimal = (lo: number, hi: number, d: number) => fc.integer({ min: lo, max: hi }).map((x) => (x / 10 ** d).toFixed(d));
const pipeArb = fc.record({
  diameter: decimal(60, 99999, 1),
  n: decimal(80, 400, 4),
  discharge: fc.integer({ min: 1, max: 999999 }).map(String),
  slope: decimal(1, 99999, 4),
});

describe('Property 6: Critical Depth on a circle ignores the slope', () => {
  it('changing the slope changes only the Slope echo', () => {
    fc.assert(fc.property(pipeArb, decimal(1, 99999, 4), (inputs, other) => {
      const a = solve({ mode: 'critical_depth', shape: 'circle', inputs });
      const b = solve({ mode: 'critical_depth', shape: 'circle', inputs: { ...inputs, slope: other } });
      expect(b.outcome).toBe(a.outcome);
      expect(b.message).toBe(a.message);
      const { in_slope: _a, ...restA } = a.printed;
      const { in_slope: _b, ...restB } = b.printed;
      expect(restB).toEqual(restA);
    }), { numRuns: 200 });
  });
  it('holds on the recorded pair (cd-circ-000001 at .005, cd-circ-000002 at .001)', () => {
    const a = solve({ mode: 'critical_depth', shape: 'circle', inputs: golden('cd-circ-000001').inputs });
    const b = solve({ mode: 'critical_depth', shape: 'circle', inputs: golden('cd-circ-000002').inputs });
    expect(b.printed.max_discharge).toBe(a.printed.max_discharge);
  });
});

describe('circle outcomes the comparator does not grade', () => {
  it('a discharge the pipe cannot carry passes the diameter and is rejected with the form message', () => {
    const r = solve({ mode: 'normal_depth', shape: 'circle', inputs: { diameter: '12', n: '.013', discharge: '1000', slope: '.005' } });
    expect(r).toMatchObject({ outcome: 'rejected', message: DEPTH_ABOVE_DIAMETER, printed: {}, held: null });
  });
  it('Max Discharge uses the entered slope in Normal Depth and Channel Capacity (51 for the 36 in pipe)', () => {
    for (const id of ['nd-circ-000001', 'cc-circ-000001']) {
      const g = golden(id);
      expect(solve({ mode: g.mode as 'normal_depth', shape: 'circle', inputs: g.inputs }).printed.max_discharge, id).toBe(g.printed.max_discharge);
    }
  });
});
