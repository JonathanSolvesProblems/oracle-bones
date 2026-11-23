// The one depth search QUICK-2 uses for every depth (design: The depth search).
//
// Given an increasing function F (a discharge for Normal Depth, the critical-flow discharge for
// Critical Depth) and a target q:
//   1. Start at the first trial and step up by the step. Stop as soon as |F(y) - q| <= tol * q.
//   2. When F passes q, take the last trial below q (or the bottom, where F is 0) and the first
//      above as a bracket, and interpolate linearly.
//   3. Check the interpolated depth the same way. If it is still short, stepping resumes from
//      it: the next trial is one step above it, and the next bracket runs from it to the first
//      trial past q. Six shallow Normal Depth cases and four Critical Depth cases need this
//      second step (results/attempts.md, A-001). An interpolation that is over q becomes the new
//      upper end and interpolation repeats; on a convex F that does not happen, so that branch
//      is unobserved.
// Each trial depth and each trial value is stored in single precision.
//
// QUICK-2 never ends when F can never reach q. The rebuild stops when the trial passes
// SEARCH_DEPTH_LIMIT, when F stops growing, or after SEARCH_MAX_TRIALS, and reports that.

import { SEARCH_DEPTH_LIMIT, SEARCH_MAX_TRIALS, SEARCH_TOL } from './constants.ts';
import { store } from './single.ts';

export interface SearchSpec {
  /** Where F is 0: the lower end of the first bracket. */
  bottom: number;
  /** The first trial. */
  first: number;
  /** The step between trials until F passes q. */
  step: number;
  /** A depth no trial may pass: the circle's diameter. */
  ceiling?: number;
}

export type SearchResult =
  | { ok: true; y: number; value: number; trials: number }
  | { ok: false; reason: 'never_finishes' | 'not_a_number' | 'past_ceiling' };

export function search(F: (y: number) => number, q: number, spec: SearchSpec): SearchResult {
  const close = (v: number) => Math.abs(v - q) <= SEARCH_TOL * q;
  let lo = spec.bottom;
  let flo = 0;
  let y = store(spec.first);
  let trials = 0;
  let fy: number;
  for (;;) {
    // Step up until F passes q.
    for (;;) {
      if (spec.ceiling !== undefined && y > spec.ceiling) return { ok: false, reason: 'past_ceiling' };
      fy = store(F(y));
      trials += 1;
      if (Number.isNaN(fy)) return { ok: false, reason: 'not_a_number' };
      if (close(fy)) return { ok: true, y, value: fy, trials };
      if (fy > q) break;
      if (y > SEARCH_DEPTH_LIMIT + spec.bottom || trials > SEARCH_MAX_TRIALS) return { ok: false, reason: 'never_finishes' };
      lo = y;
      flo = fy;
      y = store(y + spec.step);
    }
    let hi = y;
    let fhi = fy;
    // Interpolate inside the bracket.
    for (;;) {
      if (!(fhi > flo) || trials > SEARCH_MAX_TRIALS) return { ok: false, reason: 'never_finishes' };
      y = store(lo + ((q - flo) * (hi - lo)) / (fhi - flo));
      fy = store(F(y));
      trials += 1;
      if (Number.isNaN(fy)) return { ok: false, reason: 'not_a_number' };
      if (close(fy)) return { ok: true, y, value: fy, trials };
      if (fy < q) break;
      hi = y;
      fhi = fy;
    }
    // A short interpolation becomes the lower end and stepping resumes from it with the same
    // step, so the next bracket is [y, y + step] (results/attempts.md, A-001).
    lo = y;
    flo = fy;
    y = store(y + spec.step);
  }
}
