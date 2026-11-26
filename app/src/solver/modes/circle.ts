// Normal Depth and Critical Depth on the circle (design: Circle: Normal Depth, Critical Depth,
// Max Discharge; .kiro/specs/circle-outputs). Channel Capacity on the circle is in capacity.ts.
//
// The search. Both modes run the shared search with the diameter as a ceiling, with the spec
// `circleSearchSpec` gives each mode. A trial the ceiling rejects ends in outcome `rejected`
// with "DEPTH is Greater than the DIAMETER", the text QUICK-2 prints on the form (ledger Q-022,
// Q-033). The circle's search stops on the first trial within 0.5% (CIRCLE_TOL; Q-025) and
// takes the chord when no step is that close. The two modes differ after a short chord and at
// the ceiling:
// - Normal Depth takes the chord again on the narrowed bracket (afterShortChord 'narrow', Q-026
//   candidate N2, still open; A-004, A-006) and rejects a trial past the diameter (trial > D).
// - Critical Depth resumes stepping 0.2 ft above the short chord (afterShortChord 'resume', K1):
//   one pipe's Critical Slope, another's Depth and a third's Critical Slope, Velocity and Max
//   Discharge print as QUICK-2 printed them only with it, and the trials after the chord pass
//   the diameter where QUICK-2 printed the message (circle-short-chord 2.1 to 2.3; A-008 to
//   A-010, A-012, A-015, A-016 graded). It rejects a trial at or past the diameter, trial >= D
//   (rejectAtCeiling, 2.4): A-015's T1·D1·X2, one of 56 combinations that fit equally, picked
//   as the smallest change. A stepped trial equal to D is not given to A·√(g·A/T), where T is 0:
//   q is compared with the full-pipe number (ceilingValue, `fullPipeCriticalDischarge`, 2.6,
//   the person's reading, tested by A-018 graded). Within 0.5% the result is at D, printed from
//   the full pipe; more than 0.5% over it, the message; more than 0.5% under it, `error` with
//   `returns_to_menu` in a pipe with a stepped trial inside D, and the message in a pipe
//   without one. The ending under the number is what QUICK-2 was seen to do, every time, and is
//   described here, not explained: no mechanism for it is known (2.6 (c)).
// - Critical Depth's function has no value where QUICK-2's formula has none, x/√(1−x²) with
//   1 − x² <= 0, and returns NaN there. QuickBASIC stops on that run-time error, read as the
//   return to the shape menu: outcome `error` with `returns_to_menu` (2.7, the person's
//   decision). Under 2.4 and 2.6 only a chord so near 0 that x is 1 reaches it, for a discharge
//   under the floor of A·√(g·A/T).
//
// Normal Depth steps 0.1 ft from 0.1 ft (CIRCLE_STEP) on the Channel Capacity discharge,
// computed from stored geometry as Channel Capacity computes it: k = 1.486/n · store(√S),
// F(y) = k · A · store(A/P)^.6667 with A and P stored (Q-025 measured the stop against Channel
// Capacity's own discharge; .6667 fits more circles than .667, A-003). The 2215.5 in pipes stop
// on 49.00 and 49.10 by the 0.5% stop (Q-025), and three shallow pipes reach the short-chord
// branch (Q-026; A-004, A-006). Velocity = q/A.
//
// Critical Depth steps 0.2 ft from 0.2 ft (CIRCLE_CD_STEP) on A·√(g·A/T) from stored A and T
// (A-004 H5, fitted on the 15 Critical Depth circles recorded before A-005; the 11 held-out
// A-005 cases all printed as predicted, including three that separate 0.2 ft from 0.1 ft,
// A-006). Every field is computed at the search depth y: Velocity = q/A,
// Froude = Velocity/√(g·A/T), Critical Slope at q/A, and Max Discharge at the critical slope
// instead of the entered one (criteria 5.6, 5.7). Depth prints y − 0.01 ft
// (CIRCLE_CD_DEPTH_OFFSET; Q-024, Q-027, A-004 measurement 2), stored in single precision, so
// Depth and the other fields describe depths 0.01 ft apart (haunting H-004). `raw.search_depth`
// keeps y. A result at y = D takes its section from the full pipe: A = 3.1416·D²/4,
// P = 3.1416·D, T = D (2.6 (a); P is the assumption A-018 made).
//
// Known differences, expected to miss (circle-outputs design, Known differences; the cases are
// named there, since case ids stay out of this source): one A-005 Normal Depth pipe prints
// Velocity 5.7 and Froude 2.4 where QUICK-2 printed 5.8 and 2.5, which no candidate of Q-026
// explains together with the other branch cases; one A-005 Max Discharge is in capacity.ts
// (Q-028). Q-026 and Q-028 are open.

