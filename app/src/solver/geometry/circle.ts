// The circle (design: Circle geometry; .kiro/specs/circle-outputs). D (ft) = Diameter (in) / 12.
// With r = D/2 and x = (r − y)/r, the half angle is α = π/2 − ATN(x/√(1 − x²)) with π = 3.1416,
// an arc cosine written the way QuickBASIC, which has no ACOS, computes one. The area is the
// sector minus the triangle: A = r²·α − (r − y)·h, where h = √(y·(D − y)) is half the top width.
// P = 2·r·α, T = 2·h.
//
// The area was r²(θ − sin θ)/2 with θ = 2α. The two are equal with the true π, but QUICK-2's
// π error (3.7e-6 in α) cancels in the θ − sin θ form and not in this one, and only this one
// prints QUICK-2's discharges: A-004's 2200 in pipe at Depth 5.13 (the case is named there and
// in results/hauntings.md H-003, since case ids stay out of this source) prints 3783.9 with it
// and 3783.2 with the old
// form, and every Channel Capacity circle matches (results/attempts.md A-004, hypothesis C2;
// haunting H-003). Nothing between the inputs and A, P and T is stored.
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
  const alpha = PI_QUICK2 / 2 - Math.atan(x / Math.sqrt(1 - x * x));
  const half = Math.sqrt(y * (D - y));
  return {
    area: r * r * alpha - (r - y) * half,
    perimeter: 2 * r * alpha,
    topWidth: 2 * half,
  };
}

/** The same quantities stored in single precision. */
export function wetCircleStored(D: number, y: number): Section {
  const w = wetCircle(D, y);
  return { area: store(w.area), perimeter: store(w.perimeter), topWidth: store(w.topWidth) };
}
