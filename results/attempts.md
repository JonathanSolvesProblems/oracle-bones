# Honest attempts

When the rebuild and the oracle disagree, the task that meets the mismatch makes an honest
attempt before the Skeptic sees it (quick2-solver design: When the rebuild and the oracle
disagree): the mismatch is reproduced in a unit test, up to five hypotheses from inside the
design's model are tried, and each is scored on the quick set. A hypothesis that fixes the
mismatch but breaks a case that matched is rejected.

One section per mismatch. Each section gives the cases, what QUICK-2 printed, what the rebuild
printed, every hypothesis with its score, and the claim and classification handed to the
Skeptic.

## A-001: the second interpolation step on shallow Normal Depth (task 3.2)

**Resolved by H6, the sixth hypothesis. The design allows five; kept by decision, see the end.**

**Cases.** The six prismatic Normal Depth results whose first interpolation is not within 1%
of the discharge, all shallow and very wide. Five are in the quick set; nd-rect-000004 is not.
The reproduction is the `A-001` block of `app/test/normalDepth.test.ts`, which failed on all six
before the change.

| Case | QUICK-2 printed | Rebuild before (H0) | First interpolation, F/q | Depths that print the oracle's fields |
|---|---|---|---|---|
| nd-rect-000002 | Depth `0.54`, Area `4173.6` | Area `4174.4` (y 0.541103) | 0.533881, 0.972 | 0.540994 to 0.541007 |
| nd-rect-000004 | Depth `1.20`, Area `9972.3`, Velocity `84.5` | Area `9977.8`, Velocity `84.4` (y 1.203519) | 1.188488, 0.978 | 1.202853 to 1.202865 |
| nd-rect-000007 | Depth `0.45`, Area `3806.5` | Area `3813.1` (y 0.449942) | 0.421033, 0.892 | 0.449155 to 0.449166 |
| nd-rect-000026 | Depth `1.36`, Area `8570.3` | Area `8576.3` (y 1.357690) | 1.344680, 0.984 | 1.356739 to 1.356755 |
| nd-trap-000009 | Area `9490.3`, Wet Per and Top Width `7739.6`, Velocity `86.5`, Froude `13.8` | `9496.6`, `7739.7`, `86.4`, `13.7` (y 1.241272) | 1.225475, 0.977 | 1.240452 to 1.240465 |
| nd-trap-000014 | Area `8376.0`, Wet Per and Top Width `6488.3` | `8382.3`, `6488.4` (y 1.307937) | 1.292793, 0.980 | 1.306960 to 1.306975 |

In every case QUICK-2's depth lies between the first interpolation and where a second chord on
the narrowed bracket lands (H0), 0.0001 to 0.0009 ft below the latter.

**Scoring.** Each hypothesis changes only what happens after a first interpolation that is not
within 1%, so it can change only the cases that reach that point: the six above and
nd-vdit-000001, whose printed fields allow a wide enough range that every hypothesis fits it.
All other prismatic Normal Depth results stop on a step or on the first interpolation and are
unaffected. H1 to H5 were scored with a throwaway script on those seven cases (depth, area, wet
perimeter and top width stored in single precision and printed); H6 was then built into
`search.ts` and graded by the comparator.

| Hypothesis | Second-step cases that fit | Quick set |
|---|---|---|
| H0, as built: the short interpolation becomes the lower end and the chord repeats | 1 of 7 | 90 of 200 |
| H1, re-step 0.1 ft from the lower step point, then interpolate | 1 of 7 | 90 of 200 (by script) |
| H2, re-step 0.05 ft from the lower step point | 1 of 7 | 90 of 200 (by script) |
| H3, re-step 0.01 ft from the first interpolation | 0 of 7 (breaks nd-vdit-000001) | 89 of 200 (by script) |
| H4, re-step 0.1 ft from the first interpolation | 1 of 7 | 90 of 200 (by script) |
| H5, extrapolate through the step point below and the first interpolation | 1 of 7 | 90 of 200 (by script) |
| H6, stepping resumes from the short interpolation with the same 0.5 ft step: the next bracket is [y1, y1 + 0.5] | 7 of 7 | 95 of 200 (comparator) |

H1 to H5 all land too high, nearer the exact root. QUICK-2's depth is lower than a second chord
on the narrowed bracket, which pointed at a chord over a wider bracket. H6 has no free parameter:
it reuses the 0.5 ft step and the existing interpolation. It reads as the search's step loop
starting again from the interpolated depth.

**Out-of-sample check.** No Critical Depth golden was used to choose H6. Prismatic Critical Depth
uses the same search, and four of its results reach the second step: cd-trap-000007,
cd-trap-000008, cd-trap-000018 and cd-rect-000020. With H0 all four miss; with H6 all four print
the oracle's fields, including the overflowed Area `%54952` (H0 gives 54961.6) and `%71625` (H0
gives 71725.6). Task 3.3 grades them through the comparator.

**Result.** The full set for normal_depth on the trapezoid, V-ditch and rectangle matches on
every field (53 of 53 results), and irregular Normal Depth (26 of 26) still does. Nothing goes to
the Skeptic: no mismatch remains. The design's search section is updated to the H6 rule.

**Note on the count.** The design allows up to five hypotheses. H6 was the sixth. It is kept
because it fits all six cases with no parameter to tune, and fits four Critical Depth cases that
played no part in choosing it.

**Decision (person running the task, 2026-11-23):** keep H6. The five-hypothesis limit is there
to stop tuning. A rule with nothing to tune that also fixed four Critical Depth cases it was
never chosen on passes that test.

## A-002: Channel Capacity discharge on the prismatic shapes (task 3.4)

**Resolved by H1 and H2. Nothing goes to the Skeptic.**

**Cases.** With the design as written (discharge with R^.6667, exponent form past nine digits),
36 of the 39 prismatic Channel Capacity results missed on Discharge, and cc-vdit-000002 also
missed on Velocity. Discharge is the field that shows the most digits: these generated channels
give discharges of 10^7 to 10^10 cfs, which overflow and print every digit. The reproduction is
the comparator's own output, which lists every one; examples:

| Case | QUICK-2 printed (row 10) | Rebuild before |
|---|---|---|
| cc-rect-000002 | `%793879552` | `%792335232` |
| cc-vdit-000002 | `%3578117632` | `% 35716E+05` |
| cc-trap-000005 | `% 19078E+06` | `% 19043E+06` |
| cc-trap-000015 | `%-34654E+05` | `%-34593E+05` |

Two things are wrong at once: the digits (all about 0.2% low, more for a larger hydraulic radius)
and, for ten-digit values, the switch to an exponent.

| Hypothesis | Prismatic CC results that match | Quick set | Full set |
|---|---|---|---|
| As written | 3 of 39 | 139 of 200 | 185 of 254 |
| H1: discharge with R^.667, the exponent the search and the velocity use | 24 of 39; every digit now agrees, and the 15 left differ only in the exponent switch | not run | 206 of 254 |
| H2: H1, and the exponent form starts past ten characters of text (sign, digits, point, decimals) instead of nine digits | 38 of 39 | 172 of 200 | 220 of 254 |
| H3: H2, and √S held in single precision, as QuickBASIC's SQR returns it | 39 of 39 | 173 of 200 | 221 of 254 |

H1: the ratio of the oracle's discharge to the rebuild's is R^0.0003 in every case (1.00182 at
R = 429.7 for cc-vdit-000002), which is the gap between .667 and .6667. H2 is a display rule:
3578117632, 4207745280 and 1062046336 have ten digits and print in full, while the
eleven-character texts -3465xxxxxx, 19078xxxxxx and 123456789.0 print as exponents. A digit count
cannot tell these apart, and a character count can. H3 settles the velocity boundary task 3.4
named. cc-vdit-000002's velocity is 198.2500 with √S unstored and 198.249985 with it stored;
QUICK-2 printed `198.2`. Storing R, R^.667, 1.486/n or 1.486/n·√S instead, or leaving A and P
unstored, does not fix it. None of the three breaks a case that matched, and the other pairs'
full-set counts are unchanged.

**Classification.** H1 is a spec error in the design's constants table (CC discharge listed
under .6667). The design and `constants.ts` are corrected. H2 is a display rule and goes into
`printUsing.ts` (`OVERFLOW_MAX_CHARS`). H3 is a storage point, recorded in the design's
Channel Capacity section. Storing √S in Normal Depth too changes no golden, so the rebuild stores
it only where a golden needs it. Whether SQR is single everywhere is in the design's open points.

## A-003: the circle's depth search, Normal Depth and Critical Depth (task 3.5), OPEN

**Followed up in A-004 (bugfix spec `circle-outputs`).** The Skeptic held this claim; Q-024 and
Q-025 measured the Normal Depth stop and the Critical Depth split. The text below is as written
for task 3.5.

**Not resolved. Sent to the Skeptic by decision (2026-11-23); the person running the task runs
it through the Exhumer in its own session. Task 3.6 waits for the verdict.**

**Built and matching.** Circle geometry with π = 3.1416, Channel Capacity on the circle (10 of
10, discharge with .6667; with .667, 9 of 10 miss), and Max Discharge at .938·D with .6667.

**What remains.** In the full set, Normal Depth on the circle matches 6 of 8, and Critical Depth
on the circle matches 0 of 12. All 20 rejected circle goldens match.

| Case | Field(s) | QUICK-2 | Rebuild |
|---|---|---|---|
| nd-circ-000007 | Depth, Area, Wet Per, Velocity, Hyd R, Top Width; Max Discharge | `49.00`, `5693.1`, `199.8`, `6.8`, `28.5`, `163.0`; `271099` | `48.90`, `5676.8`, `199.6`, `6.9`, `28.4`, `162.9`; `271098` |
| nd-circ-000010 | Velocity, Froude | `87.0`, `24.3` | `87.4`, `24.4` |
| cd-circ-000001 to -000018 (12) | Depth on 11; Area, Wet Per, Velocity, Critical Slope and Max Discharge on several | e.g. cd-circ-000014 Depth `8.27`, Area `92.4`, Max Discharge `2164` | `8.30`, `92.7`, `2154` |

**What was tried.** This went past the five-hypothesis limit. The task asked for the circle's
start and step to be found, so I swept a grid and did not stop at five guesses:

- First trial {0.01, 0.1, 0.5 ft, or one step} × step {0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5,
  1 ft, D/10, D/20, D/50, D/100} × exponent {.667, .6667} × second step {resume (A-001), repeat
  the chord}. Each combination was scored by script on all 20 Normal Depth and Critical Depth
  circles, then on the 8 Normal Depth circles with Velocity (q/A) included.
- Best for Normal Depth: 0.1 ft steps from 0.1 ft, discharge with .6667, 6 of 8. That is built
  (`CIRCLE_STEP`, cited as not settled), and the comparator agrees: 6 of 8.
- Best for both modes together with Velocity left out: 0.5 ft steps, 11 of 20. It fits
  nd-circ-000007 (49.00 is a 0.5 ft step, the trial before it is outside 1%, and the one at 49.00
  is inside), but it misses nd-circ-000009 (`8.40`), which needs a trial at 8.40.

**What the goldens show.**

1. Normal Depth: four of the eight (nd-circ-000010, -000011, -000013, -000014) print a depth
   within 0.01% of the exact root. A 1% stop with steps of 0.1 ft or more does not land that
   close that often. Three others stop on a round depth: `49.00` (0.25% short), `8.40` (0.42%
   short) and `6.10` (0.11% over). No single fixed step fits both nd-circ-000007 and
   nd-circ-000009. At 0.1 ft, nd-circ-000007's trial at 48.90 is already within 1%; at 0.5 ft
   nd-circ-000009 has no trial at 8.40.
2. Critical Depth: in cd-circ-000001 (and -000002, -000009, -000012), no single depth prints
   every field with this geometry. Area and Wet Perimeter need 2.055 to 2.087 ft, Velocity
   √(gA/T) needs 2.032 to 2.064, and Depth prints `2.05`. The overlap is at most a few
   thousandths of a foot wide, or there is none. Either the Critical Depth circle computes its
   outputs at more than one depth, or one of its formulas differs from the Channel Capacity
   circle's, which matches on every field.
3. Max Discharge, scan or .938 (the decision task 3.5 asked for): neither explains
   nd-circ-000007. At .938·D it is 271098.16; a fine scan for the peak gives 271098.25, at
   0.93806·D; QUICK-2 printed `271099`. 32 combinations of single-precision stores at .938·D all
   give 271098.15 to 271098.18. All other 17 Channel Capacity and Normal Depth circles print the
   same with .938 or a scan, so the goldens cannot choose between them. The rebuild keeps .938.

