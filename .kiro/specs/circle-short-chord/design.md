# Bugfix Design Document: circle-short-chord

## Overview

The fix changes how circle Critical Depth searches and the text of one flag, and nothing else.
It has four parts, each tied to requirements in `bugfix.md` and to the scoring in
`results/attempts.md` A-008 to A-018 graded.

1. After a short chord, circle Critical Depth resumes stepping from the chord with the same
   0.2 ft step (K1), the rule the prismatic shapes already use (2.1 to 2.3).
2. A circle Critical Depth trial is rejected when it is at or past the stored diameter,
   trial ≥ D, where today it is rejected only past it, trial > D (2.4). The trial and D are
   stored as now: store(y + 0.2) and store(store(VAL)/12).
3. A stepped trial exactly equal to D is not given to the circle formula. The search compares q
   with the full-pipe number, store(A·√(g·A/T)) with A = store(3.1416·D²/4) and T = D: within
   0.5% it returns a result at D, printed from the full pipe; more than 0.5% over it, `rejected`;
   more than 0.5% under it, `error` with `returns_to_menu` in a pipe with a stepped trial inside
   D, and `rejected` in a pipe without one (2.6 (a) to (d)).
4. A depth where QUICK-2's circle formula has no value, x/√(1−x²) with x = ±1, ends the circle
   Critical Depth search as a run-time error: outcome `error` with the `returns_to_menu` flag,
   whose text becomes "QUICK-2 returns to its shape menu with no result for this input." Under
   2.4 and 2.6 only the chords under the floor reach such a depth (2.7, the person's decision).

Circle Normal Depth keeps N2 and trial > D (3.2). Channel Capacity does not search and is not
touched (3.3). The prismatic and irregular searches are untouched (3.1).

**Gate (passed).** A-018's cases ran and were graded against A-018 as committed (A-018 graded,
2.11, 2.12). The rule of 2.4 alone missed eight of thirteen, all at a stepped trial on D;
candidate 1 with the full-pipe number got the twelve it predicted, and the five results match
on all 70 printed fields. Part 3 is the rule that fits best, so it is built. No ending is left
as a known difference, and no printed number is wrong.

**Reference implementation.** `node scripts/circle_outputs.mts design` (about 1 s, never runs
the program) writes out the search of `search.ts` with K1 and trial ≥ D and grades every circle
Critical Depth golden with it. Where this design and the script disagree on an evaluation order
or a store, the script is right, because its numbers were checked against the goldens: on all
twelve A-016 cases its N2 with trial > D gives what `solve()` gives today, and its K1 with
trial ≥ D gives what A-015's model of T1·D1·X2 gives (`a016`). For parts 3 and 4,
`node scripts/circle_outputs.mts full-pipe-rule` (about 3 s) writes out the same search with
the full-pipe number at a stepped trial on D and the run-time error read as the menu
(`fullPipeSearch`), and grades every circle Critical Depth observation with it: 95 of 95. The
build is done when `solve()` gives what `full-pipe-rule` gives.

**Expected result** (2.9). Full set 295 of 340 today, 335 after. Quick set 192 of 200 today,
195 after. The misses left are cc-circ-000035 and nd-circ-000020 (known differences) and
sb-irr-000001 to -000003 (Step-Backwater, not built). No golden that matches today stops
matching. The counts for the seventeen goldens A-017 and A-018 added are derived, not yet the
comparator's. Of the 85 circle Critical Depth goldens, 3 are held at a prompt and never reach
the search (cd-circ-000003, -000007, -000008); of the other 82, 42 match today and all 82 match
after (`full-pipe-rule`). The 40 that change:

(2026-11-26, after the headline batch of seed 201: the comparator's full set is 1315 of 1339,
these 335 of 340 and 980 of the batch's 999, with the solver unchanged. Its 24 misses are listed
by class in `results/known-misses.json`, which the checks read. The quick set, rebuilt in
511e7e0, is 195 of 200; its misses are nd-circ-000020, nd-circ-000087 and sb-irr-000001 to
-000003, and cc-circ-000035 is no longer in it.)

