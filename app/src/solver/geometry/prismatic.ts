// Trapezoid, V-ditch and rectangle (design: Prismatic geometry). For side slopes z1 and z2
// (H:V), bottom width b and depth y:
//   A = b·y + (z1 + z2)·y²/2,  P = b + y·(√(1+z1²) + √(1+z2²)),  T = b + (z1 + z2)·y.
// The V-ditch is b = 0 and the rectangle z1 = z2 = 0 (criteria 4.1, 4.2). Negative inputs go
// into the same formulas unchanged (criteria 2.5 to 2.7).

import { store } from '../single.ts';

export interface Prism { z1: number; z2: number; b: number; }

export interface Section { area: number; perimeter: number; topWidth: number; }

/** Area, wetted perimeter and top width, each as an expression (not stored). */
export function wet(s: Prism, y: number): Section {
  return {
    area: s.b * y + ((s.z1 + s.z2) * y * y) / 2,
    perimeter: s.b + y * (Math.sqrt(1 + s.z1 * s.z1) + Math.sqrt(1 + s.z2 * s.z2)),
    topWidth: s.b + (s.z1 + s.z2) * y,
  };
}

/** The same quantities stored in single precision, as QUICK-2 keeps them. */
export function wetStored(s: Prism, y: number): Section {
  const w = wet(s, y);
  return { area: store(w.area), perimeter: store(w.perimeter), topWidth: store(w.topWidth) };
}