**Claim, for the Skeptic if you want to send it.** QUICK-2's circle search is not the prismatic
search with another step. Its Normal Depth result often lands much closer to the root than a 1%
stop allows, and its Critical Depth outputs do not all come from one depth. Proposed
classification: spec error (the design's circle search), to become a bugfix spec such as
`circle-depth-search`. Cases that would separate the ideas: a fixed pipe and n with discharges
stepped so the depth crosses 0.1 ft and 0.5 ft grid points; the 36 in pipe at discharges whose
critical depth falls just above and below a 0.1 ft step; and nd-circ-000007's pipe with its slope
varied.

## A-004: circle outputs in all three modes (bugfix spec `circle-outputs`)

**Q-027 resolved by its H5. Q-026 narrowed to four rules the goldens cannot tell apart; the
rebuild proposes A-001's rule. Channel Capacity discharge and Max Discharge resolved. Nothing
is built yet: these are offline scores, and the spec's requirements wait for review.**

**Starting point.** Quick set rebuilt first (commit affd67a): 177 of 200. Full set 238 of 267.
On the circle, Channel Capacity matches 25 of 31, Normal Depth 9 of 14 and Critical Depth 3 of
18. Every other built pair matches every golden. The other 3 misses are sb-irr-000001 to
-000003, where Step-Backwater answers `not built`. The circle misses:

| Cases | Field(s) | QUICK-2 | Rebuild |
|---|---|---|---|
| cc-circ-000031 to -000033 (D 2200 in) | Discharge | `3783.9`, `3413.6`, `3596.2` | `3783.2`, `3412.9`, `3595.5` |
| cc-circ-000027, -000028 (D 2215.5 in) | Discharge | `%38693`, `%38849` | `%38694`, `%38850` |
| cc-circ-000027 to -000029, nd-circ-000007, -000015 to -000017 | Max Discharge | `271099` | `271098` |
| nd-circ-000007, -000015 to -000017 | Depth and the fields at it | e.g. `49.00`, `5693.1` | `48.90`, `5676.8` |
| nd-circ-000010 | Velocity, Froude | `87.0`, `24.3` | `87.4`, `24.4` |
| cd-circ-000001, -000002, -000009 to -000021 (15 results) | Depth on 13; Area, Wet Per, Top Width, Velocity, Critical Slope, Max Discharge on several | e.g. cd-circ-000019 `4.89`, `194.4`, `%17133` | `4.90`, `194.2`, `%17146` |

**How scored.** `node scripts/circle_outputs.mts a004` prints every number in this section,
in order (about 5 minutes). It builds each rule on the rebuild's own printer (`printed()` and `REGULAR_RESULT`) and form reader, and
compares every printed field of every stored circle result golden: 17 Channel Capacity,
11 Normal Depth and 15 Critical Depth. Geometry and every trial are stored in single precision,
as `search.ts` does. The other 20 circle goldens are held on the form, and no rule here
touches them. No rule changes the prismatic or irregular code.

### Channel Capacity discharge: the area formula

The ratio of QUICK-2's discharge to the rebuild's is 1.00018 to 1.00022 in the 2200 in pipe
(y/D 0.027, very shallow) and 0.99996 to 1.00001 in the 2215.5 in pipe (y/D 0.265). A constant
factor cannot make one pipe higher and the other lower, so the difference is in the geometry.

| Hypothesis | CC Discharge fields that match | CC results (Max Discharge left out) |
|---|---|---|
| H0, as built: A = r²(θ − sin θ)/2, P = rθ, θ = 2(π/2 − ATN(x/√(1−x²))), π = 3.1416 | 12 of 17 | 12 of 17 |
| C1: H0 with single-precision stores of r, x, √(1−x²), the ATN, θ and sin θ (8 combinations) | 12 of 17; cc-circ-000031 is 3783.15 or 3783.16 in all 8 | 12 of 17 |
| C2: sector minus triangle. α = π/2 − ATN(x/√(1−x²)), A = r²α − (r − y)·T/2, P = 2rα, π = 3.1416 | 17 of 17 | 17 of 17 |
| C3: C2 with π = 3.14159265 | 11 of 17 | 11 of 17 |

C2 has nothing to tune. The two forms are the same in exact arithmetic. They differ only in
how QUICK-2's π = 3.1416, which is 7.3e-6 too large, reaches the area. In C2 it enters
r²α directly. In H0 it enters both θ and sin θ, and the error mostly cancels. In a pipe of
radius 91.7 ft that is 0.031 sq ft on an area of 208, which is 0.025% on the discharge:
cc-circ-000031 gives 3783.89 with C2 and 3782.98 with C2 and the true π. QUICK-2 printed
`3783.9`. That is a haunting (oracle law rule 5). Normal Depth and Critical Depth use the same
geometry and none of their goldens is worse with C2.

### Max Discharge

With C2 in place, the 2215.5 in pipe still prints 271098 at .938·D (271098.47).

| Hypothesis | CC and ND circles (28) | All circle results (43, with the rules below) |
|---|---|---|
| M1: .938·D, the rebuild's rule (with and without single-precision stores of y, A, P and R; all give 271098.47) | 21 | 36 |
| M2: .9382·D | 28 | 43 |
| M3: .94·D | 10 | 22 |
| M4: the largest Manning discharge over trials 0.01 ft apart | 28 (271098.53 at 0.93809·D) | 43 |
| M5: the largest over trials 0.001·D apart | 21 | 36 |

After M4, as a sensitivity check (not a further candidate): scans 0.005 and 0.02 ft apart also
give 43, and 0.05 ft gives 40. **The goldens cannot choose between M2 and a fine scan.** In
every pipe here the two agree to the printed digit. This stays an open point. What is settled
is that M1 is wrong: QUICK-2's Max Discharge in that pipe is at least 271098.5, the peak of
the curve, and .938·D gives 271098.47. Telling M2 from a scan needs a pipe where they print
different values. None is recorded.

### Q-026: Normal Depth after a short chord

The search is the one Q-025 measured: 0.1 ft steps from 0.1 ft, discharge with .6667, stop
within 0.5%. With that stop all Normal Depth circles but one finish on a step or on the first
chord. nd-circ-000007, -000009, -000012 and -000015 to -000017 stop on steps.
nd-circ-000001, -000011, -000013 and -000014 stop on the chord. Only nd-circ-000010 reaches the
branch: its chord, 0.5495, is 0.608% short.

| Hypothesis | Depth reached on nd-circ-000010 | ND circles that match (Max Discharge by M4) |
|---|---|---|
| N1: stepping resumes from the chord with the same 0.1 ft step (A-001's rule, as built) | 0.55113 | 11 of 11 |
| N2: the chord repeats on the narrowed bracket [chord, upper trial] | 0.55118 | 11 of 11 |
| N3: stepping resumes from the chord with 0.01 ft steps | 0.55123 | 11 of 11 |
| N4: secant through the two latest trials | 0.55130 | 11 of 11 |
| N5: bisect the bracket after a short chord | 0.55000 (Velocity `87.3`) | 10 of 11 |
| any of N1 to N5 with the old 1% stop | | 6 of 11 |

**Not settled.** One golden reaches the branch, and N1 to N4 all print its fields. Only N5 is
ruled out. The spec proposes N1. It is already the rule in `search.ts` for every other shape
(A-001), so it needs no new mechanism. Q-026 stays open in the ledger until a case separates
them. By script (not run on the oracle), these Normal Depth pipes print differently under
the candidates. D 72 in, n .025, q 2, S .0231: N1 and N2 print Wet Per 2.8, N3 prints 2.9,
and N4 prints 2.9 with Velocity 3.2 instead of 3.3. D 38 in, n .029, q 3, S .0418: N1 and N2
print Depth 0.44, N3 and N4 print 0.45. D 53 in, n .017, q 2, S .0476: N2 prints Top Width 2.0,
the others 2.1.

### Q-027: what produces the two Critical Depth depths

**Measurements first.** These are not hypotheses, because nothing is chosen. They only fix
what any rule must reproduce.

1. *Velocity is q/A.* That is what Q-024 reported, and the rebuild prints √(g·A/T). With
   √(g·A/T) and the offset of point 2, no depth prints every field of cd-circ-000010, and H5
   below with √(g·A/T) misses Velocity on cd-circ-000010 (`5.7`) and -000013 (`8.5`): 13 of 15.
2. *The fields come from one depth y, and Depth prints y − 0.01.* The test applies Area, Wet
   Per, Top Width, Hyd R, Velocity q/A, Critical Slope ((q/A)·n/(1.486·R^.667))² and Max
   Discharge (at that critical slope) at y. Depth is printed from y − h. Every one of the 15
   results has a y that fits for h from 0.0089 to 0.0101 ft. At 0.008, cd-circ-000020 has none;
   at 0.007, -000015 as well; at 0.0105, cd-circ-000017 has none. So h is 0.01. This answers two of
   Q-027's sub-questions. Critical Slope and Max Discharge come from the geometry depth y, not
   from the printed Depth. The split happens in every case: cd-circ-000010's fields also need
   it, though the Skeptic's hand check had said one depth fits.
3. *Where y sits.* Every case admits a y with F(y) = A·√(g·A/T) within 0.5% of q. In cd-circ-000011
   it must be 0.26% to 0.39% above q, as a step trial that is close enough would be. In the
   others it can be at or just below q, where a chord on a convex curve lands.

**Hypotheses for the search that sets y.**

| Hypothesis | CD circles that match (15) |
|---|---|
| H0, as built: 0.1 ft search, 1% stop, Depth and fields at one depth, Velocity √(gA/T) | 0 |
| H1: the ND circle search (0.1 ft, 0.5%, chord, resume) on F(y + 0.01), Depth printed y. Also scored with stops of 1%, 0.3% and 0.2% | 5 (3, 5, 5) |
| H2: Newton with a forward difference h = 0.01, which leaves the geometry at y + 0.01, stopping on F(y + 0.01) within 0.5%. Starts D/2, D/4, 0.1, .938·D and .99·D, with the step taken from F(y) or F(y + h) | at best 4 (start .99·D) |
| H3: bisection on [0, D], stop within 0.5%, geometry at the midpoint, Depth 0.01 below | 3 |
| H4: the ND circle search (0.1 ft from 0.1 ft, 0.5%, chord, resume) on the geometry depth, Depth printed 0.01 below | 6 |
| H5: H4 with 0.2 ft steps from 0.2 ft | **15**, every field |

**How H5's step was found, and what that costs.** After H4, I tabulated each case's required y
against the trials and the first chord of seven grids: 1, 0.5, 0.25, 0.2, 0.1, 0.05 and
0.02 ft, in both placements. 0.2 ft on the geometry depth was the only grid that puts a trial
or the first chord on every case's required depth (15 of 15; the next best, 0.25, 0.1 and
0.02 ft, reach 7). So H5's step is fitted on these 15 goldens. No Critical Depth
circle golden was held back, so there is no out-of-sample check like A-001's. Two parts of H5
were not fitted with the step. The 0.5% stop is Q-025's, measured independently on Normal
Depth, and H5 matches all 15 for any stop between 0.37% and 0.94% (cd-circ-000015's chord is
0.370% short, and cd-circ-000020's trial at 5.00 is 0.943% short). The 0.01 ft offset was measured
before any step was tried. A-003's sweep included 0.2 ft. It could not fit then, because it
printed Depth at the geometry depth and used Velocity √(gA/T).

**Sensitivity of H5 (checks, not candidates).** Steps 0.25, 0.5 and 1 ft with the same rule
give 6, 3 and 3 of 15. Stops of 0.33% and 1% each lose one case (cd-circ-000015 and
cd-circ-000020). Offsets from 0.0088 to 0.0100 ft give 15; 0.0101 gives 13 and 0.0102 gives 12. cd-circ-000011
stops on the step at 6.60 (+0.32%). The other 14 stop on the first chord, so no Critical Depth
golden reaches the branch after a short chord. With N1, N2 or N3 there, the score is still 15.

**Boundary to watch.** cd-circ-000010's chord is 1.42504 and its Depth prints `1.42` only
because 1.42504 − 0.01, stored in single precision, rounds up. An offset of 0.0101 prints
`1.41`. The unit test must keep this case.

**Haunting.** Depth prints 0.01 ft below the critical depth that the other fields describe.
For cd-circ-000019, the search depth is 4.9014 and Depth prints `4.89`. The exact critical
depth, with the true π and no single-precision rounding, is 4.9030. To record as H-003 in
`results/hauntings.md` when the fix is built.

**Classification.** Spec error (the quick2-solver design's circle search and circle Critical
Depth fields), carried by the bugfix spec `circle-outputs`. The 3.1416 area effect (C2) and the
0.01 ft Depth offset are hauntings. M2 against a scan and Q-026's N1 to N4 are open points that
need live cases, not more offline candidates.

**All rules together** (C2, M4, ND with N1, CD with H5): 43 of 43 circle results, by script.

## A-005: predictions for cases the circle rules have never seen (for the Exhumer)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section.**

**Source.** Every value below is printed by `node scripts/circle_outputs.mts a005` at commit
8624ac6 (the A-004 commit), with the rules of A-004: geometry C2, Normal Depth N1 unless the
row names another rule, Critical Depth H5 unless the row names another rule, and Max Discharge
M2 (.9382·D). Where a 0.01 ft scan (M4) would print a different Max Discharge, the row says so;
in parts (a) to (c) it never does. Each row lists every field the result screen prints, echoes
included, as the comparator compares them. The number in brackets after the rule is the
search depth, for reference; it is not printed. Inputs are typed exactly as shown.

**What each part tests.**

- (a) Q-026. Across the three pipes, N1 to N4 each print a different combination of rows: the
  72 in pipe separates {N1, N2}, N3 and N4; the 38 in pipe separates {N1, N2}, N3 and N4; the
  53 in pipe separates N2, N4 and {N1, N3}. So the three runs name one rule if QUICK-2 uses one
  of them. If no row matches a pipe, none of N1 to N4 is QUICK-2's.
- (b) H5's fitted 0.2 ft step. Each pipe is one where the 0.2 ft grid (H5) and the 0.1 ft grid
  (H4, H5's rule with A-003's step) print a different Depth and Area. A match on the 0.2 ft
  row supports H5; a match on the 0.1 ft row, or on neither, refutes it.
- (c) The rules as they stand, on eight Critical Depth circles drawn by the project's generator.
  Seed 20261125, practical ranges, generator version 2:
  `python -m oracle.record --seed 20261125 --count 8 --modes critical_depth --shapes circle --ranges practical`.
  The case ids are those the generator assigns against today's goldens (cd-circ-000022 to
  -000029); they shift if other circle Critical Depth cases are recorded first, and the inputs
  do not. None of these inputs was used to choose a rule.
- (d) Max Discharge. The script found pipes inside the ranges where .9382·D and a 0.01 ft scan
  print different Max Discharge (diameter and n inside the circle's practical ranges; slope
  has no practical range, so it is inside the accepted one). So the choice can show in an
  output, and the design does not take .9382·D by default: these cases decide it. In all
  three, a 0.005 ft scan prints what .9382·D prints, and a 0.02 ft scan prints what the 0.01 ft
  scan prints, so a match on the .9382·D row leaves .9382·D and a scan of 0.005 ft or finer.
  The script tried 209 random pipes to find three. Every other field is the same in both rows.

### (a) the three Q-026 pipes, Normal Depth

**Diameter 72, n .025, Discharge 2, Slope .0231**

| Rule | Diameter | n | Discharge | Depth | Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N1 (0.33187) | 72.0 | 0.0250 | 2 | 0.33 | 0.0231 | 0.6 | 2.8 | 3.3 | 0.2 | 2.7 | 1.2 | 360 | SUPERCRITICAL |
| N2 (0.33201) | 72.0 | 0.0250 | 2 | 0.33 | 0.0231 | 0.6 | 2.8 | 3.3 | 0.2 | 2.7 | 1.2 | 360 | SUPERCRITICAL |
| N3 (0.33232) | 72.0 | 0.0250 | 2 | 0.33 | 0.0231 | 0.6 | 2.9 | 3.3 | 0.2 | 2.7 | 1.2 | 360 | SUPERCRITICAL |
| N4 (0.33256) | 72.0 | 0.0250 | 2 | 0.33 | 0.0231 | 0.6 | 2.9 | 3.2 | 0.2 | 2.7 | 1.2 | 360 | SUPERCRITICAL |

**Diameter 38, n .029, Discharge 3, Slope .0418**

| Rule | Diameter | n | Discharge | Depth | Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N1 (0.44479) | 38.0 | 0.0290 | 3 | 0.44 | 0.0418 | 0.7 | 2.4 | 4.5 | 0.3 | 2.2 | 1.4 | 76 | SUPERCRITICAL |
| N2 (0.44491) | 38.0 | 0.0290 | 3 | 0.44 | 0.0418 | 0.7 | 2.4 | 4.5 | 0.3 | 2.2 | 1.4 | 76 | SUPERCRITICAL |
| N3 (0.44505) | 38.0 | 0.0290 | 3 | 0.45 | 0.0418 | 0.7 | 2.4 | 4.5 | 0.3 | 2.2 | 1.4 | 76 | SUPERCRITICAL |
| N4 (0.44523) | 38.0 | 0.0290 | 3 | 0.45 | 0.0418 | 0.7 | 2.4 | 4.4 | 0.3 | 2.2 | 1.4 | 76 | SUPERCRITICAL |

**Diameter 53, n .017, Discharge 2, Slope .0476**

| Rule | Diameter | n | Discharge | Depth | Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N1 (0.25263) | 53.0 | 0.0170 | 2 | 0.25 | 0.0476 | 0.3 | 2.1 | 5.7 | 0.2 | 2.1 | 2.4 | 336 | SUPERCRITICAL |
| N2 (0.25228) | 53.0 | 0.0170 | 2 | 0.25 | 0.0476 | 0.3 | 2.1 | 5.7 | 0.2 | 2.0 | 2.4 | 336 | SUPERCRITICAL |
| N3 (0.25275) | 53.0 | 0.0170 | 2 | 0.25 | 0.0476 | 0.3 | 2.1 | 5.7 | 0.2 | 2.1 | 2.4 | 336 | SUPERCRITICAL |
| N4 (0.25280) | 53.0 | 0.0170 | 2 | 0.25 | 0.0476 | 0.4 | 2.1 | 5.7 | 0.2 | 2.1 | 2.4 | 336 | SUPERCRITICAL |

### (b) Critical Depth where the 0.1 ft and 0.2 ft grids stop on different trials

**Diameter 73.3, n 0.0184, Discharge 389, Slope 0.0285**

| Rule | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 ft, H5 as it stands (5.28251) | 73.3 | 0.0184 | 389 | 5.27 | 0.0285 | 0.0141 | 26.9 | 14.6 | 14.4 | 1.8 | 4.2 | 1.0 | 401 | CRITICAL |
| 0.1 ft, H4 (5.28675) | 73.3 | 0.0184 | 389 | 5.28 | 0.0285 | 0.0141 | 27.0 | 14.6 | 14.4 | 1.8 | 4.2 | 1.0 | 401 | CRITICAL |

**Diameter 131.9, n 0.0199, Discharge 1601, Slope 0.0467**

| Rule | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 ft, H5 as it stands (9.30915) | 131.9 | 0.0199 | 1601 | 9.30 | 0.0467 | 0.0126 | 85.7 | 25.7 | 18.7 | 3.3 | 7.9 | 1.0 | 1675 | CRITICAL |
| 0.1 ft, H4 (9.30000) | 131.9 | 0.0199 | 1601 | 9.29 | 0.0467 | 0.0126 | 85.6 | 25.7 | 18.7 | 3.3 | 7.9 | 1.0 | 1677 | CRITICAL |

**Diameter 176.5, n 0.0252, Discharge 3091, Slope 0.0376**

| Rule | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 ft, H5 as it stands (12.08988) | 176.5 | 0.0252 | 3091 | 12.08 | 0.0376 | 0.0167 | 149.4 | 33.4 | 20.7 | 4.5 | 11.3 | 1.0 | 3315 | CRITICAL |
| 0.1 ft, H4 (12.10001) | 176.5 | 0.0252 | 3091 | 12.09 | 0.0376 | 0.0166 | 149.6 | 33.4 | 20.7 | 4.5 | 11.2 | 1.0 | 3313 | CRITICAL |

### (c) eight Critical Depth circles, practical ranges, seed 20261125

Typed inputs:

- cd-circ-000022: Diameter 94, n .0295, Discharge 148, Slope 2.3997
- cd-circ-000023: Diameter 15.6, n .0252, Discharge 3, Slope 4.1317
- cd-circ-000024: Diameter 16.7, n .0153, Discharge 8, Slope .1767
- cd-circ-000025: Diameter 144, n .0149, Discharge 2053, Slope 6.5026
- cd-circ-000026: Diameter 16.5, n .0148, Discharge 8, Slope 1.7439
- cd-circ-000027: Diameter 111.1, n .0098, Discharge 325, Slope 7.7597
- cd-circ-000028: Diameter 56.1, n .015, Discharge 81, Slope 4.213
- cd-circ-000029: Diameter 100.9, n .0315, Discharge 51, Slope 2.4785

Predicted (H5 as it stands):

| Case (search depth) | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cd-circ-000022 (3.04318) | 94.0 | 0.0295 | 148 | 3.03 | 2.3997 | 0.0149 | 17.3 | 10.5 | 8.5 | 1.6 | 7.6 | 1.0 | 498 | CRITICAL |
| cd-circ-000023 (0.68733) | 15.6 | 0.0252 | 3 | 0.68 | 4.1317 | 0.0218 | 0.7 | 2.1 | 4.2 | 0.3 | 1.3 | 1.0 | 6 | CRITICAL |
| cd-circ-000024 (1.11130) | 16.7 | 0.0153 | 8 | 1.10 | 0.1767 | 0.0126 | 1.3 | 3.1 | 6.1 | 0.4 | 1.1 | 1.0 | 9 | CRITICAL |
| cd-circ-000025 (10.28466) | 144.0 | 0.0149 | 2053 | 10.27 | 6.5026 | 0.0071 | 103.2 | 28.4 | 19.9 | 3.6 | 8.4 | 1.0 | 2130 | CRITICAL |
| cd-circ-000026 (1.11266) | 16.5 | 0.0148 | 8 | 1.10 | 1.7439 | 0.0122 | 1.3 | 3.1 | 6.2 | 0.4 | 1.1 | 1.0 | 9 | CRITICAL |
| cd-circ-000027 (4.36063) | 111.1 | 0.0098 | 325 | 4.35 | 7.7597 | 0.0016 | 31.2 | 14.0 | 10.4 | 2.2 | 9.2 | 1.0 | 775 | CRITICAL |
| cd-circ-000028 (2.60000) | 56.1 | 0.0150 | 81 | 2.59 | 4.2130 | 0.0052 | 9.8 | 7.9 | 8.3 | 1.2 | 4.6 | 1.0 | 146 | CRITICAL |
| cd-circ-000029 (1.72030) | 100.9 | 0.0315 | 51 | 1.71 | 2.4785 | 0.0167 | 8.2 | 7.9 | 6.2 | 1.0 | 6.8 | 1.0 | 598 | CRITICAL |

### (d) pipes where .9382·D and a 0.01 ft scan print different Max Discharge

**Diameter 171.2, n 0.0132, Depth 7.13, Slope 3.4067, Channel Capacity.** .9382·D 83413.508 prints 83414; scan 0.01 ft 83413.461 prints 83413; scan 0.005 ft 83414; scan 0.02 ft 83413.

| Rule | Diameter | n | Discharge | Depth | Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| .9382·D | 171.2 | 0.0132 | %38740 | 7.13 | 3.4067 | 79.9 | 22.4 | 485.0 | 3.6 | 14.3 | 36.1 | 83414 | SUPERCRITICAL |
| scan 0.01 ft | 171.2 | 0.0132 | %38740 | 7.13 | 3.4067 | 79.9 | 22.4 | 485.0 | 3.6 | 14.3 | 36.1 | 83413 | SUPERCRITICAL |

**Diameter 147.3, n 0.0101, Depth 6.14, Slope 6.5418, Channel Capacity.** .9382·D 101165.516 prints 101166; scan 0.01 ft 101165.430 prints 101165; scan 0.005 ft 101166; scan 0.02 ft 101165.

| Rule | Diameter | n | Discharge | Depth | Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| .9382·D | 147.3 | 0.0101 | %47055 | 6.14 | 6.5418 | 59.2 | 19.3 | 794.8 | 3.1 | 12.3 | 63.8 | 101166 | SUPERCRITICAL |
| scan 0.01 ft | 147.3 | 0.0101 | %47055 | 6.14 | 6.5418 | 59.2 | 19.3 | 794.8 | 3.1 | 12.3 | 63.8 | 101165 | SUPERCRITICAL |

**Diameter 110.2, n 0.0156, Depth 4.59, Slope 7.2582, Channel Capacity.** .9382·D 31822.514 prints 31823; scan 0.01 ft 31822.459 prints 31822; scan 0.005 ft 31823; scan 0.02 ft 31822.

| Rule | Diameter | n | Discharge | Depth | Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| .9382·D | 110.2 | 0.0156 | %14782 | 4.59 | 7.2582 | 33.1 | 14.4 | 446.6 | 2.3 | 9.2 | 41.4 | 31823 | SUPERCRITICAL |
| scan 0.01 ft | 110.2 | 0.0156 | %14782 | 4.59 | 7.2582 | 33.1 | 14.4 | 446.6 | 2.3 | 9.2 | 41.4 | 31822 | SUPERCRITICAL |

## A-006: the A-005 cases, graded against A-005 as committed

**15 of 17 print as A-005 predicted with the rules it stated (N1, the 0.2 ft grid, H5,
.9382·D). H5 holds on all 11 Critical Depth cases. Q-026 stays open. Max Discharge takes
.9382·D, with cc-circ-000035 as a known difference (ledger Q-028).**

**How graded.** The Exhumer recorded all 17 cases with the inputs A-005 shows (ledger decision
73). `node scripts/circle_outputs.mts grade-a005` reads A-005 from commit d9e1a3a with
`git show`, finds the golden with the same mode and typed inputs, and compares every
predicted cell with the printed field, echoes included. The section's numbers below are that
command's output. A-005 is unchanged.

| Part | Cases | Rows that print every field | Rule as stated |
|---|---|---|---|
| (a) Q-026 | nd-circ-000018 (D 72) | N1, N2 | match |
| | nd-circ-000019 (D 38) | N1, N2 | match |
| | nd-circ-000020 (D 53) | none | miss: Velocity `5.8` and Froude `2.5` where N1 to N4 all give 5.7 and 2.4; Top Width `2.0`, which only N2 gives |
| (b) the 0.2 ft step | cd-circ-000030 to -000032 | the 0.2 ft row in all three; the 0.1 ft row misses Depth on all three | match, 3 of 3 |
| (c) generated, seed 20261125 | cd-circ-000022 to -000029 | H5 | match, 8 of 8 |
| (d) Max Discharge | cc-circ-000034, -000036 | .9382·D (`83414`, `31823`) | match |
| | cc-circ-000035 | the 0.01 ft scan (`101165`) | miss: .9382·D gives 101166 |

**H5.** The 0.2 ft step was fitted on 15 goldens (A-004). On 11 it had never seen, it printed
every field. In the three pipes chosen to separate it from 0.1 ft, QUICK-2 printed the 0.2 ft
row each time. The fit cost recorded in A-004 is now paid: H5 is accepted.

**Max Discharge.** In cc-circ-000034 to -000036 the two rules sit 0.05 to 0.09 cfs either side
of a rounding boundary at 30,000 to 100,000 cfs: .9382·D gives 83413.508, 101165.516 and
31822.514; the 0.01 ft scan gives 83413.461, 101165.430 and 31822.459. That is about one part in
a million. Neither rule prints all three. No hypothesis is added to fit this (decision of the
person running the task, 2026-11-24). The rebuild uses .9382·D, which prints 2 of the 3, and
cc-circ-000035 is a known difference. The question is open as ledger Q-028. QuickBASIC 4.5's
single precision in the Max Discharge expression is one candidate cause; it is not a
classification, and no rule for it has been scored. It is not a haunting: hauntings record
QUICK-2 against exact hydraulics, and this is the rebuild against QUICK-2.

**Q-026 and nd-circ-000020.** Q-026 has used its five hypotheses (A-004, N1 to N5).
nd-circ-000020 adds a fact. Every field it prints except Depth comes out as printed at one
depth, 0.24883 to 0.25174 ft, where the discharge is 3.2% to 0.9% short of q. Velocity `5.8`
alone needs that range: it needs a smaller area than any of N1 to N4 ends on. Their trials
after the first bracket are:

- N1: 0.24726 (−4.61%), 0.34726, 0.25184 (−0.81%), 0.35184, and 0.25263 (−0.15%), where it stops.
- N2: 0.24726 (−4.61%), then 0.25228 (−0.45%), where it stops.
- N3: 0.24726 (−4.61%), 0.25726, then 0.25275 (−0.05%).
- N4: 0.24726 (−4.61%), 0.25354, then 0.25280 (−0.01%).

No trial of any of them falls in 0.24883 to 0.25174. One idea fits nd-circ-000020: the fields
are computed at the printed Depth, 0.25, which gives Velocity `5.8`, Froude `2.5` and Top Width
`2.0`. It fails the only other branch case, nd-circ-000010: at 0.55 it gives Velocity 87.3 and
Froude 24.4, where QUICK-2 printed `87.0` and `24.3`. I have no rule, stated before looking at
further cases, that explains both. So no new question is opened and nothing new is predicted.

The design uses N2, the only one of N1 to N4 that prints nd-circ-000020's Top Width. That match
may be a coincidence: N2 still ends at 0.25228, where Velocity is 5.7. nd-circ-000020 is a known
difference (Velocity and Froude). Q-026 stays open.

**The adopted rules on every circle result golden** (C2, .9382·D, N2, H5): 58 of 60. The two
misses are cc-circ-000035 (Max Discharge) and nd-circ-000020 (Velocity, Froude).

## A-007: predictions for "DEPTH is Greater than the DIAMETER" in circle Critical Depth (for the Exhumer, ledger Q-022)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section.**

**Source.** Every number below is printed by `node scripts/q022_boundary.mts observed`, `rate`
and `a007` at the commit that adds this section, from the rebuild's own search and circle
geometry (app/src). Inputs are typed exactly as shown.

**Why.** The rebuild's Critical Depth circle search steps 0.2 ft from 0.2 ft (A-004 H5, accepted
in A-006). When the next trial would pass the diameter before A·√(gA/T) reaches the discharge,
it returns outcome `rejected` with "DEPTH is Greater than the DIAMETER". On 2000 practical
Critical Depth circles drawn by the generator (seed 20261126, version 2) it rejects 11 (0.55%),
all of them pipes of 8.6 to 11.9 in, 6.5% of the 170 pipes under 24 in. In larger pipes the last
trial inside the pipe sits so close to the crown that no discharge the generator draws (at most
the critical discharge at 0.9·D) reaches it. No golden records the rejection: the profile has
no screen for it.

QUICK-2 has printed the message once, in run 20261122-214714-6aaf2d (Q-022): Diameter 9.1 in
(0.75833 ft), n .0216, Discharge 2, Slope 1.9915. The rebuild's trials there are 0.2 ft
(0.204 cfs), 0.4 ft (0.775), 0.6 ft (1.715, 0.791·D), then 0.8 ft, past the diameter, so it
rejects as QUICK-2 did. A 0.1 ft grid would reach 0.7 ft, bracket, and print a result. That run
was a generated case recorded before A-004 and played no part in choosing the 0.2 ft step. It is
one case, and it does not show where the boundary lies.

**Candidate rules.**

- R1, the rebuild: 0.2 ft trials; rejected when the next trial passes the diameter. For a pipe,
  a result up to q = A·√(gA/T) at the last trial inside the pipe, divided by 0.995 (the 0.5%
  stop), and rejected above.
- G1: the same with 0.1 ft trials. A-006 part (b) already refutes it for the printed Depth; it is
  listed because it predicts the rejection differently.
- S(f): rejected when q exceeds A·√(gA/T) at a fixed share f of the diameter. The observed run
  is rejected only if f < 0.847 (A·√(gA/T) is 2 cfs at 0.847·D, and 2.357 cfs at 0.9·D, the
  generator's bound).

The two pipes: 10.1 in, where the last 0.2 ft trial inside is 0.8 ft (0.950·D, 3.790 cfs) and
R1 gives a result up to 3.809 cfs; and 11.9 in, where it is 0.8 ft (0.807·D, 3.498 cfs) and R1
gives a result up to 3.516 cfs. n .013 and slope .005 in all four; Critical Depth uses n only
for Critical Slope and Max Discharge, and the slope for nothing but its echo (H-007).

| Case | Diameter | n | Discharge | Slope | R1 (rebuild) | G1 | S(f), f < 0.847 |
|---|---|---|---|---|---|---|---|
| P1 | 10.1 | .013 | 3 | .005 | result (search depth 0.75200) | result | rejected for every such f (a result needs f ≥ 0.894) |
| P2 | 10.1 | .013 | 4 | .005 | rejected | rejected | rejected (a result needs f ≥ 0.959) |
| P3 | 11.9 | .013 | 3 | .005 | result (search depth 0.74322) | result | result for f ≥ 0.750, rejected below |
| P4 | 11.9 | .013 | 4 | .005 | rejected | result (search depth 0.84644) | rejected (a result needs f ≥ 0.855) |

P1 separates R1 from every S(f) the observed run allows. P2 and P1 put R1's boundary for the
10.1 in pipe between 3 and 4 cfs. P4 separates R1 from G1 on the rejection itself. P3 is a
result under R1 and G1.

**Predicted screens under R1.** A rejection: the Critical Depth form stays, with "DEPTH is
Greater than the DIAMETER" on row 19 and no output field filled. (In the observed run the
Depth field also showed `0.00`; the rebuild does not model that field, so this is copied from
that run, not computed.) The profile maps no screen for it, so the run will end as `timeout`
on `cd_form`, as the observed run did, and its final screen is the observation.

A result prints every field below, echoes included, as the comparator compares them:

| Case | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | 10.1 | 0.0130 | 3 | 0.74 | 0.0050 | 0.0158 | 0.5 | 2.1 | 5.7 | 0.3 | 0.5 | 1.0 | 3 | CRITICAL |
| P3 | 11.9 | 0.0130 | 3 | 0.73 | 0.0050 | 0.0089 | 0.6 | 2.1 | 4.8 | 0.3 | 0.9 | 1.0 | 4 | CRITICAL |

**What each outcome means.** All four as R1 predicts: R1's boundary holds on two more pipes, and
Q-022's third part ("from what discharge") has the answer R1 gives. P1 rejected: QUICK-2 rejects
below its last trial, so R1 is wrong about the boundary even though it fits the observed run.
P4 a result: QUICK-2 does not reject where R1 does, and a rule that fits both P4 and the observed
run is needed. P1 or P3 printing a result with fields
other than those above is a circle Critical Depth mismatch for the comparator, not part of this
question. Q-022's other parts, the screen mapping and the key that leaves the message, are not
tested here.

## A-008: the A-007 cases, graded against A-007 as committed

**R1, the rebuild's rule, gets 3 of 4 outcomes. It is wrong about the boundary: QUICK-2
rejected P1 (10.1 in, 3 cfs), where R1 and G1 predicted a result. G1 gets 2 of 4; P4 refutes
it on the rejection too. S(f) with 0.750 ≤ f < 0.847 predicted all four. P3 printed 13 of its
14 fields as R1 predicted; the miss is Critical Slope `0.0090`, predicted `0.0089`.**

