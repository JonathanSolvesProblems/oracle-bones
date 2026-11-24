# Bugfix Requirements Document: circle-outputs

## Introduction

The circle prints the wrong answer in all three modes. When this spec was opened (full set
238 of 267 after the quick-set rebuild in commit affd67a), Channel Capacity on the circle
matched 25 of 31 goldens, Normal Depth 9 of 14 and Critical Depth 3 of 18. Every other built
pair matched every golden. The other 3 misses are sb-irr-000001 to -000003, where
Step-Backwater is not built yet; this spec leaves them alone. The 17 A-005 cases have been
recorded since (commit dd30c25). The full set is now 241 of 284, and there are 80 circle
goldens: 34 Channel Capacity, 17 Normal Depth and 29 Critical Depth.

This is a spec error in the quick2-solver design's "Circle geometry" and "Circle: Normal Depth,
Critical Depth, Max Discharge" sections. The Skeptic held the claim of results/attempts.md
A-003. Ledger Q-024 and Q-025 measured the Critical Depth split and the Normal Depth stop.
A-004 scored candidate rules on the stored goldens. A-005 committed predictions for 17 cases
the rules had never seen, and A-006 graded them: 15 of 17 printed as predicted. Every
requirement below cites the goldens or ledger entries that produced it. `scripts/
circle_outputs.mts` (modes `a004`, `a005`, `grade-a005`) reproduces every number cited from
A-004 to A-006.

Terms:
- **Search depth**: the depth at which a Critical Depth circle result computes its Area, Wet
  Perimeter, Top Width, Hyd Radius, Velocity, Critical Slope and Max Discharge.
- **Chord**: the linear interpolation between the last trial below q and the first trial above
  it, as in the quick2-solver design's depth search.
- **Known difference**: a golden the rebuild is expected to miss after the fix, listed with the
  field, both values and the open ledger question. It is not a haunting.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Channel Capacity is run in a very large, shallow pipe THEN the system prints a
Discharge about 0.02% below QUICK-2's: `3783.2`, `3412.9` and `3595.5` where QUICK-2 printed
`3783.9`, `3413.6` and `3596.2` (cc-circ-000031 to -000033, Diameter 2200, n .013, S .005, Depth
5.13, 4.89 and 5.01).

1.2 WHEN Channel Capacity is run in the 2215.5 in pipe THEN the system prints Discharge one unit
high: `%38694` and `%38850` where QUICK-2 printed `%38693` and `%38849` (cc-circ-000027,
-000028).

1.3 WHEN any circle result in the 2215.5 in pipe is shown THEN the system prints Max Discharge
`271098` where QUICK-2 printed `271099` (cc-circ-000027 to -000029, nd-circ-000007,
nd-circ-000015 to -000017; A-003 point 3).

1.4 WHEN Normal Depth on the circle has a 0.1 ft trial within 1% of the discharge but not
within 0.5% THEN the system stops on that trial, where QUICK-2 steps on: Depth `48.90` where
QUICK-2 printed `49.00` (nd-circ-000007, -000015), and `48.90` and `49.00` where QUICK-2 printed
`49.10` (nd-circ-000016, -000017). The other fields follow the wrong depth (A-003; Q-025).

1.5 WHEN Normal Depth on the circle stops on the first chord although it is outside 0.5%
THEN the system prints Velocity `87.4` and Froude `24.4` where QUICK-2 printed `87.0` and
`24.3` (nd-circ-000010; Q-026).

1.6 WHEN Critical Depth is run on the circle THEN the system computes Depth and every other
field at one depth from a 0.1 ft search with a 1% stop, and prints Velocity as √(g·A/T). On the
15 Critical Depth circle results recorded before A-005, Depth misses on 14 and Area, Wet
Perimeter, Top Width, Velocity, Critical Slope or Max Discharge on 11 (cd-circ-000001, -000002,
-000009 to -000021; for example cd-circ-000019: Depth `4.90`, Area `194.2`, Max Discharge
`%17146` where QUICK-2 printed `4.89`, `194.4`, `%17133`). A-003, Q-024, Q-027.

### Expected Behavior (Correct)

**Geometry and Channel Capacity**

