# Bugfix Design Document: circle-short-chord

## Overview

The fix changes how circle Critical Depth searches, and nothing else. It has two parts, each
tied to requirements in `bugfix.md` and to the scoring in `results/attempts.md` A-008 to A-016.

1. After a short chord, circle Critical Depth resumes stepping from the chord with the same
   0.2 ft step (K1), the rule the prismatic shapes already use (2.1 to 2.3).
2. A circle Critical Depth trial is rejected when it is at or past the stored diameter,
   trial ≥ D, where today it is rejected only past it, trial > D (2.4, 2.6, 2.7). The trial and
   D are stored as now: store(y + 0.2) and store(store(VAL)/12).

Circle Normal Depth keeps N2 and trial > D (3.2). Channel Capacity does not search and is not
touched (3.3). The prismatic and irregular searches are untouched (3.1).

**Gate.** A-016's twelve cases (committed in 414cad4) run and are graded against A-016 as
committed before `app/src` changes (2.11, 2.12). A miss revises the requirements, and this
design with them.

**Reference implementation.** `node scripts/circle_outputs.mts design` (about 1 s, never runs
the program) writes out the search of `search.ts` with K1 and trial ≥ D and grades every circle
Critical Depth golden with it. Where this design and the script disagree on an evaluation order
or a store, the script is right, because its numbers were checked against the goldens: on all
twelve A-016 cases its N2 with trial > D gives what `solve()` gives today, and its K1 with
trial ≥ D gives what A-015's model of T1·D1·X2 gives (`a016`). The build is done when `solve()`
gives what the script gives under 2.4.

**Expected result** (2.9). Full set 291 of 314 today, 309 after. Quick set 192 of 200 today,
195 after. The misses left are cc-circ-000035 and nd-circ-000020 (known differences) and
sb-irr-000001 to -000003 (Step-Backwater, not built). No golden that matches today stops
matching. Of the 59 circle Critical Depth goldens, 3 are held at a prompt and never reach the
search (cd-circ-000003, -000007, -000008); of the other 56, 38 match today and all 56 match
after (`design`). The 18 that change:

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
| cd-circ-000045 | `error`, `never_finishes` (S2) | rejected | trial ≥ D (1.4) |
| cd-circ-000056, -000060 | `error`, `never_finishes` (R4, R9) | rejected | trial ≥ D (1.4) |
| cd-circ-000061, -000062 | `error`, `never_finishes` (H1, H2) | rejected | trial ≥ D (1.4) |

cd-circ-000038, -000057 and -000058 are the three in the quick set.

## Fault condition and root cause

| Requirement | Fault | Root cause, with evidence |
|---|---|---|
| 1.1, 1.2 | Critical Slope, Depth, Velocity and Max Discharge one unit off on cd-circ-000033, -000035, -000036 (and -000038) | The chord is taken again on the narrowed bracket (N2). QUICK-2 resumes stepping from the short chord (K1): every field of cd-circ-000033 needs a search depth of 0.74203 to 0.74279; N2 lands at 0.74322 and K1 at 0.74259 (A-008, A-009, A-010). |
| 1.3 | A result where QUICK-2 printed the message (P1, Q1, Q2, S7 to S10, R6, R7) | Under N2 the narrowed chords stay inside the bracket and converge. Under K1 the trial after the short chord is 0.2 ft up and passes D, and QUICK-2 printed the message (A-010, A-012, A-015). |
| 1.4 | `error` with `never_finishes` where QUICK-2 printed the message (S2, R4, R9, H1, H2) | The test is trial > D, so a stepped trial exactly on D reaches the geometry. There T = 0, A·√(g·A/T) is infinite, the chord lands back on the last trial inside, and the search loops until it gives up. QUICK-2 rejects that trial (A-012, A-014, A-015). |

Both faults are in the options `modes/circle.ts` passes to the shared search. The search's
code paths already do what K1 needs (`afterShortChord: 'resume'`, A-001), and its ceiling test
already runs before F is evaluated.

## Changes by file

### `app/src/solver/search.ts`

`SearchSpec` gains one field, with a default that keeps today's behaviour:

- `rejectAtCeiling?: boolean`. Default `false`: a trial is rejected when it is past the
  ceiling (trial > ceiling), as now. `true`: a trial is rejected when it is at or past it
  (trial ≥ ceiling).

