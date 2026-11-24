# Bugfix Design Document: circle-outputs

## Overview

The fix changes how the rebuild computes the circle in all three modes, and nothing else. It
has four parts, each tied to requirements in `bugfix.md` and to the scoring in
`results/attempts.md` A-004 to A-006.

1. Circle geometry: the area is the sector minus the triangle (C2), so QUICK-2's π = 3.1416
   reaches it the way QUICK-2's does (2.1, 2.2).
2. Max Discharge at .9382·D instead of .938·D (2.3, 2.4).
3. The circle search: a 0.5% stop, a 0.1 ft step in Normal Depth and 0.2 ft in Critical Depth,
   and the chord repeated on the narrowed bracket when it is short (2.5 to 2.9).
4. Critical Depth's fields: computed at the search depth, with Depth printed 0.01 ft below
   it and Velocity as q/A (2.10, 2.11).

The prismatic and irregular code paths are not edited (3.1, 3.6).

**Reference implementation.** `scripts/circle_outputs.mts` already computes every rule here
from the rebuild's own form reader and printer, and its `grade-a005` mode scores the adopted
rules (C2, .9382·D, N2, H5) at 58 of 60 circle results. The two misses are the known
differences. Where this design and the script disagree on an evaluation order or a store,
the script is right, because its numbers were checked against the goldens. The build is done
when `app/src` prints what the script prints for every circle golden.

**Expected result.** The full set goes from 241 of 284 to 279 of 284. 78 of the 80 circle
goldens match. The misses are cc-circ-000035 and nd-circ-000020 (known differences) and
sb-irr-000001 to -000003 (Step-Backwater, not built).

## Fault condition and root cause

| Requirement | Fault | Root cause, with evidence |
|---|---|---|
| 1.1, 1.2 | CC discharge 0.02% low in the 2200 in pipe, one unit high in the 2215.5 in pipe | Area as r²(θ − sin θ)/2. QUICK-2's π error, 3.7e-6 in α, cancels in that form and does not cancel in r²α − (r − y)·T/2. Store points do not move it (A-004 C1 to C3). |
| 1.3 | Max Discharge `271098` for `271099` | .938·D sits below the peak of the part-full curve; .9382·D is at it (A-004 M1 to M5). |
| 1.4 | ND stops on a trial QUICK-2 steps past | The 1% stop; QUICK-2's circle stop is 0.5% (Q-025). |
| 1.5 | nd-circ-000010 Velocity | The 1% stop accepts the chord at −0.608%; with 0.5%, the short-chord branch decides (Q-026). |
| 1.6 | CD Depth and fields | Three faults: one depth for every field, a 0.1 ft step and Velocity √(gA/T). QUICK-2 prints Depth 0.01 ft below the depth of its other fields, steps 0.2 ft and prints q/A (Q-024, Q-027; A-004 H5; A-006). |

## Changes by file

### `app/src/solver/constants.ts`

| Constant | Value | Change | Citation (for the `@cite` tag) |
|---|---|---|---|
| `MAX_DISCHARGE_DEPTH` | .9382 | was .938 | cc-circ-000027 (271099; .938 gives 271098.47), cc-circ-000034, cc-circ-000036; known difference cc-circ-000035 (Q-028); A-004 M2, A-006 |
| `CIRCLE_TOL` | 0.005 | new | nd-circ-000015, nd-circ-000016 against cc-circ-000028 (between 0.464% and 0.515%), nd-circ-000009 (0.466%); Critical Depth fits 0.37% to 0.94% (cd-circ-000015, cd-circ-000020); Q-025, A-004 |
| `CIRCLE_STEP` | 0.1 | citation and comment replaced; no longer "not settled" | nd-circ-000007, nd-circ-000015 to -000017 (49.00, 49.10), nd-circ-000009 (8.40), nd-circ-000012 (6.10); Q-025 |
| `CIRCLE_CD_STEP` | 0.2 | new | cd-circ-000011 (stops on the trial at 6.60); fitted on cd-circ-000001 to -000021 (A-004 H5); held-out cd-circ-000022 to -000032, with cd-circ-000030 to -000032 printing the 0.2 ft prediction and not the 0.1 ft one (A-006) |
| `CIRCLE_CD_DEPTH_OFFSET` | 0.01 | new | cd-circ-000019 to -000021 against cc-circ-000031 to -000033 (Q-024); every CD circle fits 0.0089 to 0.0101 ft (A-004 measurement 2); cd-circ-000010 (rounding boundary) |

`SEARCH_TOL` (0.01) stays as is and keeps serving the prismatic and irregular searches.
`guard.test.ts`'s `COINCIDENCES` table gets an entry for each new constant whose value equals a
printed golden value: 0.2 (printed as Hyd Radius), 0.005 (printed as a Slope echo `0.0050`)
and 0.01, if the guard flags them. Each entry gets its one-line reason, as the existing
entries have. `CIRCLE_STEP`'s entry loses "(not settled)".