2.1 WHEN Channel Capacity is run on the circle THEN the system SHALL print the Discharge,
Area, Wet Perimeter, Velocity, Hyd Radius, Top Width, Froude # and Flow Type QUICK-2 printed for
every Channel Capacity circle golden. That includes `3783.9`, `3413.6`, `3596.2`
(cc-circ-000031 to -000033), `%38693`, `%38849` (cc-circ-000027, -000028) and the three A-005
pipes (cc-circ-000034 to -000036). The area formula "sector minus triangle" with π = 3.1416
does this for all 20 results by script. The as-built form (θ − sin θ) and the same form with
the true π do not (A-004, hypotheses C1 to C3; A-006).

2.2 WHEN QUICK-2's discharge differs from the discharge with the true π because of π = 3.1416
THEN the system SHALL print QUICK-2's value, and `results/hauntings.md` SHALL record the
difference as a haunting with cc-circ-000031: printed `3783.9`, 3782.98 with the true π, 0.024%
(oracle law rule 5; A-004).

**Max Discharge**

2.3 WHEN a circle result shows Max Discharge in any mode THEN the system SHALL print the
Manning discharge 1.486/n·A·R^.6667·√S at .9382·D. That prints `271099` in the 2215.5 in pipe
(cc-circ-000027 to -000029, nd-circ-000007, -000015 to -000017), where .938·D gives 271098.47.
It also prints `83414` and `31823` in cc-circ-000034 and -000036, where a 0.01 ft scan for the
peak prints 83413 and 31822 (A-004, M1 to M5; A-006). Channel Capacity and Normal Depth SHALL
continue to use the entered slope, and Critical Depth its critical slope (criteria 5.6, 5.7;
cd-circ-000001, -000002, -000019 to -000021).

2.4 WHEN Max Discharge is printed for cc-circ-000035 THEN the system is expected to print
`101166` where QUICK-2 printed `101165`. That is a known difference, not a requirement to
match. In cc-circ-000034 to -000036, .9382·D and a fine scan sit 0.05 to 0.09 cfs either side
of a rounding boundary, about one part in a million, and neither prints all three. No rule is
fitted to it. Ledger Q-028 holds it open, with QuickBASIC 4.5 single precision as one
candidate cause, not a classification. It SHALL NOT be recorded in `results/hauntings.md`,
which compares QUICK-2 with exact hydraulics, not the rebuild with QUICK-2 (A-006).

**Normal Depth**

2.5 WHEN Normal Depth is run on the circle THEN the system SHALL step on 0.1 ft trials from
0.1 ft with discharge 1.486/n·A·R^.6667·√S and stop on the first trial within 0.5% of q, so that
nd-circ-000007 and -000015 print `49.00` and nd-circ-000016 and -000017 print `49.10`, with the
fields QUICK-2 printed (Q-025: nd-circ-000015 to -000017 against cc-circ-000027 to -000029;
nd-circ-000009 against cc-circ-000030).

2.6 WHEN no 0.1 ft trial is within 0.5% THEN the system SHALL take the chord, and stop on it
if it is within 0.5%. That covers nd-circ-000001, -000011, -000013 and -000014 (A-004).

2.7 WHEN the chord is still short of 0.5% THEN the system SHALL repeat the chord on the
narrowed bracket, from the short chord to the trial above q, until a chord is within 0.5%
(Q-026 candidate N2). nd-circ-000010, -000018 and -000019 SHALL then print every field as
QUICK-2 printed it (A-004; A-006). **Not settled:** N1 also prints those three. N2 is chosen
because it is the only candidate that prints nd-circ-000020's Top Width `2.0`. That match may
be a coincidence (2.8), and Q-026 stays open in the ledger.

2.8 WHEN Normal Depth is run as in nd-circ-000020 (Diameter 53, n .017, Discharge 2, Slope
.0476) THEN the system is expected to print Velocity `5.7` and Froude `2.4` where QUICK-2 printed
`5.8` and `2.5`. That is a known difference. Velocity `5.8` needs an area smaller than any of
N1 to N4 ends on: every field but Depth prints as QUICK-2 printed it only at 0.24883 to
0.25174 ft, and N2 stops at 0.25228. No rule stated before more cases are run explains both
nd-circ-000020 and nd-circ-000010, so no new question is opened (A-006).

**Critical Depth**

