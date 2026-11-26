// The circle: Property 6, the ceiling at the diameter, and Max Discharge's slope by mode.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { solve } from '../src/solver/index.ts';
import { DEPTH_ABOVE_DIAMETER, circleCriticalDischarge, circleNormalDischarge, circleSearchSpec } from '../src/solver/modes/circle.ts';
import { diameterFeet, wetCircleStored } from '../src/solver/geometry/circle.ts';
import { readRegularForm } from '../src/solver/forms.ts';
import { readSingle } from '../src/solver/parse.ts';
import { search, type SearchSpec } from '../src/solver/search.ts';
import { CIRCLE_CD_STEP, CIRCLE_TOL } from '../src/solver/constants.ts';
import { store } from '../src/solver/single.ts';
import { FLAG_TEXT } from '../src/solver/flags.ts';
import type { Result } from '../src/solver/types.ts';
import { golden, goldens, type Golden } from './golden.ts';
import { readFileSync } from 'node:fs';
import { CIRCLE_SNAPSHOT_PATH, snapshotEntry, snapshotInputs, type CircleSnapshotEntry } from './circleSnapshot.ts';
import { HEADLINE_SEED, knownMissFields } from './knownMisses.ts';

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

/**
 * Pipes from the practical ranges (Diameter 8 to 180 in, n .008 to .033), slope from the accepted
 * range, and a discharge under the critical discharge at 0.9·D, as oracle/generator.py draws
 * Critical Depth circles.
 */
const practicalPipeArb = fc.record({
  diameter: decimal(80, 1800, 1),
  n: decimal(80, 330, 4),
  slope: decimal(1, 99999, 4),
  share: fc.double({ min: 0, max: 1, noNaN: true }),
}).map(({ share, ...rest }) => {
  const D = diameterFeet(Number(rest.diameter));
  const cap = circleCriticalDischarge(D)(0.9 * D);
  return { ...rest, discharge: String(Math.max(1, Math.floor(share * Math.min(cap, 999999)))) };
});

function circleValues(mode: CircleMode, inputs: Record<string, string>): Record<string, number> {
  const form = readRegularForm(mode, 'circle', inputs);
  if (!form.ok) throw new Error(`held at ${form.held}`);
  return form.values as Record<string, number>;
}

describe('Property 8: the circle search stops within 0.5%', () => {
  it('Normal Depth: the Channel Capacity discharge at the printed depth is within 0.5% of q', () => {
    let results = 0;
    fc.assert(fc.property(practicalPipeArb, (inputs) => {
      const r = solve({ mode: 'normal_depth', shape: 'circle', inputs });
      if (r.outcome !== 'result') return;
      results += 1;
      const v = circleValues('normal_depth', inputs);
      const value = Math.fround(circleNormalDischarge(diameterFeet(v.diameter!), v.n!, v.slope!)(r.raw!.depth!));
      expect(value).toBe(r.raw!.search_discharge);
      expect(Math.abs(value - v.discharge!)).toBeLessThanOrEqual(0.005 * v.discharge!);
    }), { numRuns: 200 });
    expect(results).toBeGreaterThan(100);
  }, 60000);
  it('Critical Depth: A·√(g·A/T) at the search depth is within 0.5% of q', () => {
    let results = 0;
    fc.assert(fc.property(practicalPipeArb, (inputs) => {
      const r = solve({ mode: 'critical_depth', shape: 'circle', inputs });
      if (r.outcome !== 'result') return;
      results += 1;
      const v = circleValues('critical_depth', inputs);
      const value = Math.fround(circleCriticalDischarge(diameterFeet(v.diameter!))(r.raw!.search_depth!));
      expect(value).toBe(r.raw!.search_discharge);
      expect(Math.abs(value - v.discharge!)).toBeLessThanOrEqual(0.005 * v.discharge!);
    }), { numRuns: 200 });
    // A few small pipes are rejected: the 0.2 ft grid passes the diameter before it brackets q.
    expect(results).toBeGreaterThan(150);
  }, 60000);
});