### `app/src/solver/geometry/circle.ts`

`wetCircle(D, y)` becomes:

```
r = D / 2
x = (r − y) / r
α = π/2 − ATN(x / √(1 − x²))      π = PI_QUICK2 = 3.1416
h = √(y·(D − y))                  half the top width
A = r²·α − (r − y)·h
P = 2·r·α
T = 2·h
```

`wetCircleStored` stores A, P and T, as now. Nothing in between is stored; the script stores
nothing in between and matches. The header comment says what changed and why, citing A-004
C2 and cc-circ-000031. Every circle mode already calls this function, so Normal Depth and
Critical Depth take the new geometry with no further edit.

### `app/src/solver/search.ts`

`SearchSpec` gains two fields, with defaults that keep today's behaviour:

- `tol`: the stop fraction. Default `SEARCH_TOL`.
- `afterShortChord`: `'resume'` (today's rule, A-001) or `'narrow'`. Default `'resume'`. With
  `'narrow'`, a chord that is still below q becomes the lower end, and the next chord is taken
  on [that chord, the same upper trial], repeating until a chord is within `tol`. A chord
  above q becomes the upper end, as now.

The prismatic and irregular callers pass neither field. A unit test checks that every
prismatic and irregular golden's search returns the same depth, value and trial count before
and after (3.6). The header comment adds the circle's rule and cites Q-026 as open.

### `app/src/solver/modes/circle.ts`

- `circleNormalDischarge` computes the trial discharge from the stored geometry and stored √S,
  as Channel Capacity does: k = 1.486/n·store(√S), F(y) = k·A·store(A/P)^.6667 with A and P
  stored. Q-025 measured the stop against Channel Capacity's own discharge, and the script
  computes it this way.
- `circleCriticalDischarge` computes A·√(g·A/T) from the stored A and T.
- `searchCircle` takes the step: `CIRCLE_STEP` for Normal Depth and `CIRCLE_CD_STEP` for
  Critical Depth, first trial equal to the step. Both use `tol: CIRCLE_TOL`,
  `afterShortChord: 'narrow'` and the diameter as the ceiling.
- `criticalDepthCircle` computes every field at the search depth y:
  - Velocity = store(q/A).
  - Froude = store(Velocity/√(g·A/T)).
  - Critical Slope = `criticalSlope(q, A, R, n)`, as now.
  - Max Discharge = `maxDischarge(D, n, Critical Slope)`.
  - Depth = store(y − `CIRCLE_CD_DEPTH_OFFSET`).

  `raw` keeps the search depth as `search_depth` beside `depth`, so the app can show the
  haunting (2.12).
- `normalDepthCircle` is unchanged apart from the search it calls.
- The header comment is rewritten to state these rules with their A-004 to A-006 citations.
  It names the known differences and the open questions (Q-026, Q-028).

### `app/src/solver/modes/capacity.ts`

`maxDischarge` keeps its form and takes `MAX_DISCHARGE_DEPTH` = .9382. Its doc comment changes
from "the peak" at .938·D to .9382·D, cites Q-028, and names cc-circ-000035 as a known
difference. `capacityCircle` needs no edit: the geometry change reaches it through
`wetCircleStored`.

### `results/hauntings.md`

- **H-003**: QUICK-2's π = 3.1416 in the circle's area. cc-circ-000031 printed `3783.9`;
  3782.98 with the true π; 0.024%. The effect grows as the pipe gets larger and shallower
  (2.2).
- **H-004**: circle Critical Depth prints Depth 0.01 ft below the depth its other fields
  describe. cd-circ-000019 printed `4.89`; the search depth is 4.9014; the exact critical depth,
  with the true π and no single-precision rounding, is 4.9030 (2.12).

Neither cc-circ-000035 nor nd-circ-000020 goes in this file (2.4).

### `.kiro/specs/quick2-solver/design.md`

The parent design is corrected where this spec found it wrong, with a pointer to this spec:

- "Circle geometry": the C2 formula.
- "The depth search": the start-and-step table's circle row (0.1 ft for Normal Depth, 0.2 ft for
  Critical Depth, 0.5% stop, chord repeated on the narrowed bracket), and the
  short-chord rule as a per-shape option.
- "Circle: Normal Depth, Critical Depth, Max Discharge": .9382·D, the Critical Depth fields of
  2.10 and 2.11, and the known differences.
- Property 1 keeps its prismatic and irregular scope. A new Property 8 states the circle's
  version (below).