import { CIRCLE_CD_DEPTH_OFFSET, CIRCLE_CD_STEP, CIRCLE_STEP, CIRCLE_TOL, EXP_B, G, MANNING_K, PI_QUICK2 } from '../constants.ts';
import { echoes } from '../forms.ts';
import { flag } from '../flags.ts';
import { diameterFeet, wetCircleStored } from '../geometry/circle.ts';
import { search, type SearchResult, type SearchSpec } from '../search.ts';
import { store } from '../single.ts';
import { failed, rejected, type Result } from '../types.ts';
import { REGULAR_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';
import { maxDischarge } from './capacity.ts';
import { CRITICAL, criticalSlope } from './criticalDepth.ts';
import { flowType, negativeFlags } from './normalDepth.ts';

export const DEPTH_ABOVE_DIAMETER = 'DEPTH is Greater than the DIAMETER';

/** The circle search's discharge function for Normal Depth, from stored geometry and stored √S. */
export function circleNormalDischarge(D: number, n: number, s: number): (y: number) => number {
  const k = (MANNING_K / n) * store(Math.sqrt(s));
  return (y: number) => {
    const w = wetCircleStored(D, y);
    return k * w.area * Math.pow(store(w.area / w.perimeter), EXP_B);
  };
}

/** The circle search's function for Critical Depth: A·√(g·A/T), from stored A and T. */
export function circleCriticalDischarge(D: number): (y: number) => number {
  return (y: number) => {
    const w = wetCircleStored(D, y);
    return w.area * Math.sqrt((G * w.area) / w.topWidth);
  };
}

/**
 * The full-pipe number: A·√(g·A/T) for the full pipe, with A = store(3.1416·D²/4) and T = D,
 * computed without the circle formula (circle-short-chord 2.6, the person's reading).
 */
export function fullPipeCriticalDischarge(D: number): number {
  const r = D / 2;
  const area = store(PI_QUICK2 * r * r);
  return store(area * Math.sqrt((G * area) / D));
}

/** The full pipe's section: area store(3.1416·D²/4), perimeter store(3.1416·D), top width D. */
function fullPipe(D: number): { area: number; perimeter: number; topWidth: number } {
  const r = D / 2;
  return { area: store(PI_QUICK2 * r * r), perimeter: store(PI_QUICK2 * D), topWidth: D };
}

/**
 * The search spec each circle mode uses. Normal Depth: 0.1 ft steps from 0.1 ft, the narrowed
 * chord (N2) and trial > D. Critical Depth: 0.2 ft steps from 0.2 ft, stepping resumed after a
 * short chord (K1), trial >= D, and the full-pipe number at a stepped trial on D.
 */
export function circleSearchSpec(D: number, mode: 'normal_depth' | 'critical_depth'): SearchSpec {
  if (mode === 'normal_depth') {
    return { bottom: 0, first: CIRCLE_STEP, step: CIRCLE_STEP, ceiling: D, tol: CIRCLE_TOL, afterShortChord: 'narrow' };
  }
  return {
    bottom: 0, first: CIRCLE_CD_STEP, step: CIRCLE_CD_STEP, ceiling: D, tol: CIRCLE_TOL, afterShortChord: 'resume',
    rejectAtCeiling: true, ceilingValue: fullPipeCriticalDischarge(D),
  };
}

/**
 * The circle's search with the narrowed chord and trial > D, at a first trial and step `step`.
 * No mode calls it; scripts/q022_boundary.mts does, with A-007's 0.1 ft step.
 */
export function searchCircle(F: (y: number) => number, q: number, D: number, step: number): SearchResult {
  return search(F, q, { bottom: 0, first: step, step, ceiling: D, tol: CIRCLE_TOL, afterShortChord: 'narrow' });
}

/**
 * The outcome of a search that found no depth: `past_ceiling` is outcome `rejected` with the
 * form's message; `never_finishes` is `error` with that flag; every other reason is `error` with
 * `returns_to_menu`: `not_a_number`, a run-time error in QUICK-2's formula (2.7), and
 * `under_ceiling_value`, a discharge under the full-pipe number at a stepped trial on D
 * (2.6 (c)).
 */
function notFound(found: Extract<SearchResult, { ok: false }>, v: Readonly<Record<string, number>>): Result {
  const flags = negativeFlags(v);
  if (found.reason === 'past_ceiling') return { ...rejected(null, DEPTH_ABOVE_DIAMETER), flags };
  return failed(null, [...flags, flag(found.reason === 'never_finishes' ? 'never_finishes' : 'returns_to_menu')]);
}

/**
 * Critical Depth's function as the search meets it: NaN where QUICK-2's formula has no value,
 * 1 − x² <= 0 with r = D/2 and x = (r − y)/r computed as `wetCircle` computes them (2.7);
 * elsewhere A·√(g·A/T).
 */
function criticalDepthFunction(D: number): (y: number) => number {
  const F = circleCriticalDischarge(D);
  return (y: number) => {
    const r = D / 2;
    const x = (r - y) / r;
    return 1 - x * x <= 0 ? NaN : F(y);
  };
}

export function normalDepthCircle(v: Readonly<Record<string, number>>): Result {
  const D = diameterFeet(v.diameter!);
  const n = v.n!;
  const q = v.discharge!;
  const s = v.slope!;
  const found = search(circleNormalDischarge(D, n, s), q, circleSearchSpec(D, 'normal_depth'));
  if (!found.ok) return notFound(found, v);
  const y = found.y;
  const w = wetCircleStored(D, y);
  const r = store(w.area / w.perimeter);
  const vel = store(q / w.area);
  const fr = store(vel / Math.sqrt((G * w.area) / w.topWidth));
  const qmax = maxDischarge(D, n, s);
  const values = {
    ...echoes(v),
    depth: y, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, max_discharge: qmax, flow_type: flowType(fr),
  };
  return {
    outcome: 'result',
    printed: printed(REGULAR_RESULT.normal_depth.circle, values),
    message: null,
    held: null,
    flags: negativeFlags(v),
    raw: { depth: y, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, max_discharge: qmax, search_discharge: found.value },
  };
}

export function criticalDepthCircle(v: Readonly<Record<string, number>>): Result {
  const D = diameterFeet(v.diameter!);
  const n = v.n!;
  const q = v.discharge!;
  const found = search(criticalDepthFunction(D), q, circleSearchSpec(D, 'critical_depth'));
  if (!found.ok) return notFound(found, v);
  const y = found.y;
  const w = y === D ? fullPipe(D) : wetCircleStored(D, y);
  const r = store(w.area / w.perimeter);
  const vel = store(q / w.area);
  const fr = store(vel / Math.sqrt((G * w.area) / w.topWidth));
  const sc = criticalSlope(q, w.area, r, n);
  const qmax = maxDischarge(D, n, sc);
  const depth = store(y - CIRCLE_CD_DEPTH_OFFSET);
  const values = {
    ...echoes(v),
    depth, critical_slope: sc, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, max_discharge: qmax, flow_type: CRITICAL,
  };
  return {
    outcome: 'result',
    printed: printed(REGULAR_RESULT.critical_depth.circle, values),
    message: null,
    held: null,
    flags: negativeFlags(v),
    raw: { depth, search_depth: y, critical_slope: sc, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, max_discharge: qmax, search_discharge: found.value },
  };
}