| Golden | Today | After | Why |
|---|---|---|---|
| cd-circ-000033 | Critical Slope `0.0089` for `0.0090` | match | K1 (1.1, 2.1) |
| cd-circ-000035 | Depth `2.75` for `2.74` | match | K1 (1.2) |
| cd-circ-000036 | Critical Slope, Velocity, Max Discharge | match | K1 (1.2) |
| cd-circ-000038 | Depth `0.90` for `0.89`, Critical Slope, Velocity | match | K1 (S6, A-012) |
| cd-circ-000040 | a result where QUICK-2 rejected (P1) | rejected | K1 (1.3) |
| cd-circ-000043 | a result (Q1) | rejected | K1 (1.3) |
| cd-circ-000044 | a result (Q2) | rejected | K1 (1.3) |
| cd-circ-000049 to -000052 | a result (S7 to S10) | rejected | K1 (A-012) |
| cd-circ-000057, -000058 | a result (R6, R7) | rejected | K1: the chord's next trial passes D (A-015) |
| cd-circ-000064, -000067 | a result (U1, U4) | rejected | K1 (A-016 graded) |
| cd-circ-000070 | Critical Slope `0.0085` for `0.0086` (V1) | match | K1 (A-016 graded) |
| cd-circ-000045, -000056, -000060 to -000062 | `error`, `never_finishes` (S2, R4, R9, H1, H2) | rejected | stepped trial on D, q over the number: 2.6 (b) (1.4) |
| cd-circ-000071 to -000079 | `error`, `never_finishes` (V3, V4, B3 to B9) | rejected | 2.6 (b) (1.4) |
| cd-circ-000080 | `error`, `never_finishes` (E3) | rejected | 2.4 in, under the number, no stepped trial inside D: 2.6 (d) |
| cd-circ-000081 to -000083, -000085, -000087 | `error`, `never_finishes` (M2 to M4, M7, M10) | match, a result at D | 2.6 (a) |
| cd-circ-000084, -000086, -000088, -000089 | `error`, `never_finishes` (M5, M8, M11, L1) | rejected | 2.6 (b) |

cd-circ-000038, -000057 and -000058 are the three in the quick set.

(2026-11-26: that was the quick set of c865f11. In the rebuilt quick set of 3cc4821 the four
are cd-circ-000050, -000062, -000082 and -000086, and the counts are 191 of 200 before and
195 after; bugfix.md 2.9 has the note.)

## Fault condition and root cause