The only ceiling test in the search is the first statement of the stepping loop, so it comes
before `F(y)` is called, for the first trial, for every stepped trial, and for every trial
resumed from a short chord (with `'resume'`, a short chord sets `y = store(y + step)` and goes
back to the stepping loop). Chords are not tested and need not be: a chord lies in [lo, hi],
and hi is a trial that passed the test. So with `rejectAtCeiling: true` no depth at or past the
ceiling reaches F. `SearchResult` is unchanged: a trial that fails the test returns
`past_ceiling`, as now.

The header comment says which caller uses which rule: circle Critical Depth `'resume'` (K1)
with `rejectAtCeiling` (circle-short-chord 2.1, 2.4); circle Normal Depth `'narrow'` (N2,
Q-026 open) with trial > D; prismatic and irregular `'resume'` with no ceiling. It also says
that a search whose discharge is under the floor of A·√(g·A/T) still gives up with
`never_finishes` (2.7).

The prismatic and irregular callers pass no new field, so their path is the same code with the
same default.

### `app/src/solver/modes/circle.ts`

- A new exported function `circleSearchSpec(D, mode)` returns the spec each mode uses, so the
  spec object says which rule applies and tests can use the same object:
  - `'normal_depth'`: `{ bottom: 0, first: CIRCLE_STEP, step: CIRCLE_STEP, ceiling: D,
    tol: CIRCLE_TOL, afterShortChord: 'narrow' }`, which is today's.
  - `'critical_depth'`: `{ bottom: 0, first: CIRCLE_CD_STEP, step: CIRCLE_CD_STEP, ceiling: D,
    tol: CIRCLE_TOL, afterShortChord: 'resume', rejectAtCeiling: true }`.
- `normalDepthCircle` and `criticalDepthCircle` call `search(F, q, circleSearchSpec(D, mode))`.
- `searchCircle(F, q, D, step)` stays, unchanged in behaviour (N2, trial > D), because
  `scripts/q022_boundary.mts` calls it with A-007's 0.1 ft step. Its doc comment says so. No
  mode calls it.
- `notFound` is unchanged: `past_ceiling` is outcome `rejected` with "DEPTH is Greater than the
  DIAMETER"; `never_finishes` is `error` with the flag.
- The header comment is rewritten: circle Critical Depth uses K1 (cd-circ-000033, -000035,
  -000036 and the six rejections; A-009, A-010) and trial ≥ D (2.4; A-015's T1·D1·X2, one of
  56 combinations that fit, picked as the smallest change); circle Normal Depth uses N2 with
  Q-026 open; the 9.6 in difference (2.6) and the floor (2.7) are named, with no case id in the
  source. The stale sentences go: "the profile has no screen for it yet, so no golden records
  it" and "No Critical Depth golden reaches the short-chord branch".

No constant is added (3.9): the step, the stop and the diameter are as now, and
`rejectAtCeiling` is a switch, not a value.

### Files that do not change

`geometry/circle.ts`, `constants.ts`, `forms.ts`, `capacity.ts`, `flags.ts` (the
`never_finishes` text stays; 2.7 records that it is a prediction for the floor case), every
prismatic and irregular mode, and `app/src/format/`.

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

**Known differences, a new section after the hauntings.** The hauntings compare QUICK-2 with
exact hydraulics; this section lists where Quickened does not do what QUICK-2 did. It starts
with one entry, the 9.6 in difference, in this shape:

```
### Circle Critical Depth, 9.6 in pipe, 2 cfs

- **Case:** obs-cdmenu-000001 (behaviour case; three runs; ledger decision 98).
- **QUICK-2:** went back to its shape menu with no message and no answer.
- **Quickened:** shows "DEPTH is Greater than the DIAMETER".
- **Why it is left:** ... (circle-short-chord 2.6, results/attempts.md A-015, Q-029)
- **Limits page:** <one paragraph in plain words for a permit reviewer>
```

The **Limits page** paragraph is the text the app's limits page shows. It lives only here: the
quickened-app spec reads it from `results/hauntings.md`, section "Known differences", one entry
per `###` heading, the paragraph after `**Limits page:**`, and does not copy it. The draft:
"For Critical Depth in a 9.6 in pipe at 2 cfs (n .013, slope .005), QUICK-2 went back to its
shape menu without a message or an answer. Quickened shows "DEPTH is Greater than the
DIAMETER" instead. Why QUICK-2 does this for this pipe is not known." If A-016's V2 to V4 end
on the shape menu, the entry widens to the pipe before it is written. cc-circ-000035 and
nd-circ-000020 are not added here by this spec (3.4); they could join the section later.

