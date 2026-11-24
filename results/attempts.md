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