*Correction, 2026-11-25.* "S(f) with 0.750 ≤ f < 0.847 predicted all four" is wrong. As
committed in A-007 (dcd4e85), S(f) predicted P1, P2 and P4. For P3 it said "result for f ≥
0.750, rejected below", and the 0.750 lower bound was taken from P3's result afterwards, so S(f)
fitted P3 rather than predicted it. The wording came from the user's prompt for this section.
The sentence above is left as written.

**How graded.** The Exhumer ran the four cases as A-007 types them (ledger decision 75). P3
ended on a result and is golden cd-circ-000033. P1, P2 and P4 timed out on `cd_form` with
the message on the form, so they store no golden; each observation is the final screen of its
run folder, and decision 75 names the runs. `node scripts/q022_boundary.mts grade-a007` reads
A-007 from commit dcd4e85 with `git show`, finds the golden with the same mode and typed inputs
or else the run that decision 75 lists for them, and compares. The numbers below are that
command's output. A-007 is unchanged. The run folders are under `oracle/out`, which is not
committed, so the grade can be repeated only on a machine that holds them.

| Case | Diameter | Discharge | QUICK-2 | Evidence | R1 (rebuild) | G1 | S(f): a result needs |
|---|---|---|---|---|---|---|---|
| P1 | 10.1 | 3 | rejected | run 20261124-225953-c32ec8 | wrong (predicted a result) | wrong (predicted a result) | f ≥ 0.894, so f < 0.894 |
| P2 | 10.1 | 4 | rejected | run 20261124-230038-48c33a | right | right | f ≥ 0.959, so f < 0.959 |
| P3 | 11.9 | 3 | result | cd-circ-000033 (run 20261124-230059-fa1771) | right | right | f ≥ 0.750, so f ≥ 0.750 |
| P4 | 11.9 | 4 | rejected | run 20261124-230140-e185ee | right | wrong (predicted a result) | f ≥ 0.855, so f < 0.855 |

n is .013 and the slope .005 in all four.

**The rejection screens.** All three are what A-007 predicted: the run ends as `timeout` on
`cd_form`, "DEPTH is Greater than the DIAMETER" is on the form, the Depth field shows `0.00`,
and no output field is filled. The message is on 0-based row 20 of the 25-row screen, the row
on which the observed run 20261122-214714-6aaf2d printed it. A-007 and Q-022 call that row 19;
the row is the same, and the name is theirs.

**P3, cd-circ-000033.** Every field prints as R1 predicted (Depth `0.73`, Area `0.6`, Wet Per
`2.1`, Velocity `4.8`, Hyd R `0.3`, Top Width `0.9`, Froude `1.0`, Max Discharge `4`, CRITICAL,
and the echoes) except Critical Slope: QUICK-2 printed `0.0090`, the rebuild prints `0.0089`.
That is a circle Critical Depth mismatch for the comparator, not part of Q-022 (A-007, What each
outcome means). It is examined separately.

**What it means for Q-022.** For the 10.1 in pipe, R1's last 0.2 ft trial inside the pipe is
0.8 ft (0.950·D), where A·√(gA/T) is 3.790 cfs, so R1 gives a result up to 3.809 cfs. QUICK-2
rejects 3 cfs. So QUICK-2's rejection does not come from a 0.2 ft trial passing the diameter,
and the rebuild's boundary is wrong. The search that sets the result fields is not in question:
P3 and the 26 other circle Critical Depth results still fit the 0.2 ft step (A-006). With the
observed run, five outcomes are now known, and S(f) with 0.750 ≤ f < 0.847 fits all five. That
range comes from three of the five (P3, and the observed run's 0.847); it is not yet a rule.
Q-022 stays open.

**Full set after recording cd-circ-000033:** 279 of 285. The misses are cd-circ-000033 (Critical
Slope, new), cc-circ-000035 (Max Discharge, Q-028), nd-circ-000020 (Velocity, Froude; Q-026)
and sb-irr-000001 to -000003 (Step-Backwater, not built). The table-driven circle test in
`app/test/circle.test.ts` fails on cd-circ-000033 until its Critical Slope is settled.

### cd-circ-000033's Critical Slope

**Not a rounding boundary. Five hypotheses from inside the design fail, and no constant factor
fits. The claim for the Skeptic is that QUICK-2's search ends 0.0004 to 0.0012 ft lower than
the rebuild's chord in this pipe. Classification proposed: spec error. Nothing is changed in
the solver, and cd-circ-000033 is not listed as a known difference.**

`node scripts/circle_outputs.mts critical-slope` prints every number here.

**The boundary.** The rebuild's Critical Slope is 0.0089380 and prints `0.0089`; the boundary
to `0.0090` is 0.00895, 1.2e-5 away, which is 0.134% of the value. cc-circ-000035's Max
Discharge is 101165.516 against a boundary at 101165.5, 1.5e-7 of the value, about three steps
of single precision (2⁻²⁴, 6.0e-8). cd-circ-000033 is about 20,000 such steps from its
boundary. Single precision cannot move it there, so it does not sit on a rounding boundary in
the sense cc-circ-000035 does.

**Measurement: a factor on Critical Slope.** Each printed Critical Slope bounds the factor
between QUICK-2's value and the rebuild's. Over the 27 circle Critical Depth results,
cd-circ-000033 needs at least 1.00134, and three cases allow at most 1.00040 to 1.00042:
cd-circ-000015 (30.8 in, R 0.694), cd-circ-000026 (16.5 in, R 0.418) and cd-circ-000029
(100.9 in, R 1.035). So no constant explains it: not 1.486, g, a folded 1.486², or n as read.

**Hypotheses.** Each changes Critical Slope only; Max Discharge is recomputed from it, and every
other field is the rebuild's. Scored on the 27 circle Critical Depth results; the quick set
holds 16 of them.

| Hypothesis | Critical Slope matches | Every field | Quick set | cd-circ-000033 prints | Breaks |
|---|---|---|---|---|---|
| As built: ((q/A)·n/(1.486·R^.667))², A and R at the search depth y | 26 of 27 | 26 | 15 of 16 | `0.0089` (0.0089380) | |
| H1: R^.6667, the exponent of the circle's discharge | 26 | 18 | 10 of 16 | `0.0089` (0.0089316) | 8, on Max Discharge |
| H2: every intermediate stored in single precision (q/A, R^.667, the quotient) | 26 | 26 | 15 of 16 | `0.0089` (0.0089380) | none |
| H3: A and R at the printed Depth, y − 0.01 | 15 | 1 | 1 of 16 | `0.0092` (0.0092283) | 25 |
| H4: the search's velocity √(g·A/T) in place of q/A | 17 | 7 | 3 of 16 | `0.0089` (0.0089069) | 19 |
| H5: A and R from the θ geometry the rebuild had before C2 | 26 | 23 | 12 of 16 | `0.0089` (0.0089380) | 3 (cd-circ-000019 to -000021) |

None prints `0.0090`. A format rule cannot either: of the four-decimal roundings, only rounding
up gives `0.0090`, and rounding up prints cd-circ-000001's 0.0054245 as `0.0055`, where QUICK-2
printed `0.0054`.

**Measurement: one depth for every field.** With every field at one depth y and Depth printed
at y − 0.01, as the design has it, cd-circ-000033 prints every field as QUICK-2 printed it for
y from 0.74049 to 0.74279 ft. A·√(gA/T) there is 0.920% to 0.291% short of q; within the 0.5%
stop, y is 0.74203 to 0.74279. The rebuild's trials are 0.6 ft (1.9689 cfs) and 0.8 ft (3.4981
cfs, 0.807·D), and its chord lands at 0.74322, 0.174% short. So the printed fields are
consistent with the design's Critical Slope rule at a search depth 0.00043 to 0.00119 ft below
the rebuild's chord.

**Claim for the Skeptic.** In circle Critical Depth on the 11.9 in pipe (n .013, q 3),
QUICK-2's search ends 0.0004 to 0.0012 ft below the rebuild's chord at 0.74322, and its Critical
Slope is the design's ((q/A)·n/(1.486·R^.667))² at that depth. cd-circ-000033 is the only circle
Critical Depth result in a pipe under 1 ft (the next smallest is cd-circ-000023, 15.6 in), and
A-008 shows QUICK-2's search also rejects differently from the rebuild's in pipes this small.
That connection is a lead, not part of the claim. What changes the search depth is not known;
none of the five hypotheses above touches the search, so the claim is not yet a rule.

**Classification proposed: spec error** in the circle Critical Depth search (quick2-solver
design, The depth search; circle-outputs 2.9). It is not a display rule, because no rounding
rule prints `0.0090` without breaking another case. It is not a haunting, because it compares
the rebuild with QUICK-2, not QUICK-2 with exact hydraulics. If the Skeptic finds it holds, a
bugfix spec follows. The table-driven circle test fails on cd-circ-000033's Critical Slope
until then.

## A-009: one rule for cd-circ-000033 and the Q-022 boundary (for the Exhumer)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section. The solver is not changed.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a009` at the
commit that adds this section. It builds each rule on the rebuild's form reader, geometry (C2)
and printer, with Max Discharge at .9382·D, and checks first that its version of the rebuild's
rule prints what `solve()` prints on all 31 cases scored here (31 of 31). Outcomes on generated
and grid cases come from the rebuild's own `search.ts`. Inputs are typed exactly as shown.

**Why one mechanism.** Both misses are circle Critical Depth in pipes under 1 ft, near the
crown, and both are cases where the search's first chord is still short of q. That branch was
unobserved in Critical Depth when the design chose its rule (A-004: no Critical Depth golden
reached it). The rebuild then takes the chord again on the narrowed bracket (N2, chosen for
Normal Depth from nd-circ-000020's Top Width, A-006). The A-005 goldens cd-circ-000023, -000024
and -000026 reach the branch too, but there every rule below prints the same.

- cd-circ-000033 (11.9 in, D 0.99167 ft, q 3): trials 0.2, 0.4, 0.6 (−34.369%), 0.8
  (+16.602%); the first chord, 0.73486, is 2.444% short. The rebuild's second chord is 0.74322
  (−0.174%). A-008 measured that every printed field needs a search depth of 0.74203 to
  0.74279.
- Run 20261124-225953-c32ec8 (10.1 in, D 0.84167 ft, q 3): trials 0.2, 0.4, 0.6 (−40.095%),
  0.8 (+26.333%); the first chord, 0.72072, is 11.085% short. The rebuild narrows three more
  times and prints a result at 0.75200. QUICK-2 printed "DEPTH is Greater than the DIAMETER".

If stepping resumes from a short chord with the same 0.2 ft step (N1, the shared search's rule
for every other shape, A-001), the 10.1 in pipe's next trial is 0.92072, past the diameter, so
the search rejects. The 11.9 in pipe's next trial is 0.93486 (+82.666%, inside the pipe); the
chord on [0.73486, 0.93486] is 0.74060 (−0.889%), the next trial 0.94060 (+88.274%), and the
chord on [0.74060, 0.94060] is 0.74259 (−0.345%), within the 0.5% stop and inside A-008's
window. One rule gives both.

**Hypotheses.** Each changes only what Critical Depth does after a chord that is still short;
the 0.2 ft step from 0.2 ft, the 0.5% stop, the diameter ceiling on stepped trials, the 0.01 ft
Depth offset and every field formula are H5 as accepted (A-006). Scored on every field of the
27 circle Critical Depth result goldens and on the outcome of the four runs that printed the
message: run 20261122-214714-6aaf2d (Q-022) and A-008's P1, P2 and P4.

| Rule after a short chord | Results (every field) | Rejections | Together | Misses |
|---|---|---|---|---|
| The rebuild: the chord repeats on the narrowed bracket (N2) | 26 of 27 | 3 of 4 | 29 of 31 | cd-circ-000033 (Critical Slope); P1 gives a result at 0.75200 |
| K1: stepping resumes from the chord with the same 0.2 ft step (N1) | **27 of 27** | **4 of 4** | **31 of 31** | none |
| K2: stepping resumes from the chord with 0.02 ft steps (N3) | 25 | 3 | 28 | cd-circ-000023 and -000033 (Critical Slope); P1 a result at 0.75222 |
| K3: secant through the two latest trials (N4) | 23 | 3 | 26 | cd-circ-000023, -000024 (Critical Slope), -000026 (Depth), -000033 (Depth, Critical Slope); P1 a result at 0.75298 |
| K4: bisect the bracket (N5) | 26 | 3 | 29 | cd-circ-000033 (Critical Slope); P1 a result at 0.75191 |

P2, P4 and the Q-022 run are rejected under every rule: each passes the diameter before F
reaches q, so no chord is taken. Only cd-circ-000033 and P1 separate the rules, and both were
seen before K1 was named. K1 is not tuned: it is the shared search's existing rule, already
candidate N1 of Q-026, with no constant chosen here. Still, two cases chose it, so it is a
proposal until the cases below run.

**The rule I would adopt for Q-022.** A circle Critical Depth input is rejected with "DEPTH is
Greater than the DIAMETER" when a 0.2 ft step would pass the diameter before a trial or a chord
lands within 0.5% of q. Steps run from 0.2 ft, and again from every chord that is still short
(K1). So the boundary is not a fixed discharge or a fixed share of the diameter: in a given
pipe it depends on where the chord lands: a chord still short of q and within 0.2 ft of the
crown rejects, wherever q sits.

**What K1 predicts beyond the goldens.** On A-007's 2000 generated practical circles (seed
20261126), the rebuild rejects 11 and K1 rejects 27 (1.50%), in pipes of 8.6 to 21.2 in where
the rebuild's rejections stop at 11.9 in. 79 of the 2000 differ from the rebuild in outcome or
in a printed field. On a grid with n .013 and slope .005 (8 to 36 in by 0.1 in with every whole
discharge below the critical discharge at 0.9·D, and 37 to 180 in by 1 in with 40 discharges
each), K1 rejects 110 cases where the rebuild prints a result, 8 to 22.7 in, and both print a
result but differ in 739, 8.3 to 98 in. In all but 4 of the 739, one or two fields differ.

**Not part of this.** Normal Depth keeps N2. nd-circ-000020's Top Width `2.0` is printed only by
N2 (A-006), so taking K1 for both modes would add a Top Width miss to a case that is already a
known difference. Q-026 stays open; QUICK-2 may treat the two modes differently, and nothing here
shows whether it does. Three of the 2000 generated cases are 9.6 in pipes (D 0.8 ft exactly),
where the trial at 0.8 ft sits on the diameter, the top width is 0 and A·√(gA/T) is infinite.
Both rules then never finish. QUICK-2 has not been run on such a pipe, and no case below tests it.

### Predictions

n .013 and slope .005 in all four. "S(f)" is A-008's range, 0.750 ≤ f < 0.847, given for
reference: each case's share is where A·√(gA/T) reaches q.

| Case | Diameter | Discharge | Rebuild (N2) | K1 | S(f) | What it tests |
|---|---|---|---|---|---|---|
| Q1 | 8 | 1 | result (search depth 0.47330) | **rejected** | result (share 0.712) | K1's rejection below the shares S(f) allows, in the smallest practical pipe |
| Q2 | 22.7 | 23 | result (search depth 1.69660) | **rejected** | rejected (share 0.898) | K1's rejection in a pipe twice the size of any rejection seen |
| Q3 | 37 | 77 | result (search depth 2.75615) | result (search depth 2.75394) | rejected (share 0.894) | K1 against the rebuild on Depth; S(f) against both on the outcome |
| Q4 | 51 | 4 | result (search depth 0.56793) | result (search depth 0.56735) | result (share 0.134) | K1 against the rebuild in a shallow flow far from the crown |

K2 to K4, refuted above, give results on all four; their fields are in the script's output.

**Predicted screens.** A rejection, as A-007 and A-008 saw it: the run ends as `timeout` on
`cd_form`, "DEPTH is Greater than the DIAMETER" is on the form, the Depth field shows `0.00`,
and no output field is filled. A result prints every field below, echoes included, as the
comparator compares them:

| Case | Rule | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Q1 | Rebuild | 8.0 | 0.0130 | 1 | 0.46 | 0.0050 | 0.0094 | 0.3 | 1.3 | 3.8 | 0.2 | 0.6 | 1.0 | 1 | CRITICAL |
| Q2 | Rebuild | 22.7 | 0.0130 | 23 | 1.69 | 0.0050 | 0.0123 | 2.7 | 4.7 | 8.7 | 0.6 | 1.2 | 1.0 | 23 | CRITICAL |
| Q3 | Rebuild | 37.0 | 0.0130 | 77 | 2.75 | 0.0050 | 0.0102 | 7.0 | 7.6 | 10.9 | 0.9 | 1.9 | 1.0 | 78 | CRITICAL |
| Q3 | K1 | 37.0 | 0.0130 | 77 | 2.74 | 0.0050 | 0.0102 | 7.0 | 7.6 | 10.9 | 0.9 | 1.9 | 1.0 | 78 | CRITICAL |
| Q4 | Rebuild | 51.0 | 0.0130 | 4 | 0.56 | 0.0050 | 0.0038 | 1.1 | 3.2 | 3.5 | 0.4 | 2.9 | 1.0 | 112 | CRITICAL |
| Q4 | K1 | 51.0 | 0.0130 | 4 | 0.56 | 0.0050 | 0.0039 | 1.1 | 3.2 | 3.6 | 0.4 | 2.9 | 1.0 | 113 | CRITICAL |

**What each outcome means.** All four as K1 predicts: K1 holds on cases it was not chosen on,
which supports A-008's claim and its proposed classification (a spec error in the circle Critical
Depth search, the short-chord rule), and Q-022's boundary has the rule above as its answer. Q1 or Q2 printing a
result refutes K1 for the rejection; if it prints the rebuild's fields, the rebuild's rule is
right there and a third rule is needed for P1. Q3 or Q4 printing the rebuild's row refutes K1 for
results. Q3 rejected with Q1 a result would point back to a share rule like S(f). Any other
printed field is a mismatch for the comparator and is examined separately.

## A-010: the A-009 cases, graded against A-009 as committed

**K1 gets 4 of 4: QUICK-2 rejected Q1 and Q2, and Q3 and Q4 printed K1's row on every field.
The rebuild gets 0 of 4. S(f) gets 2 of 4 and is refuted: it predicted a result for Q1, which
QUICK-2 rejected (it also predicted a rejection for Q3, which printed a result).**

**How graded.** The Exhumer ran the four cases as A-009 types them, n .013 and slope .005
(ledger decisions 78 to 80). Q3 ended on a result and is golden cd-circ-000035; Q4 is golden
cd-circ-000036. Q1 and Q2 timed out on `cd_form` with the message on the form, so they store no
golden; each observation is the final screen of the run folder that decision 80 names.
`node scripts/circle_outputs.mts grade-a009` reads A-009 from commit 80c87fd with `git show`,
finds the golden that decision 80 lists with the same mode and typed inputs, or else the run it
lists for them, and compares outcome and every predicted field. The numbers below are that
command's output. A-009 is unchanged. The run folders are under `oracle/out`, which is not
committed, so Q1 and Q2 can be re-graded only on a machine that holds them. Q3 and Q4 come from
committed goldens.

| Case | Diameter | Discharge | QUICK-2 | Evidence | Rebuild (N2) | K1 | S(f) |
|---|---|---|---|---|---|---|---|
| Q1 | 8 | 1 | rejected | run 20261125-100706-f61649 | wrong (predicted a result) | right | wrong (predicted a result) |
| Q2 | 22.7 | 23 | rejected | run 20261125-100748-9dd937 | wrong (predicted a result) | right | right |
| Q3 | 37 | 77 | result | cd-circ-000035 | wrong: Depth predicted `2.75`, printed `2.74`; 13 of 14 fields | right, 14 of 14 fields | wrong (predicted a rejection) |
| Q4 | 51 | 4 | result | cd-circ-000036 | wrong: predicted Critical Slope `0.0038`, Velocity `3.5`, Max Discharge `112`; printed `0.0039`, `3.6`, `113`; 11 of 14 fields | right, 14 of 14 fields | right (outcome only; S(f) predicts no fields) |

**The rejection screens.** Both are what A-009 predicted: the run ends as `timeout` on
`cd_form`, "DEPTH is Greater than the DIAMETER" is on 0-based row 20 (the row A-008 found),
the Depth field shows `0.00`, and Critical Slope and every output field are blank.

**What it means.** By A-009's own reading ("All four as K1 predicts"), K1 holds on four cases it
was not chosen on. Q1 is rejected in the smallest practical pipe although A·√(gA/T) reaches q at
0.712·D, where every S(f) in A-008's range gives a result. Q2 is rejected in a 22.7 in pipe,
twice the size of any rejection seen before. Q3 and Q4 print what K1's search depths (2.75394
and 0.56735) give, not what the rebuild's (2.75615 and 0.56793) give. This supports A-008's claim for cd-circ-000033 and its classification (a spec error in
the circle Critical Depth search, the short-chord rule). Nothing in the solver changes here.
Normal Depth's rule after a short chord (Q-026) is not tested by these cases.

**Full set after recording cd-circ-000035 and -000036:** 279 of 287. The misses are
cd-circ-000033 (Critical Slope), cd-circ-000035 (Depth) and cd-circ-000036 (Critical Slope,
Velocity, Max Discharge), all three where K1 and the rebuild differ; cc-circ-000035 (Max
Discharge, Q-028); nd-circ-000020 (Velocity, Froude; Q-026); and sb-irr-000001 to -000003
(Step-Backwater, not built).

**Not part of A-009.** The Exhumer's exploratory run on a 9.6 in pipe (D 0.8 ft), run
20261125-100815-dff8b0, ended on the shape menu with no result and no message. It is ledger
Q-029 and is not graded here.

### A check found after the runs

**Found after the A-009 runs, not predicted.** K1's search depth for cd-circ-000033 is 0.742594.
At that depth the design's Critical Slope, ((q/A)·n/(1.486·R^.667))², prints `0.8955` at n .13
(0.895548) and `4.7692` at n .3 (4.769189). Those are what the Skeptic's exploratory runs
printed on the same pipe and discharge: run 20261125-100502-2c83a6 (n .13, slope .005) and run
20261125-100602-583c5a (n .3, slope .005). The rebuild's chord at 0.74322 prints `0.8938` and
`4.7599`. `node scripts/circle_outputs.mts grade-a009` prints these numbers too; it reads the
two runs from their folders, so this check also needs a machine that holds them. The runs were
exploratory, so they are not citations for a requirement.

## A-011: trials that land on the diameter, and standard pipe sizes (for the Exhumer)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section. The solver is not changed.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a011` at the
commit that adds this section. Outcomes come from the rebuild's own `search.ts` with
`afterShortChord: 'resume'` (K1, A-009); fields come from the script's `cd()` with geometry C2
and Max Discharge at .9382·D, as in A-009. The script first checks that its model of the
rebuild's trials gives the outcome `search.ts` gives, on 3306 pipe and discharge pairs from 8 to
180 in (3306 of 3306). Inputs are typed exactly as shown. The circle-short-chord spec
(`.kiro/specs/circle-short-chord`) is the reason for this section.

**Why.** A circle Critical Depth trial that lands exactly on the diameter has top width 0, so
A·√(g·A/T) is infinite. The chord on [last trial inside, D] then lands on the last trial inside,
which is short, so stepping returns to D, and the rebuild never finishes under N2 and under K1
alike. QUICK-2 has been run on one such pipe: 9.6 in, 2 cfs, exploratory run
20261125-100815-dff8b0, which ended on the shape menu with no result and no message (Q-029).
Standard pipe sizes have never been run.

**Where the rebuild's trials land.** Trials step from 0.2 ft by `store(y + 0.2)`. On the 8 to
180 in grid by 0.1 in, a stepped trial lands exactly on the diameter in 6 pipes:

| Diameter | D (ft) | Trial on D | Last trial inside | A·√(gA/T) there | The search reaches D for q above | Critical discharge at 0.9·D |
|---|---|---|---|---|---|---|
| 9.6 | 0.800000012 | 4 | 0.600000024 | 1.7531 | 1.7619 | 2.694 |
| 12.0 | 1.00000000 | 5 | 0.800000012 | 3.5072 | 3.5248 | 4.706 |
| 50.4 | 4.20000029 | 21 | 4.00000048 | 213.1072 | 214.1781 | 170.135 |
| 52.8 | 4.40000010 | 22 | 4.20000029 | 242.4823 | 243.7008 | 191.118 |
| 55.2 | 4.59999990 | 23 | 4.40000010 | 274.3034 | 275.6818 | 213.582 |
| 57.6 | 4.79999971 | 24 | 4.59999990 | 308.6533 | 310.2043 | 237.560 |

The threshold is A·√(gA/T) at the last trial inside divided by 0.995: above it, no trial is
within 0.5% before D. In 9.6 and 12 in that is below the critical discharge at 0.9·D, so the
generator's practical range can draw it. In 50.4 to 57.6 in it is above, so only a typed
discharge reaches it. In the other pipes the sums drift off the diameter. Of the diameters in
HEC-RAS Table 6-2 (AISI 1980, the source the profile cites for the practical range: 8, 10, 12,
18, 24, 36, 48, 54, 60, 66, 72, 78, 120 and 180 in), only 12 in lands on D:

- 24, 36 and 48 in: the sum lands just past D, by 2.38e-7, 4.77e-7 and 4.77e-7 ft, so a
  search that reaches the last trial inside (0.2 ft below the crown) without stopping is
  rejected with "DEPTH is Greater than the DIAMETER".
- 60, 72, 120 and 180 in: the sum lands just below D, by 4.77e-7, 1.43e-6, 4.77e-6 and
  9.54e-6 ft. That trial is inside the pipe, with a top width near 0 and a very large but
  finite A·√(gA/T).
- 8, 10, 18, 54, 66 and 78 in: no trial comes within 0.03 ft of D.

The diameter in feet is the same whether it is formed as `store(d/12)` or
`store(store(d)/12)`: no diameter on the grid differs.

**How QUICK-2's sum could differ from the rebuild's.** The rebuild adds a double 0.2 and
stores the sum. Five ways of forming the trial were tried on every stepped trial:

| Trial formed as | Grid diameters with a trial on D | 9.6 in | 12 in | 24, 36, 48 in |
|---|---|---|---|---|
| The rebuild: `store(y + 0.2)`, 0.2 a double | 6 (above) | on D | on D | just past |
| `y + .2` with the literal .2 a single (0.200000003), stored | the same 6 | on D | on D | just past |
| A counter: `base + k·.2`, stored, so errors do not accumulate | 58: 9.6, 12.0, 16.8, 19.2, 21.6, 24.0, 26.4, 31.2, 33.6, 36.0, 38.4, 43.2, 45.6, 48.0, 50.4, 52.8, 55.2, 60.0, 62.4, 64.8, 67.2, 72.0, 74.4, 76.8, 79.2, 84.0, 86.4, 88.8, 91.2, 96.0, 98.4, 100.8, 105.6, 108.0, 110.4, 112.8, 117.6, 120.0, 122.4, 124.8, 129.6, 132.0, 134.4, 136.8, 141.6, 144.0, 146.4, 148.8, 153.6, 156.0, 158.4, 160.8, 165.6, 168.0, 170.4, 172.8, 177.6, 180.0 | on D | on D | on D |
| The depth held in double precision and never stored | 2: 12.0, 108.0 | 1.2e-8 below D | on D | 2.2e-16 below to 8.9e-16 past |
| `y + .2` stored, but tested against D before the store, as the 8087 holds it | 0 | past D | 1.49e-8 past | just past |

The first two give identical trials on all 76 steps from 0.2 to 15.2 ft, so the single literal
alone changes nothing on stepped trials. A counter puts every pipe whose diameter is a multiple
of 0.2 ft on D. A double depth or a test before the store takes 9.6 in off D. Each is a way
the program could be written, not an observation.

### Predictions

n .013 and slope .005 in all five. The rebuild column is what `solve()` prints today (N2).

| Case | Diameter | Discharge | A·√(gA/T) reaches q at | Rebuild now (N2) | K1, the rebuild's trials | Counter `base + k·.2` | Double depth | Tested before the store |
|---|---|---|---|---|---|---|---|---|
| S1 | 12 | 3 | 0.7424·D | result (search depth 0.74182) | **result** (search depth 0.74139) | result, same fields | result, same fields | result, same fields |
| S2 | 12 | 4 | 0.8474·D | never finishes | **on the diameter** (trial 5, 1.0 ft) | on the diameter | on the diameter | rejected |
| S3 | 24 | 27 | 0.9041·D | rejected | **rejected** (trial 10, 2.00000024 ft, past D) | on the diameter | rejected | rejected |
| S4 | 36 | 84 | 0.9348·D | rejected | **rejected** (trial 15, 3.00000048 ft, past D) | on the diameter | rejected | rejected |
| S5 | 48 | 188 | 0.9518·D | rejected | **rejected** (trial 20, 4.00000048 ft, past D) | on the diameter | rejected | rejected |

K1's trials, from the script:

- S1: 0.2, 0.4, 0.6 (−34.048%), 0.8 (+16.907%); chord 0.733640 (−2.379%); 0.933640
  (+78.695%); chord 0.739507 (−0.796%); 0.939507 (+83.620%); chord 0.741393 (−0.283%), stop.
- S2: 0.2, 0.4, 0.6, 0.8 (−12.320%), then 1.0 ft, on D. The chord lands back on 0.8.
- S3: the trial at 1.80000019 ft is 1.399% short; the next is past D.
- S4: the trial at 2.80000043 ft is 0.651% short; the next is past D.
- S5: the trial at 3.80000067 ft is 1.014% short; the next is past D.

**Predicted screens under K1 with the rebuild's trials.**

S1 prints every field below, echoes included, as the comparator compares them. N2 prints the
same fields, so S1 does not separate K1 from N2. It is the first standard-size result.

| Case | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 12.0 | 0.0130 | 3 | 0.73 | 0.0050 | 0.0088 | 0.6 | 2.1 | 4.8 | 0.3 | 0.9 | 1.0 | 4 | CRITICAL |

S3, S4 and S5, a rejection as A-008 and A-010 saw it: "DEPTH is Greater than the DIAMETER" on
0-based row 20, the Depth field `0.00`, Critical Slope and every output field blank. The
rebuild does not model the Depth field, so `0.00` is copied from those runs, not computed. If
the profile maps the rejection screen in the same session, as planned, each is stored as a
`rejected` golden; otherwise each times out on `cd_form`.

S2: the rebuild makes no prediction of QUICK-2's screen for a trial on the diameter. The only
observation is Q-029's exploratory 9.6 in run, which ended on the shape menu with no result and
no message. If QUICK-2 does here what it did there, the run times out on `shape_menu` and
stores no golden.

**What each outcome means.**

- S1 prints the row above: K1 and the 0.2 ft search hold in a standard 12 in pipe. Any field
  printed otherwise is a circle Critical Depth mismatch for the comparator.
- S2 ends on the shape menu with no message: what the 9.6 in run showed happens on a second
  pipe whose trial lands on D, so landing on D, not something about 9.6 in, is the likely
  trigger. S2 printing the message instead points at a test before the store, and then the 9.6
  in run needs another explanation, since that model takes 9.6 in past D. A result fits none of
  the five.
- S3 to S5 rejected with the message: the trials accumulate, as in the rebuild. Any of them
  ending as S2 is predicted to end (on D) points at a counter. Then 58 grid diameters land on D
  and the rebuild's trials are wrong for this spec. A result in any of them fits none of the
  five.
- The double depth is not separated from the rebuild by these five cases. It takes 9.6 in off
  D, so if the 9.6 in run's shape menu comes from a trial on D, the double depth does not
  explain it. That is a reading of one exploratory run, not a result.

## A-011, amendment of 2026-11-25: two corrections and six cases (for the Exhumer)

**Written and committed before any A-011 case runs, in its own commit. A-011's text above is
left as committed in b4950f7. Nothing in this amendment changes after the runs; the results go
in A-012, which grades S1 to S11.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a011` at the
commit that adds this amendment. The script's diameter check is fixed (correction 1). For S1 to
S5 it now also prints every trial, every field and the outcome with `store(VAL/12)`; the
numbers A-011 gives are unchanged. S6 to S11 were chosen by the person running the task: S1 to
S5 do not separate K1 from N2.

### Correction 1: how the diameter is stored

A-011 says: "The diameter in feet is the same whether it is formed as `store(d/12)` or
`store(store(d)/12)`: no diameter on the grid differs." That is wrong. The script took d from
the form reader, which has already stored VAL's value (`parse.ts`, `readSingle`), so it
compared a value with itself. From the typed text, `store(VAL/12)` and the rebuild's
`store(store(VAL)/12)` give a different diameter in feet for 525 of the 1721 grid diameters
(the first are 8.6, 8.7, 8.9, 9.1, 9.3, 9.4 and 10.1 in).

So the pipes where a stepped trial lands on the diameter depend on how the diameter is stored:

| Diameter store | Trials `store(y + 0.2)` | Pipes with a trial on D, 8 to 180 in by 0.1 in |
|---|---|---|
| The rebuild: `store(store(VAL)/12)` | the rebuild's | 9.6, 12.0, 50.4, 52.8, 55.2, 57.6 (as in A-011) |
| `store(VAL/12)` | the rebuild's | 9.6, 12.0, 14.4, 52.8, 55.2 |

With `store(VAL/12)`, 14.4 in has D 1.20000005 ft and its sixth trial lands on it. The search
reaches it for q above 6.0943 cfs, below the critical discharge at 0.9·D (7.424 cfs), so the
generator can draw it. With the rebuild's store, D is 1.19999993 ft and the sixth trial,
1.20000005, is 1.19e-7 ft past it.

S1 to S5 are unaffected: 12, 24, 36 and 48 in give the same D both ways, and every outcome is
the same.

### Correction 2: the counter

A-011 says: "A counter puts every pipe whose diameter is a multiple of 0.2 ft on D." That is
wrong. Of the 72 multiples of 2.4 in from 9.6 to 180 in, a counter (`base + k·.2`, stored)
puts 58 on D with either diameter store, and leaves out 14:

- The rebuild's store: 14.4, 28.8, 40.8, 57.6, 69.6, 81.6, 93.6, 103.2, 115.2, 127.2, 139.2,
  151.2, 163.2 and 175.2 in.
- `store(VAL/12)`: 21.6, 31.2, 43.2, 50.4, 62.4, 74.4, 86.4, 100.8, 112.8, 124.8, 136.8, 148.8,
  160.8 and 172.8 in.

A-011's list of 58 for the rebuild's store is right as printed.

### Six more cases

n .013 and slope .005 in all six. "N2" is what `solve()` prints today. "K1" is `search.ts`
with `afterShortChord: 'resume'`. The five trial models are A-011's, with the rebuild's
diameter store; the last column is K1 with the rebuild's trials and `store(VAL/12)`.

| Case | Diameter | Discharge | A·√(gA/T) reaches q at | N2 (today) | **K1** | y + .2, .2 single | Counter | Double depth | Tested before the store | K1, D = store(VAL/12) |
|---|---|---|---|---|---|---|---|---|---|---|
| S6 | 15 | 5 | 0.7253·D | result (0.90591) | **result (0.90489)** | result, K1's fields | result, K1's fields | result, K1's fields | result, K1's fields | result, K1's fields |
| S7 | 15 | 7 | 0.8480·D | result (1.05853) | **rejected** | rejected | rejected | rejected | rejected | rejected |
| S8 | 18 | 12 | 0.8761·D | result (1.31296) | **rejected** | rejected | rejected | rejected | rejected | rejected |
| S9 | 30 | 55 | 0.9416·D | result (2.35330) | **rejected** | rejected | rejected | rejected | rejected | rejected |
| S10 | 60 | 360 | 0.9657·D | result (4.82503) | **rejected** | rejected | on the diameter | rejected | rejected | rejected |
| S11 | 14.4 | 7 | 0.8821·D | rejected | **rejected** | rejected | rejected | rejected | rejected | on the diameter |

The person running the task expected K1 to reject S7 to S10, where the rebuild prints a result
today. `search.ts` agrees on all four.

K1's trials, from the script (percent of q):

- S6: 0.2, 0.4, 0.6, 0.8 (−21.738%), 1.0 (+22.537%); chord 0.898194 (−1.848%); 1.098194
  (+53.328%); chord 0.904894 (−0.381%), stop.
- S7: … 1.0 (−12.474%), 1.2 (+54.292%); chord 1.037365 (−4.983%); 1.237365 (+119.808%); chord
  1.045352 (−3.270%); 1.245352 (+182.354%); chord 1.048875 (−2.499%); 1.248875 (+302.461%);
  chord 1.050514 (−2.137%); the next trial, 1.250514, is 5.14e-4 ft past D.
- S8: … 1.2 (−19.460%), 1.4 (+22.938%); chord 1.291798 (−4.382%); 1.491798 (+135.934%); chord
  1.298045 (−3.193%); 1.498045 (+237.598%); chord 1.300697 (−2.679%); the next trial, 1.500697,
  is 6.97e-4 ft past D.
- S9: … 2.2 (−20.793%), 2.4 (+11.085%); chord 2.330456 (−4.301%); the next trial, 2.530456, is
  3.05e-2 ft past D.
- S10: … 4.79999971 (−3.996%); trial 25 at 4.99999952, 4.77e-7 ft below D (+2367.863%); chord
  4.800337 (−3.952%); the next trial, 5.000337, is 3.37e-4 ft past D.
- S11: 0.2, 0.4, 0.6, 0.8, 1.0 (−13.374%); the next trial, 1.20000005, is 1.19e-7 ft past D
  (1.19999993). No chord is taken, so N2 rejects too.

**Every field of every result.** Echoes included, as the comparator compares them.

| Case | Rule | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S6 | K1, and every trial model | 15.0 | 0.0130 | 5 | 0.89 | 0.0050 | 0.0079 | 1.0 | 2.5 | 5.3 | 0.4 | 1.1 | 1.0 | 6 | CRITICAL |
| S6 | N2 | 15.0 | 0.0130 | 5 | 0.90 | 0.0050 | 0.0078 | 1.0 | 2.5 | 5.2 | 0.4 | 1.1 | 1.0 | 6 | CRITICAL |
| S7 | N2 | 15.0 | 0.0130 | 7 | 1.05 | 0.0050 | 0.0111 | 1.1 | 2.9 | 6.3 | 0.4 | 0.9 | 1.0 | 7 | CRITICAL |
| S8 | N2 | 18.0 | 0.0130 | 12 | 1.30 | 0.0050 | 0.0118 | 1.6 | 3.6 | 7.3 | 0.5 | 1.0 | 1.0 | 12 | CRITICAL |
| S9 | N2 | 30.0 | 0.0130 | 55 | 2.34 | 0.0050 | 0.0155 | 4.8 | 6.6 | 11.5 | 0.7 | 1.2 | 1.0 | 55 | CRITICAL |
| S10 | N2 | 60.0 | 0.0130 | 360 | 4.82 | 0.0050 | 0.0167 | 19.4 | 13.8 | 18.5 | 1.4 | 1.8 | 1.0 | 362 | CRITICAL |

S6 under N2 and K1 differs on Depth, Critical Slope and Velocity.

**Predicted screens under K1** with the rebuild's trials and diameter store: S6 prints the K1
row above. S7 to S11 are rejections as A-008 and A-010 saw them: "DEPTH is Greater than the
DIAMETER" on 0-based row 20, the Depth field `0.00`, Critical Slope and every output field
blank, stored as `rejected` goldens once the profile maps the screen.

**What each outcome means.**

- S6 prints the K1 row: K1 holds on a result where it and N2 print differently. The N2 row
  refutes K1 there.
- S7 to S10 rejected: K1 holds on four more cases where N2 prints a result, in 15, 18, 30 and 60
  in pipes. Any of them printing the N2 row refutes K1 for that case.
- S10 ending on the shape menu, as Q-029's 9.6 in run did, points at a counter, and so would S3
  to S5 (A-011).
- S11 rejected: the rebuild's diameter store holds. S11 ending on the shape menu points at
  `store(VAL/12)`. The diameter store is used by every circle mode, so that would also need
  checking against every circle golden.

## A-012: S1 to S11, graded against A-011 and its amendment as committed

**K1 with the rebuild's trials gets 10 of 11: every outcome and every printed field except S2.
S2 (12 in, 4 cfs) printed "DEPTH is Greater than the DIAMETER", where the rebuild's fifth trial
lands on the diameter and A-011 predicted "on the diameter". The only model right on all
eleven is "tested before the store", and it takes the 9.6 in pipe past the diameter, where
QUICK-2's one run there ended on the shape menu with no message (Q-029). The rebuild today
(N2) gets 5 of 11. On S6 to S10, K1 gets 5 of 5 and the rebuild 0 of 5.**

**How graded.** The Exhumer ran S1 to S11 once each, n .013 and slope .005, as A-011 and its
amendment type them (ledger decisions 87 and 88). `node scripts/circle_outputs.mts grade-a011`
reads A-011 from commit b4950f7 (S1 to S5) and the amendment from 3d9bf3a (S6 to S11) with
`git show`, finds the golden that decision 87 or 88 lists with the same mode and typed inputs,
or else the run folder it lists for them, and compares the outcome and every predicted field.
The numbers below are that command's output. A-011 and the amendment are unchanged.

**What is a golden and what is not.** S1 is golden cd-circ-000037 and S6 is golden
cd-circ-000038. The other nine are not goldens yet. Each reached the rejection screen and timed
out under Q-030, so each observation is the final screen of its run folder: S2
20261125-141415-e06fc2, S3 -141455-32c1dd, S4 -141528-97d64c, S5 -141601-3cef76, S7
-141645-fb0830, S8 -141717-8eba31, S9 -141750-6e1c20, S10 -141822-a7c47f and S11
-141855-1d1517. The run folders are under `oracle/out`, which is not committed, so those nine
can be re-graded only on a machine that holds them, until they are recorded (Q-031). On every
one of the nine the message is on 0-based row 20, the Depth field shows `0.00`, and Critical
Slope and every output field are blank.

**Derived predictions, labelled.** A-011's S1 to S5 table has no column for ".2 a single" or
for `store(VAL/12)`. A-011 says the single literal "alone changes nothing on stepped trials",
and the amendment says "S1 to S5 are unaffected" by the diameter store, so both are graded with
K1's column there. N2's S1 fields are graded with K1's row, because A-011 says "N2 prints the
same fields". The script checks that these sentences are in the committed text.

| Case | Diameter | Discharge | QUICK-2 | Evidence | N2 (today) | K1 | .2 single | Counter | Double depth | Tested before the store | K1, D = store(VAL/12) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 12 | 3 | result | cd-circ-000037 | right, 14 of 14 | right, 14 of 14 | right (derived) | right | right | right | right (derived) |
| S2 | 12 | 4 | rejected | run 20261125-141415-e06fc2 | wrong (never finishes) | wrong (on the diameter) | wrong (derived) | wrong | wrong | **right** | wrong (derived) |
| S3 | 24 | 27 | rejected | run 20261125-141455-32c1dd | right | right | right (derived) | wrong (on the diameter) | right | right | right (derived) |
| S4 | 36 | 84 | rejected | run 20261125-141528-97d64c | right | right | right (derived) | wrong (on the diameter) | right | right | right (derived) |
| S5 | 48 | 188 | rejected | run 20261125-141601-3cef76 | right | right | right (derived) | wrong (on the diameter) | right | right | right (derived) |
| S6 | 15 | 5 | result | cd-circ-000038 | wrong: Depth `0.90`, Critical Slope `0.0078`, Velocity `5.2` predicted; `0.89`, `0.0079`, `5.3` printed | right, 14 of 14 | right | right | right | right | right |
| S7 | 15 | 7 | rejected | run 20261125-141645-fb0830 | wrong (a result) | right | right | right | right | right | right |
| S8 | 18 | 12 | rejected | run 20261125-141717-8eba31 | wrong (a result) | right | right | right | right | right | right |
| S9 | 30 | 55 | rejected | run 20261125-141750-6e1c20 | wrong (a result) | right | right | right | right | right | right |
| S10 | 60 | 360 | rejected | run 20261125-141822-a7c47f | wrong (a result) | right | right | wrong (on the diameter) | right | right | right |
| S11 | 14.4 | 7 | rejected | run 20261125-141855-1d1517 | right | right | right | right | right | right | wrong (on the diameter) |
| **All eleven** | | | | | **5 of 11** | **10 of 11** | **10 of 11** | **6 of 11** | **10 of 11** | **11 of 11** | **9 of 11** |

A-011 gave no screen for "on the diameter". It read the 9.6 in run's ending (the shape menu, no
message) as what a trial on the diameter would show, and said "S2 printing the message instead
points at a test before the store, and then the 9.6 in run needs another explanation, since
that model takes 9.6 in past D." Every "on the diameter" above met the message instead.

**K1 against the rebuild today, S6 to S10.** `solve()` today gives what the amendment's N2
column says on all five. S6: K1 prints every field as QUICK-2 printed it; the rebuild differs on
Depth (`0.90` against `0.89`), Critical Slope (`0.0078` against `0.0079`) and Velocity (`5.2`
against `5.3`). S7 to S10: QUICK-2 rejected all four, as K1 predicted; the rebuild prints a
result on each. K1 5 of 5, the rebuild 0 of 5.

**What the triggers of circle-short-chord 2.12 say.** No result where K1 rejects and no
rejection where K1 prints a result: K1's one miss, S2, is a case K1 predicted to land on the
diameter. S6's fields are K1's row. S3 to S5 and S10 printed the message, not the shape menu,
so they do not point at a counter; the counter is wrong on four of the eleven. S11 printed the
message, so the rebuild's diameter store holds against `store(VAL/12)` on it. None of the four
listed triggers fired, but S2 contradicts 1.4, 2.6 and 2.7, below.

**What S2 does to circle-short-chord 1.4, 2.6 and 2.7.** bugfix.md is not edited here.

- **1.4** (current behaviour) is right about the rebuild: on S2 the stepped trials are
  0.200000003, 0.400000006, 0.600000024, 0.800000012 and 1.00000000, the fifth equals D, and
  `solve()` returns `error` with `never_finishes`. What 1.4 says about QUICK-2 is now too narrow.
  It names one contradiction, the 9.6 in run's shape menu against the flag text. S2 adds a
  second, different one: in the 12 in pipe of its list QUICK-2 printed the rejection. So 12 in,
  4 cfs belongs in the defect as a case where the rebuild's outcome is wrong, not only its flag
  text. The two pipes where the rebuild's trial lands on the diameter ended differently in
  QUICK-2, so 1.4's list is a list of where the rebuild's trials land, not of where QUICK-2's
  do.
- **2.6** says that a trial on the diameter, in any pipe, gives `error` with no printed field.
  Built as written it gives `error` on S2, where QUICK-2 printed the message. Once S2 is
  recorded as a rejected golden, that is an outcome mismatch. Its premise, that a trial on the
  diameter ends the same way in every pipe, fails on the only two pipes run. Which pipes still
  end on the shape menu, and why, is A-013's question; 2.6 cannot be kept as written.
- **2.7** says the app shows "what QUICK-2 does with this input has not been established" for
  every trial on the diameter, "12 in included". For 12 in at 4 cfs it is now observed, in a
  run that is not a golden yet: the rejection. Kept as written, the app would say "not
  established" for an input whose answer is known. Its words still fit the 9.6 in case, which
  rests on one exploratory run.
- 2.9's last row ("ten more, since S2 stores none") also changes: with Q-030 fixed, S2 would
  store a `rejected` golden, so recording S1 to S11 adds eleven.

**Full set now:** 280 of 289. cd-circ-000037 (S1) matches; cd-circ-000038 (S6) misses Depth,
Critical Slope and Velocity, where K1 and the rebuild differ. The rebuild is not changed.

## A-013: what separates the 9.6 in run from S2 (for the Exhumer)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section. The solver is not changed.**

**Of 136 ways of forming the trial, storing the diameter and testing one against the other, 16
fit all 47 circle Critical Depth observations. 14 of the 16 test the trial in inches against
the diameter as typed, trial·12 ≥ store(VAL). The rebuild's combination misses S2 only. Five
cases nobody has run separate the survivors into 13 groups; two of them are in the generator's
practical range, and they are the only two practical grid cases where the survivors differ in
outcome. Three pairs of survivors cannot be told apart by any grid case.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a013` at the
commit that adds this section (about 45 minutes, most of it the grid scan);
`node scripts/circle_outputs.mts a013 predictions` prints the same without the check and the
grid scan. It uses the rebuild's geometry C2, Max Discharge at .9382·D, the 0.01 ft Depth
offset, the 0.5% stop and K1 after a short chord (A-009, A-010); only the trial, the diameter
and the test vary. It never runs the program.