| Requirement | Fault | Root cause, with evidence |
|---|---|---|
| 1.1, 1.2 | Critical Slope, Depth, Velocity and Max Discharge one unit off on cd-circ-000033, -000035, -000036 (and -000038) | The chord is taken again on the narrowed bracket (N2). QUICK-2 resumes stepping from the short chord (K1): every field of cd-circ-000033 needs a search depth of 0.74203 to 0.74279; N2 lands at 0.74322 and K1 at 0.74259 (A-008, A-009, A-010). |
| 1.3 | A result where QUICK-2 printed the message (P1, Q1, Q2, S7 to S10, R6, R7, U1, U4) | Under N2 the narrowed chords stay inside the bracket and converge. Under K1 the trial after the short chord is 0.2 ft up and passes D, and QUICK-2 printed the message (A-010, A-012, A-015, A-016 graded). |
| 1.4 | `error` with `never_finishes` where QUICK-2 printed the message, a result, or went to the shape menu at a stepped trial on D (S2, R4, R9, H1, H2, V3, V4, B3 to B9, E3, M1 to M11, L1, and the ten menu endings) | The test is trial > D, so a stepped trial exactly on D reaches the geometry. There T = 0, A·√(g·A/T) is infinite, the chord lands back on the last trial inside, and the search loops until it gives up. QUICK-2's ending at that trial follows q against the full-pipe number (A-017 graded, the full-pipe reading; A-018 graded). |
| 2.7 | `error` with `never_finishes` where QUICK-2 returned to the shape menu (W1, W2, under the floor) | The chords on [0, 0.2] fall until one is so near 0 that x = (r − y)/r is 1. In QuickBASIC x/√(1−x²) then divides by zero, a run-time error, read as the return to the menu (A-013's inference; A-017 graded, 3a). In JavaScript x/0 is Infinity, ATN gives π/2, no NaN arises, and the search gives up with `never_finishes`. |

The first two faults are in the options `modes/circle.ts` passes to the shared search. The
search's code paths already do what K1 needs (`afterShortChord: 'resume'`, A-001), and its
ceiling test already runs before F is evaluated. The third needs a new branch in the search, at
the ceiling test, and the full pipe in `modes/circle.ts`. The fourth is in the F that the circle
Critical Depth caller gives the search: the search already returns `not_a_number` when F is
NaN, and `modes/circle.ts` already maps that to `returns_to_menu`. For 2.6 (c) no mechanism is
known (2.6); the search implements the comparison as observed, not a run-time error.

## Changes by file

### `app/src/solver/search.ts`

`SearchSpec` gains two fields, with defaults that keep today's behaviour:

- `rejectAtCeiling?: boolean`. Default `false`: a trial is rejected when it is past the
  ceiling (trial > ceiling), as now. `true`: a trial is rejected when it is at or past it
  (trial ≥ ceiling), except as `ceilingValue` says.
- `ceilingValue?: number`. Used only with `rejectAtCeiling: true`. A stepped trial, one reached
  by stepping from `first` without a short chord before it, whose stored value equals the
  ceiling exactly, is not given to F. The search compares q with `ceilingValue` instead:
  - within tol (`close(ceilingValue)`): it returns `{ ok: true, y: ceiling, value:
    ceilingValue, trials }`, the trial counted;
  - `ceilingValue < q`: `past_ceiling`, which is what stepping on gives, since the next trial is
    past the ceiling;
  - `ceilingValue > q`: if the trial is the first trial (no stepped trial below the ceiling was
    taken), `past_ceiling`; otherwise the new reason `under_ceiling_value`.
  A trial resumed from a short chord that lands on the ceiling is rejected by `rejectAtCeiling`
  as any trial at the ceiling is (2.4).

`SearchResult` gains the reason `under_ceiling_value`. The search needs one more piece of state,
whether the current trial was resumed from a short chord: with `'resume'`, a short chord sets
`y = store(y + step)` and goes back to the stepping loop, so the loop sets a flag there and
clears nothing else. "First trial" is the trial count being 0 when the test runs.

The only ceiling test in the search is the first statement of the stepping loop, so it comes
before `F(y)` is called, for the first trial, for every stepped trial, and for every trial
resumed from a short chord. Chords are not tested and need not be: a chord lies in [lo, hi],
and hi is a trial that passed the test. So with `rejectAtCeiling: true` no depth at or past the
ceiling reaches F.

The header comment says which caller uses which rule: circle Critical Depth `'resume'` (K1)
with `rejectAtCeiling` and `ceilingValue` (circle-short-chord 2.1, 2.4, 2.6); circle Normal
Depth `'narrow'` (N2, Q-026 open) with trial > D; prismatic and irregular `'resume'` with no
ceiling. It also says that circle Critical Depth's F returns NaN where QUICK-2's formula has no
value, so a search whose discharge is under the floor of A·√(g·A/T) ends with `not_a_number`
(2.7), and that `under_ceiling_value` describes what QUICK-2 was seen to do, with no known
mechanism (2.6 (c)).

The prismatic and irregular callers pass no new field, so their path is the same code with the
same default.

### `app/src/solver/modes/circle.ts`

- A new exported function `fullPipeCriticalDischarge(D)` returns the full-pipe number:
  A = store(PI_QUICK2·D·D/4), then store(A·√(G·A/D)), with the square root in double, as
  `crownEv` in the script computes it. It uses the existing constants `PI_QUICK2` and `G`.
- A new exported function `circleSearchSpec(D, mode)` returns the spec each mode uses, so the
  spec object says which rule applies and tests can use the same object:
  - `'normal_depth'`: `{ bottom: 0, first: CIRCLE_STEP, step: CIRCLE_STEP, ceiling: D,
    tol: CIRCLE_TOL, afterShortChord: 'narrow' }`, which is today's.
  - `'critical_depth'`: `{ bottom: 0, first: CIRCLE_CD_STEP, step: CIRCLE_CD_STEP, ceiling: D,
    tol: CIRCLE_TOL, afterShortChord: 'resume', rejectAtCeiling: true, ceilingValue:
    fullPipeCriticalDischarge(D) }`.
- `normalDepthCircle` and `criticalDepthCircle` call `search(F, q, circleSearchSpec(D, mode))`.
- `criticalDepthCircle`'s F returns NaN where QUICK-2's formula has no value: where 1 − x² ≤ 0,
  with r = D/2 and x = (r − y)/r computed in double as `wetCircle` computes them. Elsewhere it
  returns `circleCriticalDischarge(D)(y)`, unchanged. Under 2.4 and 2.6 no depth at or past D
  reaches F, so in practice this is a chord so near 0 that x is 1 (2.7). The test is in the
  mode, not in `geometry/circle.ts` or `circleCriticalDischarge`, whose header already says "the
  caller decides what that means", and Normal Depth and Channel Capacity do not get it (3.2,
  3.3).