2.9 WHEN Critical Depth is run on the circle THEN the system SHALL search on A·√(g·A/T) with
0.2 ft trials from 0.2 ft, stop on the first trial within 0.5% of q, and otherwise take the
chord and stop on it if it is within 0.5%. A short chord SHALL be handled as in 2.7. This prints
every field of all 26 Critical Depth circle results. The 15 before A-005 were scored by script
(A-004, Q-027 H5). The 11 A-005 cases were predicted before they ran and all printed as
predicted, including cd-circ-000030 to -000032, which print the 0.2 ft prediction and not the
0.1 ft one (A-006). No Critical Depth golden reaches the short-chord branch, so the 2.7 rule is
unobserved there.

2.10 WHEN a Critical Depth circle result is shown THEN the system SHALL compute Area, Wet
Perimeter, Top Width, Hyd Radius, Velocity, Froude #, Critical Slope and Max Discharge at the
search depth and print Depth as the search depth minus 0.01 ft, stored in single precision.
Every Critical Depth circle golden of A-004 fits an offset from 0.0089 to 0.0101 ft, and at
0.008 or 0.0105 at least one does not (Q-024: cd-circ-000019 to -000021 against cc-circ-000031
to -000033; A-004 measurement 2). cd-circ-000010 SHALL print `1.42` (its chord, 1.42504, sits on
the rounding boundary).

2.11 WHEN a Critical Depth circle result is shown THEN the system SHALL print Velocity as q/A
at the search depth, and Critical Slope as ((q/A)·n/(1.486·R^.667))². With √(g·A/T),
cd-circ-000010 and -000013 print `5.6` and `8.4` where QUICK-2 printed `5.7` and `8.5` (Q-024;
A-004 measurement 1).

2.12 WHEN Critical Depth prints a Depth 0.01 ft below the depth its other fields describe THEN
`results/hauntings.md` SHALL record it as a haunting with cd-circ-000019: printed `4.89`, search
depth 4.9014, exact critical depth 4.9030 with the true π and no single-precision rounding
(oracle law rule 5; A-004).

**Coverage and the ledger**

2.13 WHEN the fix is built THEN the comparator SHALL grade 78 of the 80 circle goldens as
matching on the full set. The two misses SHALL be exactly the known differences of 2.4 and 2.8.
The full set SHALL then be 279 of 284: those two and the three unbuilt Step-Backwater cases.
The quick set count SHALL be reported before and after.

2.14 WHEN the fix is built THEN the ledger SHALL answer Q-027 with the rule of 2.9 to 2.11 and
its evidence, including the A-005 cases. Q-026 and Q-028 SHALL stay open. Neither is reported
as observed coverage (oracle law rule 7).

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any trapezoid, V-ditch, rectangle or irregular golden is graded THEN the system SHALL
CONTINUE TO match it on every field, 100% of each pair, on the quick set and the full set.

3.2 WHEN a circle input is held on the form (a Diameter of 0 or -1, a Channel Capacity Depth
above the diameter, a 0 at any prompt) THEN the system SHALL CONTINUE TO hold it as it does now.
All 20 circle goldens that are not results stay matched (A-003; criteria 8.5, 8.6).

3.3 WHEN a circle search passes the diameter without bracketing q THEN the system SHALL
CONTINUE TO return outcome `rejected` with "DEPTH is Greater than the DIAMETER" (ledger Q-022).

3.4 WHEN Critical Depth on the circle is run with a different slope THEN the system SHALL
CONTINUE TO change only the Slope echo (Property 6; cd-circ-000001, -000002).

3.5 WHEN Channel Capacity is run on the circle THEN the system SHALL CONTINUE TO print Velocity
as Q/A and to use R^.6667 in the discharge (quick2-solver design, Channel Capacity; A-003).

3.6 WHEN the prismatic or irregular search runs THEN it SHALL CONTINUE TO use its own start,
step, 1% stop and resume rule (quick2-solver design, The depth search; A-001). The circle's
0.5% stop, 0.2 ft Critical Depth step and short-chord rule apply to the circle only.

3.7 WHEN the solver or format source is checked THEN it SHALL CONTINUE TO pass the guard tests:
no case id or golden path in the source, and every numeric constant in `constants.ts` with a
citation (quick2-solver design, rules 1 to 3).

## Open points

- Q-026 (2.7, 2.8): what QUICK-2 does after a short chord on the circle. N2 is used. N1 to N4
  have all been scored, and nd-circ-000020 fits none of them.
- Q-028 (2.4): cc-circ-000035's Max Discharge, one unit below .9382·D.
- The short-chord rule in Critical Depth (2.9): no golden reaches it.
