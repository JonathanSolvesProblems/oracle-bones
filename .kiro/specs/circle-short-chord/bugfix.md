# Bugfix Requirements Document: circle-short-chord

## Introduction

Circle Critical Depth handles a chord that is still short of q the wrong way. The rebuild takes
the chord again on the narrowed bracket (Q-026 candidate N2, chosen for Normal Depth in
`circle-outputs` 2.7 and applied to Critical Depth by 2.9, where no golden reached the branch).
QUICK-2 instead resumes stepping from the short chord with the same 0.2 ft step (K1, the shared
search's rule for every other shape, A-001). The spec also covers how a trial is tested against
the diameter: the rebuild lets a trial that lands exactly on its stored diameter through to the
geometry, where QUICK-2 printed the message on five goldens (A-012, A-014, A-015). The fix
rejects that trial (trial ≥ D), which leaves one known difference, the 9.6 in pipe of 2.6.

Evidence, in order:

- A-008 graded A-007's four cases. QUICK-2 rejected P1 (10.1 in, 3 cfs, run
  20261124-225953-c32ec8), where the rebuild prints a result, and printed cd-circ-000033
  (11.9 in, 3 cfs) with Critical Slope `0.0090`, where the rebuild prints `0.0089`. Every
  printed field of cd-circ-000033 needs a search depth of 0.74203 to 0.74279 ft. The rebuild's
  chord lands at 0.74322. The Skeptic held the claim (ledger decisions 77 and 80).
- A-009 scored five short-chord rules on the 27 circle Critical Depth results and the four
  rejections then known. K1 was the only rule to get 31 of 31. It committed predictions for
  four new cases (Q1 to Q4) before they ran.
- A-010 graded them. K1 got 4 of 4 and the rebuild 0 of 4. QUICK-2 rejected Q1 (8 in, 1 cfs,
  run 20261125-100706-f61649) and Q2 (22.7 in, 23 cfs, run 20261125-100748-9dd937), and printed
  K1's row on every field of cd-circ-000035 (Q3) and cd-circ-000036 (Q4).
- Q-022 asks where QUICK-2 prints "DEPTH is Greater than the DIAMETER" and whether the profile
  should map it. Q-029 records the one run on a pipe where a trial lands on the diameter.
- A-011 lists every pipe from 8 to 180 in where a trial lands on the diameter, compares five ways
  QUICK-2 could form its trials, and commits predictions for five standard-size cases (S1 to S5)
  before they run. Its amendment of 2026-11-25 (commit 3d9bf3a) corrects two statements,
  shows that the list depends on how the diameter is stored, and adds S6 to S11: S6 to S10
  separate K1 from N2, and S11 separates the two ways of storing the diameter.
- A-012 graded S1 to S11. K1 got 10 of 11. S2 (12 in, 4 cfs, now cd-circ-000045) printed the
  message where the rebuild's trial lands on the diameter, which contradicted 1.4, 2.6 and 2.7
  as first written.
- A-013 and its amendment (commits 69338b5 and 6ecfb3c) scored 184 ways of forming the trial,
  storing the diameter and testing one against the other, and committed seven cases (R1, R2, R4,
  R6 to R9) that give each of 14 surviving groups a different row.
- A-014 graded them. QUICK-2 printed the message on all seven (cd-circ-000054 to -000060). Only
  T1·D3·X6 and T2·D3·X6 fit all 54 circle Critical Depth goldens: the trial stored as a single,
  the diameter in feet as VAL/12 in double, and the test trial·12 ≥ store(VAL). The seven cases
  picked that group, so A-014 commits three held-out cases (H1 to H3) for it. A-014 also
  reports that VAL/12 in double changes no printed field on any circle golden.