- When the search returns a result at y = D (2.6 (a)), `criticalDepthCircle` takes the section
  from the full pipe instead of `wetCircleStored(D, y)`: area store(PI_QUICK2·D·D/4), perimeter
  store(PI_QUICK2·D), top width D. Hyd R, Velocity, Froude, Critical Slope, Max Discharge and
  Depth (y − 0.01) are computed from it by the code that follows, unchanged. This is the section
  `crownGeo(true)` gives in the script, and the five results print with it on all 70 fields
  (A-018 graded). P = 3.1416·D is the assumption A-018 made (2.6 (a)).
- `searchCircle(F, q, D, step)` stays, unchanged in behaviour (N2, trial > D), because
  `scripts/q022_boundary.mts` calls it with A-007's 0.1 ft step. Its doc comment says so. No
  mode calls it.
- `notFound` needs no new code: `past_ceiling` is outcome `rejected` with "DEPTH is Greater than
  the DIAMETER"; `never_finishes` is `error` with that flag; every other reason, now
  `not_a_number` and `under_ceiling_value`, is `error` with `returns_to_menu`. Its comment names
  both.
- The header comment is rewritten: circle Critical Depth uses K1 (cd-circ-000033, -000035,
  -000036 and the six rejections; A-009, A-010), trial ≥ D (2.4; A-015's T1·D1·X2, picked as
  the smallest change), the full-pipe number at a stepped trial on D (2.6, the person's reading,
  tested by A-018, with (c) described and not explained) and a run-time error read as the shape
  menu (2.7); circle Normal Depth uses N2 with Q-026 open; no case id in the source. The stale
  sentences go: "the profile has no screen for it yet, so no golden records it" and "No Critical
  Depth golden reaches the short-chord branch".

No constant is added (3.9): the step, the stop and the diameter are as now, `PI_QUICK2` and `G`
already exist and are cited, `rejectAtCeiling` is a switch, `ceilingValue` is computed, and
1 − x² ≤ 0 is a test, not a constant.

### `app/src/solver/flags.ts`

The text of `returns_to_menu` becomes "QUICK-2 returns to its shape menu with no result for this
input." (2.7, the person's wording). The code and where Normal Depth raises it stay. The old
text, "abandons this calculation", stated a mechanism that is an inference; the new one says
only what the runs showed, which is true of all three uses: Normal Depth's -1, the floor, and
2.6 (c). `never_finishes` and its text are unchanged and stay for the inputs of 3.8.

### Files that do not change

`geometry/circle.ts`, `constants.ts`, `forms.ts`, `capacity.ts`, `search.ts` apart from its two
options, its new reason and its header, every prismatic and irregular mode, and
`app/src/format/`. Showing the flag's sentence under the form, and the limits page, are the
app's work (quickened-app).

### `results/hauntings.md`

