// Normal Depth (design: Normal Depth, prismatic shapes).
//
// The search runs on Q(y) = 1.486/n · A · R^.667 · √S, from 0.5 ft in 0.5 ft steps. At the
// search's depth, Velocity = q/A (the entered discharge, not Manning's velocity) and
// Froude = (q/A)/√(g·A/T).

import { EXP_A, G, MANNING_K, PRISMATIC_STEP } from '../constants.ts';
import { echoes } from '../forms.ts';
import { wet, wetStored, type Prism } from '../geometry/prismatic.ts';
import { search } from '../search.ts';
import { store } from '../single.ts';
import { failed, type Result } from '../types.ts';
import { ND_TRAP_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';

/** Flow Type from Froude. Froude exactly 1 is unobserved; it prints SUPERCRITICAL here. */
export function flowType(froude: number): string {
  return froude < 1 ? 'SUBCRITICAL' : 'SUPERCRITICAL';
}

/** Normal Depth on the trapezoid, from the form's read values (holds already applied). */
export function normalDepthTrapezoid(v: Readonly<Record<string, number>>): Result {
  const prism: Prism = { z1: v.left_slope!, z2: v.right_slope!, b: v.bottom_width! };
  const n = v.n!;
  const q = v.discharge!;
  const s = v.slope!;
  const k = (MANNING_K / n) * Math.sqrt(s);
  const Q = (y: number) => {
    const w = wet(prism, y);
    return k * w.area * Math.pow(w.area / w.perimeter, EXP_A);
  };
  const found = search(Q, q, { bottom: 0, first: PRISMATIC_STEP, step: PRISMATIC_STEP });
  if (!found.ok) return failed(null);
  const y = found.y;
  const w = wetStored(prism, y);
  const r = store(w.area / w.perimeter);
  const vel = store(q / w.area);
  const fr = store(vel / Math.sqrt((G * w.area) / w.topWidth));
  const values = {
    ...echoes(v),
    depth: y, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, flow_type: flowType(fr),
  };
  return {
    outcome: 'result',
    printed: printed(ND_TRAP_RESULT, values),
    message: null,
    held: null,
    flags: [],
    raw: { depth: y, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, search_discharge: found.value },
  };
}
