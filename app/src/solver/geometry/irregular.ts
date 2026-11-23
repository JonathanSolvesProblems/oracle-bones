// An irregular section (design: Normal Depth, irregular section).
//
// Water is confined between the first and last ground points as if each end rose as a
// vertical wall, and the walls add no perimeter (criterion 3.12). Every part of the section
// below the water surface is wet, connected to the channel or not (criterion 9.7). Ground
// between points is straight.
//
// The section splits at the bank stations into left overbank, channel and right overbank.
// Each overbank's conveyance is the sum of its ground segments' conveyances, each from that
// segment's own area and perimeter; the channel's is computed from its whole area and
// perimeter. K = 1.486/n · A · R^.6667.

import { EXP_B, MANNING_K } from '../constants.ts';
import type { GroundPoint } from '../groundPoints.ts';

export interface Wet { area: number; perimeter: number; topWidth: number; }

export interface Subsection extends Wet { conveyance: number; }

export interface IrregularSection {
  points: readonly Pick<GroundPoint, 'station' | 'elevation'>[];
  bankLeft: number;
  bankRight: number;
  nLeft: number;
  nChannel: number;
  nRight: number;
}

export interface IrregularFlow extends Wet {
  left: Subsection;
  channel: Subsection;
  right: Subsection;
  /** Total conveyance. */
  conveyance: number;
  /** The velocity-head coefficient α = (A²/K³) · Σ Ki³/Ai². */
  alpha: number;
  /** The wet spans along the section, left to right, as [start, end] stations. */
  spans: [number, number][];
}

const NONE: Wet = { area: 0, perimeter: 0, topWidth: 0 };

/** The wet part of the ground segment (x1, z1)-(x2, z2) between stations lo and hi below ws. */
export function wetSegment(x1: number, z1: number, x2: number, z2: number, ws: number, lo: number, hi: number):
  Wet & { from: number; to: number } | null {
  const a = Math.max(x1, lo);
  const b = Math.min(x2, hi);
  if (!(b > a)) return null;
  const z = (x: number) => z1 + ((z2 - z1) * (x - x1)) / (x2 - x1);
  const za = z(a);
  const zb = z(b);
  const d1 = ws - za;
  const d2 = ws - zb;
  if (d1 <= 0 && d2 <= 0) return null;
  if (d1 >= 0 && d2 >= 0) {
    const w = b - a;
    return { area: (w * (d1 + d2)) / 2, perimeter: Math.hypot(w, zb - za), topWidth: w, from: a, to: b };
  }
  // The water surface crosses the segment.
  const frac = d1 > 0 ? d1 / (d1 - d2) : d2 / (d2 - d1);
  const w = (b - a) * frac;
  const d = d1 > 0 ? d1 : d2;
  const from = d1 > 0 ? a : b - w;
  return { area: (w * d) / 2, perimeter: Math.hypot(w, d), topWidth: w, from, to: from + w };
}

function conveyanceOf(w: Wet, n: number): number {
  if (!(w.area > 0) || !(w.perimeter > 0)) return 0;
  return (MANNING_K / n) * w.area * Math.pow(w.area / w.perimeter, EXP_B);
}

function add(a: Wet, b: Wet): Wet {
  return { area: a.area + b.area, perimeter: a.perimeter + b.perimeter, topWidth: a.topWidth + b.topWidth };
}

/** Wet geometry, conveyance and α at water-surface elevation ws. */
export function flowAt(s: IrregularSection, ws: number): IrregularFlow {
  const pts = s.points;
  const first = pts[0]?.station ?? 0;
  const last = pts[pts.length - 1]?.station ?? 0;
  const parts: [number, number, number, boolean][] = [
    [first, s.bankLeft, s.nLeft, true],
    [s.bankLeft, s.bankRight, s.nChannel, false],
    [s.bankRight, last, s.nRight, true],
  ];
  const spans: [number, number][] = [];
  const subs = parts.map(([lo, hi, n, perSegment]) => {
    let total: Wet = NONE;
    let k = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      const w = wetSegment(p.station, p.elevation, q.station, q.elevation, ws, lo, hi);
      if (!w) continue;
      total = add(total, w);
      if (perSegment) k += conveyanceOf(w, n);
      const prev = spans[spans.length - 1];
      if (prev && w.from <= prev[1]) prev[1] = Math.max(prev[1], w.to);
      else spans.push([w.from, w.to]);
    }
    if (!perSegment) k = conveyanceOf(total, n);
    return { ...total, conveyance: k };
  }) as [Subsection, Subsection, Subsection];
  const [left, channel, right] = subs;
  const total = add(add(left, channel), right);
  const K = left.conveyance + channel.conveyance + right.conveyance;
  let sum = 0;
  for (const sub of subs) {
    if (sub.area > 0) sum += (sub.conveyance * sub.conveyance * sub.conveyance) / (sub.area * sub.area);
  }
  const alpha = K > 0 ? ((total.area * total.area) / (K * K * K)) * sum : 1;
  return { ...total, left, channel, right, conveyance: K, alpha, spans };
}
