// Normal Depth on the prismatic shapes: trapezoid, V-ditch and rectangle (design: Normal
// Depth, prismatic shapes).
//
// The search runs on Q(y) = 1.486/n · A · R^.667 · √S, from 0.5 ft in 0.5 ft steps. At the
// search's depth, Velocity = q/A (the entered discharge, not Manning's velocity) and
// Froude = (q/A)/√(g·A/T).
//
// Negative values are used as typed (criteria 2.5 to 2.7) and raise `negative_input`. QUICK-2
// never finishes with n of -1 (criterion 2.8): every trial discharge is negative. With Discharge
// or Slope of -1 it returns to the shape menu with no message (criteria 2.9, 2.10); the search
// meets the square root or fractional power of a negative number, which the rebuild sees as
// NaN. That mechanism is the design's inference.

import { EXP_A, G, MANNING_K, PRISMATIC_STEP } from '../constants.ts';
import { echoes } from '../forms.ts';
import { flag } from '../flags.ts';
import { wet, wetStored, type Prism } from '../geometry/prismatic.ts';
import { search } from '../search.ts';
import { store } from '../single.ts';
import { failed, type Flag, type RegularShape, type Result } from '../types.ts';
import { REGULAR_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';

/** Flow Type from Froude. Froude exactly 1 is unobserved; it prints SUPERCRITICAL here. */
export function flowType(froude: number): string {
  return froude < 1 ? 'SUBCRITICAL' : 'SUPERCRITICAL';
}

/** Inputs whose negative value QUICK-2 accepts and computes with (criterion 2.1). */
const SIGNED_INPUTS = ['left_slope', 'right_slope', 'bottom_width', 'diameter', 'n', 'discharge', 'depth', 'slope'];

/** `negative_input` for every accepted input below 0, naming its echo fields. */
export function negativeFlags(v: Readonly<Record<string, number>>): Flag[] {
  const fields = SIGNED_INPUTS.filter((k) => (v[k] ?? 0) < 0).map((k) => `in_${k}`);
  return fields.length ? [flag('negative_input', fields)] : [];
}

/** The prism of a prismatic form's read values (fixed fields included). */
export function prismOf(v: Readonly<Record<string, number>>): Prism {
  return { z1: v.left_slope!, z2: v.right_slope!, b: v.bottom_width! };
}

/** The search's discharge function on a prism: Q(y) = 1.486/n · A · R^.667 · √S. */
export function normalDischarge(prism: Prism, n: number, s: number): (y: number) => number {
  const k = (MANNING_K / n) * Math.sqrt(s);
  return (y: number) => {
    const w = wet(prism, y);
    return k * w.area * Math.pow(w.area / w.perimeter, EXP_A);
  };
}

/** Normal Depth on a prismatic shape, from the form's read values (holds already applied). */
export function normalDepthPrismatic(shape: RegularShape, v: Readonly<Record<string, number>>): Result {
  const prism = prismOf(v);
  const n = v.n!;
  const q = v.discharge!;
  const s = v.slope!;
  const flags = negativeFlags(v);
  const found = search(normalDischarge(prism, n, s), q, { bottom: 0, first: PRISMATIC_STEP, step: PRISMATIC_STEP });
  if (!found.ok) {
    const code = found.reason === 'never_finishes' ? 'never_finishes' : 'returns_to_menu';
    return failed(null, [...flags, flag(code)]);
  }
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
    printed: printed(REGULAR_RESULT.normal_depth[shape], values),
    message: null,
    held: null,
    flags,
    raw: { depth: y, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, search_discharge: found.value },
  };
}