describe('Property 9: circle Critical Depth prints Depth one hundredth of a foot below its fields', () => {
  it('raw.depth = store(search depth − 0.01), and Area, Wet Perimeter and Top Width are at the search depth', () => {
    fc.assert(fc.property(practicalPipeArb, (inputs) => {
      const r = solve({ mode: 'critical_depth', shape: 'circle', inputs });
      if (r.outcome !== 'result') return;
      const y = r.raw!.search_depth!;
      expect(r.raw!.depth).toBe(Math.fround(y - 0.01));
      const w = wetCircleStored(diameterFeet(circleValues('critical_depth', inputs).diameter!), y);
      expect([r.raw!.area, r.raw!.wet_perimeter, r.raw!.top_width]).toEqual([w.area, w.perimeter, w.topWidth]);
    }), { numRuns: 200 });
  }, 60000);
});

describe('circle-outputs: every circle result golden', () => {
  const circle = goldens().filter((g) => g.shape === 'circle' && g.outcome !== 'observed');
  const results = circle.filter((g) => g.outcome === 'result');
  it('every circle golden is a result, a hold at a prompt or a rejection by the search with its message', () => {
    expect(results.length).toBeGreaterThan(0);
    const other = circle.filter((g) => g.outcome !== 'result'
      && !(g.outcome === 'rejected' && (g.held_prompt || g.message?.trim() === DEPTH_ABOVE_DIAMETER)));
    expect(other.map((g) => `${g.id} ${g.outcome}`)).toEqual([]);
  });
  for (const g of results) {
    it(g.id, () => {
      const r = solve({ mode: g.mode as CircleMode, shape: 'circle', inputs: g.inputs });
      // A field of a known miss (results/known-misses.json) must still differ: one that has
      // come to match fails here, as it fails oracle/tests/test_known_misses.py.
      const known = knownMissFields(g.id);
      for (const k of Object.keys(g.printed)) {
        if (known.includes(k)) expect(r.printed[k]?.trim(), `${g.id} ${k} (known miss)`).not.toBe(g.printed[k]!.trim());
        else expect(r.printed[k], `${g.id} ${k}`).toBe(g.printed[k]);
      }
    });
  }
});

// ---- circle-short-chord (.kiro/specs/circle-short-chord) -----------------------------------

/**
 * What the comparator reports for one golden (oracle/compare.py, compare_one): the outcome, and
 * when the outcomes agree every printed field, trimmed, with missing and extra fields.
 */
function comparatorMisses(g: Golden, r: Result): string[] {
  if (r.outcome !== g.outcome) return [`outcome ${g.outcome}/${r.outcome}${r.flags.length ? ` (${r.flags.map((f) => f.code).join(', ')})` : ''}`];
  const out: string[] = [];
  for (const k of Object.keys(g.printed).sort()) {
    if (!(k in r.printed)) out.push(`${k} missing`);
    else if (g.printed[k]!.trim() !== r.printed[k]!.trim()) out.push(`${k} ${g.printed[k]!.trim()}/${r.printed[k]!.trim()}`);
  }
  for (const k of Object.keys(r.printed).filter((x) => !(x in g.printed)).sort()) out.push(`${k} extra`);
  return out;
}

const solveCd = (inputs: Record<string, string>) => solve({ mode: 'critical_depth', shape: 'circle', inputs });