- A-015 graded H1 to H3. QUICK-2 printed the message on all three (cd-circ-000061 to -000063),
  where T1·D3·X6 and T2·D3·X6 (A-014's group G3) predicted the shape menu on H1 and H2, so G3
  is refuted by its first held-out cases.
  Of the 184 combinations none fits all 57 circle Critical Depth outcomes, and 56 miss only
  obs-cdmenu-000001, all by giving the message there. 2.4's rule, T1·D1·X2, is one of the 56,
  picked as the smallest change to the rebuild.

Normal Depth keeps N2 (A-009, Not part of this; Q-026 stays open). Nothing in this spec
changes a printed value outside circle Critical Depth. Inside it, the change is larger than the
goldens show: on A-007's 2000 generated practical circles (seed 20261126), K1 differs from the
current rebuild in outcome or in a printed field on 79, and it rejects 27 where the rebuild
rejects 11 (A-009). Those 79 are predictions, not observations, and are not reported as coverage.

Every number below comes from `results/attempts.md` A-008 to A-016, from
`node scripts/circle_outputs.mts floor` (2.7), from the ledger, or from the comparator. The run
folders cited are under `oracle/out`, which is not committed. The rejection screen is mapped (accepted, see Order of work), and the six rejections, S1 to S11,
A-013's seven cases and A-014's three are committed goldens (2.11).

Terms:
- **Search depth**, **chord** and **known difference**: as in `circle-outputs`.
- **Short chord**: a chord whose A·√(g·A/T) is more than 0.5% below q.
- **K1**: after a short chord, the chord becomes the lower end and the next trial is the chord
  plus 0.2 ft. Stepping and chording then continue as from the start.
- **The test against the diameter**: a trial is rejected when the stored trial, store(y + 0.2)
  as now, is at or past the stored diameter, store(store(VAL)/12) as now: trial ≥ D, where the
  rebuild today tests trial > D (A-015's T1·D1·X2; A-013's X2).
- **The 9.6 in difference**: Diameter 9.6, n .013, Discharge 2, Slope .005, where QUICK-2
  ended on the shape menu with no result and no message (obs-cdmenu-000001, three runs) and the
  test against the diameter rejects stepped trial 4, 0.8000000119 ft, which equals D (A-015). It
  is a known difference that the comparator never grades, because obs-cdmenu-000001 is a
  behaviour case.
- **The six rejections**: the inputs below, all circle Critical Depth, where QUICK-2 left
  "DEPTH is Greater than the DIAMETER" on the form, showed Depth `0.00` and filled no output
  field (A-008, A-010; ledger decisions 75 and 80). They were recorded as goldens in ledger
  decision 94.

| Name | Diameter | n | Discharge | Slope | Run | Golden | Rebuild now | K1 |
|---|---|---|---|---|---|---|---|---|
| Q-022 run | 9.1 | .0216 | 2 | 1.9915 | 20261122-214714-6aaf2d | cd-circ-000039 | rejected | rejected |
| P1 | 10.1 | .013 | 3 | .005 | 20261124-225953-c32ec8 | cd-circ-000040 | result (0.75200) | rejected |
| P2 | 10.1 | .013 | 4 | .005 | 20261124-230038-48c33a | cd-circ-000041 | rejected | rejected |
| P4 | 11.9 | .013 | 4 | .005 | 20261124-230140-e185ee | cd-circ-000042 | rejected | rejected |
| Q1 | 8 | .013 | 1 | .005 | 20261125-100706-f61649 | cd-circ-000043 | result (0.47330) | rejected |
| Q2 | 22.7 | .013 | 23 | .005 | 20261125-100748-9dd937 | cd-circ-000044 | result (1.69660) | rejected |

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN circle Critical Depth reaches a short chord THEN the system takes the chord again on
[short chord, upper trial] until a chord is within 0.5%. In cd-circ-000033 (11.9 in, n .013,
q 3, S .005) the first chord is 0.73486 (2.444% short), the second lands at 0.74322, and the
system prints Critical Slope `0.0089` where QUICK-2 printed `0.0090` (A-008, A-009).

1.2 WHEN the same rule runs on cd-circ-000035 (37 in, q 77) and cd-circ-000036 (51 in, q 4)
THEN the system prints Depth `2.75` where QUICK-2 printed `2.74`, and Critical Slope `0.0038`,
Velocity `3.5` and Max Discharge `112` where QUICK-2 printed `0.0039`, `3.6` and `113`. Its
search depths are 2.75615 and 0.56793; K1's are 2.75394 and 0.56735 (A-010).

1.3 WHEN P1, Q1 or Q2 is run THEN the system prints a result at search depth 0.75200, 0.47330
or 1.69660, where QUICK-2 printed "DEPTH is Greater than the DIAMETER" (A-008, A-010).

1.4 WHEN a 0.2 ft trial lands on the rebuild's stored diameter, `store(store(VAL)/12)`, THEN the
chord on [last trial inside, D] lands back on the last trial inside, stepping returns to D, and
the system returns outcome `error` with the `never_finishes` flag after 1,000,000 trials, under
N2 and under K1 alike. The flag's text says "QUICK-2 never finishes this calculation; it keeps
searching." The rebuild tests the trial against that store with trial > D, so a trial exactly
on D passes. QUICK-2 printed "DEPTH is Greater than the DIAMETER" on five goldens where the
rebuild returns this `error`: cd-circ-000045 (S2, 12 in, 4 cfs; A-012), cd-circ-000056 (R4,
55.2 in, 276 cfs) and cd-circ-000060 (R9, 57.6 in, 312 cfs; A-014), and cd-circ-000061 (H1,
4.8 in, 1 cfs) and -000062 (H2, 2.4 in, 1 cfs; A-015). On the 9.6 in pipe QUICK-2 did not keep
searching: obs-cdmenu-000001 (9.6 in, n .013, q 2, S .005) ended on the shape menu with no
result and no message, as the exploratory run 20261125-100815-dff8b0 did. The flag text claims
something that case contradicts. 50.4 and 52.8 in, also pipes where the rebuild's trial lands
on its stored diameter (A-011), have no golden; there the search reaches D only for a typed
discharge above the critical discharge at 0.9·D.

1.5 WHEN QUICK-2 printed "DEPTH is Greater than the DIAMETER" before the profile mapped the
screen THEN the case timed out on `cd_form` and no golden was stored (Q-022), so the comparator
could not grade the six rejections. This is fixed in the harness, not by this spec's solver
change: the profile maps `cd_circ_rejected` (4773535, see the Decision below), rejections end
on it since the Q-030 fix (40b8f6d), and the 25 rejections are goldens, cd-circ-000039 to
-000063, which the comparator grades on outcome.

### Expected Behavior (Correct)

**The search after a short chord**

2.1 WHEN circle Critical Depth reaches a short chord THEN the system SHALL make the chord the
lower end and take the next trial at the chord plus 0.2 ft, stepping by 0.2 ft and taking a
chord again when a trial passes q (K1; A-009, A-010). Everything else in the search SHALL stay
as `circle-outputs` 2.9 and 2.10 set it: trials from 0.2 ft by 0.2 ft, the 0.5% stop, the
diameter as a ceiling on every trial, the fields at the search depth, and Depth printed 0.01 ft
below it. In cd-circ-000033 the trials SHALL run 0.93486, chord 0.74060 (0.889% short), 0.94060,
chord 0.74259 (0.345% short), and stop there (A-009).

2.2 WHEN cd-circ-000033, cd-circ-000035 and cd-circ-000036 are graded THEN the system SHALL
print every field as QUICK-2 printed it: Critical Slope `0.0090`; Depth `2.74`; Critical Slope
`0.0039`, Velocity `3.6` and Max Discharge `113` (A-008, A-010).

2.3 WHEN any other circle Critical Depth result golden is graded THEN the system SHALL print
every field as it does now. cd-circ-000023, -000024 and -000026 reach the short-chord branch,
and K1 prints what N2 prints for all three (A-009, Why one mechanism).

**Rejection**

2.4 WHEN a circle Critical Depth trial, stepped from the start or resumed from a short chord,
is taken before a trial or a chord is within 0.5% of q THEN the system SHALL test it against
the diameter first, and SHALL return outcome `rejected` with the message "DEPTH is Greater
than the DIAMETER" and no printed field when the stored trial is at or past the stored
diameter (trial ≥ D). The trial is stored as a single, store(y + 0.2), and D is
store(store(VAL)/12), both as now; only the comparison changes, from trial > D. D stays as now
for the geometry and every printed field of circle Critical Depth. All 25 rejection goldens,
cd-circ-000039 to -000063, SHALL be rejected and SHALL match (A-009, The rule I would adopt
for Q-022; A-010; A-012; A-014; A-015). The boundary is therefore not a fixed discharge or a
fixed share of the diameter. S(f) is refuted by Q1, rejected at a share of 0.712·D (A-010).
This rule is A-015's T1·D1·X2. It is one of 56 of A-013's 184 combinations that fit every
circle Critical Depth golden and miss only obs-cdmenu-000001, and nothing observed separates
it from the other 55. It is chosen because it is the smallest change to the rebuild. Its 10 of
10 on R1, R2, R4, R6 to R9 and H1 to H3 is derived after those cases ran, not predicted, and
A-013 had already found that it misses the 9.6 in run (A-015).

2.5 WHEN a rejection is shown THEN `results/hauntings.md` SHALL record it as haunting H-009
with Q1's golden, cd-circ-000043: QUICK-2 printed "DEPTH is Greater than the DIAMETER" for 1
cfs in an 8 in pipe, where A·√(g·A/T) reaches q at about 0.712·D (A-009). S7 (15 in, 7 cfs,
0.848·D) and S8 (18 in, 12 cfs, 0.876·D) were both rejected (A-012), so H-009 SHALL cite their
goldens too, cd-circ-000049 and cd-circ-000050, since 15 and 18 in are sizes engineers use
(A-011 amendment). For each case cited, the exact critical depth, with the
true π and no single-precision rounding, and its distance below the crown, SHALL be computed
for the entry (oracle law rule 5).

**The 9.6 in difference (Q-029)**

2.6 WHEN circle Critical Depth is run with Diameter 9.6, n .013, Discharge 2, Slope .005 THEN
the system SHALL return what 2.4 gives, outcome `rejected` with the message, at stepped trial
4, 0.8000000119 ft, which equals D. QUICK-2 ended on the shape menu with no result and no
message there (obs-cdmenu-000001; runs 20261125-100815-dff8b0 and 20261125-184734-96cde0 and
the run that recorded the case, ledger decision 98). The solver SHALL have no special case for
this input or this pipe. The difference SHALL be recorded as a known difference in the ledger
and in the known differences of `results/hauntings.md`, citing obs-cdmenu-000001 and A-015.
Q-029 SHALL be open: why QUICK-2 ends on the shape menu for 9.6 in at 2 cfs and prints the
message for 4.8 in (cd-circ-000061) and 2.4 in (cd-circ-000062) at 1 cfs, where a stepped
trial lands on D in all three. The entry SHALL list what was tried (A-015, Q-029 goes back to
open).

2.7 WHEN the app shows the outcome of 2.6 THEN it SHALL show the rejection as it shows any
rejection of 2.4, and SHALL say nothing about the shape menu, since the solver returns
`rejected`. The limits page of the app SHALL list the 9.6 in difference: for 9.6 in, n .013, 2
cfs, slope .005, QUICK-2 went to its shape menu with no message (obs-cdmenu-000001), and
Quickened shows "DEPTH is Greater than the DIAMETER".

A trial on or past D SHALL no longer raise the `never_finishes` flag, so every input named in
1.4 is rejected instead: cd-circ-000045, -000056, -000060, -000061 and -000062, the inputs of
obs-cdmenu-000001, and 50.4 in at 216 cfs and 52.8 in at 245 cfs, which reach D, all `error`
with the flag today and `rejected` under 2.4 (`node scripts/circle_outputs.mts floor`). A
discharge under or just above the least value of A·√(g·A/T) in the pipe SHALL still raise it,
as now. With π = 3.1416 the area does not go to 0 as y does, while the top width does, so
A·√(g·A/T) has a floor: 6.34E-8 cfs at 12 in, 1.15E-5 at 96 in, .570 at 7254 in and 1.27 at
9999 in (6.34E-8·D^2.5 cfs at y = 1.95E-5·D, from the rebuild's stored geometry; the same
formulas unstored give the same values). The first trial, 0.2 ft, is above q, so the chords
are taken on [0, 0.2], and each lands lower, where A·√(g·A/T) is higher, until one is 0, where
T = 0. The search cannot get under the floor or close above it: 12 in at 1E-7 cfs (1.6 times
the floor), 7254 in at .5 and 9999 in at 1 give `error` with the flag today, and never finish
in A-015's model of 2.4 with K1; in the 12 in pipe that model first gives a result at about
2.8 times the floor. What
QUICK-2 does for these inputs is unobserved. The flag's text, "it keeps searching", is a
prediction for them, with no capture, and T = 0 is the division A-013's assumption reads as a
run-time error. No golden is near the floor: the nearest circle Critical Depth golden,
cd-circ-000019 (2200 in, 2000 cfs), is 6.9E4 times its pipe's floor. A-016's last two cases
are under it.

**Records**

2.8 WHEN the fix is built THEN `circle-outputs` 2.9 ("A short chord SHALL be handled as in
2.7"), the quick2-solver design's search table and the comments in `search.ts` and `circle.ts`
SHALL say that circle Critical Depth uses K1 and circle Normal Depth uses N2, each with its
evidence, and that circle Critical Depth tests trial ≥ D (2.4), with the 9.6 in difference
of 2.6.

2.9 WHEN the fix is built THEN the comparator SHALL grade every circle golden as matching
except cc-circ-000035 and nd-circ-000020, and every full-set golden except those two and
sb-irr-000001 to -000003. Every golden recorded from A-011, its amendment, A-013, its
amendment and A-014 SHALL match. The counts today are the comparator's (the full set and the
quick set, after commit c865f11, with H1 to H3 as the goldens cd-circ-000061 to -000063):

| Goldens | Full set | Rebuild today (N2, `store(store(VAL)/12)`, trial > D) | After the fix |
|---|---|---|---|
| With cd-circ-000039 to -000063 | 314 | 291: misses cd-circ-000033, -000035, -000036 and -000038 on fields; cd-circ-000040, -000043, -000044, -000049 to -000052, -000057 and -000058 on outcome (a result); cd-circ-000045, -000056, -000060, -000061 and -000062 on outcome (`error`); cc-circ-000035, nd-circ-000020 and sb-irr-000001 to -000003 | 309 |

Quick set: 192 of 200 today; its misses are cc-circ-000035, cd-circ-000038, cd-circ-000057,
cd-circ-000058, nd-circ-000020 and sb-irr-000001 to -000003. None of cd-circ-000061 to -000063
is in it. After the fix, 195 of 200, since cd-circ-000038, -000057 and -000058 match. The
after-the-fix counts are derived: T1·D1·X2 with K1 fits all 56 circle Critical Depth goldens
it is scored on (A-015), which removes the 18 circle Critical Depth misses above. The comparator
SHALL confirm them, and the quick set count SHALL be reported before and after.
obs-cdmenu-000001 is a behaviour case and is in neither count, so the 9.6 in difference of 2.6
does not show in them.

2.10 WHEN the fix is built THEN the ledger SHALL record K1 as observed for the circle
Critical Depth short-chord branch, citing cd-circ-000033, -000035 and -000036 and the six
rejection goldens. Q-022 is already answered in part in the ledger (the profile maps the
screen), and the Exhumer moved the rest to Q-033 (75897a7). Q-033 (2), from what discharge
QUICK-2 prints the message for a given pipe, SHALL be answered with the rule of 2.4 as the
rule the rebuild uses, citing A-015 and the 25 rejection goldens, and SHALL say that 56
combinations fit them equally and that the rule gives the message for the 9.6 in pipe of
2.6. Q-033 (1), the key that leaves the screen, SHALL stay open and be recorded as unobserved.
Q-029, answered in the ledger today, SHALL be reopened as 2.6 says. Q-026 and Q-032 (a) SHALL
stay open. The 79 generated circles of A-009 SHALL NOT be reported as coverage (oracle law
rule 7).

**Order of work**

2.11 WHEN the design is written THEN no further oracle run SHALL be needed before it, and
WHEN the solver is changed THEN A-016's cases SHALL have run first: 8 in at 1.6, 1.71 and 1.8
cfs, 15 in at 10.5, 10.8 and 11 cfs, 9.6 in at 1.5, 1.8, 3 and 10 cfs, 9999 in at .5 cfs and
7254 in at .3 cfs, n .013 and slope .005, as `results/attempts.md` A-016 types them,
committed before any of them runs. They are the first predictions made for K1 with 2.4's
rule before the cases ran. A case that times out stores no golden. Done before A-016: the
rejection screen is mapped (`cd_circ_rejected`); the six rejections are cd-circ-000039 to
-000044, S1 and S6 are cd-circ-000037 and -000038, S2 to S5 and S7 to S11 are cd-circ-000045 to
-000053, A-013's R1, R2, R4 and R6 to R9 are cd-circ-000054 to -000060, and the 9.6 in run is
obs-cdmenu-000001 (ledger decisions 87, 88 and 94 to 98). A-014's held-out cases H1 (4.8 in),
H2 (2.4 in) and H3 (7.2 in) ran in one Exhumer session after A-014 (commit f066861) was
committed, as A-014 types them (n .013, 1 cfs, slope .005), with every screen kept; all three
ended rejected and are cd-circ-000061 to -000063 (decision 100).

2.12 WHEN H1 to H3 were graded against A-014 as committed (A-015) THEN H1 and H2 missed: QUICK-2
printed the message where G3 predicted the shape menu. G3, which fit 54 of 54, is refuted by
its first held-out cases, and these requirements are revised again, as this criterion
required, and shown before the design is written. Graded so far: A-012 graded S1 to S11, where
S2 contradicted 1.4, 2.6 and 2.7 as first written; A-014 graded R1, R2, R4 and R6 to R9, which
picked G3 (T1·D3·X6 and T2·D3·X6); A-015 graded H1 to H3, which refuted G3, and rescored all
184 combinations: none fits all 57 circle Critical Depth outcomes, and 56 miss only
obs-cdmenu-000001. The rule of 2.4 is one of the 56, and no case was predicted for it before it
ran. A-016's cases are graded the same way, against A-016 as committed, before the solver
changes. A miss on any of them revises these requirements again, and the revision is shown
before the solver changes.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any trapezoid, V-ditch, rectangle or irregular golden is graded THEN the system SHALL
CONTINUE TO match it on every field, on the quick set and the full set. Their search keeps its
own 0.5 ft step, 1% stop and resume rule (A-001).

3.2 WHEN circle Normal Depth reaches a short chord THEN the system SHALL CONTINUE TO take the
chord again on the narrowed bracket (N2), with 0.1 ft trials from 0.1 ft and the 0.5% stop.
Every Normal Depth circle golden SHALL CONTINUE TO print what it prints now (circle-outputs 2.5
to 2.7; A-009, Not part of this).

3.3 WHEN Channel Capacity is run on the circle THEN the system SHALL CONTINUE TO print what it
prints now for all 34 Channel Capacity circle goldens (circle-outputs 2.1 to 2.3).

3.4 WHEN cc-circ-000035 and nd-circ-000020 are graded THEN they SHALL CONTINUE TO be the only
circle known differences the comparator grades (the 9.6 in difference of 2.6 is a behaviour
case and is not graded): Max Discharge `101166` where QUICK-2 printed `101165` (Q-028), and
Velocity `5.7` and Froude `2.4` where QUICK-2 printed `5.8` and `2.5` (Q-026). Neither SHALL be
recorded as a haunting (circle-outputs 2.4, 2.8).

3.5 WHEN a circle input is held on the form (a Diameter of 0 or -1, a Channel Capacity Depth
above the diameter, a 0 at any prompt) THEN the system SHALL CONTINUE TO hold it. All 20 circle
goldens that are not results SHALL stay matched (circle-outputs 3.2).

3.6 WHEN the Q-022 run, P2 or P4 is run THEN the system SHALL CONTINUE TO reject it. Each
passes the diameter before any chord is taken, so the short-chord rule does not reach them
(A-009).

3.7 WHEN circle Critical Depth is run with a different slope THEN the system SHALL CONTINUE TO
change only the Slope echo (Property 6; H-007).

3.8 WHEN n is -1 in prismatic Normal Depth, or a section has one ground point (nd-irr-000026)
THEN the system SHALL CONTINUE TO return `error` with the `never_finishes` flag and its text.
Circle Critical Depth SHALL CONTINUE TO do the same when the discharge is under or just above
the floor of 2.7; 2.7 removes the flag only where a trial lands on or past the diameter.

3.9 WHEN the solver or format source is checked THEN it SHALL CONTINUE TO pass the guard
tests: no case id or golden path in the source, and every constant in `constants.ts` cited.
K1 adds no constant.

## Decision: map the rejection screen in the profile

**Accepted (2026-11-25).** The screen is mapped, and the six rejections are recorded as goldens
before the solver changes (2.11). The reasons, as recommended:

- P1, Q1 and Q2 are half of the evidence that separates K1 from N2, and today they exist only as
  final screens in uncommitted run folders. Recorded, they are committed, repeatable and graded
  by the comparator on every run.
- Without them, the comparator sees K1 only through three result goldens. A later change that
  moved the rejection boundary would pass every check.
- Recorded before the fix, the comparator shows the rebuild missing P1, Q1 and Q2 on outcome.
  After the fix it shows them matching.

What it costs:
- **Profile:** one screen in `oracle/targets/quick2.json`, kind `rejected`, marker on the message
  text, message on 0-based row 20 from column 13 (run 20261124-225953-c32ec8, final screen). It
  must sit before `cd_form`, because the first matching screen wins (`screen.identify`) and the
  `cd_form` marker also matches the rejection screen. It maps no field, so the golden's printed
  fields are empty and the comparator grades the outcome only. The Depth `0.00` stays in the
  capture, ungraded, because the rebuild does not model it.
- **Citation, in two steps:** a profile fact needs a `cite` naming a stored golden or capture,
  or an `unobserved` note (`test_every_cite_names_a_stored_golden_or_capture`). Run ids are not
  allowed. So the screen starts with an `unobserved` note naming the six runs, and the note is
  replaced by a `cite` of the new goldens once they are recorded.
- **Stored goldens:** none should be read differently. No file under `oracle/goldens` contains
  "Greater than the DIAMETER" (searched for this spec), so the reread check should pass with no
  version bump and no rerecord. The design confirms it by running the check.
- **Oracle runs:** six cases with record true, and S1 to S11, in one session. Rejections end
  on the stop screen instead of waiting out a timeout. The recorder assigns the case ids.
  Recording through the Exhumer spends credits; the runs themselves do not.
- **Counts:** the full set grows from 287 to 293 goldens with the six rejections, and to 303 if
  S1 to S11 go as predicted (2.9).
- **Side effects:** generated batches that reach this message will store a `rejected` golden
  instead of timing out. Normal Depth and Channel Capacity have never been seen printing the
  message. If they do, a marker on the message alone reads them as rejected too, which is what
  the rebuild already returns for them.
- **Not answered by it:** which key leaves the screen. The form shows `<F2>` and `<F7>`, both
  untried there. A case ends on the stop screen, so recording does not need it.

## Open points

- Q-029, open again: why QUICK-2 ends on the shape menu for 9.6 in at 2 cfs and prints the
  message for 4.8 and 2.4 in at 1 cfs, where a stepped trial lands on D in all three.
  obs-cdmenu-000001 keeps one screen per step, so the screens between the last Enter and the
  menu are not seen, and no capture shows a QuickBASIC error. What was tried is in A-015. The
  person also searched about 32,000 wider models after the fact; the 16 that fit were chosen by
  one pipe, so none is adopted.
- What QUICK-2 does when the discharge is under or just above the floor of 2.7. The rebuild
  raises `never_finishes` there, before and after this fix, and the flag's text, "it keeps
  searching", is a prediction with no capture. A-016's 9999 in at .5 cfs and 7254 in at .3 cfs
  ask it; a run that times out stores no golden. No golden is near the floor (2.7).
- How QUICK-2 forms its trials and stores the diameter. None of the 184 combinations A-013 and
  its amendment wrote down fits all 57 circle Critical Depth outcomes; 56 miss only
  obs-cdmenu-000001 and give the same outcome on every observation (A-015). No grid case
  separates T1 from T2 (0.2 a double or .2 a single).
- Q-026: whether Normal Depth also uses K1. Normal Depth keeps N2 here because only N2 prints
  nd-circ-000020's Top Width `2.0`. QUICK-2 may treat the two modes differently, and nothing
  observed shows whether it does.
- Whether practical circles should also draw from nominal sizes. The generator draws Diameter
  uniformly from 8 to 180 in and rounds it to 0.1 in (`generator._draw`), so 12.0 in, or 24.0
  in, comes up about once in 1720 draws. The sizes people use, where trials land on, just past
  or just below the diameter (A-011), are almost never tested.
  This spec does not change the generator.
- K1 was chosen on two cases (cd-circ-000033 and P1) and held on four it was not chosen on
  (A-010). The 79 generated circles where K1 and the current rebuild differ are unrecorded.
