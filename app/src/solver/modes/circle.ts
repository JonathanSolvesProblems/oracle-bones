// Normal Depth and Critical Depth on the circle (design: Circle: Normal Depth, Critical Depth,
// Max Discharge; .kiro/specs/circle-outputs). Channel Capacity on the circle is in capacity.ts.
//
// The search. Both modes run the shared search with the diameter as a ceiling: a trial past the
// diameter ends in outcome `rejected` with "DEPTH is Greater than the DIAMETER", the text QUICK-2
// prints on the form (ledger Q-022; the profile has no screen for it yet, so no golden records
// it). The circle's search stops on the first trial within 0.5% (CIRCLE_TOL; Q-025), takes the
// chord when no step is that close, and when the chord is still short takes the chord again on
// the narrowed bracket (afterShortChord 'narrow', Q-026 candidate N2; A-004, A-006).
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
// keeps y. No Critical Depth golden reaches the short-chord branch, so the narrow rule is
// unobserved there.
//
// Known differences, expected to miss (circle-outputs design, Known differences; the cases are
// named there, since case ids stay out of this source): one A-005 Normal Depth pipe prints
// Velocity 5.7 and Froude 2.4 where QUICK-2 printed 5.8 and 2.5, which no candidate of Q-026
// explains together with the other branch cases; one A-005 Max Discharge is in capacity.ts
// (Q-028). Q-026 and Q-028 are open.

import { CIRCLE_CD_DEPTH_OFFSET, CIRCLE_CD_STEP, CIRCLE_STEP, CIRCLE_TOL, EXP_B, G, MANNING_K } from '../constants.ts';
import { echoes } from '../forms.ts';
import { flag } from '../flags.ts';
import { diameterFeet, wetCircleStored } from '../geometry/circle.ts';
import { search, type SearchResult } from '../search.ts';
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

/** The circle's search: first trial and step `step`, the 0.5% stop, the narrowed chord. */
export function searchCircle(F: (y: number) => number, q: number, D: number, step: number): SearchResult {
  return search(F, q, { bottom: 0, first: step, step, ceiling: D, tol: CIRCLE_TOL, afterShortChord: 'narrow' });
}

function notFound(found: Extract<SearchResult, { ok: false }>, v: Readonly<Record<string, number>>): Result {
  const flags = negativeFlags(v);
  if (found.reason === 'past_ceiling') return { ...rejected(null, DEPTH_ABOVE_DIAMETER), flags };
  return failed(null, [...flags, flag(found.reason === 'never_finishes' ? 'never_finishes' : 'returns_to_menu')]);
}

export function normalDepthCircle(v: Readonly<Record<string, number>>): Result {
  const D = diameterFeet(v.diameter!);
  const n = v.n!;
  const q = v.discharge!;
  const s = v.slope!;
  const found = searchCircle(circleNormalDischarge(D, n, s), q, D, CIRCLE_STEP);
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
  const found = searchCircle(circleCriticalDischarge(D), q, D, CIRCLE_CD_STEP);
  if (!found.ok) return notFound(found, v);
  const y = found.y;
  const w = wetCircleStored(D, y);
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