**H-009: circle Critical Depth refuses a pipe that could carry the flow.** Numbers from
`node scripts/circle_outputs.mts design` (true π, double precision, nothing stored, g = 32.2,
QUICK-2's value; bisection on A·√(g·A/T) = q):

| Case | Pipe and discharge | QUICK-2 printed | Exact critical depth | Share of D | Below the crown |
|---|---|---|---|---|---|
| cd-circ-000043 (Q1) | 8 in, 1 cfs | the message | 0.4744 ft | 0.712 | 0.1922 ft (2.31 in) |
| cd-circ-000049 (S7) | 15 in, 7 cfs | the message | 1.0600 ft | 0.848 | 0.1900 ft (2.28 in) |
| cd-circ-000050 (S8) | 18 in, 12 cfs | the message | 1.3141 ft | 0.876 | 0.1859 ft (2.23 in) |

The entry says what happens: the search steps 0.2 ft, and when the trial after the last one
inside the pipe, or 0.2 ft above a short chord, is at or past the diameter, QUICK-2 prints the
message, even though the exact critical depth is about 2.2 to 2.3 in below the crown. The
difference is a refusal where an answer exists. All three are n .013 and slope .005; the slope
does not change a Critical Depth outcome (H-007).

If A-016 holds, H-009 also says that QUICK-2 refuses 1.6 cfs in the 8 in pipe and answers 1.71:
the exact critical depths are 0.5867 ft (0.880·D, 0.96 in below the crown) and 0.6002 ft
(0.900·D, 0.80 in below), and 1.71 cfs prints Depth `0.59` because the stepped trial 0.6 ft is
within 0.5% of it. So the boundary is not one discharge per pipe. The entry is written after
A-016 is graded, with its golden ids; if A-016 misses, these two sentences are not written.

**Limits, a new section after the hauntings.** The hauntings compare QUICK-2 with exact
hydraulics. This section lists where Quickened gives no answer because QUICK-2 gave none, and
the rule behind it is described but not explained. It starts with one entry, for 2.6 (c):

```
### Circle Critical Depth, a discharge under the full-pipe number at a trial on D

- **Cases:** obs-cdmenu-000001, -000002, -000005 to -000012 (behaviour cases; ledger decisions 98, 102, 104, 106).
- **QUICK-2:** went back to its shape menu with no message and no answer, in every run.
- **Quickened:** returns no result and says "QUICK-2 returns to its shape menu with no result for this input."
- **Why it is described, not explained:** circle-short-chord 2.6 (c); results/attempts.md A-017 graded and A-018 graded; the question that carries Q-029.
- **Limits page:** <one paragraph in plain words for a permit reviewer>
```

The **Limits page** paragraph is the text the app's limits page shows. It lives only here: the
quickened-app spec reads it from `results/hauntings.md`, section "Limits", one entry per `###`
heading, the paragraph after `**Limits page:**`, and does not copy it. The draft: "For
Critical Depth in a circular pipe of 4.8, 9.6, 12, 50.4, 52.8, 55.2 or 57.6 in, QUICK-2's search
can reach a depth equal to the diameter. There, when the discharge is more than 0.5% below what
the full pipe carries at critical flow, QUICK-2 went back to its shape menu without a message or
an answer. It did this ten times in the 9.6, 12 and 4.8 in pipes, and three of the ten were
predicted before they were run. Quickened gives no answer there either, and says that QUICK-2
returns to its shape menu. Why QUICK-2 does this is not known."

The floor of 2.7 gets no entry: Quickened does there what QUICK-2 was seen to do, and the
mechanism read for it, a run-time error, is the one A-013 wrote down. No "Known differences"
section is started by this spec, since no circle Critical Depth ending is left as one;
cc-circ-000035 and nd-circ-000020 are not added here (3.4).

### Ledger

The Exhumer owns these sections and writes them only through `ledger_write`; the default agent
does not edit `results/ledger.json`. Evidence must be a stored case id, a capture path, a run
id or a batch id, so A-015 and this spec are named in the text.

| Change | Requirement | Who, and how |
|---|---|---|
| Mismatch counts after the fix | 2.9 | The comparator, when the task runs `python scripts/oracle_quick.py` and `--full` (`ledger.set_mismatches`). Nobody writes them by hand. |
| K1 and trial ≥ D recorded as what circle Critical Depth does | 2.10 | An Exhumer session: `decide`, chose `write_requirement`, evidence cd-circ-000033, -000035, -000036 and cd-circ-000039 to -000044. |
| 2.6 recorded as what circle Critical Depth does at a stepped trial on D | 2.6, 2.10 | The same session: `decide`, chose `write_requirement`, saw and why naming (a) to (d), the person's full-pipe reading, A-018 graded, and that (c) has no mechanism; evidence cd-circ-000081 to -000083, -000085, -000087 (a), cd-circ-000084, -000086, -000088, -000089 (b), obs-cdmenu-000001, -000002, -000005 to -000012 (c), cd-circ-000080 (d). |
| Q-033 (1), the key that leaves `cd_circ_rejected`, stays open as unobserved | 2.10 | The same session: `ask`, carrying Q-033 (1) to a new question, as Q-022 carried its rest to Q-033. `keys_untried` already lists `{Esc}` for the screen; no recorded case presses a key there. |
| Q-033 (2) answered with 2.4 and 2.6 | 2.10 | The same session, after the `ask`: `answer` Q-033 with the message when a trial passes D, or at a stepped trial on D when q is more than 0.5% over the full-pipe number or under it in a pipe with no stepped trial inside D; that 56 combinations fit trial ≥ D equally on the observations before A-018 (A-015, A-017 graded); and that the full-pipe number is the person's reading, tested by A-018. Evidence the 43 rejection goldens, cd-circ-000039 to -000064, -000066, -000067, -000069, -000071 to -000080, -000084, -000086, -000088 and -000089. |
| Q-029 carried to a new question | 2.6, 2.10 | The person's decision (2026-11-26): Q-029 is carried to a new question, not reopened. The same session `ask`s a question that names Q-029, states 2.6 (a) to (d) and asks what sends a discharge under the full-pipe number back to the shape menu, with evidence obs-cdmenu-000001, -000002, -000005 to -000012 and cd-circ-000080 to -000083. Q-029's answer, what the recording showed, stays as it is. This follows Q-022 to Q-033 and changes no tool. |
| The floor's outcome | 2.7, 2.10 | The same session: `decide`, chose `write_requirement`, saw and why naming 2.7's outcome, the person's decision, and that F1 is above the floor only if the form kept the fourth decimal (Q-035); evidence obs-cdmenu-000003, -000004 and -000013. |
| Q-026, Q-032 (a) and Q-035 stay open; A-009's 79 generated circles and F1 above the floor are not coverage | 2.10 | Nothing is written. |

No known difference is recorded for a trial on D. The Exhumer session runs after the comparator
confirms 335 of 340, and runs no case.

### Other documents (2.8)

- `.kiro/specs/circle-outputs/bugfix.md` 2.9: a note after "A short chord SHALL be handled as in
  2.7" that circle Critical Depth now uses K1, trial ≥ D and the full-pipe number at a stepped
  trial on D, pointing here.
- `.kiro/specs/quick2-solver/design.md`, "The depth search": the paragraph on
  `afterShortChord` says circle Critical Depth uses `'resume'` (K1) with `rejectAtCeiling` and
  `ceilingValue`, and circle Normal Depth `'narrow'` (N2), each with its evidence; the sentence
  "No circle Critical Depth golden reaches the branch" goes; the comparison at a stepped trial
  on D is named, with (c) described and not explained. Its flag table gives `returns_to_menu` the
  new text and adds circle Critical Depth's run-time error (2.7) and 2.6 (c) to "Raised when";
  its section "Negative values and abandoned calculations" says that W1 and W2 are the first
  observations that fit the reading of a run-time error as the menu.
- `scripts/circle_outputs.mts`: the `design` command, added with this design, `grade-a017` and
  `a018`, which write out part 4, and `grade-a018` and `full-pipe-rule`, which write out part 3.

## Known differences

After the fix, as before, a test lists the graded ones so that any change in them fails it.

| Case | What differs | Graded | Ledger |
|---|---|---|---|
| cc-circ-000035 | Max Discharge `101166` for `101165` | yes | Q-028 |
| nd-circ-000020 | Velocity `5.7` and Froude `2.4` for `5.8` and `2.5` | yes | Q-026 |

No circle Critical Depth observation is a known difference. The seven menu endings the previous
version of this design listed here, and the three A-018 added, end as QUICK-2 did under 2.6 (c).

**The floor is not a known difference.** Under it (W1, W2) Quickened returns `error` with
`returns_to_menu`, no result, which is what QUICK-2 did. Just above it, in pipes up to 3072 in,
the search meets the same run-time error and Quickened returns the same (2.7). F1 ended that way,
but it is above the floor only if the form kept the fourth decimal of .0023 (Q-035), so just
above the floor stays unobserved. No graded golden is near the floor.

## Correctness properties

### Property 10: no depth at or past the diameter reaches the circle Critical Depth formula

For any circle Critical Depth input, every depth the search gives A·√(g·A/T) is below D; a
stepped trial on D gets the full-pipe number instead. The test wraps `circleCriticalDischarge(D)`
to record each depth and runs `search` with `circleSearchSpec(D, 'critical_depth')`, the object
`criticalDepthCircle` uses. Diameters are drawn from 2.4 to 180 in, half of them multiples of 2.4
in, where stepped trials land on D (A-011), and discharges log-uniform from 0.01 cfs to twice
A·√(g·A/T) at 0.99·D, so draws past the crown are included. The script's draw of 20000 circles
of that kind gave a largest depth of 0.9999999046·D, 17919 results, 2046 messages and 35 shape
menu endings; 307 reached a stepped trial on D, and none never finished (`full-pipe-rule`).
**Validates: Requirements 2.4, 2.6, 2.7**

### Property 11: circle Normal Depth and Channel Capacity are identical before and after

For any generated circle, Normal Depth and Channel Capacity return the same `Result` after the
fix as before it: outcome, every printed field, message, held prompt, flags and every raw value.
"Before" is a fixture written from the unchanged solver by an explicit command, as
`searchSnapshot.ts` does for the prismatic search: a fixed list of generated inputs (seeded
draw, practical ranges and the ranges of the Exhumer's batches) and each `Result`, doubles as
exact decimals. The test replays the list after the fix and compares exactly.
**Validates: Requirements 3.2, 3.3**

No property is written for 2.6: its expected outcomes would come from the rule itself, and the
tests take expected values only from goldens and behaviour cases. The 34 observations that reach
a stepped trial on D cover it (testing steps 1 to 3).

Not a property: that an input stays rejected when its discharge goes up. A-016 predicts that it
does not (8 in: 1.6 cfs the message, 1.71 a result), and 2.6 gives the menu, a result and the
message in that order as q rises past the full-pipe number.

### Preservation

- Properties 6, 8 and 9 still hold; their tests are unchanged. Property 8's Critical Depth test
  expects more than 150 results in 200 practical draws; K1 rejects more practical pipes than N2
  (27 of A-009's 2000 against 11), which leaves that margin.
- Every prismatic and irregular golden's search returns the same depth, value and trial count:
  the existing `search-snapshot.json` test, unchanged.
- Every circle Normal Depth and Channel Capacity golden prints as before: the comparator, and
  Property 11's fixture, which also holds them.
- All circle goldens held at a prompt stay matched; holds are in `forms.ts`, which is not
  touched.
- Circle Critical Depth: the 42 goldens that match today still match, and the 40 above start to
  match (`full-pipe-rule`, then the comparator).
- Normal Depth with a Discharge or Slope of -1 still returns `returns_to_menu`; only the flag's
  text changes, and the existing Normal Depth tests check the code, not the text.

## Testing strategy

All tests are Vitest in `app/test/`. Expected values come from the goldens and the behaviour
cases, never from the scripts' models. The reproduction comes first and must fail before the
fix.

0. **Gate (passed).** A-018 graded against its commit (2.12): no ending left wrong, no printed
   number wrong.
1. **Reproduction** (`circle.test.ts`, new block "circle-short-chord"): the 40 goldens above
   through `solve()`, each compared with its golden as the comparator compares it (outcome, and
   every field of a result). It fails on the current code for all 40 and passes after.
2. **Every circle golden**: the existing table-driven block keeps its two known differences.
   A new block expects all 43 rejection goldens, cd-circ-000039 to -000064, -000066, -000067,
   -000069, -000071 to -000080, -000084, -000086, -000088 and -000089, to be `rejected` with
   "DEPTH is Greater than the DIAMETER" and no printed field.
3. **A stepped trial on D** (2.6): the five result goldens of (a) are in step 1. The inputs of
   the ten behaviour cases of (c), obs-cdmenu-000001, -000002 and -000005 to -000012, each return
   `error` with `returns_to_menu`, its new text and no printed field, read from each behaviour
   case's transcript; the test names each behaviour case. cd-circ-000080 (d) is in step 2.
4. **The floor**: the inputs of obs-cdmenu-000003 (9999 in, .5 cfs), -000004 (7254 in, .3 cfs)
   and -000013 (768 in, .0023 cfs) return `error` with `returns_to_menu`, its new text and no
   printed field (2.7). No circle Critical Depth input in the test returns `never_finishes`. The
   existing negative-n and one-point tests are unchanged (3.8), and the flag test checks the new
   text.
5. **Search options** (`search.test.ts`): on a hand-made increasing F with a trial that lands
   exactly on the ceiling, the default evaluates F there and `rejectAtCeiling: true` returns
   `past_ceiling` without calling F at that depth; the same for a trial resumed from a short
   chord that lands on the ceiling, with or without `ceilingValue`; with `ceilingValue`, q
   within tol returns the ceiling as found without calling F there, q over returns
   `past_ceiling`, q under returns `under_ceiling_value`, and q under with the ceiling as the
   first trial returns `past_ceiling`; and the default path's existing cases pass unchanged.
6. **Properties 10 and 11**: fast-check, 200 runs for Property 10 as for Property 6; Property 11 replays its whole fixture. The fixture is written once, before step 1's code
   change, by `npm run snapshot:circle` (new, in `app/`), never by a test run.
7. **Guard**: the existing guard test; no new constant, no case id in the source.
8. **Comparator**: `python scripts/oracle_quick.py` and `--full`, before and after, keeping both
   reports. Quick set 192 to 195 of 200, full set 295 to 335 of 340. Every golden that matches
   before matches after; the five misses left are cc-circ-000035, nd-circ-000020 and
   sb-irr-000001 to -000003, with the same fields.
9. **Script agreement**: after the fix, on all 95 circle Critical Depth observations `solve()`
   ends as `full-pipe-rule` says the rule does, every field of every result among them, and
   `node scripts/circle_outputs.mts full-pipe-rule` reports 82 of 82 goldens matching both
   through its `solve()` column and its own search. The script computes the search with its own
   code, so agreement checks the rebuild against an independent copy.
10. The full Python and Vitest suites pass.

## Not in scope

- Normal Depth's short-chord rule (Q-026) and nd-circ-000020.
- Which of the 56 combinations QUICK-2 uses (T1 against T2, the diameter store, the test), and
  why a discharge under the full-pipe number ends on the shape menu (the question that carries
  Q-029). The solver has no special case for any input or pipe.
- Whether P at D is 3.1416·D, beyond the five results that print with it.
- What QUICK-2 does just above the floor of 2.7, and how many decimals of a discharge the form
  keeps (Q-035); the `never_finishes` text, which stays for the inputs of 3.8.
- The key that leaves `cd_circ_rejected` (Q-033 (1)) and Q-032.
- The generator's diameters (nominal sizes, an open point of `bugfix.md`).
- The app: the limits page, how it shows a rejection and the flag, and showing H-009 are
  quickened-app's work; this spec only fixes where the limits text lives.
- Step-Backwater, and any shape other than the circle.
