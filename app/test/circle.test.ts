// The circle: Property 6, the ceiling at the diameter, and Max Discharge's slope by mode.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { DEPTH_ABOVE_DIAMETER } from '../src/solver/modes/circle.ts';
import { golden, goldens } from './golden.ts';

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

// ---- circle-outputs (.kiro/specs/circle-outputs) -------------------------------------------

type CircleMode = 'channel_capacity' | 'normal_depth' | 'critical_depth';

/** Fields where the rebuild's printed text differs from the golden's, as "field golden/rebuild". */
function fieldMisses(id: string): string[] {
  const g = golden(id);
  const r = solve({ mode: g.mode as CircleMode, shape: 'circle', inputs: g.inputs });
  return Object.keys(g.printed).filter((k) => g.printed[k] !== r.printed[k]).map((k) => `${k} ${g.printed[k]!.trim()}/${(r.printed[k] ?? '').trim()}`);
}

describe('circle-outputs: reproduction of bugfix.md 1.1 to 1.6', () => {
  for (const id of [
    'cc-circ-000027', 'cc-circ-000031', 'nd-circ-000007', 'nd-circ-000010', 'nd-circ-000016',
    'cd-circ-000010', 'cd-circ-000011', 'cd-circ-000013', 'cd-circ-000019', 'cd-circ-000030',
  ]) {
    it(`${id} prints every field as QUICK-2 printed it`, () => {
      expect(fieldMisses(id)).toEqual([]);
    });
  }
});

/** The design's known differences: the rebuild's expected printed value, field by field. */
const KNOWN_DIFFERENCES: Record<string, Record<string, string>> = {
  'cc-circ-000035': { max_discharge: '101166' }, // Q-028
  'nd-circ-000020': { velocity: '5.7', froude: '2.4' }, // Q-026
};

describe('circle-outputs: every circle result golden', () => {
  const results = goldens().filter((g) => g.shape === 'circle' && g.outcome === 'result');
  it('finds the 60 circle result goldens (the other 20 of the 80 circle goldens are holds)', () => {
    expect(results.length).toBe(60);
  });
  for (const g of results) {
    it(g.id, () => {
      const r = solve({ mode: g.mode as CircleMode, shape: 'circle', inputs: g.inputs });
      const known = KNOWN_DIFFERENCES[g.id] ?? {};
      for (const k of Object.keys(g.printed)) {
        if (k in known) expect(r.printed[k]?.trim(), `${g.id} ${k} (known difference)`).toBe(known[k]);
        else expect(r.printed[k], `${g.id} ${k}`).toBe(g.printed[k]);
      }
    });
  }
});
