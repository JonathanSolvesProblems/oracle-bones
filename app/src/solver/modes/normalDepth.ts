// Normal Depth (design: Normal Depth, prismatic shapes).
//
// The search runs on Q(y) = 1.486/n · A · R^.667 · √S, from 0.5 ft in 0.5 ft steps. At the
// search's depth, Velocity = q/A (the entered discharge, not Manning's velocity) and
// Froude = (q/A)/√(g·A/T).

import { EXP_A, G, MANNING_K, PRISMATIC_STEP } from '../constants.ts';
import { ND_TRAPEZOID_PROMPTS } from '../forms.ts';
import { wet, wetStored, type Prism } from '../geometry/prismatic.ts';
import { heldAsZero, readSingle } from '../parse.ts';
import { search } from '../search.ts';
import { store } from '../single.ts';
import { failed, rejected, type Result } from '../types.ts';
import { ND_TRAP_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';

/** Read the prompts in order; the first that holds ends the form. */
function readForm(prompts: readonly string[], inputs: Readonly<Record<string, string>>):
  { values: Record<string, number> } | { held: string } {
  const values: Record<string, number> = {};
  for (const p of prompts) {
    const v = readSingle(inputs[p] ?? '');
    if (heldAsZero(v)) return { held: p };
    values[p] = v;
  }
  return { values };
}

/** Flow Type from Froude. Froude exactly 1 is unobserved; it prints SUPERCRITICAL here. */
export function flowType(froude: number): string {
  return froude < 1 ? 'SUBCRITICAL' : 'SUPERCRITICAL';
}

export function normalDepthTrapezoid(inputs: Readonly<Record<string, string>>): Result {
  const form = readForm(ND_TRAPEZOID_PROMPTS, inputs);
  if ('held' in form) return rejected(form.held);
  const v = form.values;
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
    in_left_slope: v.left_slope!, in_right_slope: v.right_slope!, in_bottom_width: v.bottom_width!,
    in_n: n, in_discharge: q, in_slope: s,
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
