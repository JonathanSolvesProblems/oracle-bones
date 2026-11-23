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

**Resolved by H6, the sixth hypothesis. The design allows five; see the note at the end.**

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
played no part in choosing it. Whether the five-hypothesis limit should count it is for the
person running the task to decide.