/** The 40 goldens of the design's table (Expected result) that change. */
const CSC_CHANGES = [
  'cd-circ-000033', 'cd-circ-000035', 'cd-circ-000036', 'cd-circ-000038',
  'cd-circ-000040', 'cd-circ-000043', 'cd-circ-000044',
  'cd-circ-000049', 'cd-circ-000050', 'cd-circ-000051', 'cd-circ-000052',
  'cd-circ-000057', 'cd-circ-000058', 'cd-circ-000064', 'cd-circ-000067', 'cd-circ-000070',
  'cd-circ-000045', 'cd-circ-000056', 'cd-circ-000060', 'cd-circ-000061', 'cd-circ-000062',
  'cd-circ-000071', 'cd-circ-000072', 'cd-circ-000073', 'cd-circ-000074', 'cd-circ-000075',
  'cd-circ-000076', 'cd-circ-000077', 'cd-circ-000078', 'cd-circ-000079',
  'cd-circ-000080',
  'cd-circ-000081', 'cd-circ-000082', 'cd-circ-000083', 'cd-circ-000085', 'cd-circ-000087',
  'cd-circ-000084', 'cd-circ-000086', 'cd-circ-000088', 'cd-circ-000089',
];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `cd-circ-${String(from + i).padStart(6, '0')}`);

/** The 43 rejection goldens that reach the search (bugfix.md 1.5, 2.4). */
const CSC_REJECTIONS = [
  ...range(39, 64), 'cd-circ-000066', 'cd-circ-000067', 'cd-circ-000069', ...range(71, 80),
  'cd-circ-000084', 'cd-circ-000086', 'cd-circ-000088', 'cd-circ-000089',
];

describe('circle-short-chord', () => {
  for (const id of CSC_CHANGES) {
    it(`${id} ends and prints as QUICK-2 did`, () => {
      const g = golden(id);
      expect(g.mode).toBe('critical_depth');
      expect(comparatorMisses(g, solveCd(g.inputs))).toEqual([]);
    });
  }
});

describe('circle-short-chord: the 43 rejection goldens', () => {
  for (const id of CSC_REJECTIONS) {
    it(`${id} is rejected with "${DEPTH_ABOVE_DIAMETER}" and no printed field`, () => {
      const g = golden(id);
      expect([g.mode, g.outcome, g.message?.trim(), g.printed]).toEqual(['critical_depth', 'rejected', DEPTH_ABOVE_DIAMETER, {}]);
      const r = solveCd(g.inputs);
      expect([r.outcome, r.message?.trim(), r.printed]).toEqual([g.outcome, g.message!.trim(), g.printed]);
    });
  }
});

/** The typed Diameter, n, Discharge and Slope of a behaviour case, from its transcript. */
function typedCdInputs(g: Golden): Record<string, string> {
  const typed = g.transcript.filter((s) => s.expect === 'cd_form').map((s) => s.keys.replace(/\{Enter\}$/, ''));
  if (typed.length !== 5 || typed[4] !== '') throw new Error(`${g.id}: the transcript does not type the four cd_form values`);
  return { diameter: typed[0]!, n: typed[1]!, discharge: typed[2]!, slope: typed[3]! };
}

describe('circle-short-chord: the behaviour cases that ended on the shape menu (2.6 (c), 2.7)', () => {
  const cases: [string, string][] = [
    ...['000001', '000002', '000005', '000006', '000007', '000008', '000009', '000010', '000011', '000012'].map((n): [string, string] => [`obs-cdmenu-${n}`, '2.6 (c)']),
    ...['000003', '000004', '000013'].map((n): [string, string] => [`obs-cdmenu-${n}`, 'the floor, 2.7']),
  ];
  for (const [id, why] of cases) {
    it(`${id} (${why}): no result, returns_to_menu, never never_finishes`, () => {
      const g = golden(id);
      expect([g.outcome, g.expected_screen, g.mode, g.shape]).toEqual(['observed', 'shape_menu', 'critical_depth', 'circle']);
      const r = solveCd(typedCdInputs(g));
      const codes = r.flags.map((f) => f.code);
      expect(codes, id).not.toContain('never_finishes');
      expect([r.outcome, r.printed, codes.includes('returns_to_menu')], id).toEqual(['error', {}, true]);
    });
  }
});

describe('circle-short-chord: the flag text (2.7)', () => {
  it('returns_to_menu says what QUICK-2 was seen to do', () => {
    expect(FLAG_TEXT.returns_to_menu).toBe('QUICK-2 returns to its shape menu with no result for this input.');
  });
});

