// Normal Depth and Critical Depth on the circle (design: Circle: Normal Depth, Critical Depth,
// Max Discharge). Channel Capacity on the circle is in capacity.ts.
//
// Both modes run the shared search with the circle's own start and step (CIRCLE_STEP, not
// settled) and the diameter as a ceiling: a trial past the diameter ends in outcome `rejected`
// with "DEPTH is Greater than the DIAMETER", the text QUICK-2 prints on the form (ledger Q-022;
// the profile has no screen for it yet, so no golden records it).
//
// Normal Depth searches on 1.486/n · A · R^.6667 · √S, which fits more circles than .667 does
// (A-003); Velocity = q/A. Critical Depth searches on A·√(g·A/T); Velocity = √(g·A/T), Flow Type
// CRITICAL, and Max Discharge at the critical slope instead of the entered one (criteria 5.6,
// 5.7). Channel Capacity and Normal Depth compute Max Discharge at the entered slope.

import { CIRCLE_STEP, EXP_B, G, MANNING_K } from '../constants.ts';
import { echoes } from '../forms.ts';
import { flag } from '../flags.ts';
import { diameterFeet, wetCircle, wetCircleStored } from '../geometry/circle.ts';
import { search, type SearchResult } from '../search.ts';
import { store } from '../single.ts';
import { failed, rejected, type Result } from '../types.ts';
import { REGULAR_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';
import { maxDischarge } from './capacity.ts';
import { CRITICAL, criticalSlope } from './criticalDepth.ts';
import { flowType, negativeFlags } from './normalDepth.ts';

export const DEPTH_ABOVE_DIAMETER = 'DEPTH is Greater than the DIAMETER';

/** The circle search's discharge function for Normal Depth. */
export function circleNormalDischarge(D: number, n: number, s: number): (y: number) => number {
  const k = (MANNING_K / n) * Math.sqrt(s);
  return (y: number) => {
    const w = wetCircle(D, y);
    return k * w.area * Math.pow(w.area / w.perimeter, EXP_B);
  };
}

/** The circle search's function for Critical Depth: A·√(g·A/T). */
export function circleCriticalDischarge(D: number): (y: number) => number {
  return (y: number) => {
    const w = wetCircle(D, y);
    return w.area * Math.sqrt((G * w.area) / w.topWidth);
  };
}

function searchCircle(F: (y: number) => number, q: number, D: number): SearchResult {
  return search(F, q, { bottom: 0, first: CIRCLE_STEP, step: CIRCLE_STEP, ceiling: D });
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
  const found = searchCircle(circleNormalDischarge(D, n, s), q, D);
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
  const found = searchCircle(circleCriticalDischarge(D), q, D);
  if (!found.ok) return notFound(found, v);
  const y = found.y;
  const w = wetCircleStored(D, y);
  const r = store(w.area / w.perimeter);
  const celerity = Math.sqrt((G * w.area) / w.topWidth);
  const vel = store(celerity);
  const fr = store(vel / celerity);
  const sc = criticalSlope(q, w.area, r, n);
  const qmax = maxDischarge(D, n, sc);
  const values = {
    ...echoes(v),
    depth: y, critical_slope: sc, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, max_discharge: qmax, flow_type: CRITICAL,
  };
  return {
    outcome: 'result',
    printed: printed(REGULAR_RESULT.critical_depth.circle, values),
    message: null,
    held: null,
    flags: negativeFlags(v),
    raw: { depth: y, critical_slope: sc, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, max_discharge: qmax, search_discharge: found.value },
  };
}
