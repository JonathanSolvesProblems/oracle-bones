// Critical Depth on the prismatic shapes: trapezoid, V-ditch and rectangle (design: Critical
// Depth, prismatic shapes).
//
// The search runs on the critical-flow discharge Qc(y) = A·√(g·A/T), g = 32.2, from 0.5 ft in
// 0.5 ft steps. At the search's depth: Velocity = √(g·A/T), Froude = Velocity/√(g·A/T) (it
// prints `1.0`, criterion 5.1), Flow Type CRITICAL, and Critical Slope
// = ((q/A)·n / (1.486·R^.667))². The entered slope is echoed and used for nothing else.

import { EXP_A, G, MANNING_K, PRISMATIC_STEP } from '../constants.ts';
import { echoes } from '../forms.ts';
import { flag } from '../flags.ts';
import { wet, wetStored, type Prism } from '../geometry/prismatic.ts';
import { search } from '../search.ts';
import { store } from '../single.ts';
import { failed, type RegularShape, type Result } from '../types.ts';
import { REGULAR_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';
import { negativeFlags, prismOf } from './normalDepth.ts';

export const CRITICAL = 'CRITICAL';

/** The search's function for Critical Depth on a prism: Qc(y) = A·√(g·A/T). */
export function criticalDischarge(prism: Prism): (y: number) => number {
  return (y: number) => {
    const w = wet(prism, y);
    return w.area * Math.sqrt((G * w.area) / w.topWidth);
  };
}

/** Critical Slope: the slope at which the discharge flows at this depth, with R^.667. */
export function criticalSlope(q: number, area: number, r: number, n: number): number {
  return store(Math.pow(((q / area) * n) / (MANNING_K * Math.pow(r, EXP_A)), 2));
}

/** Critical Depth on a prismatic shape, from the form's read values (holds already applied). */
export function criticalDepthPrismatic(shape: RegularShape, v: Readonly<Record<string, number>>): Result {
  const prism = prismOf(v);
  const n = v.n!;
  const q = v.discharge!;
  const flags = negativeFlags(v);
  const found = search(criticalDischarge(prism), q, { bottom: 0, first: PRISMATIC_STEP, step: PRISMATIC_STEP });
  if (!found.ok) {
    const code = found.reason === 'never_finishes' ? 'never_finishes' : 'returns_to_menu';
    return failed(null, [...flags, flag(code)]);
  }
  const y = found.y;
  const w = wetStored(prism, y);
  const r = store(w.area / w.perimeter);
  const celerity = Math.sqrt((G * w.area) / w.topWidth);
  const vel = store(celerity);
  const fr = store(vel / celerity);
  const sc = criticalSlope(q, w.area, r, n);
  const values = {
    ...echoes(v),
    depth: y, critical_slope: sc, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, flow_type: CRITICAL,
  };
  return {
    outcome: 'result',
    printed: printed(REGULAR_RESULT.critical_depth[shape], values),
    message: null,
    held: null,
    flags,
    raw: { depth: y, critical_slope: sc, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, search_discharge: found.value },
  };
}
