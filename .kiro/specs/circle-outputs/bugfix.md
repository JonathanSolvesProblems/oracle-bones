# Bugfix Requirements Document: circle-outputs

## Introduction

The circle prints the wrong answer in all three modes. On the full set (238 of 267 after the
quick-set rebuild in commit affd67a), Channel Capacity on the circle matches 25 of 31 goldens,
Normal Depth 9 of 14 and Critical Depth 3 of 18. Every other built pair matches every golden.
The other 3 misses are sb-irr-000001 to -000003, where Step-Backwater is not built yet; this
spec leaves them alone.

This is a spec error in the quick2-solver design's "Circle geometry" and "Circle: Normal Depth,
Critical Depth, Max Discharge" sections. The Skeptic held the claim of results/attempts.md
A-003. Ledger Q-024 and Q-025 measured the Critical Depth split and the Normal Depth stop, and
results/attempts.md A-004 scores the candidate rules for what remained (Q-026, Q-027) and for
the Channel Capacity discharge and Max Discharge misses the 13 new goldens exposed. Every
requirement below cites the goldens or ledger entries that produced it. "By script" means
scored offline against the stored goldens (A-004), not yet built or graded by the comparator.

Terms:
- **Search depth**: the depth at which a Critical Depth circle result computes its Area, Wet
  Perimeter, Top Width, Hyd Radius, Velocity, Critical Slope and Max Discharge.
- **Chord**: the linear interpolation between the last trial below q and the first trial above
  it, as in the quick2-solver design's depth search.

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
15 Critical Depth circle results, Depth misses on 14 and Area, Wet Perimeter, Top Width,
Velocity, Critical Slope or Max Discharge on 11 (cd-circ-000001, -000002, -000009 to -000021;
for example cd-circ-000019: Depth `4.90`, Area `194.2`, Max Discharge `%17146` where QUICK-2
printed `4.89`, `194.4`, `%17133`). A-003, Q-024, Q-027.

### Expected Behavior (Correct)

**Geometry and Channel Capacity**

2.1 WHEN Channel Capacity is run on the circle THEN the system SHALL print the Discharge,
Area, Wet Perimeter, Velocity, Hyd Radius, Top Width, Froude # and Flow Type QUICK-2 printed for
every Channel Capacity circle golden, including `3783.9`, `3413.6`, `3596.2` (cc-circ-000031
to -000033) and `%38693`, `%38849` (cc-circ-000027, -000028). By script, the area formula
"sector minus triangle" with π = 3.1416 does this for all 17 results. The as-built form
(θ − sin θ) and the same form with the true π do not (A-004, hypotheses C1 to C3).

2.2 WHEN QUICK-2's discharge differs from the discharge with the true π because of π = 3.1416
THEN the system SHALL print QUICK-2's value, and `results/hauntings.md` SHALL record the
difference as a haunting with cc-circ-000031: printed `3783.9`, 3782.98 with the true π, 0.024%
(oracle law rule 5; A-004).

**Max Discharge**

2.3 WHEN a circle result shows Max Discharge in any mode THEN the system SHALL print the peak
of the part-full Manning discharge, 1.486/n·A·R^.6667·√S over depth, so that the 2215.5 in pipe
prints `271099` (cc-circ-000027 to -000029, nd-circ-000007, -000015 to -000017) and every other
circle golden prints as QUICK-2 printed it. .938·D gives 271098.47 there and does not
(A-004, M1). Channel Capacity and Normal Depth SHALL continue to use the entered slope and
Critical Depth its critical slope (criteria 5.6, 5.7; cd-circ-000001, -000002, -000019 to -000021).

**Normal Depth**

2.4 WHEN Normal Depth is run on the circle THEN the system SHALL step on 0.1 ft trials from
0.1 ft with discharge 1.486/n·A·R^.6667·√S and stop on the first trial within 0.5% of q, so that
nd-circ-000007 and -000015 print `49.00` and nd-circ-000016 and -000017 print `49.10`, with the
fields QUICK-2 printed (Q-025: nd-circ-000015 to -000017 against cc-circ-000027 to -000029;
nd-circ-000009 against cc-circ-000030).

2.5 WHEN no 0.1 ft trial is within 0.5% THEN the system SHALL take the chord, and stop on it
if it is within 0.5%. That covers nd-circ-000001, -000011, -000013 and -000014 (A-004).