- "Unverified assumptions and open points": remove the circle step and the scan-or-.938 lines.
  Add Q-026, Q-028 and the unobserved short-chord rule in Critical Depth.

### Ledger

- Answer Q-027 with the rule of 2.9 to 2.11. Evidence: cd-circ-000019 to -000021 and
  cc-circ-000031 to -000033 (the split), cd-circ-000011 (the step stop), cd-circ-000022 to
  -000032 (held out).
- Q-026 and Q-028 stay open. Nothing is reported as observed for the short-chord rule in
  Critical Depth (2.14).

## Known differences

These are the goldens the rebuild is expected to miss after the fix. A test lists them, so
that any change in them, whether a new miss or one that starts to match, fails the test.

| Case | Field | QUICK-2 | Rebuild | Why it is left | Ledger |
|---|---|---|---|---|---|
| cc-circ-000035 | Max Discharge | `101165` | `101166` (101165.516) | .9382·D and a fine scan sit 0.05 to 0.09 cfs either side of a rounding boundary in all three A-005 pipes; neither prints all three. No rule is fitted to a one-in-a-million difference. Candidate cause: QuickBASIC 4.5 single precision in the expression. That is a candidate, not a classification. | Q-028 |
| nd-circ-000020 | Velocity, Froude # | `5.8`, `2.5` | `5.7`, `2.4` | Velocity `5.8` needs a depth of 0.24883 to 0.25174 ft. N2 stops at 0.25228, and no candidate that also fits nd-circ-000010 lands there. N2's Top Width match may be a coincidence. | Q-026 |

## Correctness properties

### Property 8: The circle search stops within 0.5%

For any circle input that gives a Normal Depth or Critical Depth result, the search's own
function (the Channel Capacity discharge for Normal Depth, A·√(g·A/T) for Critical Depth) at
the search depth is within 0.5% of the entered discharge. The fast-check property draws pipes
from the practical ranges, with discharges under the critical discharge at 0.9·D, as the
generator does.
**Validates: Requirements 2.5, 2.6, 2.7, 2.9**

### Property 9: Circle Critical Depth prints Depth one hundredth of a foot below its fields

For any circle Critical Depth result, `raw.depth` = store(`raw.search_depth` − 0.01), and
Area, Wet Perimeter and Top Width equal `wetCircleStored` at `raw.search_depth`.
**Validates: Requirement 2.10**

### Preservation

- Property 6 (Critical Depth on a circle ignores the slope) still holds; its test is unchanged.
- Every prismatic and irregular golden prints as before. This is checked two ways: the
  comparator's per-pair counts, and the search-level test above that compares depth, value and
  trial count.
- All 20 circle goldens that end on a held prompt still match. Holds are decided in
  `forms.ts`, which this fix does not touch.

## Testing strategy

All tests are Vitest in `app/test/`. The reproduction comes first and must fail before the fix.

1. **Reproduction** (`circle.test.ts`, new block "circle-outputs"): each case of 1.1 to 1.6 is
   solved through `solve()` and compared field by field with its golden. They are
   cc-circ-000027, -000031, nd-circ-000007, -000010, -000016, cd-circ-000010 (the rounding
   boundary), -000011 (the step stop), -000013, -000019 and -000030 (0.2 ft against 0.1 ft).
   The block fails on the current code, and passes after.
2. **Every circle golden**: a table-driven test over all circle result goldens. It expects
   every field to match, except the known differences, where it expects exactly the listed
   rebuild value (`101166`; `5.7` and `2.4`).
3. **Search options**: `search.test.ts` gains cases for `tol` and `afterShortChord: 'narrow'`
   on a hand-made convex function, and the preservation check of the default path.
4. **Properties 8 and 9**: fast-check, 200 runs each, as Property 6.
5. **Guard**: the existing guard test, with the new `COINCIDENCES` entries.
6. **Comparator**: `python scripts/oracle_quick.py` and `--full`. Report the quick set before
   and after, and the full set, which should be 279 of 284. Every mismatch left should be a
   known difference or Step-Backwater.
7. **Script agreement**: `node scripts/circle_outputs.mts grade-a005` still reports 15 of 17
   for A-005's stated rules and 58 of 60 for the adopted ones. The script computes the rules
   with its own code; it calls `solve()` only for its "as built" rows. So agreement between
   the script and the comparator checks the rebuild against an independent copy of the rules.
8. The full Python and Vitest suites pass.

## Not in scope

- A rule for cc-circ-000035 or nd-circ-000020 (Q-028, Q-026).
- The short-chord rule in Critical Depth beyond using the Normal Depth rule. No golden reaches
  it there.
- Step-Backwater on the circle, and any app or UI change. The app shows `raw.search_depth`
  beside the printed Depth under quickened-app Requirement 2.2, which is that spec's work.