**The two runs.** The 9.6 in run (20261125-100815-dff8b0, exploratory: 9.6 in, n .013, 2 cfs,
slope .005) typed `{Enter} 1{Enter} C{Enter} 9.6{Enter} .013{Enter} 2{Enter} .005{Enter}
{Enter}`, resent no key, and ended on the shape menu with no result and no message. S2 (run
20261125-141415-e06fc2: 12 in, 4 cfs, same n and slope) printed "DEPTH is Greater than the
DIAMETER". In the rebuild both pipes step to a trial exactly on the diameter: 0.800000012 ft
(trial 4) and 1.0 ft (trial 5). Both discharges are above what the last trial inside gives, so
both searches reach that trial (A-011).

**One assumption.** A trial the test lets through at or past the diameter reaches the
geometry. There T = 0 divides by zero (so does x/√(1−x²) in the angle), and past it √ of a
negative is taken. Both are QuickBASIC run-time errors. The model reads either as the shape
menu with no message, the way the quick2-solver design reads Normal Depth with Slope -1 or
Discharge -1 (Negative values and abandoned calculations). That reading is an inference, not
an observation. Without it no combination ends on the shape menu: a trial on the diameter
would never finish, as in the rebuild.

**The combinations.**

- Trial, 7 ways. T1: store(y + 0.2) with 0.2 a double (the rebuild). T2: store(y + .2) with .2
  a single. T3: a counter, store(base + k·.2). T4: y + .2 in double, the geometry given the
  double. T5: the same, the geometry given store(y). T6: base + k·.2 in double, the geometry
  given the double. T7: the same, the geometry given store(y). Chords are stored for T1 to T3
  and kept in double for T4 to T7.
- Diameter, 4 ways. D1: store(store(VAL)/12) (the rebuild). D2: store(VAL/12). D3: VAL/12 in
  double. D4: store(VAL)/12 in double. The geometry uses the same diameter as the test.
- Test, 6 ways. X1: trial > D (the rebuild). X2: trial ≥ D. X3 and X4: the sum before it is
  stored, > D and ≥ D (stored trials only, T1 to T3). X5 and X6: in inches, trial·12 > store(VAL)
  and trial·12 ≥ store(VAL).

That is 7 × 4 × 6 less the 32 before-the-store tests on unstored trials: 136.

**The observations, 47.** All 31 circle Critical Depth result goldens, scored on every printed
field; the six rejections (the runs in circle-short-chord's table); S2 to S5 and S7 to S11
(A-012's run folders, not goldens yet); and the 9.6 in run. S1 and S6 are among the 31.

**Scores.** 16 combinations fit 47 of 47, 63 fit 46, 28 fit 45, 4 fit 44, 1 fits 43, 9 fit
42 and 15 fit 41. Every one of the 136 prints every field of all 31 results and rejects all six
rejections, so those 37 observations do not separate any of them. Only seven do: S2, S3, S4,
S5, S10, S11 and the 9.6 in run. The rebuild's T1·D1·X1 misses S2 (it reaches the geometry at
1.0 ft). With a `≥` test (T1·D1·X2) or A-011's test before the store (T1·D1·X3), the rebuild's
trials miss the 9.6 in run instead: both reject at 0.800000012 ft. 48 combinations miss only the
9.6 in run and 9 only S2.

**The 16 that fit all 47.**

| Combination | Trial | Diameter | Test |
|---|---|---|---|
| T1·D1·X6, T1·D2·X6, T1·D3·X6 | store(y + 0.2), 0.2 a double | D1, D2, D3 | trial·12 ≥ store(VAL) |
| T2·D1·X6, T2·D2·X6, T2·D3·X6 | store(y + .2), .2 a single | D1, D2, D3 | trial·12 ≥ store(VAL) |
| T3·D1·X6, T3·D2·X6, T3·D3·X6 | a counter, store(base + k·.2) | D1, D2, D3 | trial·12 ≥ store(VAL) |
| T3·D1·X3 | a counter, store(base + k·.2) | D1 | the sum before the store > D |
| T4·D3·X6 | y + .2 in double, the geometry given the double | D3 | trial·12 ≥ store(VAL) |
| T6·D3·X6 | base + k·.2 in double, the geometry given the double | D3 | trial·12 ≥ store(VAL) |
| T7·D1·X2 | base + k·.2 in double, the geometry given store(y) | D1 | trial ≥ D |
| T7·D1·X6, T7·D2·X6, T7·D3·X6 | base + k·.2 in double, the geometry given store(y) | D1, D2, D3 | trial·12 ≥ store(VAL) |

**What separates the two pipes, in every survivor.** At 9.6 in the value tested falls just
short of the diameter, so the trial goes on to the geometry, and the depth the geometry gets
equals the diameter it has. At 12 in the value tested reaches the diameter, and the case is
rejected before the geometry sees it. The survivors get there three ways:

- In inches (14 survivors): trial 4 is 0.800000012 ft, and 0.800000012 × 12 = 9.60000014 in,
  2.4e-7 in short of the typed 9.6 stored as a single (9.60000038). The geometry gets 0.800000012
  ft, which equals D. At 12 in, 1.0 × 12 = 12 meets 12.
- A counter tested before the store (T3·D1·X3): 4 × 0.200000003 = 0.800000012 equals D, so it
  is not past it; 5 × 0.200000003 = 1.0000000149 is past 1.0.
- A double counter whose geometry gets a single (T7·D1·X2): the double 0.8 is 1.19e-8 ft below D
  and passes the test, and the geometry gets store(0.8) = 0.800000012 = D. At 12 in the double
  1.0 meets 1.0.

None of these was proposed before the runs. A test in inches is a way the program could be
written (`IF Y * 12 >= DIA`), not an observation.

**Where the survivors part.** 8 to 180 in by 0.1 in, every whole discharge from 1 cfs to the
critical discharge at 0.99·D. n and slope do not change a Critical Depth outcome, since the
search uses only D and q. Printed fields are compared only in the practical range (q at most
the critical discharge at 0.9·D, the generator's range); above it, outcomes only. The scan
checks its lookup of stepped trials against the full search first: 3227456 of 3227456 on every
20th diameter. 11358 grid cases separate at least two survivors. 10015 differ in outcome, and
only 2 of those are practical: 19.2 in at 15 cfs and 21.6 in at 20 cfs. 1343 practical cases
differ only in printed fields. In the generator's practical range, then, the survivors almost
never differ in outcome. No grid case separates T1 from T2 with the same diameter and test
(three pairs), so whether .2 is a single or a double is not testable this way.

### Predictions

n .013 and slope .005 in all five. Chosen by the scan: practical cases that differ in outcome
first, then any case that differs in outcome, until every pair of survivors a grid case can
separate is separated. Together they give each of the 13 groups a different row. "Message" is
the rejection screen as A-012 saw it: "DEPTH is Greater than the DIAMETER" on 0-based row 20,
Depth `0.00`, Critical Slope and every output field blank. "Shape menu" is the 9.6 in run's
ending: the shape menu, no message.

| Case | Diameter | Discharge | Critical discharge at 0.9·D | Practical |
|---|---|---|---|---|
| R1 | 19.2 | 15 | 15.239 | yes |
| R2 | 21.6 | 20 | 20.457 | yes |
| R3 | 160.4 | 5238 | 3074.170 | no |
| R4 | 55.2 | 276 | 213.582 | no |
| R5 | 88.3 | 1013 | 691.224 | no |

| Survivor | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| T1·D1·X6, T2·D1·X6 | message | message | shape menu | shape menu | message |
| T1·D2·X6, T2·D2·X6 | message | message | message | shape menu | shape menu |
| T1·D3·X6, T2·D3·X6 | message | message | message | message | message |
| T3·D1·X3 | shape menu | shape menu | result | message | message |
| T3·D1·X6 | shape menu | message | result | shape menu | message |
| T3·D2·X6 | shape menu | message | result | shape menu | shape menu |
| T3·D3·X6 | shape menu | message | result | message | message |
| T4·D3·X6 | shape menu | message | message | shape menu | message |
| T6·D3·X6 | shape menu | shape menu | message | shape menu | message |
| T7·D1·X2 | shape menu | message | shape menu | message | message |
| T7·D1·X6 | shape menu | message | shape menu | shape menu | message |
| T7·D2·X6 | shape menu | shape menu | message | shape menu | shape menu |
| T7·D3·X6 | shape menu | message | message | message | message |

R3's result, the same under all four counters (search depth 13.16671; 13.16672 with D2),
every field as the comparator compares it:

| Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 160.4 | 0.0130 | 5238 | 13.16 | 0.0050 | 0.0193 | 139.9 | 38.7 | 37.4 | 3.6 | 3.2 | 1.0 | 5363 | CRITICAL |

The trial each survivor stops at is in the script's output.

**What each outcome means.**

- R1 printing the message: the trials accumulate as single sums (T1 or T2). The shape menu: a
  counter or a double depth. R1 is a practical case, so this is also the one prediction here
  the generator could draw.
- R2 separates T3·D1·X3, T6·D3·X6 and T7·D2·X6 (shape menu) from the rest (message).
- R3 printing a result: a counter (T3), the only family that finishes there. R3, R4 and R5
  then tell the diameter stores apart within each family, and R5 also separates T6·D3·X6 from
  T7·D2·X6. Every two rows of the table differ in at least one of the five cases.
- A result in R1, R2, R4 or R5, or a result other than the row above in R3, fits no survivor.
  A row of the five that matches no row of the table fits none either, and then the model space
  or the assumption above is wrong.
- Whatever they show, the 9.6 in run is still one exploratory run with only its final screen
  kept (Q-029). Recording it, once a screen like the shape menu can end a case, would make it a
  citation.

**Not part of this.** The solver is unchanged, and circle-short-chord's bugfix.md is not
edited. 2.6 and 2.7 (A-012) wait for these runs. Normal Depth's search (N2, Q-026) is not
tested by any case here.

## A-013 amendment: R3 and R5 withdrawn, T8 to T10 added, R6 to R9 (for the Exhumer)

**Written and committed before any A-013 case runs. A-013's text above is unchanged; where
this section differs from it, this section holds. The solver, circle-short-chord's bugfix.md
and the ledger are not changed.**

**R3 and R5 are withdrawn and will not be run. A-013 left out the single literal .2 summed in
double; with it (T8 to T10), 23 more combinations fit all 47 observations, 39 in all. R1, R2
and R4 stay, and four new cases, R6 to R9, join them. On those seven cases the 39 survivors
fall into 14 groups, each with a different row. No survivor's answer on the seven changes
when A·√(gA/T) is multiplied by 1 ± 1e-4.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a013-amendment`
at the commit that adds this section (under a second; no grid scan). It uses A-013's
observations, geometry and search unchanged, and its own scoring of the 136 combinations
gives the same 16 survivors. It never runs the program. The stability check and the new
trials come from the user, who wrote his own code from A-013's prose and got the same 16.

### Why R3 and R5 are withdrawn

In both cases the deciding trial is a chord plus 0.2 ft, and the chord sits about 0.2 ft below
the diameter, so the chord's last digits decide whether the next trial lands on D, short of it
or past it. At 160.4 in (R3), D1 gives D = 13.36666584 ft; T1·D1·X6's chord is 13.16666603
and the next trial 13.36666584, exactly D (shape menu), while T1·D2·X6's chord 13.16666698
gives 13.36666679 against its D of 13.36666679 (message). At 88.3 in (R5) the same happens at
7.358333 ft. A prediction that turns on the seventh significant digit of a chord tests the
model's rounding of A·√(gA/T), not the trial, diameter and test the cases were meant to tell
apart.

The check: multiply A·√(gA/T) by 1 ± ε before it is stored as a single, rerun every survivor,
and count the survivors whose outcome changes.

| Case | ε | A-013's 16 survivors | All 39 |
|---|---|---|---|
| R3 | 1e-6 | 12 change | 35 change (19 at 1 + ε, 16 at 1 − ε) |
| R3 | 1e-4 | 16 change | 39 change |
| R5 | 1e-6 | 6 change | 15 change (9 at 1 + ε, 10 at 1 − ε) |
| R5 | 1e-4 | 4 change | 10 change |
| R1, R2, R4 | 1e-6 and 1e-4 | none | none |

The user's counts (R3 19, or 39 with T8 to T10; R5 up to 17) differ from these, and the
difference was not traced. Both checks agree on what matters: R3 and R5 change
at 1 ± 1e-6, and R1, R2 and R4 do not change even at 1 ± 1e-4. Every case that stays is held
to 1 ± 1e-4.

### T8 to T10: the single literal .2 summed in double

`Y# = Y# + .2` in QuickBASIC adds the single-precision constant .2 (0.200000003) to a double.
A-013's T4 to T7 add the double 0.2 and its T2 stores the sum; neither is this.

- T8: y + .2 in double, .2 a single, the geometry given the double, chords kept in double.
- T9: the same, the geometry given store(y).
- T10: the same as T8, chords stored as a single.

Scored with D1 to D4 and the tests X1, X2, X5 and X6 (X3 and X4 need a stored trial) on the
same 47 observations: 48 combinations, 23 fit all 47, 24 fit 46 and 1 fits 45. 23 of the 25
that miss, miss only the 9.6 in run: rejected at trial 0.800000012 under X2 and under D3 with
X1, and at 0.800393 under every D4. T9·D2·X1 misses only S11 (shape menu at 1.200000018), and
T9·D2·X2 misses both.

### The corrected survivors, 39

| Trial | Survivors |
|---|---|
| T1, store(y + 0.2) | T1·D1·X6, T1·D2·X6, T1·D3·X6 |
| T2, store(y + .2) | T2·D1·X6, T2·D2·X6, T2·D3·X6 |
| T3, a counter | T3·D1·X3, T3·D1·X6, T3·D2·X6, T3·D3·X6 |
| T4, y + 0.2 in double | T4·D3·X6 |
| T6, base + k·0.2 in double | T6·D3·X6 |
| T7, base + k·0.2 in double, store(y) to the geometry | T7·D1·X2, T7·D1·X6, T7·D2·X6, T7·D3·X6 |
| T8 | T8·D1·X1, T8·D1·X5, T8·D1·X6, T8·D2·X1, T8·D2·X5, T8·D2·X6, T8·D3·X5, T8·D3·X6 |
| T9 | T9·D1·X1, T9·D1·X5, T9·D1·X6, T9·D2·X5, T9·D2·X6, T9·D3·X5, T9·D3·X6 |
| T10 | T10·D1·X1, T10·D1·X5, T10·D1·X6, T10·D2·X1, T10·D2·X5, T10·D2·X6, T10·D3·X5, T10·D3·X6 |

T8·D1·X1, T9·D1·X1 and T10·D1·X1 keep the rebuild's diameter store and test and change only
the trial. With T8·D2·X1 and T10·D2·X1 they are the only survivors with the rebuild's test,
trial > D.

### The cases

All multiples of 2.4 in, so the stepped trials reach the diameter (0.2 ft is 2.4 in). n .013
and slope .005 in all seven. The four suggested cases each separate pairs no other case here
separates (98.4 in 32 pairs, 129.6 in 43, 26.4 in 6, 57.6 in 4; R1 8, R2 28, R4 24), so all
four are kept, numbered from R6 in the order suggested.

| Case | Diameter | Discharge | Critical discharge at 0.9·D | Practical | Survivors that change at 1 ± 1e-4 |
|---|---|---|---|---|---|
| R1 | 19.2 | 15 | 15.239 | yes | none of 39 |
| R2 | 21.6 | 20 | 20.457 | yes | none of 39 |
| R4 | 55.2 | 276 | 213.582 | no | none of 39 |
| R6 | 98.4 | 1369 | 906.160 | no | none of 39 |
| R7 | 129.6 | 2924 | 1803.971 | no | none of 39 |
| R8 | 26.4 | 36 | 33.785 | no | none of 39 |
| R9 | 57.6 | 312 | 237.560 | no | none of 39 |

R1 and R2 are the only cases in the generator's practical range; R4 and R6 to R9 are outside
it. None of the seven changes at 1 ± 1e-6 either. In R1 every survivor's deciding trial is
stepped from 0. In the others some follow a chord (R2 10 of 39, R4 4, R6 10, R7 19, R8 4,
R9 6), but each such chord starts from the stepped trial about 0.2 ft below D, so the next trial is
past D by about the chord's distance above that trial, 4.98e-7 ft at the least (T4·D3·X6 in
R2). All of them get the message however the chord's last digits fall, and the 1 ± 1e-4 check
agrees.

### Predictions

"Message" and "shape menu" mean what they mean in A-013. No survivor prints a result on any of
the seven, so every prediction rests on A-013's one assumption that a geometry error at the
diameter ends on the shape menu with no message.

| Group | Survivors | R1 | R2 | R4 | R6 | R7 | R8 | R9 |
|---|---|---|---|---|---|---|---|---|
| G1 | T1·D1·X6, T2·D1·X6 | message | message | shape menu | message | message | message | shape menu |
| G2 | T1·D2·X6, T2·D2·X6 | message | message | shape menu | message | message | message | message |
| G3 | T1·D3·X6, T2·D3·X6 | message | message | message | message | message | message | message |
| G4 | T3·D1·X3, T9·D1·X1 | shape menu | shape menu | message | message | shape menu | shape menu | message |
| G5 | T3·D1·X6, T3·D2·X6, T7·D1·X6 | shape menu | message | shape menu | shape menu | shape menu | message | message |
| G6 | T3·D3·X6, T7·D3·X6 | shape menu | message | message | message | shape menu | message | message |
| G7 | T4·D3·X6 | shape menu | message | shape menu | shape menu | message | message | message |
| G8 | T6·D3·X6, T7·D2·X6 | shape menu | shape menu | shape menu | shape menu | shape menu | message | message |
| G9 | T7·D1·X2 | shape menu | message | message | message | shape menu | shape menu | message |
| G10 | T8·D1·X1, T8·D2·X1, T10·D1·X1, T10·D2·X1 | shape menu | message | message | message | message | message | message |
| G11 | T8·D1·X5, T8·D1·X6, T10·D1·X5, T10·D1·X6 | shape menu | message | message | shape menu | message | message | message |
| G12 | T8·D2·X5, T8·D2·X6, T10·D2·X5, T10·D2·X6 | shape menu | shape menu | message | shape menu | message | message | message |
| G13 | T8·D3·X5, T8·D3·X6, T9·D1·X5, T9·D1·X6, T9·D2·X5, T9·D2·X6, T10·D3·X5, T10·D3·X6 | shape menu | shape menu | message | shape menu | shape menu | message | message |
| G14 | T9·D3·X5, T9·D3·X6 | shape menu | shape menu | message | message | shape menu | message | message |

The trial each survivor stops at, and whether a chord comes before it, is in the script's
output.

**Groups no case separates.** The survivors inside each group of more than one give the same
answer on all seven: T1 and T2 with the same diameter (G1 to G3, as in A-013's grid); T3·D1·X3
and T9·D1·X1 (G4); T3·D1·X6, T3·D2·X6 and T7·D1·X6 (G5); T3·D3·X6 and T7·D3·X6 (G6); T6·D3·X6
and T7·D2·X6 (G8); and, within T8 to T10, T8 against T10 (chords kept or stored), X5 against
X6, and D1 against D2 under X1 (G10 to G13), T9·D1 and T9·D2 with T8·D3 and T10·D3 (G13), and
X5 against X6 for T9·D3 (G14). No grid scan was run for this amendment, so whether some other
case separates any of them is not known, except T1 from T2, which A-013's grid found no case
to separate.

**What each outcome would mean.**

- R1, the message: G1 to G3, the trial is a stored single sum (T1 or T2) and the test is in
  inches. Then R4 and R9 give the diameter store: shape menu on both, D1; shape menu on R4 and
  the message on R9, D2; the message on both, D3. R2 and R6 to R8 print the message for all
  three.
- R1, the shape menu: G4 to G14, a counter, a double depth, or .2 summed in double. R2 then
  splits them: shape menu G4, G8, G12, G13, G14; the message G5, G6, G7, G9, G10, G11.
  - After the shape menu on R2, in this order: R4's shape menu is G8; otherwise R8's shape
    menu is G4; otherwise the shape menu on R6 with the message on R7 is G12, the shape menu on
    both G13, and the message on R6 with the shape menu on R7 G14.
  - After the message on R2: the message on all of R4 and R6 to R9 is G10, which holds
    T8·D1·X1, the rebuild with only the trial changed. R7's message with R4's shape menu is G7,
    and with R6's shape menu and R4's message G11. R8's shape menu is G9. R7's shape menu with
    R4's shape menu is G5, and with the message on R4, R6 and R8 G6.
- A result on any of the seven, or a row of seven answers that is not in the table, fits no
  survivor; then the model space or A-013's assumption is wrong.
- R1 is the case the generator could draw; R2 is practical too. The other five are outside
  the generator's practical range: their discharges are above the critical discharge at 0.9·D,
  so the generator would not draw them.
- The 9.6 in run is still one exploratory run with only its final screen kept (Q-029), as
  A-013 says.

**Not part of this.** A-013's text, the solver, circle-short-chord's bugfix.md and the ledger
are unchanged. 2.6 and 2.7 (A-012) wait for R1, R2, R4 and R6 to R9.

## A-014: A-013 and its amendment graded on cd-circ-000054 to -000060, and three held-out cases for G3 (for the Exhumer)

**The grade below is written after the runs. The predictions are written and committed with
the script before any of their cases runs, and nothing in them changes after the runs; the
results go in a new section. The solver is not changed.**

**G3 (T1·D3·X6 and T2·D3·X6) is the only one of the amendment's 14 groups right on all seven
cases: QUICK-2 printed "DEPTH is Greater than the DIAMETER" on R1, R2, R4 and R6 to R9
(cd-circ-000054 to -000060). G2 and G10 get 6 of 7; the other eleven get 2 to 5. Of all 184
combinations, only T1·D3·X6 and T2·D3·X6 fit every one of the 54 circle Critical Depth
goldens. The score is seven new cases for one group, and the group was picked by these same
seven cases, so it has not yet passed a test it was not chosen on. It needs one more held-out
test; three held-out cases are predicted below.**

**How graded.** `node scripts/circle_outputs.mts grade-a013` (about 2 s) reads A-013 from
commit 69338b5 and its amendment from 6ecfb3c with `git show`: both case tables, n .013 and
slope .005, and the amendment's group table. For each case it finds the golden that ledger
decision 97 lists with the same mode and typed inputs, and reads its outcome and its last
captured screen. Before grading it checks three things and prints them: R1, R2 and R4 have the
same inputs in A-013's table and the amendment's; A-013's cells on R1, R2 and R4 agree with the
amendment's for all 16 of A-013's survivors (48 of 48 cells); and the model, rerun now, gives
the committed cell on 273 of 273 (survivor, case) pairs. Every number in this section is that
command's output. It never runs the program.

| Group | Survivors | R1 | R2 | R4 | R6 | R7 | R8 | R9 | Right |
|---|---|---|---|---|---|---|---|---|---|
| QUICK-2 | | message | message | message | message | message | message | message | |
| Golden | | cd-circ-000054 | cd-circ-000055 | cd-circ-000056 | cd-circ-000057 | cd-circ-000058 | cd-circ-000059 | cd-circ-000060 | |
| G1 | T1·D1·X6, T2·D1·X6 | message | message | **shape menu** | message | message | message | **shape menu** | 5 of 7 |
| G2 | T1·D2·X6, T2·D2·X6 | message | message | **shape menu** | message | message | message | message | 6 of 7 |
| G3 | T1·D3·X6, T2·D3·X6 | message | message | message | message | message | message | message | 7 of 7 |
| G4 | T3·D1·X3, T9·D1·X1 | **shape menu** | **shape menu** | message | message | **shape menu** | **shape menu** | message | 3 of 7 |
| G5 | T3·D1·X6, T3·D2·X6, T7·D1·X6 | **shape menu** | message | **shape menu** | **shape menu** | **shape menu** | message | message | 3 of 7 |
| G6 | T3·D3·X6, T7·D3·X6 | **shape menu** | message | message | message | **shape menu** | message | message | 5 of 7 |
| G7 | T4·D3·X6 | **shape menu** | message | **shape menu** | **shape menu** | message | message | message | 4 of 7 |
| G8 | T6·D3·X6, T7·D2·X6 | **shape menu** | **shape menu** | **shape menu** | **shape menu** | **shape menu** | message | message | 2 of 7 |
| G9 | T7·D1·X2 | **shape menu** | message | message | message | **shape menu** | **shape menu** | message | 4 of 7 |
| G10 | T8·D1·X1, T8·D2·X1, T10·D1·X1, T10·D2·X1 | **shape menu** | message | message | message | message | message | message | 6 of 7 |
| G11 | T8·D1·X5, T8·D1·X6, T10·D1·X5, T10·D1·X6 | **shape menu** | message | message | **shape menu** | message | message | message | 5 of 7 |
| G12 | T8·D2·X5, T8·D2·X6, T10·D2·X5, T10·D2·X6 | **shape menu** | **shape menu** | message | **shape menu** | message | message | message | 4 of 7 |
| G13 | T8·D3·X5, T8·D3·X6, T9·D1·X5, T9·D1·X6, T9·D2·X5, T9·D2·X6, T10·D3·X5, T10·D3·X6 | **shape menu** | **shape menu** | message | **shape menu** | **shape menu** | message | message | 3 of 7 |
| G14 | T9·D3·X5, T9·D3·X6 | **shape menu** | **shape menu** | message | message | **shape menu** | message | message | 4 of 7 |

A bold cell is a wrong prediction. On all seven goldens the message is on 0-based row 20, the
Depth field shows `0.00`, and Critical Slope and every output field are blank. None ended on
the shape menu and none printed a result.

**What the seven say.** R1's message puts every group but G1 to G3 out: the trial is a stored
single sum (T1 or T2) and the test is in inches. R4 and R9 then give the diameter store. Under
D1 and D2, the 55.2 in pipe of R4 (cd-circ-000056) reaches the geometry at stepped trial
4.599999905 ft, which is its stored diameter, and A-013's assumption reads that as the shape
menu. Under D3 the diameter is 4.6 ft, the same trial is inside it, the search takes a chord
below it, and the next trial fails the inches test: the message, which QUICK-2 printed. R9
(57.6 in, cd-circ-000060) does the same to D1 alone, at trial 4.799999714 ft.

**The run folders A-012 graded are goldens now.** A-012 graded S2 to S5 and S7 to S11 from the
final screens of their run folders. They are now cd-circ-000045 to -000053 (ledger decision
95), and each golden has the same outcome as its run folder, rejected, and the same rejection
screen. A-012's grades stand as written. The six rejections of circle-short-chord are
cd-circ-000039 to -000044 (decision 94), the same on all six. The 9.6 in run repeated as
obs-cdmenu-000001 (decision 98): the same inputs ended on the shape menu with no result and no
message, and its last captured screen is the run folder's final screen on every row. A second
run of the same inputs in that session (20261125-184734-96cde0) also ended on the shape menu
and stored no golden. obs-cdmenu-000001 is a behaviour case, so the comparator never grades it
and it is not in the quick set. Its capture holds one screen per step, so what happens between
the last Enter and the shape menu is still not seen.

**All 184 combinations on the 54 goldens.** A-013's 136 and the amendment's 48 (T8 to T10 with
D1 to D4 and X1, X2, X5, X6), scored the way A-013 scored its 47 observations: the 31 circle
Critical Depth results on every printed field, the 22 rejections with the message
(cd-circ-000039 to -000060), and obs-cdmenu-000001 as the shape menu. The run folders are no
longer needed. cd-circ-000003, -000007 and -000008 are held at a prompt by an input of 0 and
are not search outcomes, so they are left out. Scores: 2 fit 54, 67 fit 53, 33 fit 52, 20 fit
51, 21 fit 50, 11 fit 49, 13 fit 48, 5 fit 47, 2 fit 46, 5 fit 45, 3 fit 44, 1 fits 43 and 1
fits 42. The two that fit all 54 are T1·D3·X6 and T2·D3·X6. This agrees with the person's own
code, written from A-013's prose over the same 184 combinations, which leaves only those two.
Nothing outside the amendment's 39 survivors fits all 54. The nearest misses are G2 (T1·D2·X6
and T2·D2·X6 miss cd-circ-000056) and G10 (T8·D1·X1, T8·D2·X1, T10·D1·X1 and T10·D2·X1 miss
cd-circ-000054), one case each.

**What the score is.** Seven new cases for one group. The amendment chose the seven so that its
14 groups would each give a different row. Whatever QUICK-2 printed could match at most one
row, and the row it matched is the group these cases pick. G3 matching is how G3 was selected,
so it is not yet a test of G3. G3 needs at least one case it was not chosen on: the three
below.

**Room for models outside A-013's space.** The 184 are only the combinations A-013 and its
amendment wrote down: ten ways of forming the trial, four diameter stores and six tests, all
on K1 with the rebuild's geometry C2, Max Discharge at .9382·D, the 0.01 ft Depth offset and
the 0.5% stop, and all under A-013's assumption that a trial the test lets through at or past
the diameter ends on the shape menu. A model outside that space could fit all 54 too, and
nothing here looks for one. Three limits in particular:
- G3's answer on all seven is the message, so these cases do not test the shape-menu ending.
  The only shape-menu observation is obs-cdmenu-000001, one pipe.
- T1 and T2 (0.2 a double or .2 a single, the sum stored) gave the same answer on every grid
  case A-013 scanned, so which one QUICK-2 uses is not known.
- A-013's assumption is still an inference. No capture shows a QuickBASIC error.

### Predictions for G3: three held-out cases

T1·D3·X6 and T2·D3·X6 give the same answer on all three, so "G3" below means both. n .013,
slope .005 and 1 cfs in all three. "Message" and "shape menu" mean what they mean in A-013.

| Case | Diameter | Discharge | G3 predicts | Deciding trial, stepped from 0 | Trial·12 | store(VAL) | D = VAL/12 |
|---|---|---|---|---|---|---|---|
| H1 | 4.8 | 1 | shape menu, no message | trial 2, 0.4000000060 | 4.800000072 | 4.800000191 | 0.4 |
| H2 | 2.4 | 1 | shape menu, no message | trial 1, 0.2000000030 | 2.400000036 | 2.400000095 | 0.2 |
| H3 | 7.2 | 1 | message | trial 3, 0.6000000238 | 7.200000286 | 7.199999809 | 0.6 |

In H1 and H2 the trial in inches falls short of the typed diameter stored as a single, so the
test lets it through, and in feet the trial is past VAL/12. The geometry is then given a depth
past the crown, which A-013's assumption reads as the shape menu. In H3, store(7.2) rounds
down, the trial in inches is past it, and the test rejects the trial: the message. 1 cfs
reaches the deciding trial in all three. It is above A·√(gA/T) at the last stepped trial inside
divided by 0.995 (0.1420 cfs in H1, 0.6794 cfs in H3), and H2 has no trial inside. No answer
changes when A·√(gA/T) is multiplied by 1 ± 1e-6 or 1 ± 1e-4. No golden has any of the three
inputs.

**Why these three.** With the stepped trials only, T1·D3·X6 and T2·D3·X6 over every diameter
typed to 0.01 in from 8.00 to 180.00 in (17201 diameters), 9.60 in is the only one whose
stepped trials end on the shape menu. This confirms the person's count. From 0.01 to 7.99 in,
2.40 and 4.80 are the only ones. So G3 puts a stepped shape-menu ending at three typed
diameters up to 180 in: 2.4, 4.8 and 9.6. H1 and H2 are the two that have not run. H3, 7.2 in,
is the multiple of 2.4 between them and 9.6 in, where G3 predicts the message. None of the three
was used to choose G3, and none is in the generator's range of 8 to 180 in.

**What is not known about them.** No circle golden has a typed diameter below 3.9 in
(cc-circ-000007, held at the Depth prompt after the form took the Diameter), so whether
QUICK-2's form accepts 2.4 in is unobserved. A hold at the Diameter prompt, a result, or any
answer other than the one in the table counts as a miss.

**What each answer would mean.**
- All three as predicted: G3 has passed three cases it was not chosen on.
- H1 or H2 printing the message: the inches test letting a trial through at the crown does not
  explain the shape menu beyond 9.6 in, and the 9.6 in ending needs another explanation.
- H3 ending on the shape menu: G3's inches test is wrong where store(VAL) rounds down.
- Any miss: circle-short-chord's requirements are revised again before the design (its 2.12).

### D1 against D3 on every circle golden (report only)

The question: does holding the diameter in feet as VAL/12 in double (D3) change any circle
golden, against the rebuild's `store(store(VAL)/12)` (D1)?

The same command loads a second copy of the rebuild's solver (`app/src`) through a Node module
hook, with only `diameterFeet` changed to return VAL/12 of the typed diameter, and runs both
copies on every circle golden of Critical Depth, Channel Capacity and Normal Depth. No file
under `app/` is changed. As a check, the second copy with no override prints what `solve()`
prints on 107 of 107 goldens. The form's hold on a Channel Capacity Depth above the diameter
(`forms.ts`) keeps its own store and is not changed.

| Mode | Goldens | Results | Result fields | Missed by D1 | Missed by D3 | Printed differently by D1 and D3 | Outcome differs |
|---|---|---|---|---|---|---|---|
| Critical Depth | 56 | 31 | 434 | 8 | 8 | 0 | 2 |
| Channel Capacity | 34 | 20 | 260 | 1 | 1 | 0 | 0 |
| Normal Depth | 17 | 14 | 182 | 2 | 2 | 0 | 0 |

D3 changes none of the 876 printed fields of the 65 circle result goldens. D1 and D3 miss the
same 11 fields: cd-circ-000033, -000035, -000036 and -000038 (8 fields, the short-chord rule),
cc-circ-000035 (Max Discharge) and nd-circ-000020 (Velocity and Froude). Two outcomes differ,
both at the crown: cd-circ-000056 (55.2 in) and -000060 (57.6 in) give `error` under D1, where
the rebuild's trial lands on its stored diameter, and a result under D3. QUICK-2 rejected both,
so neither store gets them with the rebuild's test. With K1 and the inches test, T1·D1·X6
against T1·D3·X6, the 434 fields again print the same, and the same two outcomes differ: the
shape menu under D1, the message under D3, which is what QUICK-2 printed.

**Not part of this.** The solver is unchanged. circle-short-chord's bugfix.md is revised in a
later commit. Normal Depth's search (N2, Q-026) is not tested by any case here.

## A-015: A-014's held-out cases graded, every combination rescored, and the rule to build

**Written after cd-circ-000061 to -000063 ran. The grade is against A-014 as committed
(f066861). Nothing in this section is a prediction: every score below, including the proposed
rule's, is derived from cases that had already run. The solver is not changed.**

**G3 is right on H3 and wrong on H1 and H2. QUICK-2 printed "DEPTH is Greater than the
DIAMETER" on all three, where G3 predicted the shape menu on H1 and H2. G3 (T1·D3·X6 and
T2·D3·X6), which fit 54 of 54 circle Critical Depth goldens, is refuted by its first held-out
cases, and circle-short-chord 2.12's revision is triggered. Of all 184 combinations, none fits
all 57 circle Critical Depth outcomes; 56 miss only obs-cdmenu-000001, and all 56 give the
message there. The rule proposed to build is T1·D1·X2, one of the 56.**