2.6 WHEN the chord is still short of 0.5% THEN the system SHALL resume stepping from the
chord with the same 0.1 ft step, the rule the search already uses on every other shape
(A-001). nd-circ-000010 SHALL then print Velocity `87.0` and Froude `24.3`. **Not settled:**
Q-026's candidates N1 (this rule), N2, N3 and N4 all print nd-circ-000010's fields, and no other
golden reaches this branch. Q-026 stays open in the ledger (A-004).

**Critical Depth**

2.7 WHEN Critical Depth is run on the circle THEN the system SHALL search on
A·√(g·A/T) with 0.2 ft trials from 0.2 ft, stop on the first trial within 0.5% of q, and
otherwise take the chord and stop on it if within 0.5%. It SHALL resume as in 2.6 if the chord
is short. By script this prints every field of all 15 Critical Depth circle results, with
cd-circ-000011 stopping on the trial at 6.60 and the other 14 on the chord (A-004, Q-027 H5).
The 0.2 ft step is fitted on these 15 goldens and has no held-out check. The 0.5% stop is
Q-025's, measured on Normal Depth.

2.8 WHEN a Critical Depth circle result is shown THEN the system SHALL compute Area, Wet
Perimeter, Top Width, Hyd Radius, Velocity, Froude #, Critical Slope and Max Discharge at the
search depth and print Depth as the search depth minus 0.01 ft, stored in single precision.
Every Critical Depth circle golden fits an offset from 0.0089 to 0.0101 ft, and at 0.008 or
0.0105 at least one does not (Q-024: cd-circ-000019 to -000021 against cc-circ-000031 to -000033; A-004
measurement 2). cd-circ-000010 SHALL print `1.42` (its chord, 1.42504, sits on the rounding
boundary).

2.9 WHEN a Critical Depth circle result is shown THEN the system SHALL print Velocity as q/A
at the search depth, and Critical Slope as ((q/A)·n/(1.486·R^.667))². With √(g·A/T),
cd-circ-000010 and -000013 print `5.6` and `8.4` where QUICK-2 printed `5.7` and `8.5` (Q-024; A-004 measurement 1).

2.10 WHEN Critical Depth prints a Depth 0.01 ft below the depth its other fields describe THEN
`results/hauntings.md` SHALL record it as a haunting with cd-circ-000019: printed `4.89`, search
depth 4.9014, exact critical depth 4.9030 with the true π and no single-precision rounding
(oracle law rule 5; A-004).

**Coverage and the ledger**

2.11 WHEN the fix is built THEN the comparator SHALL grade every circle golden as matching on
the full set (31, 14 and 18). The full set SHALL then be 264 of 267, the three left being the
unbuilt Step-Backwater cases. The quick set count SHALL be reported before and after.

2.12 WHEN the fix is built THEN the ledger SHALL answer Q-027 with the rule of 2.7 to 2.9 and
its evidence. It SHALL record Q-026 as narrowed to N1 to N4, not answered, and it SHALL record
Max Discharge's rule as an open point between a fine scan and .9382·D, which print the same on
every golden (A-004, M2 and M4). Neither is reported as observed coverage (oracle law rule 7).

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
step and 1% stop (quick2-solver design, The depth search). The circle's 0.5% stop and 0.2 ft
Critical Depth step apply to the circle only.

3.7 WHEN the solver or format source is checked THEN it SHALL CONTINUE TO pass the guard tests:
no case id or golden path in the source, and every numeric constant in `constants.ts` with a
citation (quick2-solver design, rules 1 to 3).

## Open points carried into the design

- Q-026 (2.6): N1 against N2, N3 and N4. Offline, these Normal Depth inputs print differently:
  D 72 in, n .025, q 2, S .0231; D 38 in, n .029, q 3, S .0418; D 53 in, n .017, q 2, S .0476
  (A-004). None has been run on the oracle.
- Max Discharge (2.3): a fine scan (0.02 ft or finer) or .9382·D. No recorded golden tells them
  apart.
- Critical Depth step (2.7): 0.2 ft is fitted on the goldens it is scored on. A live case would
  check it, for example a Critical Depth whose 0.2 ft and 0.1 ft grids stop on different trials.
