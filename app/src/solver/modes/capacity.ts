// Channel Capacity on the prismatic shapes: trapezoid, V-ditch and rectangle (design: Channel
// Capacity).
//
// At the entered depth: Q = 1.486/n · A · R^.6667 · √S, printed with no decimals. Velocity is
// 1.486/n · R^.667 · √S, Manning's velocity with the other spelling of 2/3, which is not Q/A.
// Froude = V/√(g·A/T). Flow Type is SUBCRITICAL below Froude 1 and SUPERCRITICAL above.
//
// A negative value is used as typed: n of -1 prints a negative discharge (design: Negative
// values and abandoned calculations). A negative Depth or Slope has not been tried in Channel Capacity; where it would
// take the root or fractional power of a negative number the rebuild answers outcome `error`
// with message `not observed` instead of guessing what QUICK-2 shows.

import { EXP_A, EXP_B, G, MANNING_K, MAX_DISCHARGE_DEPTH } from '../constants.ts';
import { echoes } from '../forms.ts';
import { diameterFeet, wetCircleStored } from '../geometry/circle.ts';
import { wetStored } from '../geometry/prismatic.ts';

// The circle's discharge uses .6667, where the prismatic shapes use .667: with .667, 9 of the
// 10 Channel Capacity circles miss on Discharge (task 3.5).
const CIRCLE_CC_EXP = EXP_B;
import { store } from '../single.ts';
import { failed, type RegularShape, type Result } from '../types.ts';
import { REGULAR_RESULT } from '../../format/layout.ts';
import { printed } from '../../format/screen.ts';
import { flowType, negativeFlags, prismOf } from './normalDepth.ts';

export const NOT_OBSERVED = 'not observed';

/**
 * Max Discharge of a pipe: 1.486/n · A · R^.6667 · √S at .938·D, the peak of the part-full
 * curve (design: Circle). Channel Capacity and Normal Depth pass the entered slope, Critical
 * Depth its critical slope.
 */
export function maxDischarge(D: number, n: number, s: number): number {
  const w = wetCircleStored(D, store(MAX_DISCHARGE_DEPTH * D));
  const r = store(w.area / w.perimeter);
  return store((MANNING_K / n) * w.area * Math.pow(r, EXP_B) * store(Math.sqrt(s)));
}

/** Channel Capacity on the circle: discharge with one decimal, Velocity = Q/A (criterion 6.2). */
export function capacityCircle(v: Readonly<Record<string, number>>): Result {
  const D = diameterFeet(v.diameter!);
  const n = v.n!;
  const y = v.depth!;
  const s = v.slope!;
  const flags = negativeFlags(v);
  const w = wetCircleStored(D, y);
  const r = store(w.area / w.perimeter);
  const q = store((MANNING_K / n) * w.area * Math.pow(r, CIRCLE_CC_EXP) * store(Math.sqrt(s)));
  const vel = store(q / w.area);
  const fr = store(vel / Math.sqrt((G * w.area) / w.topWidth));
  const qmax = maxDischarge(D, n, s);
  if ([q, vel, fr, qmax].some(Number.isNaN)) return failed(NOT_OBSERVED, flags);
  const values = {
    ...echoes(v),
    discharge: q, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, max_discharge: qmax, flow_type: flowType(fr),
  };
  return {
    outcome: 'result',
    printed: printed(REGULAR_RESULT.channel_capacity.circle, values),
    message: null,
    held: null,
    flags,
    raw: { discharge: q, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr, max_discharge: qmax },
  };
}

/** Channel Capacity on a prismatic shape, from the form's read values (holds already applied). */
export function capacityPrismatic(shape: RegularShape, v: Readonly<Record<string, number>>): Result {
  const prism = prismOf(v);
  const n = v.n!;
  const y = v.depth!;
  const s = v.slope!;
  const flags = negativeFlags(v);
  const w = wetStored(prism, y);
  const r = store(w.area / w.perimeter);
  // √S is held in single precision, as QuickBASIC's SQR returns it for a single argument. The
  // velocity of one golden sits on a rounding boundary that only this store explains.
  const k = (MANNING_K / n) * store(Math.sqrt(s));
  const q = store(k * w.area * Math.pow(r, EXP_A));
  const vel = store(k * Math.pow(r, EXP_A));
  const fr = store(vel / Math.sqrt((G * w.area) / w.topWidth));
  if ([q, vel, fr].some(Number.isNaN)) return failed(NOT_OBSERVED, flags);
  const values = {
    ...echoes(v),
    discharge: q, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r,
    top_width: w.topWidth, froude: fr, flow_type: flowType(fr),
  };
  return {
    outcome: 'result',
    printed: printed(REGULAR_RESULT.channel_capacity[shape], values),
    message: null,
    held: null,
    flags,
    raw: { discharge: q, area: w.area, wet_perimeter: w.perimeter, velocity: vel, hyd_radius: r, top_width: w.topWidth, froude: fr },
  };
}