**How graded.** `node scripts/circle_outputs.mts grade-a014` (about 1 s) reads A-014 from
commit f066861 with `git show`: the table under "Predictions for G3", the common inputs (n
.013, slope .005, 1 cfs) and G3's two survivors. For each case it finds the golden that ledger
decision 100 lists with the same mode and typed inputs, and reads its outcome and its last
captured screen. As a check, the model rerun now gives A-014's committed answer on 6 of 6
(survivor, case) pairs. It never runs the program. Every number in this section is that
command's output, except the person's wider search, which is reported as his.

| Case | Diameter | Discharge | G3 predicts | QUICK-2 | Golden | Right |
|---|---|---|---|---|---|---|
| H1 | 4.8 | 1 | **shape menu, no message** | message | cd-circ-000061 | no |
| H2 | 2.4 | 1 | **shape menu, no message** | message | cd-circ-000062 | no |
| H3 | 7.2 | 1 | message | message | cd-circ-000063 | yes |

A bold cell is a wrong prediction. On all three goldens the message is on 0-based row 20,
the Depth field shows `0.00`, and Critical Slope and every output field are blank. None ended
on the shape menu, none printed a result, and the form took the 2.4 in diameter.

**What H1 and H2 say.** In both, trial·12 falls short of the typed diameter stored as a single
(4.800000072 against 4.800000191 in, and 2.400000036 against 2.400000095 in), so the inches
test lets the trial through, and in feet the trial is past VAL/12. G3 sends that trial to the
geometry, and A-013's assumption reads the geometry's error as the shape menu. QUICK-2 printed
the message instead. This is the case A-014 listed as "H1 or H2 printing the message": the
inches test letting a trial through at the crown does not explain the shape menu beyond 9.6 in,
and the 9.6 in ending needs another explanation. G3 now scores 55 of 57, missing cd-circ-000061
and -000062.

**All 184 combinations on every circle Critical Depth outcome there is now.** A-013's 136 and
the amendment's 48, scored as A-014 scored them: the 31 circle Critical Depth results on every
printed field, the 25 rejections with the message (cd-circ-000039 to -000063), and
obs-cdmenu-000001 as the shape menu, 57 observations. cd-circ-000003, -000007 and -000008 are
held at a prompt and are left out, as in A-014. Scores: 56 fit 56, 21 fit 55, 17 fit 54, 15
fit 53, 18 fit 52, 30 fit 51, 5 fit 50, 6 fit 49, 6 fit 48, 2 fit 47, 3 fit 46, 2 fit 45, 2
fit 44 and 1 fits 42. None fits all 57. The 56 that fit 56 all miss obs-cdmenu-000001 and
nothing else, and every one of them rejects the 9.6 in pipe with the message. This agrees with
the person's own count, none and 56.

| Trial | Combinations that miss only obs-cdmenu-000001 |
|---|---|
| T1 | T1·D1·X2, T1·D2·X2, T1·D3·X2, T1·D3·X4, T1·D4·X2, T1·D4·X3, T1·D4·X4, T1·D4·X6 |
| T2 | T2·D1·X2, T2·D1·X4, T2·D2·X2, T2·D3·X2, T2·D3·X3, T2·D3·X4, T2·D4·X2, T2·D4·X3, T2·D4·X4, T2·D4·X6 |
| T3 | T3·D1·X2, T3·D2·X2, T3·D3·X2, T3·D3·X3, T3·D3·X4, T3·D4·X2, T3·D4·X6 |
| T4 | T4·D1·X2, T4·D2·X2, T4·D3·X2, T4·D4·X2, T4·D4·X6 |
| T6 | T6·D1·X2, T6·D2·X2, T6·D3·X2, T6·D4·X2, T6·D4·X6 |
| T7 | T7·D3·X2, T7·D4·X2, T7·D4·X6 |
| T8 | T8·D1·X2, T8·D2·X2, T8·D3·X1, T8·D3·X2, T8·D4·X1, T8·D4·X2, T8·D4·X5, T8·D4·X6 |
| T9 | T9·D3·X1, T9·D3·X2 |
| T10 | T10·D1·X2, T10·D2·X2, T10·D3·X1, T10·D3·X2, T10·D4·X1, T10·D4·X2, T10·D4·X5, T10·D4·X6 |

The 56 give the same outcome on all 57 observations: QUICK-2's on 56, and the message on the
9.6 in pipe. No observation separates any two of them.

### The rule to build: T1·D1·X2

The rebuild's trial (T1, store(y + 0.2)) and diameter store (D1, store(store(VAL)/12)), with
the test trial ≥ D in place of trial > D, and K1 after a short chord (circle-short-chord 2.1).
Scored on the ten cases it was not chosen on, the amendment's R1, R2, R4 and R6 to R9 and
A-014's H1 to H3:

| Case | Diameter | Discharge | T1·D1·X2 | Deciding trial (D) | QUICK-2 | Golden | Right |
|---|---|---|---|---|---|---|---|
| R1 | 19.2 | 15 | message | stepped trial 8, 1.600000143 (1.600000024) | message | cd-circ-000054 | yes |
| R2 | 21.6 | 20 | message | stepped trial 9, 1.800000191 (1.800000072) | message | cd-circ-000055 | yes |
| R4 | 55.2 | 276 | message | stepped trial 23, 4.599999905 (4.599999905) | message | cd-circ-000056 | yes |
| R6 | 98.4 | 1369 | message | after a chord, 8.200121880 (8.199999809) | message | cd-circ-000057 | yes |
| R7 | 129.6 | 2924 | message | after a chord, 10.80014133 (10.80000019) | message | cd-circ-000058 | yes |
| R8 | 26.4 | 36 | message | stepped trial 11, 2.200000286 (2.200000048) | message | cd-circ-000059 | yes |
| R9 | 57.6 | 312 | message | stepped trial 24, 4.799999714 (4.799999714) | message | cd-circ-000060 | yes |
| H1 | 4.8 | 1 | message | stepped trial 2, 0.4000000060 (0.4000000060) | message | cd-circ-000061 | yes |
| H2 | 2.4 | 1 | message | stepped trial 1, 0.2000000030 (0.2000000030) | message | cd-circ-000062 | yes |
| H3 | 7.2 | 1 | message | stepped trial 3, 0.6000000238 (0.5999999642) | message | cd-circ-000063 | yes |

