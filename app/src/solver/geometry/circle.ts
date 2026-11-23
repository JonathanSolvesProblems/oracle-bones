// The circle (design: Circle geometry). D (ft) = Diameter (in) / 12. With x = (D/2 − y)/(D/2),
// the wetted angle is θ = 2·(π/2 − ATN(x/√(1 − x²))) with π = 3.1416, an arc cosine written
// the way QuickBASIC, which has no ACOS, computes one. A = (D/2)²·(θ − sin θ)/2, P = (D/2)·θ,
// T = 2·√(y·(D − y)).
//
// A depth at or past the crown, or at or below the invert, has no angle by this formula (x/√(1−x²)
// divides by zero or takes the root of a negative number); the caller decides what that means.

import { INCHES_PER_FOOT, PI_QUICK2 } from '../constants.ts';
import { store } from '../single.ts';
import type { Section } from './prismatic.ts';

/** The pipe's diameter in feet, stored as QUICK-2 would store it. */
export function diameterFeet(diameterInches: number): number {
  return store(diameterInches / INCHES_PER_FOOT);
}

/** Area, wetted perimeter and top width at depth y in a pipe of diameter D (ft), unstored. */
export function wetCircle(D: number, y: number): Section {
  const r = D / 2;
  const x = (r - y) / r;
  const theta = 2 * (PI_QUICK2 / 2 - Math.atan(x / Math.sqrt(1 - x * x)));
  return {
    area: (r * r * (theta - Math.sin(theta))) / 2,
    perimeter: r * theta,
    topWidth: 2 * Math.sqrt(y * (D - y)),
  };
}

/** The same quantities stored in single precision. */
export function wetCircleStored(D: number, y: number): Section {
  const w = wetCircle(D, y);
  return { area: store(w.area), perimeter: store(w.perimeter), topWidth: store(w.topWidth) };
}