### Ledger

The Exhumer owns these sections and writes them only through `ledger_write`; the default agent
does not edit `results/ledger.json`. Evidence must be a stored case id, a capture path, a run
id or a batch id, so A-015 and this spec are named in the text.

| Change | Requirement | Who, and how |
|---|---|---|
| Mismatch counts after the fix | 2.9 | The comparator, when the task runs `python scripts/oracle_quick.py` and `--full` (`ledger.set_mismatches`). Nobody writes them by hand. |
| K1 and trial ≥ D recorded as what circle Critical Depth does | 2.10 | An Exhumer session: `decide`, chose `write_requirement`, evidence cd-circ-000033, -000035, -000036 and cd-circ-000039 to -000044. |
| Q-033 (1), the key that leaves `cd_circ_rejected`, stays open as unobserved | 2.10 | The same session: `ask`, carrying Q-033 (1) to a new question, as Q-022 carried its rest to Q-033. `keys_untried` already lists `{Esc}` for the screen; no recorded case presses a key there. |
| Q-033 (2) answered with 2.4's rule | 2.10 | The same session, after the `ask`: `answer` Q-033 with 2.4's rule as the rule the rebuild uses, that 56 combinations fit the goldens equally (A-015), and that it gives the message for the 9.6 in pipe; evidence cd-circ-000039 to -000063. |
| The 9.6 in difference | 2.6 | The same session: `decide`, chose `triage`, saw and why naming the difference and A-015, evidence obs-cdmenu-000001, cd-circ-000061, cd-circ-000062. |
| Q-029 open again | 2.6, 2.10 | **Decision needed.** `ledger_write` cannot reopen a question: `answer` refuses one that is not open, and no op sets one back to open. (a) The Exhumer session asks a new question that names Q-029 and states 2.6's question, with evidence obs-cdmenu-000001, cd-circ-000061 and -000062. Q-029's answer, what the recording showed, stays true. This follows Q-022 to Q-033 and changes no tool, but 2.6 and 2.10 would say "carried to a new question" instead of "reopened". (b) A `reopen` op is added to `oracle/ledger.py` and the `ledger_write` schema, with a test, keeping the old answer in the entry's history; the Exhumer then reopens Q-029. That is a harness change outside this spec's files. Recommended: (a). |
| Q-026 and Q-032 (a) stay open; A-009's 79 generated circles are not coverage | 2.10 | Nothing is written. |

The Exhumer session runs after the comparator confirms 309 of 314, and runs no case.

### Other documents (2.8)

- `.kiro/specs/circle-outputs/bugfix.md` 2.9: a note after "A short chord SHALL be handled as in
  2.7" that circle Critical Depth now uses K1 and trial ≥ D, pointing here.
- `.kiro/specs/quick2-solver/design.md`, "The depth search": the paragraph on
  `afterShortChord` says circle Critical Depth uses `'resume'` (K1) with `rejectAtCeiling` and
  circle Normal Depth `'narrow'` (N2), each with its evidence; the sentence "No circle Critical
  Depth golden reaches the branch" goes; the 9.6 in difference is named.
- `scripts/circle_outputs.mts`: the `design` command, added with this design.

## Known differences

After the fix, as before, a test lists the graded ones so that any change in them fails it.

| Case | What differs | Graded | Ledger |
|---|---|---|---|
| cc-circ-000035 | Max Discharge `101166` for `101165` | yes | Q-028 |
| nd-circ-000020 | Velocity `5.7` and Froude `2.4` for `5.8` and `2.5` | yes | Q-026 |
| obs-cdmenu-000001 (9.6 in, 2 cfs) | QUICK-2 went to the shape menu; Quickened rejects with the message | no, a behaviour case | Q-029 (see Ledger) |

**Unobserved, not a known difference.** A discharge under or just above the floor of 2.7 (for
example 9999 in at .5 cfs) gives `error` with `never_finishes`, before and after the fix. What
QUICK-2 does there has no capture; A-016's W1 and W2 ask. No golden is near the floor.

## Correctness properties

### Property 10: no depth at or past the diameter reaches the circle Critical Depth geometry