10 of 10. This agrees with the person's count. On all 57 observations T1·D1·X2 fits 56; it
misses obs-cdmenu-000001, rejected at trial 0.8000000119 ft, which is its D. Its outcomes are
results and rejections only. For comparison, T1·D1·X1 (the rebuild's test, with K1) fits 52:
it reaches the geometry at a trial on D in cd-circ-000045, -000056, -000060, -000061 and -000062.

**What the 10 of 10 is, and is not.**
- T1·D1·X2 was already known to miss the 9.6 in run. A-013 says so ("With a `≥` test
  (T1·D1·X2) ... the rebuild's trials miss the 9.6 in run instead: both reject at 0.800000012
  ft"), and that is why A-013 dropped it: A-013 kept only the combinations that fit all 47
  observations, the 9.6 in run among them.
- Its scores on the ten are derived, not predictions committed before the runs. Nobody wrote
  T1·D1·X2's answers on R1 to R9 or H1 to H3 down before those cases ran.
- It is picked because it is the smallest change to the rebuild: one comparison, > to ≥, with
  the trial and the diameter store as they are now. Nothing observed separates it from the other
  55; all 56 give the same outcome on every observation.

**The known difference it leaves.** 9.6 in, n .013, 2 cfs, slope .005: QUICK-2 went to the
shape menu with no result and no message (obs-cdmenu-000001; three runs, the exploratory
20261125-100815-dff8b0, the run that recorded obs-cdmenu-000001 and 20261125-184734-96cde0,
ledger decision 98). Under T1·D1·X2 the rebuild returns rejected with the message, at stepped
trial 4, 0.8000000119 ft, which equals D. obs-cdmenu-000001 is a behaviour case, so the
comparator never grades it, and this difference shows up in no count.

**Q-029 goes back to open.** The question is now why QUICK-2 ends on the shape menu for the
9.6 in pipe at 2 cfs, when it prints the message for 4.8 in and 2.4 in at 1 cfs. Under the
rebuild's trial and diameter store, all three pipes put a stepped trial exactly on D (trial 4,
0.8000000119; trial 2, 0.4000000060; trial 1, 0.2000000030), and the discharge typed reaches
that trial in all three (above 1.7619 cfs at 9.6 in, 0.1420 cfs at 4.8 in, any q at 2.4 in).
The pipes differ in diameter and discharge, and no case has varied either alone at 9.6 in.
What was tried:
- A-011 and its amendment: five, then seven ways of forming the trials, and two diameter
  stores. A-012: S2 (12 in, 4 cfs, cd-circ-000045) printed the message where the rebuild's
  trial lands on its diameter, so a trial on the diameter does not by itself give the menu.
- A-013 and its amendment: 184 combinations of ten trial formers, four diameter stores and six
  tests, under the assumption that a trial the test passes at or past D raises a QuickBASIC
  error that ends on the shape menu. 16, then 39, fit the 47 observations then known.
- A-014: R1, R2, R4 and R6 to R9 picked G3, which explained the 9.6 in ending by an inches test that
  lets the trial through, and predicted the menu at 4.8 and 2.4 in.
- This section: H1 and H2 printed the message. None of the 184 fits all 57 outcomes.
- obs-cdmenu-000001 keeps one screen per step, so nothing between the last Enter and the shape
  menu is seen, and no capture shows a QuickBASIC error. The ending repeated in all three runs.
- After the fact, the person searched about 32,000 wider models. 16 fit, and they were chosen
  by one pipe, so none is adopted. That search is his; this script does not run it.

**Not part of this.** The solver is unchanged. circle-short-chord's bugfix.md is revised in a
later commit, and its design is not written. Normal Depth's search (N2, Q-026) is not tested
by any case here.

**Correction, 2026-11-25:** R1, R2, R4, R6 to R9 and H1 to H3 are not "the ten cases it was
not chosen on": they are ten cases that ran after A-013 dropped T1·D1·X2, and the rule was
brought back after seeing them (the heading in `grade-a014` now says so).

## A-016: predictions for K1 with T1·D1·X2, before any case runs (for the Exhumer)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section. The solver is not changed.**

**These are the first predictions made for circle-short-chord's rule, K1 after a short chord
with the test trial ≥ D (A-015's T1·D1·X2), before the cases run. Twelve cases, n .013 and
slope .005. In the 8 in and the 15 in pipes the rule refuses a discharge, answers a higher one,
and refuses a higher one again: 1.6 cfs the message, 1.71 a result, 1.8 the message; 10.5 the
message, 10.8 a result, 11 the message. The rebuild today gives a result for 1.6 and 10.5. In
the 9.6 in pipe, 1.5 cfs is a result and 1.8, 3 and 10 cfs the message. 9999 in at .5 cfs and
7254 in at .3 cfs never finish.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a016` (about 3 s)
at the commit that adds this section. It writes out the search of `app/src/solver/search.ts`
with two options, K1 or N2 after a short chord and trial > D or trial ≥ D, with the trial and D
stored as the rebuild stores them, and it checks itself on all twelve cases: N2 with trial > D
gives what `solve()` gives today (outcome and search depth), and K1 with trial ≥ D gives what
A-015's model of T1·D1·X2 gives. Printed fields come from the rebuild's printer at the search
depth, as in A-013. The discharge is the stored single the form reads; A-015's `grade-a014`
gave its model the typed discharge as a double, which changes no outcome here. It never runs
the program.

**No golden has these inputs.** No stored case has a 9999 or 7254 in circle (cd-circ-000008 is
7254.7 in, held at the Slope prompt). The 8 in golden is cd-circ-000043 (Q1, 1 cfs) and the 15
in goldens are cd-circ-000038 (5 cfs) and -000049 (7 cfs). The only stored case at 9.6 in is
obs-cdmenu-000001, 2 cfs, a behaviour case whose inputs are in its transcript.

### The cases

"Message" is the rejection screen as A-012 saw it: "DEPTH is Greater than the DIAMETER" on
0-based row 20, Depth `0.00`, Critical Slope and every output field blank. "Shape menu" is
obs-cdmenu-000001's ending. "Never finishes": no result, no message and no shape menu; the
runner waits 10 s for a screen (`wait_timeout_s`) within a 60 s case limit
(`case_time_limit_s`, both in `oracle/targets/quick2.json`), and a case that times out stores
no golden. The percentages are A·√(g·A/T) at the trial against q; a trial stops the search
within 0.5%.

| Case | Diameter | Discharge | Predicted | How the search ends under K1 and trial ≥ D | The rebuild today |
|---|---|---|---|---|---|
| U1 | 8 | 1.6 | message | trial 0.6 is +6.74%; chord 0.5782145 is −3.83%; K1 steps to 0.7782145, 0.112 ft past D (0.6666667) | result, search depth 0.58610 |
| U2 | 8 | 1.71 | result | stepped trial 0.6, 1.70782 cfs, −0.13% | result, the same fields |
| U3 | 8 | 1.8 | message | trial 0.6 is −5.12%; trial 0.8000000 is 0.133 ft past D | message |
| U4 | 15 | 10.5 | message | trial 1.2 is +2.86%; chord 1.1871434 is −3.40%; K1 steps to 1.3871434, 0.137 ft past D (1.25) | result, search depth 1.19412 |
| U5 | 15 | 10.8 | result | stepped trial 1.2, 10.8004 cfs, +0.004% | result, the same fields |
| U6 | 15 | 11 | message | trial 1.2 is −1.81%; trial 1.4000001 is 0.150 ft past D | message |
| V1 | 9.6 | 1.5 | result | trial 0.6 is +16.9%; chords 0.5469216 (−2.83%) and 0.5521857 (−0.99%), each followed by a trial 0.2 ft up that is over q and inside D; chord 0.5539467, −0.37% | result, search depth 0.55454 |
| V2 | 9.6 | 1.8 | message | trial 0.6 is −2.60%; trial 4, 0.8000000119, equals D | `error`, `never_finishes` |
| V3 | 9.6 | 3 | message | trial 0.6 is −41.6%; trial 4 equals D | `error`, `never_finishes` |
| V4 | 9.6 | 10 | message | trial 0.6 is −82.5%; trial 4 equals D | `error`, `never_finishes` |
| W1 | 9999 | .5 | never finishes | trial 0.2 gives 9.20 cfs; the chords on [0, 0.2] fall toward 0 and rise above q; none within 0.5% in 1,000,000 evaluations | `error`, `never_finishes` |
| W2 | 7254 | .3 | never finishes | trial 0.2 gives 7.15 cfs; the same | `error`, `never_finishes` |

The printed fields of the three results, every field the comparator compares:

| Case | Diameter | n | Discharge | Depth | Slope | Critical Slope | Area | Wet Per | Velocity | Hyd R | Top Width | Froude # | Max Discharge | Flow Type |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| U2 | 8.0 | 0.0130 | 2 | 0.59 | 0.0050 | 0.0176 | 0.3 | 1.7 | 5.2 | 0.2 | 0.4 | 1.0 | 2 | CRITICAL |
| U5 | 15.0 | 0.0130 | 11 | 1.19 | 0.0050 | 0.0244 | 1.2 | 3.4 | 8.9 | 0.4 | 0.5 | 1.0 | 11 | CRITICAL |
| V1 | 9.6 | 0.0130 | 2 | 0.54 | 0.0050 | 0.0086 | 0.4 | 1.6 | 4.0 | 0.2 | 0.7 | 1.0 | 2 | CRITICAL |

The rebuild today prints the same for U2 and U5, and for V1 the same except Critical Slope
`0.0085`. For U1 it prints Depth `0.58`, Critical Slope `0.0158`, Velocity `4.9`, Max
Discharge `2`; for U4 Depth `1.18`, Critical Slope `0.0230`, Velocity `8.7`, Max Discharge
`11`.

**Four discharges in one pipe.** With Q1 (8 in, 1 cfs, the message, cd-circ-000043), the 8 in
pipe has four: 1 cfs the message, 1.6 the message, 1.71 a result, 1.8 the message. A higher
discharge gets an answer after a lower one is refused, because the stepped trial 0.6 ft is
within 0.5% of 1.71 cfs and the 1.6 cfs search reaches the crown through a short chord. The 15
in pipe does the same with the stepped trial 1.2 ft. So the discharge at which QUICK-2 starts
to refuse a pipe is not one number, and a requirement that says a rejected input stays rejected
when the discharge goes up would be false if these hold.

### What the cases separate

| Case | K1, trial ≥ D (2.4) | K1, trial > D | N2, trial > D (today) | N2, trial ≥ D | The 56 of A-015 | All 184 |
|---|---|---|---|---|---|---|
| U1 | message | message | result | result | 56 message | 184 message |
| U2 | result | result | result | result | 56 result | 184 result |
| U3 | message | message | message | message | 56 message | 184 message |
| U4 | message | message | result | result | 56 message | 184 message |
| U5 | result | result | result | result | 56 result | 184 result |
| U6 | message | message | message | message | 56 message | 184 message |
| V1 | result, `0.0086` | result, `0.0086` | result, `0.0085` | result, `0.0085` | 56 result | 184 result |
| V2, V3, V4 | message | never finishes | never finishes | message | 56 message | 110 message, 74 shape menu |
| W1, W2 | never finishes | never finishes | never finishes | never finishes | 56 never finish | 184 never finish |

The 56 are A-015's combinations that miss only obs-cdmenu-000001, rescored by this command
(T1·D1·X2 among them); the 184 all use K1 (A-013).

- U1 and U4 separate K1 from N2 on the outcome, and V1 on Critical Slope alone. Trial > D
  against trial ≥ D does not matter in them.
- U2, U3, U5 and U6 do not separate any model here: every one gives the same answer. They test
  the 0.2 ft step and the 0.5% stop at the trial just below the crown, the part every model
  shares.
- V2 to V4 separate trial ≥ D from trial > D, which five goldens already decide (1.4), and the
  56 from the 74 of the 184 that give the shape menu. If any of the three ends on the shape
  menu, every one of the 56 is wrong there, and Q-029 narrows to the pipe, not the discharge.
  If all three print the message, 9.6 in ends on the menu at 2 cfs and not at these three.
  V1 never reaches the trial on D, which a search reaches only above 1.7619 cfs (A-015).
- No case here separates any two of the 56.
- W1 and W2 separate nothing. They ask what QUICK-2 does when the discharge is under the
  least A·√(g·A/T) the pipe gives (circle-short-chord 2.7): 1.271 cfs at 9999 in, so .5 cfs is
  0.39 of it, and 0.570 cfs at 7254 in, so .3 cfs is 0.53 of it (`floor`).

### How far each prediction is from a knife edge

- **Rounding of A·√(g·A/T).** Multiplied by 1 ± 1e-6 and by 1 ± 1e-4 before it is stored, no
  outcome of the twelve changes, and no printed field of U2, U5 or V1 changes at 1 ± 1e-4.
- **The 0.5% stop.** Trial 0.6 in the 8 in pipe stops the search for q from 1.69932 to 1.71640
  cfs: 1.71 is 0.0064 cfs (0.37%) under the top, 1.8 is 0.084 cfs over it, and 1.6 is 0.099
  cfs under the bottom, where its chord is 3.83% short. Trial 1.2 in the 15 in pipe stops it
  from 10.7467 to 10.8547: 10.8 is 0.053 and 0.055 cfs from the ends, 11 is 0.145 over the top, and
  10.5 is 0.247 under the bottom, where its chord is 3.40% short. V1's last chord is 0.37%
  short, 0.13 points inside the stop, and the chord before it 0.99% short.
- **The diameter.** The trial that rejects U1, U3, U4 and U6 is 0.112 to 0.150 ft past D, so
  trial > D and trial ≥ D agree there. In V2 to V4 trial 4 equals D exactly: that tie is what
  these cases are for, and the test decides it by construction. V2's 1.8 cfs is 2.2% over the
  top of trial 0.6's stop, 1.7619 cfs, so it reaches trial 4.
- **The floor.** W1 and W2 are at 0.39 and 0.53 of the floor. In the 12 in pipe the model first
  finishes at about 2.8 times the floor (`floor`), so both are well inside the range where it
  never finishes.
- **Printed fields.** The nearest any printed value comes to a rounding boundary is U2's
  Critical Slope, 0.0176473, which is 0.015% under 0.01765. U5's is 0.0243685, 0.076% over
  0.02435. V1's is 0.0085626, 0.15% over 0.00855, and today's 0.0085383 is 0.14% under it. In
  U2 and U5 the search depth is a stepped trial, which the search cannot move, so a miss on
  their Critical Slope points at its arithmetic, not at the search.
- **The Discharge echo.** No result golden has a fractional discharge, so the echo `2` for
  1.71 and 1.5 cfs and `11` for 10.8, which the form's `######` mask gives (`layout.ts`), is
  itself unobserved. A different echo is a format miss, not a search miss.
- **The form.** No stored circle has a diameter above 8190.5 in, so whether the form takes
  9999 is unobserved. A hold at the Diameter prompt counts as a miss of W1's premise and says
  nothing about the floor.

### What each answer would mean

- U1 or U4 giving a result: K1 is wrong for a chord short of q just under the crown, where N2,
  today's rule, gives the result. U1's result under N2 prints the fields above.
- U2 or U5 refused, or U3 or U6 answered: the step or the stop near the crown is wrong. Every
  model here and every one of the 184 misses it.
- V1 printing Critical Slope `0.0085`: N2 on this pipe, where K1 says `0.0086`.
- V2, V3 or V4 on the shape menu: Q-029 narrows to the pipe, as above, and the 56 are all wrong
  there.
- W1 or W2 timing out: what the model predicts. It stores no golden, and the run folder's last
  screen is the only record. A message, a result or the shape menu are misses, and each says
  what QUICK-2 does under the floor. The model's chords reach y = 0, where T = 0, the division
  A-013's assumption reads as a run-time error, so the shape menu is a live alternative to
  "it keeps searching".
- Any miss: circle-short-chord's requirements are revised again before the solver changes (its
  2.12).

The cases can run in any order. W1 and W2 each take up to the 60 s case limit.

**Not part of this.** The solver, circle-short-chord's bugfix.md and the ledger are unchanged.
Normal Depth's search (N2, Q-026) is not tested by any case here.

## A-016 graded: 9 of 12, and what the misses say

**Written after A-016's twelve cases ran (ledger decision 102; recorded in 89c65a3). The grade
is against A-016 as committed (414cad4). Nothing in this section is a prediction. The solver is
not changed.**

**A-016 is right on 9 of 12. U1 to U6, V1, V3 and V4 ended as predicted, and the three results,
U2, U5 and V1, match on every printed field. The three misses all ended on the shape menu with
no result and no message: V2 (9.6 in, 1.8 cfs), where A-016 predicted the message, and W1 (9999
in, .5 cfs) and W2 (7254 in, .3 cfs), where it predicted that QUICK-2 never finishes. The misses
trigger circle-short-chord 2.12: the requirements are revised again before the solver changes.**

**How graded.** `node scripts/circle_outputs.mts grade-a016` (about 2 s) reads A-016 from commit
414cad4 with `git show`: the table under "The cases", the common n (.013) and slope (.005), and
the table of printed fields. For each case it lists every golden, behaviour case and run folder
that ledger decision 102 names with the same typed inputs, and reads each one's outcome and last
screen. A behaviour case's inputs are read from its transcript. As a check, the model rerun now
gives A-016's committed outcome on 12 of 12 cases and its committed field on 42 of 42. It never
runs the program. Every number in this section is that command's output. W2 is graded from its
run folder, 20261126-001813-0cfa74, under `oracle/out`, which is not committed; its behaviour
case, obs-cdmenu-000004, is in the profile and has no golden yet (Q-034).

| Case | Diameter | Discharge | A-016 predicts | QUICK-2 | Seen in | Right |
|---|---|---|---|---|---|---|
| V2 | 9.6 | 1.8 | **message** | shape menu | obs-cdmenu-000002, run 20261126-001523-d4c7e8 | no |
| W1 | 9999 | .5 | **never finishes** | shape menu | obs-cdmenu-000003, run 20261126-001714-439809 | no |
| W2 | 7254 | .3 | **never finishes** | shape menu | run 20261126-001813-0cfa74 | no |
| U1 | 8 | 1.6 | message | message | cd-circ-000064, run 20261126-001352-8d0e17 | yes |
| U2 | 8 | 1.71 | result | result | cd-circ-000065, run 20261126-001406-f2f758 | yes |
| U3 | 8 | 1.8 | message | message | cd-circ-000066, run 20261126-001418-489629 | yes |
| U4 | 15 | 10.5 | message | message | cd-circ-000067, run 20261126-001428-fd8dd6 | yes |
| U5 | 15 | 10.8 | result | result | cd-circ-000068, run 20261126-001438-2cb7f3 | yes |
| U6 | 15 | 11 | message | message | cd-circ-000069, run 20261126-001451-7c4a5a | yes |
| V1 | 9.6 | 1.5 | result | result | cd-circ-000070, run 20261126-001501-e6c9d8 | yes |
| V3 | 9.6 | 3 | message | message | cd-circ-000071, run 20261126-001616-046275 | yes |
| V4 | 9.6 | 10 | message | message | cd-circ-000072, run 20261126-001650-f37143 | yes |

A bold cell is a wrong prediction. The misses are listed first. This agrees with the person's
count, 9 of 12 with V2, W1 and W2 the misses. Every source for a case agrees with the others.
V2 and W1 each ended on the shape menu twice, in the run and again when the behaviour case was
recorded; W2 ran once. Each of the six messages is on 0-based row 20, with the Depth field
`0.00` and Critical Slope and every output field blank. The three runs that ended on the menu
were reported as a timeout after a 10 s wait for a result or a rejection, with the shape menu on
screen; none reached the 60 s case limit.

**The three results.** cd-circ-000065 (U2), -000068 (U5) and -000070 (V1) match A-016's rows on
14 of 14 fields each. V1's Critical Slope is `0.0086`, K1's value, where N2, the rebuild today,
prints `0.0085`. U1 and U4 printed the message where N2 gives a result. So the three A-016 cases
that separate K1 from N2 all went K1's way. The form shows the typed discharge as a whole number:
1.71 as `2`, 10.8 as `11` and 1.5 as `2`. These are the first result goldens with a fractional
discharge, and they confirm the `######` mask that A-016 listed as unobserved.

### What the misses say

**The floor (W1, W2).** Under the least A·√(g·A/T) the pipe gives (circle-short-chord 2.7),
at 0.393 of it in the 9999 in pipe and 0.527 in the 7254 in pipe, QUICK-2 went back to the shape
menu with no message. It did not keep searching. In the model, the chords on [0, 0.2] fall to
y = 0 at chord 17 (W1) and chord 18 (W2), where T = 0 and A·√(g·A/T) divides by zero. A-013
read a QuickBASIC run-time error as a return to the shape menu (quick2-solver design, Negative
values and abandoned calculations, an inference). This is the first observation that fits that
reading: the model reaches a division by zero, and QUICK-2 returned to the menu. No capture
shows an error, so it is not shown that a division by zero is what happened.

**The 9.6 in pipe.** It has five discharges now: 1.5 cfs a result (cd-circ-000070), 1.8 and 2
cfs the shape menu (obs-cdmenu-000002 and -000001), 3 and 10 cfs the message (cd-circ-000071 and
-000072). Under the rebuild's trial and diameter store, D is 0.8000000119 ft and the stepped
trials are 0.2000000030, 0.4000000060, 0.6000000238 and 0.8000000119, which equals D.
A·√(g·A/T) at the first three is 0.21001, 0.79936 and 1.7531 cfs. Trial 3 is more than 0.5%
short of q for q above 1.7619 cfs. So 1.8, 2, 3 and 10 cfs take the same three trials, each
short of q, and reach trial 4, equal to D, with nothing else done; 1.5 cfs is over q at trial
3 and takes a chord. This is the person's check (`tmp/v2_trace.mts`), confirmed by the committed
command. A rule that looks only at the trial and the diameter gives the four the same outcome,
and QUICK-2 gave them two.

**All 184 combinations on all 69 observations.** A-013's 136 and the amendment's 48, scored as
A-015 scored them, on 34 circle Critical Depth results on every printed field, 31 rejections
with the message (cd-circ-000039 to -000063, -000064, -000066, -000067, -000069, -000071 and
-000072), and 4 shape-menu endings: obs-cdmenu-000001 to -000003 and W2's run folder. cd-circ-000003, -000007
and -000008 are held at a prompt and are left out, as before. None fits all 69, as the person
expected. Scores: 56 fit 65, 19 fit 64, 11 fit 63, 13 fit 62, 15 fit 61, 25 fit 60, 19 fit 59,
5 fit 58, 7 fit 57, 4 fit 56, 2 fit 55, 3 fit 54, 2 fit 53, 2 fit 52 and 1 fits 50. The 56 that
fit 65 are A-015's 56, T1·D1·X2 among them, and all miss the same four: they print the message
at 9.6 in for 1.8 and 2 cfs, and never finish W1 and W2. No combination gives the shape menu for
1.8 and 2 cfs and the message for 3 and 10 cfs. All 184 never finish W1 and W2.

**What could make the outcome depend on the discharge.** Up to trial 4, q enters the search only
in the two comparisons made at each trial, within 0.5% of q and short of or over it, and for 1.8
to 10 cfs both come out the same at trials 1 to 3. So the discharge has to change something at
trial 4: in what is done with the trial on D, or in a test on q that the model does not have.
These are the candidates. None is modelled to the end, and none is chosen.

1. **q is compared with a number QUICK-2 gets at the trial on D.** If QUICK-2's test lets trial 4
   through (trial > D, as the rebuild does today) and its geometry returns a number there instead
   of an error, q is compared with that number as at any trial. q more than 0.5% above it steps
   to trial 5, 1.0 ft, past D, and gets the message (3 and 10 cfs). q more than 0.5% below it
   takes a chord on [trial 3, trial 4], and that branch would have to end on the menu (1.8 and 2
   cfs), which no model written here does. The number belongs to the pipe, so n and the slope
   cannot move it. This predicts one change from the menu to the message, somewhere between 2.01
   and 2.985 cfs, and a result at the trial on D, with Depth `0.79`, for a discharge within 0.5%
   of the number. **Told apart by** a 9.6 in result with Depth `0.79`, which no other candidate
   gives.
   - **1a: the number scales as D^2.5**, as A·√(g·A/T) at any fixed share of D does. Call it
     c·D^2.5. obs-cdmenu-000001 needs c above 3.5113 and cd-circ-000045 (12 in, 4 cfs, the
     message) needs it below 3.9800, so at 9.6 in the change is between 2.0100 and 2.2783 cfs.
     In the 4.8 in and 2.4 in pipes, low discharges that step to D would then end on the menu.
     **Told apart from 1 by** the 9.6 in change falling above 2.28 cfs, or a low discharge in the
     4.8 in or 2.4 in pipe printing the message; either refutes 1a and leaves 1.
2. **q acts through the chord after trial 4.** If the number at trial 4 is above every discharge
   here (above 10.05 cfs, so T is near 0: the trial lies just inside QUICK-2's own diameter), all
   four discharges take a chord on [trial 3, trial 4]. The chord sits higher for a larger q, and
   K1 resumes 0.2 ft above it. That trial is past D for a large q (the message) and not past it
   for a small one, where it lands at or next to the crown and would have to end on the menu.
   This predicts one change between 2 and 3 cfs and no result on that range. **Told apart from 1
   by** a result on that range, which refutes 2; with no result, A-017 cannot separate 1 from 2,
   since a 0.1 cfs grid can step over 1's band, which is about 1% wide.
3. **A test on q made before the search, from n or the slope.** QUICK-2 could refuse a discharge
   above some capacity before it steps, and the trial on D would then end on the menu for the
   discharges under it. The form written here, Manning's formula with the typed n and slope at
   0.9382·D (where Max Discharge is taken), gives 1.495 cfs at 9.6 in, under the 1.8 cfs that
   ended on the menu, and 8 result goldens have a discharge above it, so that form is refuted. No
   other form is written. **Told apart from 1 and 2 by** 9.6 in at 2 cfs with another n ending
   differently from obs-cdmenu-000001. Under 1 and 2, n cannot matter, since it does not enter
   A·√(g·A/T).

Ruled out already by the goldens (the same command):
- **A cap at a fixed share s of D** (refuse q above A·√(g·A/T) at s·D): 3 cfs at 9.6 in printed
  the message, which needs s under 0.9284, and U5 (15 in, 10.8 cfs) gave a result, which needs
  s of at least 0.9592.
- **The ratio of q to the last trial's A·√(g·A/T):** cd-circ-000045 (12 in, 4 cfs) printed the
  message at 1.1405, and obs-cdmenu-000001 (9.6 in, 2 cfs) ended on the menu at 1.1408.
- **A straight line through the last two trials, extended to D:** q is under it in both
  cd-circ-000045 (5.0359 cfs) and obs-cdmenu-000001 (2.7069 cfs), and they ended differently.

**Pipes whose stored diameter is a stepped trial.** The same command scans the typed diameters
0.1 to 180.0 in by 0.1 under the rebuild's trial and diameter store. Eight pipes put a stepped
trial exactly on D:

| Diameter (in) | Trial on D | Last trial inside, A·√(g·A/T) | Steps to D for q above (cfs) | Observations that step to D |
|---|---|---|---|---|
| 2.4 | 1, 0.2000000030 | none | any | cd-circ-000062, 1 cfs, message |
| 4.8 | 2, 0.4000000060 | 0.2000000030, 0.14131 | 0.14202 | cd-circ-000061, 1 cfs, message |
| 9.6 | 4, 0.8000000119 | 0.6000000238, 1.7531 | 1.7619 | obs-cdmenu-000002, 1.8, menu; obs-cdmenu-000001, 2, menu; cd-circ-000071, 3, message; cd-circ-000072, 10, message |
| 12 | 5, 1.000000000 | 0.8000000119, 3.5072 | 3.5248 | cd-circ-000045, 4 cfs, message |
| 50.4 | 21, 4.200000286 | 4.000000477, 213.11 | 214.18 | none |
| 52.8 | 22, 4.400000095 | 4.200000286, 242.48 | 243.70 | none |
| 55.2 | 23, 4.599999905 | 4.400000095, 274.30 | 275.68 | cd-circ-000056, 276 cfs, message |
| 57.6 | 24, 4.799999714 | 4.599999905, 308.65 | 310.20 | cd-circ-000060, 312 cfs, message |

The 9.6 in pipe is the only one where a discharge that steps to D has ended on the menu, and the
only one where more than one such discharge has run.

**K1 and trial ≥ D still stand for results and rejections.** T1·D1·X2 with K1 fits all 65
results and rejections with the message, and it predicted all nine A-016 cases that ended on a
result or the message before they ran, the first predictions committed for it. It misses all
four shape-menu endings. Candidates 1 and 2 both have QUICK-2 reach the geometry at a trial on
D, which trial ≥ D never does, and both are fitted to give the message wherever a golden has it.
So trial ≥ D is the rule that reproduces the results and the messages. It is not a finding about
how QUICK-2 tests a trial against the diameter.

**Not part of this.** The solver is not changed. circle-short-chord's bugfix.md is revised in
the next commit, and A-017 follows it. Normal Depth's search (N2, Q-026) is not tested by any
case here.

## A-017: where the 9.6 in pipe changes from the shape menu to the message (for the Exhumer)

**Written and committed before any of these cases runs. Nothing in this section changes after
the runs; the results go in a new section. The solver is not changed.**

**Thirteen cases. Nine find where the 9.6 in pipe changes from the shape menu (1.8 and 2 cfs) to
the message (3 cfs), at 2.1 to 2.9 cfs. Three put a discharge on another pipe whose stored
diameter equals a stepped trial: 12 in at 3.6 cfs, 4.8 in at .2 cfs and 2.4 in at .05 cfs. One
repeats obs-cdmenu-000001 with n .02. The rule to build (2.4 with K1) gives the message on all
thirteen. Candidates 1 and 2 of A-016 graded predict one change along the nine; only 1 allows a
result there, with Depth `0.79`; only its variant 1a predicts the shape menu at 4.8 and 2.4 in.**

**Source.** Every number below is printed by `node scripts/circle_outputs.mts a017` (about 1 s)
at the commit that adds this section, and the pipes and the bounds on c by `grade-a016`. It runs
A-016's written-out search with K1 and trial ≥ D on each case, multiplies A·√(g·A/T) by 1 ± 1e-6
and 1 ± 1e-4, scores the 184 combinations, and checks that no stored case has these inputs. It
never runs the program.

**Candidates (A-016 graded, What the misses say).**
- **2.4 with K1**: the rule to build. Not an explanation of the 9.6 in pattern; listed so a
  case's difference from the rebuild is known before it runs.
- **1**: q is compared with a number QUICK-2 gets at the trial on D. Menu more than 0.5% under
  it, message more than 0.5% over it, a result at the trial on D (Depth `0.79` at 9.6 in) within
  0.5%. The number belongs to the pipe and is unknown: at 9.6 in it lies between 2.01 and 2.985
  cfs, and at 12 in below 3.98 cfs (cd-circ-000045).
- **1a**: candidate 1 with the number c·D^2.5, c above 3.5113 (obs-cdmenu-000001) and below
  3.9800 (cd-circ-000045).
- **2**: q acts through the chord after trial 4. One change from menu to message; no result.
- **3**: a test on q made before the search, from n or the slope. No form of it fits the goldens,
  so it predicts nothing here except that N1 may differ from obs-cdmenu-000001.

### The cases

n .013 and slope .005 except N1. "Message" and "shape menu" are as in A-016. In every case the
discharge steps to a trial that equals the stored D exactly, under the rebuild's trial and
diameter store; "over" is how far the discharge is above the least one that steps past the last
trial inside to it.

| Case | Diameter | n | Discharge | Steps to the trial on D | 2.4 with K1 | 1 | 1a (c·D^2.5) | 2 | 3 |
|---|---|---|---|---|---|---|---|---|---|
| B1 | 9.6 | .013 | 2.1 | trial 4, 19.2% over | message | one change along B1 to B9 | menu if c > 3.687, message if c < 3.650, result between | one change along B1 to B9 | none |
| B2 | 9.6 | .013 | 2.2 | trial 4, 24.9% over | message | one change | menu if c > 3.862, message if c < 3.824, result between | one change | none |
| B3 | 9.6 | .013 | 2.3 | trial 4, 30.5% over | message | one change | message | one change | none |
| B4 | 9.6 | .013 | 2.4 | trial 4, 36.2% over | message | one change | message | one change | none |
| B5 | 9.6 | .013 | 2.5 | trial 4, 41.9% over | message | one change | message | one change | none |
| B6 | 9.6 | .013 | 2.6 | trial 4, 47.6% over | message | one change | message | one change | none |
| B7 | 9.6 | .013 | 2.7 | trial 4, 53.2% over | message | one change | message | one change | none |
| B8 | 9.6 | .013 | 2.8 | trial 4, 58.9% over | message | one change | message | one change | none |
| B9 | 9.6 | .013 | 2.9 | trial 4, 64.6% over | message | one change | message | one change | none |
| E1 | 12 | .013 | 3.6 | trial 5, 2.1% over | message | none | menu if c > 3.618, message if c < 3.582, result between | none | none |
| E2 | 4.8 | .013 | .2 | trial 2, 40.8% over | message | none | shape menu | none | none |
| E3 | 2.4 | .013 | .05 | trial 1, any q | message | none | shape menu | none | none |
| N1 | 9.6 | .02 | 2 | trial 4, 13.5% over | message | shape menu | shape menu | shape menu | may differ from obs-cdmenu-000001 |

"One change" means: B1 to B9 end on the shape menu up to some discharge and on the message above
it, with at most one result between, and only under 1. "None" means the candidate does not fix
the outcome. The 184 combinations give 74 shape menu and 110 message on B1 to B9 and N1, 56 and
128 on E1, and 80 and 104 on E2 and E3; none of them fits all 69 outcomes (A-016 graded), so they
are not a candidate here.

**Joint predictions.**
- Under 1 and 2, B1 to B9 change once, from the menu to the message. A message below a menu
  along the series refutes both.
- Under 1a, B3 to B9 print the message, and the change falls below 2.28 cfs: before B1,
  between B1 and B2, or between B2 and B3. E1 ends
  on the menu if B1 does (B1's menu needs c > 3.687, above E1's 3.618), and if E1 prints the
  message, so do B1 and B2 (c < 3.582).
- Under 1 and 1a, a result within 0.5% of the number prints Depth `0.79` at 9.6 in (D − 0.01 at
  0.8000000119 ft) and is the only result possible on B1 to B9. Under 2 there is none.
- Under 1, 1a and 2, N1 ends on the shape menu, since n does not enter A·√(g·A/T) or the steps.

### How far each prediction is from a knife edge

- **Reaching the trial on D.** Every case steps to it. The nearest is E1: 3.6 cfs is 2.13% over
  the least discharge that steps past trial 4 (0.8000000119 ft, A·√(g·A/T) 3.5072, reached above
  3.5248 cfs). B1 is 19.2% over 1.7619 cfs, N1 13.5%, E2 40.8% over 0.14202 cfs, and E3's pipe
  has no trial inside, so any discharge steps to trial 1.
- **Rounding of A·√(g·A/T).** Multiplied by 1 ± 1e-6 and by 1 ± 1e-4, no outcome under 2.4 with
  K1 changes.
- **The trial on D.** The trial equals D exactly in every case (trial 4 in the 9.6 in pipe,
  trial 5 at 12 in, trial 2 at 4.8 in, trial 1 at 2.4 in); that tie is what the cases are for.
- **1a.** B3 is the closest: its message needs c under 3.9978, and c is known only to be under
  3.9800, a margin of 0.45%. B1 and B2 depend on c. E2 needs c above 1.986 for the menu and E3
  above 2.809, against a known 3.5113, margins of 77% and 25%. N1 has obs-cdmenu-000001's
  discharge and pipe, so its bound is the same by construction.
- **The grid.** B1 to B9 are 0.1 cfs apart, so they place the change to within 0.1 cfs. A
  result under 1 needs a discharge within 0.5% of the number, a band about 0.02 cfs wide here,
  which the grid can step over. No result on B1 to B9 does not refute 1.

### What each answer would mean

- B1 to B9 changing once: what 1, 1a and 2 predict. Where the change falls is the finding; above
  2.28 cfs (B3 or later on the menu) refutes 1a.
- A message below a menu along B1 to B9: refutes 1 and 2.
- A result on B1 to B9 with Depth `0.79`: supports 1 and refutes 2. Any other result is a miss of
  every candidate.
- E2 or E3 on the shape menu: supports 1a. The message at either refutes 1a.
- E1 on the menu: in a second pipe, a discharge just over the reach of the trial on D ends on
  the menu, as 1.8 cfs did at 9.6 in. The message there means the menu is not seen just over the
  reach in every pipe with a trial on D.
- N1 differing from obs-cdmenu-000001: n matters, which only 3 allows.
- Any case on the shape menu is a known difference from the rebuild under 2.6, unless 2.6 does
  not yet name it, in which case circle-short-chord's requirements are revised again before the
  solver changes (its 2.12). A result or the message where 2.4 gives the other is a miss of the
  rule to build and revises them too.

**How to run.** Each case once, with record true, in any order. A case that ends on the shape
menu stores no golden; add a behaviour case with the same keys (`hold_ms` 3000, as
obs-cdmenu-000002 has) and record it. In the same session record obs-cdmenu-000004, W2's
behaviour case, already in the profile (Q-034); it ran once and ended on the shape menu, and that
is its prediction. A shape-menu run waits 10 s for a result or a rejection before it ends.

**Not part of this.** The solver, circle-short-chord's bugfix.md and the ledger are unchanged.
Normal Depth's search (N2, Q-026) is not tested by any case here.

## A-017 graded: the change at 9.6 in is between 2.2 and 2.3 cfs, and the full-pipe reading

**Written after A-017's thirteen cases ran (ledger decision 104; recorded in 811f3a5). The grade
is against A-017 as committed (d57eed5). Nothing in this section is a prediction. The solver is
not changed.**

**B1 and B2 (9.6 in, 2.1 and 2.2 cfs) ended on the shape menu and B3 to B9 (2.3 to 2.9 cfs)
printed the message, so the 9.6 in pipe changes from the menu to the message between 2.2 and
2.3 cfs. E1 (12 in, 3.6 cfs) and E2 (4.8 in, .2 cfs) ended on the shape menu, E3 (2.4 in, .05
cfs) printed the message, and N1 (9.6 in, 2 cfs, n .02) ended on the shape menu, as the same
inputs did with n .013. No case gave a result. The rule to build is right on 8 of 13 and misses
B1, B2, E1, E2 and N1. Candidates 1 and 2 are right on both predictions they make, the single
change along B1 to B9 and N1. 1a is right on 12 of 13 and misses E3. This agrees with the
person's account on every point. The misses trigger circle-short-chord 2.12 again.**

**How graded.** `node scripts/circle_outputs.mts grade-a017` (about 3 s) reads A-017 from commit
d57eed5 with `git show`: the case table, the common slope and 1a's bounds on c. For each case
it lists every golden, behaviour case and run folder that ledger decision 104 names with the same
typed inputs. As a check, the model rerun now gives A-017's committed cell on 26 of 26 (2.4 with
K1 and 1a, each case). It never runs the program. Every number in this section is that
command's output. Each case has a stored record: a golden for the eight messages and a behaviour
case for the five menus, each agreeing with its run folder under `oracle/out` (not committed).

A cell "menu if c > a, message if c < b" is right whatever the case ends on, and the ending
bounds c. "One change" is one prediction over B1 to B9, graded once. "None" and 3's "may differ"
predict nothing and are not graded.

| Case | Diameter | n | Discharge | QUICK-2 | Seen in | 2.4 with K1 | 1 | 1a (c·D^2.5) | 2 | 3 |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 9.6 | .013 | 2.1 | shape menu | obs-cdmenu-000005, run 20261126-095222-e41350 | **message** | one change: right | c > 3.687 | one change: right | none |
| B2 | 9.6 | .013 | 2.2 | shape menu | obs-cdmenu-000006, run 20261126-095333-e9502a | **message** | (joint) | c > 3.862 | (joint) | none |
| E1 | 12 | .013 | 3.6 | shape menu | obs-cdmenu-000007, run 20261126-095543-11fe0c | **message** | none | c > 3.618 | none | none |
| E2 | 4.8 | .013 | .2 | shape menu | obs-cdmenu-000008, run 20261126-095623-fd7c2f | **message** | none | shape menu | none | none |
| N1 | 9.6 | .02 | 2 | shape menu | obs-cdmenu-000009, run 20261126-095717-b9ff1c | **message** | shape menu | shape menu | shape menu | may differ |
| E3 | 2.4 | .013 | .05 | message | cd-circ-000080, run 20261126-095654-cdbd22 | message | none | **shape menu** | none | none |
| B3 | 9.6 | .013 | 2.3 | message | cd-circ-000073, run 20261126-095413-04bf58 | message | (joint) | message | (joint) | none |
| B4 | 9.6 | .013 | 2.4 | message | cd-circ-000074, run 20261126-095426-581b78 | message | (joint) | message | (joint) | none |
| B5 | 9.6 | .013 | 2.5 | message | cd-circ-000075, run 20261126-095437-ad71b5 | message | (joint) | message | (joint) | none |
| B6 | 9.6 | .013 | 2.6 | message | cd-circ-000076, run 20261126-095448-21f2e2 | message | (joint) | message | (joint) | none |
| B7 | 9.6 | .013 | 2.7 | message | cd-circ-000077, run 20261126-095459-2177fb | message | (joint) | message | (joint) | none |
| B8 | 9.6 | .013 | 2.8 | message | cd-circ-000078, run 20261126-095510-9cada8 | message | (joint) | message | (joint) | none |
| B9 | 9.6 | .013 | 2.9 | message | cd-circ-000079, run 20261126-095522-711613 | message | (joint) | message | (joint) | none |

A bold cell is a wrong prediction. Rows the rule to build misses come first, then E3, then the
hits. Every source for a case agrees with the others: B1, B2, E1, E2 and N1 each ended on the
menu twice, in the run and again when the behaviour case was recorded. Each of the eight
messages is on 0-based row 20, with the Depth field `0.00` and Critical Slope and every output
field blank.

| Prediction | Graded | Right | Misses |
|---|---|---|---|
| 2.4 with K1 (the rule to build) | 13 | 8 | B1, B2, E1, E2, N1 |
| 1 | 2 (the change, N1) | 2 | none |
| 1a | 13 | 12 | E3 |
| 2 | 2 (the change, N1) | 2 | none |
| 3 | 0 | - | - |

N1 ending as obs-cdmenu-000001 did does not refute 3, which allowed either ending. It shows that
n .02 against .013 does not change the ending at 9.6 in and 2 cfs.

### The number at the trial on D, pipe by pipe

Under candidate 1, q more than 0.5% under the number ends on the menu and more than 0.5% over
it prints the message. Every observation that steps to a trial on D (the same command; 2.4 in
has no stepped trial inside D, so every discharge steps to trial 1):

| Pipe | Trial on D | Endings seen (cfs) | The number lies between (cfs) | As c = number/D^2.5 |
|---|---|---|---|---|
| 2.4 in | 1, 0.2000000030 | .05 and 1 message | 0 and 0.04975 | under 2.7811 |
| 4.8 in | 2, 0.4000000060 | .2 menu; 1 message | 0.20100 and 0.99500 | 1.9863 to 9.8327 |
| 9.6 in | 4, 0.8000000119 | 1.8, 2, 2 (n .02), 2.1, 2.2 menu; 2.3 to 2.9, 3, 10 message | 2.2110 and 2.2885 | 3.8625 to 3.9978 |
| 12 in | 5, 1.000000000 | 3.6 menu; 4 message | 3.6180 and 3.9800 | 3.6180 to 3.9800 |
| 55.2 in | 23, 4.599999905 | 276 message | 0 and 274.62 | under 6.0511 |
| 57.6 in | 24, 4.799999714 | 312 message | 0 and 310.44 | under 6.1500 |

50.4 and 52.8 in have no observation that steps to their trial on D. Every pipe allows a number
on its own. As one c·D^2.5 (1a), B2 (obs-cdmenu-000006) needs c above 3.8625 and E3
(cd-circ-000080) below 2.7811, so no c fits, and 1a is refuted. Leaving out the 2.4 in pipe, B2
and cd-circ-000045 put c between 3.8625 and 3.9800, as the person said.

### The full-pipe reading (the person's, checked here)

The reading: at a trial on D, QUICK-2 gets A·√(g·A/T) of the full pipe with the top width taken
as D, A = 3.1416·D²/4 and T = D. That is c·D^2.5 with c = (3.1416/4)^1.5·√32.2 = 3.9497, inside
(3.8625, 3.9800). Each number below is A and T stored as singles and A·√(g·A/T) stored, which
agrees with 3.9497·D^2.5 in double to the digits shown.

| Pipe | The number (cfs) | A result for q from (cfs) | Last trial inside gives (cfs) |
|---|---|---|---|
| 2.4 in | 0.070654 | 0.070303 to 0.071009 | none |
| 4.8 in | 0.39968 | 0.39769 to 0.40169 | 0.14131 |
| 9.6 in | 2.2609 | 2.2497 to 2.2723 | 1.7531 |
| 12 in | 3.9497 | 3.9301 to 3.9695 | 3.5072 |
| 50.4 in | 142.79 | 142.08 to 143.50 | 213.11 |
| 52.8 in | 160.40 | 159.60 to 161.20 | 242.48 |
| 55.2 in | 179.25 | 178.36 to 180.15 | 274.30 |
| 57.6 in | 199.37 | 198.38 to 200.38 | 308.65 |

The person's numbers (2.2609, 3.9497, 0.3997) are right. So is the split. Of the 22 observations
that step to a trial on D, the 14 messages are all more than 0.5% over the number (the nearest,
cd-circ-000045 at 12 in and 4 cfs, by 1.27%, and cd-circ-000073 by 1.73%), and the 8 under it are the 7 menu
endings (by 2.70% for B2 to 49.96% for E2) and E3 (29.23% under). From 50.4 to 57.6 in the last
trial inside gives more than the number, so any discharge that reaches the trial on D there is
over it and the reading predicts the message.

E3 also goes the way the person said. In the model the chord on [0, trial 1] lands at 0.1415340
ft, 2.495% short, and K1 resumes at 0.3415340, past D, which the test rejects: the message.

### 3a: the number added to the model, with run-time errors read as the menu

Each of the 184 combinations is run four ways. **E**: a depth the geometry has no value for is a
run-time error, read as the shape menu: x/√(1−x²) divides by zero (x = ±1, at y = 0, at y = D,
or so near 0 that x = (r − y)/r rounds to 1) or takes the root of a negative number (y outside 0
to D), or g·A/T divides by zero. **F**: E, and a depth equal to D gives the full-pipe number
instead of the error. With either, a trial resumed from a short chord is tested against D as
2.4 says, or (**u**) it is not tested, so one past D reaches the geometry and meets the error.
That is 736 variants, on all 82 circle Critical Depth observations: 34 results on every printed
field, 39 rejections with the message (cd-circ-000039 to -000064, -000066, -000067, -000069 and
-000071 to -000080), and 9 shape-menu endings (obs-cdmenu-000001 to -000009, W1 and W2 among
them). A result at y = D under F is printed from the full pipe (A = 3.1416·D²/4, P = 3.1416·D,
T = D); no observation reaches that branch.

**None of the 736 fits all 82.** The best fit 75, by 203 variants: 66 E and 137 F.

| Variants | Best score | By | What the best miss |
|---|---|---|---|
| E (184) | 75 | 66 | 56, T1·D1·X2 among them, miss the 7 menu endings in pipes with a trial on D (each the message); 10 miss cd-circ-000045 and 6 of the 7 |
| F (184) | 75 | 137 | the same 7, each the message or a result |
| Eu (184) | 67 | 12 | 8 rejections (the menu) and the 7 |
| Fu (184) | 70 | 13 | 9 rejections (the menu, E3 among them) and obs-cdmenu-000002, -000007, -000008 |

193 variants fit all 73 results and rejections: 56 E and 137 F. Every one of them gives the menu
at W1 and W2 and the message or a result at all 7 of the others.

**How each menu ending arises.**
- **W1 and W2 (obs-cdmenu-000003, -000004), under the floor.** In all 736 variants the chords on
  [0, 0.2] fall until one lands so near 0 that x rounds to 1, and x/√(1−x²) divides by zero:
  chord 1.864515e-15 ft at 9999 in, 1.658026e-16 ft at 7254 in. (A-016 graded's loop, which has
  no error, evaluated those chords and went on to y = 0 at chords 17 and 18.) A-016's models never
  finished W1 and W2; with the error read as the menu, every variant ends them there.
- **The 7 in pipes with a trial on D** (obs-cdmenu-000001, -000002, -000005 to -000009). The
  variants that give the menu there do it in one of three ways: the stepped trial on D reaches the
  geometry, which divides by zero (108 to 120 variants, by pipe); a stepped trial past D reaches
  it, the root of a negative number (80; none at 12 in); or a resumed trial past D reaches it
  untested (124 to 178; none at 12 in). No variant that does any of the three fits every result
  and rejection.

**The reading itself, T1·D1·X1 F** (the rebuild's trial and store, trial > D so the trial on D
reaches the geometry, the full pipe there), fits 75 of 82: all 73 results and rejections, W1 and
W2. It misses the 7, and the path shows why:

| Observation | QUICK-2 | Under T1·D1·X1 F |
|---|---|---|
| obs-cdmenu-000002 (9.6 in, 1.8 cfs) | menu | trial on D 2.2609 (+25.6%); chord 0.6184633 (+3.69%); chord 0.6076410, −0.043%: **a result** |
| obs-cdmenu-000001, -000009 (9.6 in, 2 cfs) | menu | chord 0.6972311 (+22.9%); chord 0.6340317 (−1.63%); resumed 0.8340316, past D: **the message** |
| obs-cdmenu-000005 (9.6 in, 2.1 cfs) | menu | chord 0.7366150 (+38.4%); chord 0.6410595 (−4.05%); resumed past D: **the message** |
| obs-cdmenu-000006 (9.6 in, 2.2 cfs) | menu | chord 0.7759990 (+73.6%); chord 0.6380508 (−9.35%); resumed past D: **the message** |
| obs-cdmenu-000007 (12 in, 3.6 cfs) | menu | chord 0.8419387 (+9.40%); chord 0.8090246, −0.152%: **a result** |
| obs-cdmenu-000008 (4.8 in, .2 cfs) | menu | chord 0.2454314 (+4.50%); chord 0.2393910, −0.379%: **a result** |

The chord below D does not end on the menu. Where the next chord is within 0.5%, the search stops
there with a result; where it is short, K1 resumes past D and the test rejects it, which is E3's
path too. With the resumed trial untested (T1·D1·X1 Fu), the four in the second and third rows
end on the menu, but E3 and 11 other rejection goldens end on it as well (cd-circ-000040, -000043,
-000044, -000049 to -000052, -000057, -000058, -000064, -000067), and the three results stay:
67 of 82. Multiplying A·√(g·A/T) by 1 ± 1e-4 changes no ending under T1·D1·X1 F.

**3b: what stands in the way.** Two groups of observations, and no variant tried gets past both:
- obs-cdmenu-000002, -000007 and -000008 end on the menu where, once q is compared with any number
  above it at the trial on D, the chord on [last trial inside, D] lands within 0.5% of q
  (−0.043%, −0.152%, −0.379%). A menu there needs the search to stop before that chord or the
  chord to meet an error, and no form written here does either while keeping the 73.
- obs-cdmenu-000001, -000005, -000006 and -000009 end on the menu where the model's resumed trial
  lands past D. cd-circ-000080 (E3) and 11 other rejection goldens take a resumed trial past D
  and print the message. A test that rejects one and not the other would have to depend on
  something the model does not track.
What else was tried: run-time errors alone (E), the number with and without the test on resumed
trials (F, Fu, Eu), and 1 ± 1e-4. A-016 graded's tests on q (a fixed share of D, the ratio to the
last trial, a straight-line look-ahead, Manning at 0.9382·D) stay ruled out. Nothing is forced.

**What the grade leaves.** The rule to build is still 2.4 with K1 (T1·D1·X2). Reading a run-time
error as the menu adds W1 and W2 to what it reproduces: 75 of 82, against 73 of 82 for A-016's
model, which never finished them. The 7 menu endings in pipes with a trial on D are what it gets
wrong, all by printing the message. The full-pipe reading ties with it at 75. It differs from it
on discharges that reach a trial on D and are not over the number: inside the result band it
prints a result at the trial on D (Depth `0.79` at 9.6 in), and under it, where the chord on
[last trial inside, D] lands within 0.5%, a result at the chord (1.8 cfs at 9.6 in, E1, E2). The
rule to build prints the message for all of them. Every observation under the number ended on
the menu, so both miss there, and no observation is inside a band.

**Not part of this.** The solver is not changed. circle-short-chord's bugfix.md and design.md
are revised in the next commit, and A-018 follows them. Normal Depth's search (N2, Q-026) is not
tested by any case here.