/** The spec circle Critical Depth searches with: the object criticalDepthCircle uses. */
const cdSpec = (D: number): SearchSpec => circleSearchSpec(D, 'critical_depth');

/**
 * Diameters 2.4 to 180 in, half of them multiples of 2.4 in, where stepped trials land on D
 * (A-011); discharges log-uniform from 0.01 cfs to twice A·√(g·A/T) at 0.99·D (design:
 * Property 10).
 */
const property10Arb = fc.record({
  diameter: fc.oneof(
    fc.integer({ min: 1, max: 75 }).map((k) => String((24 * k) / 10)),
    fc.integer({ min: 24, max: 1800 }).map((i) => String(i / 10)),
  ),
  u: fc.double({ min: 0, max: 1, noNaN: true }),
}).map(({ diameter, u }) => {
  const D = diameterFeet(readSingle(diameter));
  const top2 = 2 * store(circleCriticalDischarge(D)(store(0.99 * D)));
  return { diameter, D, q: store(0.01 * Math.pow(top2 / 0.01, u)) };
});

/**
 * Whether stepping from the first trial reaches a trial equal to D before any trial passes q or
 * comes within 0.5% of it: a stepped trial on D, with no short chord before it.
 */
function reachesSteppedTrialOnD(D: number, q: number): boolean {
  const F = circleCriticalDischarge(D);
  for (let y = store(CIRCLE_CD_STEP); y <= D; y = store(y + CIRCLE_CD_STEP)) {
    if (y === D) return true;
    const fy = store(F(y));
    if (Math.abs(fy - q) <= CIRCLE_TOL * q || fy > q) return false;
  }
  return false;
}

describe('Property 11: circle Normal Depth and Channel Capacity are identical before and after circle-short-chord', () => {
  const { _note: note, ...snapshot } = JSON.parse(readFileSync(CIRCLE_SNAPSHOT_PATH, 'utf-8')) as Record<string, CircleSnapshotEntry> & { _note: string };
  // The headline batch's goldens were recorded after the fixture, so it does not hold them; the
  // comparator grades them (results/headline.md).
  const later = new Set(goldens().filter((g) => g.seed === HEADLINE_SEED).map((g) => g.id));
  const inputs = () => snapshotInputs().filter((c) => !later.has(c.key));
  it('the fixture says where it came from', () => {
    expect(note).toMatch(/at commit [0-9a-f]{7,}/);
  });
  it('the fixture holds the generated list and every circle Normal Depth and Channel Capacity golden before the headline batch, and nothing else', () => {
    expect(later.size).toBeGreaterThan(0);
    expect(Object.keys(snapshot).sort()).toEqual(inputs().map((c) => c.key).sort());
  });
  it('every recorded input returns the same Result', () => {
    const now = inputs().map((c) => ({ key: c.key, entry: snapshotEntry(c) }));
    const changed = now.filter((x) => JSON.stringify(x.entry) !== JSON.stringify(snapshot[x.key]));
    expect(changed.map((x) => x.key)).toEqual([]);
    for (const x of changed.slice(0, 1)) expect(x.entry, x.key).toEqual(snapshot[x.key]);
  }, 60000);
});

describe('Property 10: no depth at or past the diameter reaches the circle Critical Depth formula', () => {
  it('every depth given to A·√(g·A/T) is below D', () => {
    let draws = 0;
    let onD = 0;
    try {
      fc.assert(fc.property(property10Arb, ({ D, q }) => {
        draws += 1;
        if (reachesSteppedTrialOnD(D, q)) onD += 1;
        const F = circleCriticalDischarge(D);
        const atOrPast: number[] = [];
        search((y) => {
          if (y >= D) atOrPast.push(y);
          return F(y);
        }, q, cdSpec(D));
        expect(atOrPast, `D ${D} ft, q ${q} cfs`).toEqual([]);
      }), { numRuns: 200, endOnFailure: true });
    } finally {
      console.log(`Property 10: ${onD} of ${draws} draws reach a stepped trial on D`);
    }
  }, 60000);
});
