# Bugfix Requirements Document: circle-short-chord

## Introduction

Circle Critical Depth handles a chord that is still short of q the wrong way. The rebuild takes
the chord again on the narrowed bracket (Q-026 candidate N2, chosen for Normal Depth in
`circle-outputs` 2.7 and applied to Critical Depth by 2.9, where no golden reached the branch).
QUICK-2 instead resumes stepping from the short chord with the same 0.2 ft step (K1, the shared
search's rule for every other shape, A-001). The spec also covers how a trial is tested against
the diameter: the rebuild lets a trial that lands exactly on its stored diameter through to the
geometry, where QUICK-2 printed the message on seven goldens (A-012, A-014, A-015, A-016
graded, A-017 graded). The fix rejects that trial (trial ≥ D). Where QUICK-2 went back to the
shape menu, two things follow. Under the least A·√(g·A/T) a pipe gives, the search meets a
run-time error, and the system returns outcome `error` with a flag that says QUICK-2 returns to
its shape menu with no result (2.7). In pipes whose stored diameter is a stepped trial, seven
inputs that step to it ended on the menu where the fix prints the message: the trial-on-D
difference, a known difference (2.6).

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
- A-016 committed twelve cases for 2.4's rule with K1 before they ran (414cad4), and they ran
  in ledger decision 102. Graded against A-016 as committed (`results/attempts.md`, A-016
  graded; `node scripts/circle_outputs.mts grade-a016`), it is right on 9 of 12. U1 to U6, V1, V3
  and V4 ended as predicted (cd-circ-000064 to -000072), and the three results match on every
  printed field. V2 (9.6 in, 1.8 cfs) ended on the shape menu where 2.4 gives the message
  (obs-cdmenu-000002), and W1 (9999 in, .5 cfs) and W2 (7254 in, .3 cfs), under the floor of
  2.7, ended on the shape menu where the model never finishes (obs-cdmenu-000003; W2's run
  20261126-001813-0cfa74, Q-034). None of the 184 combinations fits all 69 circle Critical Depth
  outcomes; the 56 fit 65 and miss the four shape-menu endings.
- A-017 committed thirteen cases (d57eed5), and they ran in ledger decision 104 (recorded in
  811f3a5). Graded against A-017 as committed (`results/attempts.md`, A-017 graded;
  `node scripts/circle_outputs.mts grade-a017`), 2.4's rule is right on 8 of 13: B3 to B9
  (9.6 in, 2.3 to 2.9 cfs; cd-circ-000073 to -000079) and E3 (2.4 in, .05 cfs; cd-circ-000080)
  printed the message. B1 and B2 (9.6 in, 2.1 and 2.2 cfs), E1 (12 in, 3.6 cfs), E2 (4.8 in,
  .2 cfs) and N1 (9.6 in, 2 cfs, n .02) ended on the shape menu (obs-cdmenu-000005 to -000009).
  So the 9.6 in pipe changes from the menu to the message between 2.2 and 2.3 cfs, two more
  pipes with a trial on D end on the menu, and n does not change the ending at 9.6 in and 2 cfs.
  W2's behaviour case was recorded as obs-cdmenu-000004 (Q-034 answered). The person's
  full-pipe reading (A·√(g·A/T) of the full pipe with T = D at the trial on D) was added to the
  184 combinations, with a run-time error read as the shape menu: of 736 variants none fits all
  82 circle Critical Depth outcomes, and the best fit 75 (A-017 graded, 3a).

Normal Depth keeps N2 (A-009, Not part of this; Q-026 stays open). Nothing in this spec
changes a printed value outside circle Critical Depth. Inside it, the change is larger than the
goldens show: on A-007's 2000 generated practical circles (seed 20261126), K1 differs from the
current rebuild in outcome or in a printed field on 79, and it rejects 27 where the rebuild
rejects 11 (A-009). Those 79 are predictions, not observations, and are not reported as coverage.

Every number below comes from `results/attempts.md` A-008 to A-017 graded, from
`node scripts/circle_outputs.mts floor` (2.7), `grade-a016`, `grade-a017` and `design`, from
the ledger, or from the comparator. The run folders cited are under `oracle/out`, which is not
committed. The rejection screen is mapped (accepted, see Order of work), and the six rejections,
S1 to S11, A-013's seven cases, A-014's three, A-016's nine and A-017's eight messages are
committed goldens (2.11).

Terms:
- **Search depth**, **chord** and **known difference**: as in `circle-outputs`.
- **Short chord**: a chord whose A·√(g·A/T) is more than 0.5% below q.
- **K1**: after a short chord, the chord becomes the lower end and the next trial is the chord
  plus 0.2 ft. Stepping and chording then continue as from the start.
- **The test against the diameter**: a trial is rejected when the stored trial, store(y + 0.2)
  as now, is at or past the stored diameter, store(store(VAL)/12) as now: trial ≥ D, where the
  rebuild today tests trial > D (A-015's T1·D1·X2; A-013's X2).
- **A pipe with a trial on D**: a pipe whose stored diameter equals a stepped trial exactly,
  under the rebuild's trial and diameter store. From 0.1 to 180 in there are eight: 2.4, 4.8,
  9.6, 12, 50.4, 52.8, 55.2 and 57.6 in (A-016 graded).
- **The trial-on-D difference**: the seven inputs in pipes with a trial on D that step to that
  trial and where QUICK-2 ended on the shape menu with no result and no message, while the test
  against the diameter rejects the trial with the message (2.6). All are n .013 and slope .005
  unless shown:

  | Behaviour case | Diameter | Discharge | Runs that ended on the menu |
  |---|---|---|---|
  | obs-cdmenu-000001 | 9.6 | 2 | 20261125-100815-dff8b0, 20261125-184734-96cde0 and the recording (decision 98) |
  | obs-cdmenu-000002 | 9.6 | 1.8 | 20261126-001523-d4c7e8 and the recording (decision 102) |
  | obs-cdmenu-000005 | 9.6 | 2.1 | 20261126-095222-e41350 and the recording (decision 104) |
  | obs-cdmenu-000006 | 9.6 | 2.2 | 20261126-095333-e9502a and the recording (decision 104) |
  | obs-cdmenu-000009 | 9.6 | 2 (n .02) | 20261126-095717-b9ff1c and the recording (decision 104) |
  | obs-cdmenu-000007 | 12 | 3.6 | 20261126-095543-11fe0c and the recording (decision 104) |
  | obs-cdmenu-000008 | 4.8 | .2 | 20261126-095623-fd7c2f and the recording (decision 104) |

  It is a known difference that the comparator never grades, because all seven are behaviour
  cases. In the same pipes QUICK-2 printed the message at 2.3 to 2.9, 3 and 10 cfs (9.6 in), 4
  cfs (12 in), 1 cfs (4.8 in) and .05 and 1 cfs (2.4 in), as 2.4 gives (A-016 graded, A-017
  graded).
- **The floor**: the least A·√(g·A/T) over 0 < y < D in a pipe (2.7).
- **A run-time error**: a depth at which QUICK-2's circle formula has no value. x/√(1−x²), with
  x = (r − y)/r, divides by zero where x is ±1 (at y = 0 or y = D, or so near 0 that x rounds to
  1), and takes the root of a negative number outside 0 to D. A-013 read such an error as a
  return to the shape menu (quick2-solver design, Negative values and abandoned calculations, an
  inference); W1 and W2 are the first observations that fit it (A-016 graded, A-017 graded).
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
on D passes. QUICK-2 printed "DEPTH is Greater than the DIAMETER" on fifteen goldens where the
rebuild returns this `error`: cd-circ-000045 (S2, 12 in, 4 cfs; A-012), cd-circ-000056 (R4,
55.2 in, 276 cfs) and cd-circ-000060 (R9, 57.6 in, 312 cfs; A-014), cd-circ-000061 (H1,
4.8 in, 1 cfs) and -000062 (H2, 2.4 in, 1 cfs; A-015), cd-circ-000071 and -000072 (V3 and
V4, 9.6 in, 3 and 10 cfs; A-016 graded), and cd-circ-000073 to -000080 (B3 to B9, 9.6 in, 2.3
to 2.9 cfs, and E3, 2.4 in, .05 cfs; A-017 graded) (`design`). For the seven inputs of the
trial-on-D difference QUICK-2 did not keep searching: each ended on the shape menu with no
result and no message, twice or more. The flag text claims something those cases contradict.
50.4 and 52.8 in, also pipes with a trial on D, have no golden; there the search reaches D
only for a discharge above 214.18 and 243.70 cfs.

1.5 WHEN QUICK-2 printed "DEPTH is Greater than the DIAMETER" before the profile mapped the
screen THEN the case timed out on `cd_form` and no golden was stored (Q-022), so the comparator
could not grade the six rejections. This is fixed in the harness, not by this spec's solver
change: the profile maps `cd_circ_rejected` (4773535, see the Decision below), rejections end
on it since the Q-030 fix (40b8f6d), and the 39 rejections that reach the search are goldens,
cd-circ-000039 to -000064, -000066, -000067, -000069 and -000071 to -000080, which the
comparator grades on outcome.

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
for the geometry and every printed field of circle Critical Depth. All 39 rejection goldens
that reach the search, cd-circ-000039 to -000064, -000066, -000067, -000069 and -000071 to
-000080, SHALL be rejected and SHALL match (A-009, The rule I would adopt for Q-022; A-010;
A-012; A-014; A-015; A-016 graded; A-017 graded). The boundary is therefore not a fixed
discharge or a fixed share of the diameter. S(f) is refuted by Q1, rejected at a share of
0.712·D (A-010). This rule is A-015's T1·D1·X2. With a run-time error read as the shape menu
(2.7), it is one of 56 of A-013's 184 combinations that fit all 73 circle Critical Depth
results and rejections and both endings under the floor (W1, W2), and miss the seven endings of
the trial-on-D difference, each by printing the message; nothing observed separates it from
the other 55 (A-017 graded, 3a). It is chosen because it is the smallest change to the
rebuild. Its 10 of 10 on R1, R2, R4, R6 to R9 and H1 to H3 is derived after those cases ran,
not predicted, and A-013 had already found that it misses the 9.6 in run (A-015). Its 9 of 9
on the A-016 cases that ended on a result or the message, and its 8 of 8 on the A-017 cases
that ended on the message, were predicted before they ran (A-016 graded, A-017 graded).

K1 and trial ≥ D stand for results and rejections: they reproduce every circle Critical Depth
result on every printed field and every rejection with the message, and A-016's nine and
A-017's eight were predicted. They do not describe what QUICK-2 does with a trial on D. In the
9.6 in pipe every discharge from 1.8 to 10 cfs reaches the same trial on D by the same steps,
and QUICK-2 ended 1.8 to 2.2 cfs on the shape menu and 2.3 to 10 cfs on the message (A-016
graded, A-017 graded), so its outcome there depends on the discharge, which a test of the
trial against D alone cannot give. The person's full-pipe reading, a number QUICK-2 compares q
with at the trial on D, splits the observed endings correctly by whether q is over it, but in
the model the discharges under it end on a result or the message, never on the menu (A-017
graded, 3a and 3b). trial ≥ D is kept as the rule that reproduces the results and the
messages, not as a finding about how QUICK-2 tests the trial.

2.5 WHEN a rejection is shown THEN `results/hauntings.md` SHALL record it as haunting H-009
with Q1's golden, cd-circ-000043: QUICK-2 printed "DEPTH is Greater than the DIAMETER" for 1
cfs in an 8 in pipe, where A·√(g·A/T) reaches q at about 0.712·D (A-009). S7 (15 in, 7 cfs,
0.848·D) and S8 (18 in, 12 cfs, 0.876·D) were both rejected (A-012), so H-009 SHALL cite their
goldens too, cd-circ-000049 and cd-circ-000050, since 15 and 18 in are sizes engineers use
(A-011 amendment). For each case cited, the exact critical depth, with the
true π and no single-precision rounding, and its distance below the crown, SHALL be computed
for the entry (oracle law rule 5).

**The trial-on-D difference (Q-029)**

2.6 WHEN circle Critical Depth is run in a pipe with a trial on D with a discharge that steps to
that trial THEN the system SHALL return what 2.4 gives, outcome `rejected` with the message, at
the trial on D. QUICK-2 ended on the shape menu with no result and no message for the seven
inputs of the trial-on-D difference: obs-cdmenu-000001 (9.6 in, 2 cfs), -000002 (9.6 in, 1.8
cfs), -000005 (9.6 in, 2.1 cfs), -000006 (9.6 in, 2.2 cfs), -000009 (9.6 in, 2 cfs, n .02),
-000007 (12 in, 3.6 cfs) and -000008 (4.8 in, .2 cfs), each in two runs or more (Terms). For
every other observation that steps to a trial on D, fifteen in all, QUICK-2 printed the message
and 2.4 matches it (1.4). No combination of A-013's 184, with or without the person's full-pipe
number at the trial on D and with a run-time error read as the menu, gives these seven the menu
and keeps the 73 results and rejections (A-017 graded, 3a and 3b), so the rule of 2.4 is kept
and the seven stay a known difference. The solver SHALL have no special case for these inputs
or these pipes. The difference SHALL be recorded as a known difference in the ledger and in the
known differences of `results/hauntings.md`, one entry per behaviour case, citing A-015, A-016
graded and A-017 graded. Q-029 SHALL be carried to a new question, which names Q-029 and states
the pattern: with n .013 and slope .005, the 9.6 in pipe gives a result at 1.5 cfs
(cd-circ-000070), the shape menu from 1.8 to 2.2 cfs and the message from 2.3 to 10 cfs, though
every discharge from 1.8 to 10 cfs takes the same three stepped trials, each short of q, and
reaches trial 4, which equals D; the 12 in pipe ends on the menu at 3.6 cfs and prints the
message at 4; the 4.8 in pipe ends on the menu at .2 cfs and prints the message at 1; the 2.4
in pipe prints the message at .05 and 1 cfs; and n .02 ends 9.6 in at 2 cfs on the menu as n
.013 does. It asks what makes the outcome at a trial on D depend on the discharge. The new
question is used instead of reopening Q-029 (the person's decision, 2026-11-26), and Q-029's
recorded answer, that the ending repeated and that the screens do not show what happened, stays
as it is. The new question SHALL list what was tried: A-015 (Q-029 goes back to open), A-016
graded (What the misses say, its candidates and the forms the goldens rule out), and A-017
graded (1a refuted by E3; the full-pipe reading, which splits the endings by whether q is over
its number but gives a result or the message for every discharge under it).

2.7 WHEN the app shows the outcome of 2.6 THEN it SHALL show the rejection as it shows any
rejection of 2.4, and SHALL say nothing about the shape menu, since the solver returns
`rejected`. The limits page of the app SHALL list the trial-on-D difference in plain words: for
the seven inputs of 2.6, QUICK-2 went to its shape menu with no message, and Quickened shows
"DEPTH is Greater than the DIAMETER". In the 9.6 in pipe, discharges from 1.7619 to 1.8 cfs
and from 2.2 to 2.3 cfs are unobserved, and in the other pipes with a trial on D the discharges
between those observed are unobserved; A-018 asks about some of them (2.12).

A trial on or past D SHALL no longer raise the `never_finishes` flag, so every input named in
1.4 is rejected instead: the fifteen goldens there, the seven inputs of 2.6, and 50.4 in at
216 cfs and 52.8 in at 245 cfs, which reach D, all `error` with the flag today and `rejected`
under 2.4 (`node scripts/circle_outputs.mts floor`, `design`).

**The floor (the person's decision, 2026-11-26).** With π = 3.1416 the area does not go to 0 as
y does, while the top width does, so A·√(g·A/T) has a floor: 6.34E-8 cfs at 12 in, 1.15E-5 at
96 in, .570 at 7254 in and 1.27 at 9999 in (6.34E-8·D^2.5 cfs at y = 1.95E-5·D, from the
rebuild's stored geometry; the same formulas unstored give the same values). The first trial,
0.2 ft, is above q, so the chords are taken on [0, 0.2], and each lands lower, where
A·√(g·A/T) is higher. Under the floor, QUICK-2 ends on the shape menu with no result and no
message: W1, 9999 in at .5 cfs, 0.393 of the floor (obs-cdmenu-000003 and run
20261126-001714-439809), and W2, 7254 in at .3 cfs, 0.527 of the floor (obs-cdmenu-000004 and
run 20261126-001813-0cfa74), three runs and two recordings, none reaching the case limit (A-016
graded, A-017 graded). Today the rebuild returns `error` with the `never_finishes` flag there,
whose text, "it keeps searching", those runs refute.

WHEN circle Critical Depth is run with a discharge under the floor THEN the system SHALL return
outcome `error` with the `returns_to_menu` flag, whose text SHALL be "QUICK-2 returns to its
shape menu with no result for this input.", and no printed field. It SHALL NOT return the
`never_finishes` flag for any circle Critical Depth input where a run of QUICK-2 was seen to
end. The app SHALL show the flag's sentence under the form. The flag is the one Normal Depth
already raises for a Discharge or Slope of -1, which also end on the shape menu (quick2-solver
design, Negative values and abandoned calculations); its text changes for every use, and still
says what QUICK-2 was seen to do in each.

The outcome comes from the search, not from a test of q against the floor: a chord that reaches
a run-time error returns it. Under the floor the chords on [0, 0.2] fall until one lands so
near 0 that x rounds to 1, where x/√(1−x²) divides by zero: chord 1.864515e-15 ft for W1 and
1.658026e-16 ft for W2 (A-017 graded, 3a). Every variant of A-017 graded's 736 ends W1 and W2
this way. The same path gives the menu just above the floor in pipes up to 3072 in, from 2.81
times the floor at 12 in down to 1.02 times at 3072 in, and a result from just above it at 6000
in and up (`node scripts/circle_outputs.mts a018`). Those discharges are unobserved; A-018's F1
asks (2.12). No graded golden is near the floor: the nearest circle Critical Depth golden the
comparator grades, cd-circ-000019 (2200 in, 2000 cfs), is 6.9E4 times its pipe's floor, and the
two floor cases are behaviour cases, which are not graded.

**Records**

2.8 WHEN the fix is built THEN `circle-outputs` 2.9 ("A short chord SHALL be handled as in
2.7"), the quick2-solver design's search table and the comments in `search.ts` and `circle.ts`
SHALL say that circle Critical Depth uses K1 and circle Normal Depth uses N2, each with its
evidence, that circle Critical Depth tests trial ≥ D (2.4), with the trial-on-D difference
of 2.6, and that a run-time error in its search returns `returns_to_menu` (2.7). The
quick2-solver design's flag table SHALL carry the new text of `returns_to_menu` and its new
use.

2.9 WHEN the fix is built THEN the comparator SHALL grade every circle golden as matching
except cc-circ-000035 and nd-circ-000020, and every full-set golden except those two and
sb-irr-000001 to -000003. Every golden recorded from A-011, its amendment, A-013, its
amendment, A-014, A-016 and A-017 SHALL match. The counts for the 323 goldens up to
cd-circ-000072 are the comparator's (the full set and the quick set, after commit 89c65a3).
A-017 added eight, cd-circ-000073 to -000080, all messages; the rebuild returns `error` for all
eight today and 2.4 rejects them (`design`), so the row below adds them by derivation, not by a
comparator run:

| Goldens | Full set | Rebuild today (N2, `store(store(VAL)/12)`, trial > D) | After the fix |
|---|---|---|---|
| With cd-circ-000039 to -000080 | 331 | 295: misses cd-circ-000033, -000035, -000036, -000038 and -000070 on fields; cd-circ-000040, -000043, -000044, -000049 to -000052, -000057, -000058, -000064 and -000067 on outcome (a result); cd-circ-000045, -000056, -000060 to -000062 and -000071 to -000080 on outcome (`error`); cc-circ-000035, nd-circ-000020 and sb-irr-000001 to -000003 | 326 |

Quick set: 192 of 200 today; its misses are cc-circ-000035, cd-circ-000038, cd-circ-000057,
cd-circ-000058, nd-circ-000020 and sb-irr-000001 to -000003. None of cd-circ-000061 to -000080
is in it. After the fix, 195 of 200, since cd-circ-000038, -000057 and -000058 match. The
after-the-fix counts are derived: 2.4 with K1 matches all 73 circle Critical Depth goldens that
reach the search (`node scripts/circle_outputs.mts design`: 42 match today, 73 after), which
removes the 31 circle Critical Depth misses above. The comparator SHALL confirm them, and the
quick set count SHALL be reported before and after. obs-cdmenu-000001 to -000009 are behaviour
cases and are in neither count, so the trial-on-D difference of 2.6 and the floor of 2.7 do not
show in them.

2.10 WHEN the fix is built THEN the ledger SHALL record K1 as observed for the circle
Critical Depth short-chord branch, citing cd-circ-000033, -000035 and -000036 and the six
rejection goldens. Q-022 is already answered in part in the ledger (the profile maps the
screen), and the Exhumer moved the rest to Q-033 (75897a7). Q-033 (2), from what discharge
QUICK-2 prints the message for a given pipe, SHALL be answered with the rule of 2.4 as the
rule the rebuild uses, citing A-015, A-016 graded, A-017 graded and the 39 rejection goldens,
and SHALL say that 56 combinations fit them equally, that the rule gives the message for the
seven inputs of 2.6, and that the pattern in pipes with a trial on D shows the outcome there
depends on the discharge. Q-033 (1), the key that leaves the screen, SHALL stay open and be
recorded as unobserved. Q-029 SHALL stay answered as it is, and the new question of 2.6, which
names Q-029, SHALL be recorded open in its place; the ledger tool has no reopen operation, and
the person chose a new question over adding one (2026-11-26). The floor's outcome of 2.7 SHALL
be recorded as a decision citing obs-cdmenu-000003 and -000004. Q-034 is answered
(obs-cdmenu-000004 recorded, decision 105). Q-026 and Q-032 (a) SHALL stay open. The 79
generated circles of A-009 SHALL NOT be reported as coverage (oracle law rule 7).

**Order of work**

2.11 WHEN the solver is changed THEN A-018's cases SHALL have run first, as
`results/attempts.md` A-018 types them, committed before any of them runs: discharges inside
and just outside 0.5% of the full-pipe number at the trial on D in the 9.6, 12 and 4.8 in
pipes (M1 to M11), one discharge that steps to the trial on D at 50.4 in (L1), and one
discharge just above the floor of 2.7 (F1). Each runs once with record true; a case that ends on
the shape menu stores no golden from its run and is recorded as a behaviour case with the same
keys, as obs-cdmenu-000002 to -000009 were. Done before A-018: A-017's thirteen cases ran in one
Exhumer session after A-017 (d57eed5) was committed, each once with record true: eight are
cd-circ-000073 to -000080, five are the behaviour cases obs-cdmenu-000005 to -000009, and W2's
behaviour case obs-cdmenu-000004 was recorded in the same session (decisions 104 and 105,
811f3a5). Done before A-017: the design was written (728c662) with no
further run, as this criterion required; the rejection screen is mapped (`cd_circ_rejected`);
the six rejections are cd-circ-000039 to -000044, S1 and S6 are cd-circ-000037 and -000038, S2
to S5 and S7 to S11 are cd-circ-000045 to -000053, A-013's R1, R2, R4 and R6 to R9 are
cd-circ-000054 to -000060, and the 9.6 in run is obs-cdmenu-000001 (ledger decisions 87, 88 and
94 to 98). A-014's held-out cases H1 to H3 are cd-circ-000061 to -000063 (decision 100).
A-016's twelve cases ran in one Exhumer session after A-016 (414cad4) was committed, as A-016
types them, each once with record true: nine are cd-circ-000064 to -000072, and V2 and W1 are
the behaviour cases obs-cdmenu-000002 and -000003; W2 ended on the shape menu and its behaviour
case is not recorded (decision 102, Q-034).

2.12 WHEN A-017's cases were graded against A-017 as committed (A-017 graded) THEN B1, B2, E1,
E2 and N1 missed: QUICK-2 ended on the shape menu where 2.4 gives the message. These
requirements are revised again, as the previous version of this criterion required, and shown
before the solver changes. Graded so far: A-012 graded S1 to S11, where S2 contradicted 1.4,
2.6 and 2.7 as first written; A-014 graded R1, R2, R4 and R6 to R9, which picked G3 (T1·D3·X6
and T2·D3·X6); A-015 graded H1 to H3, which refuted G3, and rescored all 184 combinations;
A-016 graded twelve cases, the first predictions committed for the rule of 2.4, which got 9 of
12, all nine results and messages among them; A-017 graded thirteen, of which the rule got the
eight messages and missed the five menu endings. With a run-time error read as the menu, 56 of
the 184 fit 75 of the 82 circle Critical Depth outcomes and miss the seven of 2.6; no variant of
A-017 graded's 736 fits all 82.

A-018 is the last held-out round before the build (the person's decision, 2026-11-26). Its
cases are graded the same way, against A-018 as committed. After that grade the solver SHALL be
built with the rule that fits best, which is 2.4 with K1 and 2.7's floor unless A-018 shows
another fits better. An ending the rule still gets wrong after A-018 SHALL be recorded as a
known difference, with its case id, in the ledger and in the known differences of
`results/hauntings.md`, and listed on the app's limits page (2.7); it does not hold the build.
A printed number the rule gets wrong, on any field of a result, still blocks the build: it
revises these requirements again, and the revision is shown before the solver changes.

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
circle known differences the comparator grades (the trial-on-D difference of 2.6 and the floor
of 2.7 are behaviour cases and are not graded): Max Discharge `101166` where QUICK-2 printed `101165` (Q-028), and
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
Circle Critical Depth no longer does: a trial on or past D is rejected (2.4), and a discharge
under the floor returns `returns_to_menu` (2.7), since QUICK-2 was seen to end on the shape menu
there (W1, W2). The search's trial limit still returns `never_finishes` if it is reached; under
2.4 and 2.7 it is reached on none of the 82 circle Critical Depth observations (`a018`). Normal
Depth with a Discharge or Slope of -1 SHALL CONTINUE TO return `returns_to_menu`, with the
flag's text of 2.7.

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

- The pattern in pipes with a trial on D (the new question of 2.6, which carries Q-029): at 9.6
  in, 1.5 cfs a result, 1.8 to 2.2 cfs the shape menu, 2.3 to 10 cfs the message, where 1.8 to
  10 cfs reach the same trial on D by the same steps; at 12 in 3.6 cfs the menu and 4 the
  message; at 4.8 in .2 the menu and 1 the message; at 2.4 in .05 and 1 the message. A-016
  graded listed the candidates. A-017 graded refutes 1a (a number c·D^2.5 met at the trial on
  D) with E3, and finds that the person's full-pipe number (c = 3.9497) splits every ending by
  whether q is over it, but that in the model a discharge under it ends on a result or the
  message, never the menu. Candidates 1 and 2 stand. A-018 asks whether a discharge inside 0.5%
  of the full-pipe number gives a result at the trial on D. The captures keep one screen per
  step, so the screens between the last Enter and the menu are not seen, and no capture shows a
  QuickBASIC error. The person also searched about 32,000 wider models after A-015; the 16 that
  fit were chosen by one pipe, so none is adopted.
- Just above the floor of 2.7. Under the rule of 2.7 the search's chords reach the run-time
  error just above the floor too, in pipes up to 3072 in, so the system returns
  `returns_to_menu` there; what QUICK-2 does is unobserved. A-018's F1 asks.
- How QUICK-2 forms its trials and stores the diameter. None of the 184 combinations A-013 and
  its amendment wrote down fits all 82 circle Critical Depth outcomes, with or without the
  full-pipe number; with a run-time error read as the menu, 56 fit 75 and miss the seven of 2.6,
  and they give the same outcome on every observation (A-017 graded). No grid case separates T1
  from T2 (0.2 a double or .2 a single).
- Q-026: whether Normal Depth also uses K1. Normal Depth keeps N2 here because only N2 prints
  nd-circ-000020's Top Width `2.0`. QUICK-2 may treat the two modes differently, and nothing
  observed shows whether it does.
- Whether practical circles should also draw from nominal sizes. The generator draws Diameter
  uniformly from 8 to 180 in and rounds it to 0.1 in (`generator._draw`), so 12.0 in, or 24.0
  in, comes up about once in 1720 draws. The sizes people use, where trials land on, just past
  or just below the diameter (A-011), are almost never tested.
  This spec does not change the generator.
- K1 was chosen on two cases (cd-circ-000033 and P1) and held on four it was not chosen on
  (A-010), and on A-016's U1, U4 and V1, the three of its cases that separate K1 from N2
  (A-016 graded). The 79 generated circles where K1 and the current rebuild differ are unrecorded.
