import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { flowAt } from '../src/solver/geometry/irregular.ts';
import { readIrregular } from '../src/solver/modes/normalDepthIrregular.ts';
import { readSingle } from '../src/solver/parse.ts';
import { golden } from './golden.ts';

describe('Normal Depth, irregular: outcomes the comparator does not grade', () => {
  it('a RIGHT bank that matches no station gives the ERROR line as the message (nd-irr-000009)', () => {
    const g = golden('nd-irr-000009');
    const r = solve({ mode: 'normal_depth', shape: 'irregular', inputs: g.inputs });
    expect(r.outcome).toBe('rejected');
    expect(r.message).toBe(g.message);
    expect(r.held).toBe(g.held_prompt ?? null);
  });
  it('a one-point section never finishes (nd-irr-000026)', () => {
    const g = golden('nd-irr-000026');
    const r = solve({ mode: 'normal_depth', shape: 'irregular', inputs: g.inputs });
    expect(r.outcome).toBe('error');
    expect(r.message).toBe(g.message);
    expect(r.flags.map((f) => f.code)).toEqual(['never_finishes']);
  });
});

// Property 1 for irregular sections: the search's own discharge at the returned elevation is
// within 1% of the entered discharge.
const typed = (x: number, d: number) => x.toFixed(d);
const sectionArb = fc.record({
  gaps: fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 2, maxLength: 39 }),
  elevs: fc.array(fc.integer({ min: 1, max: 5000 }), { minLength: 40, maxLength: 40 }),
  banks: fc.tuple(fc.nat(), fc.nat()),
  n: fc.tuple(fc.integer({ min: 110, max: 5000 }), fc.integer({ min: 110, max: 5000 }), fc.integer({ min: 110, max: 5000 })),
  q: fc.integer({ min: 1, max: 50000 }),
  slope: fc.integer({ min: 1, max: 500 }),
});

describe('Property 1, irregular sections', () => {
  it('the search stops within 1% of the discharge', () => {
    fc.assert(fc.property(sectionArb, (a) => {
      const inputs: Record<string, string> = {};
      let x = 0;
      const count = a.gaps.length + 1;
      for (let i = 0; i < count; i++) {
        const k = String(i + 1).padStart(2, '0');
        inputs[`sta_${k}`] = typed(x / 100, 2);
        inputs[`elev_${k}`] = typed(a.elevs[i]! / 100, 2);
        if (i < a.gaps.length) x += a.gaps[i]!;
      }
      const i1 = a.banks[0] % count;
      const i2 = i1 + (a.banks[1] % (count - i1));
      inputs.bank_left = inputs[`sta_${String(i1 + 1).padStart(2, '0')}`]!;
      inputs.bank_right = inputs[`sta_${String(i2 + 1).padStart(2, '0')}`]!;
      inputs.n_left = typed(a.n[0] / 10000, 4);
      inputs.n_channel = typed(a.n[1] / 10000, 4);
      inputs.n_right = typed(a.n[2] / 10000, 4);
      inputs.discharge = String(a.q);
      inputs.slope = typed(a.slope / 10000, 4);
      const r = solve({ mode: 'normal_depth', shape: 'irregular', inputs });
      fc.pre(r.outcome === 'result');
      const read = readIrregular(inputs);
      if (!read.ok) throw new Error('inputs did not read');
      const q = readSingle(inputs.discharge);
      const got = flowAt(read.value.section, r.raw.ws_elev!).conveyance * Math.sqrt(read.value.slope);
      expect(Math.abs(Math.fround(got) - q)).toBeLessThanOrEqual(0.01 * q * (1 + 1e-6));
    }), { numRuns: 200 });
  });
});
