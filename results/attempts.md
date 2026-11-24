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