For any circle Critical Depth input, every depth the search gives A·√(g·A/T) is below D. The
test wraps `circleCriticalDischarge(D)` to record each depth and runs `search` with
`circleSearchSpec(D, 'critical_depth')`, the object `criticalDepthCircle` uses. Diameters are
drawn from 2.4 to 180 in, half of them multiples of 2.4 in, where stepped trials land on D
(A-011), and discharges log-uniform from 0.01 cfs to twice A·√(g·A/T) at 0.99·D, so draws past
the crown are included. The script's draw of 20000 circles (8 to 180 in, up to 0.99·D) gave a
largest depth of 0.9999998·D, 19363 results and 637 messages, and no search that never
finished (`design`).
**Validates: Requirements 2.4, 2.7**

### Property 11: circle Normal Depth and Channel Capacity are identical before and after

For any generated circle, Normal Depth and Channel Capacity return the same `Result` after the
fix as before it: outcome, every printed field, message, held prompt, flags and every raw value.
"Before" is a fixture written from the unchanged solver by an explicit command, as
`searchSnapshot.ts` does for the prismatic search: a fixed list of generated inputs (seeded
draw, practical ranges and the ranges of the Exhumer's batches) and each `Result`, doubles as
exact decimals. The test replays the list after the fix and compares exactly.
**Validates: Requirements 3.2, 3.3**

Not a property: that an input stays rejected when its discharge goes up. A-016 predicts that it
does not (8 in: 1.6 cfs the message, 1.71 a result).

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
- Circle Critical Depth: the 38 goldens that match today still match, and the 18 above start to
  match (`design`, then the comparator).

## Testing strategy

All tests are Vitest in `app/test/`. The reproduction comes first and must fail before the fix.

0. **Gate.** A-016 graded against 414cad4 before step 1. Any miss stops the work (2.12).
1. **Reproduction** (`circle.test.ts`, new block "circle-short-chord"): the 18 goldens above
   through `solve()`, each compared with its golden as the comparator compares it (outcome, and
   every field of a result). It fails on the current code for all 18 and passes after.
2. **Every circle golden**: the existing table-driven block keeps its two known differences.
   A new block expects all 25 rejection goldens, cd-circ-000039 to -000063, to be `rejected`
   with "DEPTH is Greater than the DIAMETER" and no printed field.
3. **The 9.6 in difference**: 9.6 in, .013, 2, .005 returns `rejected` with the message, at
   stepped trial 4, which equals D. The test names obs-cdmenu-000001 and fails if the outcome
   changes.
4. **The floor**: 12 in at 1E-7 cfs returns `error` with `never_finishes` (2.7, 3.8); the
   existing negative-n and one-point tests are unchanged.
5. **Search option** (`search.test.ts`): on a hand-made increasing F with a trial that lands
   exactly on the ceiling, the default evaluates F there and `rejectAtCeiling: true` returns
   `past_ceiling` without calling F at that depth; the same for a trial resumed from a short
   chord that lands on the ceiling; and the default path's existing cases pass unchanged.
6. **Properties 10 and 11**: fast-check, 200 runs for Property 10 as for Property 6; Property 11
   replays its whole fixture. The fixture is written once, before step 1's code change, by
   `npm run snapshot:circle` (new, in `app/`), never by a test run.
7. **Guard**: the existing guard test; no new constant, no case id in the source.
8. **Comparator**: `python scripts/oracle_quick.py` and `--full`, before and after, keeping both
   reports. Quick set 192 to 195 of 200, full set 291 to 309 of 314. Every golden that matches
   before matches after; the five misses left are cc-circ-000035, nd-circ-000020 and
   sb-irr-000001 to -000003, with the same fields.
9. **Script agreement**: after the fix, `node scripts/circle_outputs.mts design` reports 56 of 56
   both "today" (its `solve()` column) and "after", and 0 starting to match. The script computes
   the search with its own code, so agreement checks the rebuild against an independent copy.
10. The full Python and Vitest suites pass.

## Not in scope

- Normal Depth's short-chord rule (Q-026) and nd-circ-000020.
- Which of the 56 combinations QUICK-2 uses (T1 against T2, the diameter store, the test), and
  why 9.6 in at 2 cfs ends on the shape menu (Q-029). The solver has no special case for it.
- What QUICK-2 does under the floor of 2.7, and the `never_finishes` text.
- The key that leaves `cd_circ_rejected` (Q-033 (1)) and Q-032.
- The generator's diameters (nominal sizes, an open point of `bugfix.md`).
- The app: the limits page, how it shows a rejection, and showing H-009 are quickened-app's
  work; this spec only fixes where the limits text lives.
- Step-Backwater, and any shape other than the circle.
