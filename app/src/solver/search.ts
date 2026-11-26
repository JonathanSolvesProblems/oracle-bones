// The one depth search QUICK-2 uses for every depth (design: The depth search).
//
// Given an increasing function F (a discharge for Normal Depth, the critical-flow discharge for
// Critical Depth) and a target q:
//   1. Start at the first trial and step up by the step. Stop as soon as |F(y) - q| <= tol * q.
//   2. When F passes q, take the last trial below q (or the bottom, where F is 0) and the first
//      above as a bracket, and interpolate linearly (the chord).
//   3. Check the chord the same way. An interpolation that is over q becomes the new upper end
//      and interpolation repeats; on a convex F that does not happen, so that branch is
//      unobserved. A chord that is still short is handled by `afterShortChord`:
//      - 'resume': stepping resumes from it, so the next trial is one step above it and the
//        next bracket runs from it to the first trial past q (K1). The prismatic and irregular
//        searches use it: six shallow Normal Depth cases and four Critical Depth cases need this
//        second step (results/attempts.md, A-001). Circle Critical Depth uses it too: one pipe's
//        Critical Slope, another's Depth and a third's Critical Slope, Velocity and Max
//        Discharge print only with it, and six rejections follow from it (circle-short-chord
//        2.1, 2.2; results/attempts.md, A-009, A-010).
//      - 'narrow': the short chord becomes the lower end and the chord is taken again on
//        [that chord, the same upper trial], until a chord is within tol (N2). Circle Normal
//        Depth uses it. This is candidate N2 of ledger Q-026, which is still open: N1
//        ('resume') prints the same three branch cases, and one A-005 case fits neither
//        (.kiro/specs/circle-outputs, 2.7, 2.8).
// The stop fraction `tol` is SEARCH_TOL (1%) unless the caller passes another: the circle
// passes CIRCLE_TOL (0.5%, Q-025).
// Each trial depth and each trial value is stored in single precision.
//
// The ceiling. A caller with a ceiling (the circle's diameter) has each trial, stepped from the
// first or resumed from a short chord, tested against it before F is called; the test is the
// first statement of the stepping loop. Chords are not tested: a chord lies in [lo, hi], and hi
// is a trial that passed the test. By default a trial past the ceiling (trial > ceiling) ends
// the search with `past_ceiling`; circle Normal Depth uses this. With `rejectAtCeiling` a trial
// at or past it (trial >= ceiling) does, so no depth at or past the ceiling reaches F; circle
// Critical Depth uses this (circle-short-chord 2.4). With `ceilingValue` as well, a stepped
// trial equal to the ceiling, with no short chord before it, is not given to F: q is compared
// with `ceilingValue`, the value F stands for there (for circle Critical Depth, the full pipe's
// number, circle-short-chord 2.6). Within tol it is found at the ceiling; under q it is
// `past_ceiling`, as stepping on would give; over q it is `past_ceiling` when the ceiling is the
// first trial, and otherwise `under_ceiling_value`. `under_ceiling_value` describes what QUICK-2
// was seen to do there (2.6 (c)); no mechanism for it is known. A trial resumed from a short
// chord that lands on the ceiling is rejected as any trial at the ceiling is.
//
// A value that is not a number ends the search with `not_a_number`. Circle Critical Depth's F
// returns one where QUICK-2's formula has no value, so a discharge under the floor of A·√(g·A/T)
// ends that way (circle-short-chord 2.7).
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
  /** The stop fraction. Default SEARCH_TOL. */
  tol?: number;
  /** What a chord still short of q does. Default 'resume'. */
  afterShortChord?: 'resume' | 'narrow';
  /** Reject a trial at the ceiling as well as past it (trial >= ceiling). Default false. */
  rejectAtCeiling?: boolean;
  /**
   * With `rejectAtCeiling`: the value compared with q, instead of calling F, at a stepped trial
   * equal to the ceiling with no short chord before it.
   */
  ceilingValue?: number;
}

export type SearchResult =
  | { ok: true; y: number; value: number; trials: number }
  | { ok: false; reason: 'never_finishes' | 'not_a_number' | 'past_ceiling' | 'under_ceiling_value' };

export function search(F: (y: number) => number, q: number, spec: SearchSpec): SearchResult {
  const tol = spec.tol ?? SEARCH_TOL;
  const narrow = spec.afterShortChord === 'narrow';
  const atCeiling = spec.rejectAtCeiling === true;
  const close = (v: number) => Math.abs(v - q) <= tol * q;
  let lo = spec.bottom;
  let flo = 0;
  let y = store(spec.first);
  let trials = 0;
  // Whether the current trial was reached by resuming from a short chord.
  let resumed = false;
  let fy: number;
  for (;;) {
    // Step up until F passes q.
    for (;;) {
      if (spec.ceiling !== undefined && (atCeiling ? y >= spec.ceiling : y > spec.ceiling)) {
        if (atCeiling && spec.ceilingValue !== undefined && y === spec.ceiling && !resumed) {
          const cv = spec.ceilingValue;
          if (close(cv)) return { ok: true, y, value: cv, trials: trials + 1 };
          if (cv < q || trials === 0) return { ok: false, reason: 'past_ceiling' };
          return { ok: false, reason: 'under_ceiling_value' };
        }
        return { ok: false, reason: 'past_ceiling' };
      }
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
      if (fy < q) {
        if (!narrow) break;
        // The short chord becomes the lower end; the chord is taken again on the narrowed
        // bracket (Q-026 candidate N2).
        lo = y;
        flo = fy;
        continue;
      }
      hi = y;
      fhi = fy;
    }
    // A short interpolation becomes the lower end and stepping resumes from it with the same
    // step, so the next bracket is [y, y + step] (results/attempts.md, A-001).
    lo = y;
    flo = fy;
    y = store(y + spec.step);
    resumed = true;
  }
}
