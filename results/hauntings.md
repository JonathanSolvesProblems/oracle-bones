# Hauntings

Places where QUICK-2's printed answer disagrees with exact hydraulics (oracle law, rule 5). Quickened
reproduces the printed value by default and may show the exact value beside it, labelled. Each
entry gives the case, what the program printed, the exact answer, and the size of the difference.
"Exact" here means the answer under the stated physical assumption, computed by the rebuild with
QUICK-2's own search and constants; it is not an observation.

## H-001: low ground cut off from the channel is counted as flowing

- **Case:** nd-irr-000010. The Grapevine section, n .06 / .04 / .06, discharge 3000 cfs, slope .0035.
- **QUICK-2 printed:** WS ELEV `596.37`, Area `623`, Top Wid `219`, Wet Per `220`.
- **What happens:** at 596.37 the water stands in two places: around the channel (155.76 to
  307.14 ft, 151.4 ft wide) and over low ground on the right overbank (347.07 to 414.81 ft,
  67.7 ft wide), which the 597.93 ft point at station 333.33 cuts off from the channel. QUICK-2
  counts the pocket in Area, Top Wid and Wet Per and lets it carry flow (criterion 9.7). The
  rebuild does the same and matches all nine fields.
- **Exact answer, with the pocket treated as ineffective (wet but carrying no flow, and left
  out of the section):** WS ELEV 596.42, Area 586, Top Wid 152, Wet Per 153.
- **Difference:** WS ELEV 0.05 ft lower in QUICK-2. Top Wid 67 ft wider (44%), Area 37 sq ft larger
  (6%), Wet Per 67 ft longer.
- **Flag:** `cut_off_area_counted`. The rebuild also raises it for nd-irr-000014 (a second pool
  inside the channel banks) and sb-irr-000003.

## H-002: the ends of the section act as frictionless vertical walls

- **Case:** nd-irr-000005. The 40-point section, n .06 / .035 / .08, discharge 30000 cfs, slope
  .002.
- **QUICK-2 printed:** WS ELEV `19.10`, Top Wid `390`, Wet Per `391`, Hyd R `10.8`, Area `4226`.
- **What happens:** the water surface is 7.1 ft above the left end (elevation 12) and 6.6 ft
  above the right end (12.5). QUICK-2 holds the water between the first and last stations as if
  each end rose as a vertical wall, and the walls add nothing to the wetted perimeter
  (criterion 3.12). It prints EXTENDED CROSS SECTION on row 24 and nothing else. The rebuild does
  the same and matches every field.
- **Exact answer, with the walls counted as wetted boundary:** Wet Per 404.9 ft and Hyd R 10.4 ft,
  at the same Area 4226. A real channel this full spills past the ends; the true answer needs a
  wider section, which QUICK-2 does not ask for.
- **Difference:** Wet Per 13.7 ft shorter in QUICK-2 (3.4%), Hyd R 0.36 ft larger (10.80 against 10.44,
  3.5%).
- **Flag:** `extended_section`.

## H-003: QUICK-2's π = 3.1416 in the circle's area

- **Case:** cc-circ-000031. Channel Capacity, Diameter 2200 in, n .013, Depth 5.13 ft, slope
  .005 (y/D 0.028).
- **QUICK-2 printed:** Discharge `3783.9`.
- **What happens:** QUICK-2 types π as 3.1416, 7.3e-6 above the true value, and computes the
  wetted area as the sector minus the triangle, r²·α − (r − y)·√(y·(D − y)), with
  α = π/2 − ATN(x/√(1 − x²)). The error of 3.7e-6 in α is multiplied by r², so it does not cancel
  against the triangle (results/attempts.md A-004, hypothesis C2; circle-outputs requirement
  2.2). The rebuild uses the same π and the same form and prints `3783.9`.
- **Exact answer, with the true π:** Discharge 3782.98.
- **Difference:** 0.92 cfs, 0.024%, higher in QUICK-2. The effect grows as the pipe gets larger
  and the flow shallower: the area error is about r²·3.7e-6 (0.031 sq ft at r = 91.7 ft), a
  larger share of a smaller area.

## H-004: circle Critical Depth prints a Depth 0.01 ft below the depth of its other fields

- **Case:** cd-circ-000019. Critical Depth, Diameter 2200 in, n .013, discharge 2000 cfs.
- **QUICK-2 printed:** Depth `4.89`, with Area `194.4`, Top Width `59.1`, Velocity `10.3`,
  Critical Slope `0.0017` and Max Discharge `%17133`.
- **What happens:** QUICK-2's search stops at 4.9014 ft, and Area, Wet Perimeter, Top Width,
  Hyd Radius, Velocity, Critical Slope and Max Discharge are computed at that depth. The printed
  Depth is 0.01 ft lower, 4.8914 (ledger Q-024 and Q-027: cd-circ-000019 to -000021 against
  cc-circ-000031 to -000033; A-004 measurement 2; circle-outputs requirements 2.10, 2.12). The
  rebuild does the same and keeps the search depth as `raw.search_depth`.
- **Exact answer, with the true π and no single-precision rounding:** critical depth 4.9030 ft.
- **Difference:** the printed Depth is 0.0116 ft below the exact critical depth (0.24%), and
  0.01 ft below the depth its own fields describe.
## H-005: the depth search stops anywhere within 1% of the discharge
- **Cases:** nd-trap-000001, Normal Depth, trapezoid, side slopes 3 and 2, Bottom Width 10,
  n .035, discharge 300 cfs, slope .005; and cd-vdit-000001, Critical Depth, V-ditch, side
  slopes 2 and 3, discharge 100 cfs.
- **QUICK-2 printed:** nd-trap-000001 Depth `3.27`, Area `59.6`, Velocity `5.0`. cd-vdit-000001
  Depth `2.50`, Area `15.6`, Velocity `6.3`, Critical Slope `0.0187`.
- **What happens:** on the V-ditch, rectangle and trapezoid the search steps up 0.5 ft,
  interpolates once it passes the discharge, and stops on the first trial whose discharge is
  within 1% of the entered one (solver design, The depth search; tasks 3.2 and 3.3; ledger
  Q-008). In nd-trap-000001 the interpolation lands at 3.2747 ft, where Manning's discharge is
  298.08 cfs, 0.64% short, and every field is computed there. In cd-vdit-000001 the 0.5 ft trial
  at 2.50 ft is already close enough: A·√(gA/T) there is 99.13 cfs, 0.87% short, so it stops
  without interpolating. The rebuild does the same and matches every field of all 53 prismatic
  Normal Depth and 56 prismatic Critical Depth results.
- **Exact answer, the root of QUICK-2's own equation:** nd-trap-000001 normal depth 3.2853 ft
  with QUICK-2's exponent .667 (3.2857 ft with 2/3), Area 59.8 sq ft. cd-vdit-000001 critical
  depth 2.5088 ft with g = 32.2, Area 15.73 sq ft, Velocity 6.36 ft/s.
- **Difference:** nd-trap-000001 Depth 0.011 ft shallower in QUICK-2 (0.32%), Area 0.28 sq ft
  smaller (0.47%). cd-vdit-000001 Depth 0.0088 ft shallower (0.35%), Area 0.11 sq ft smaller
  (0.70%). The stop allows up to 1% in discharge on every channel size; because discharge grows
  faster than depth, the depth error is smaller, about 0.3% to 0.4% in these two. The search
  approaches from below, so the printed depth is never above the root in these cases. The
  circle's search stops at 0.5% instead (H-004, ledger Q-025).
## H-006: Manning's 2/3 power typed as .667
- **Case:** cc-vdit-000012. Channel Capacity, V-ditch, side slopes 99 and 90.8, n .0173, Depth
  567.55 ft, slope 1.887.
- **QUICK-2 printed:** Velocity `5104.8`, Froude # `53.4`, Hyd Radius `283.8`, and the Discharge
  window `% 1560` (an overflow).
- **What happens:** on the V-ditch, rectangle and trapezoid QUICK-2 raises the hydraulic radius
  to .667, not 2/3, in the Channel Capacity discharge and velocity, the Normal Depth search and
  the critical slope (solver design, constants table, exponent A; task 3.4: Channel Capacity
  velocity misses 29 goldens with 2/3 and none with .667). Velocity here is
  1.486/n · R^.667 · √S with R = 283.76 ft. The rebuild does the same and prints `5104.8`; its
  discharge is 1.5605E+11 cfs. The circle and the irregular section use .6667 (exponent B),
  which is 3.3e-5 above 2/3.
- **Exact answer, with 2/3:** Velocity 5095.17 ft/s, Discharge 1.5575E+11 cfs, Froude 53.30.
- **Difference:** 9.6 ft/s, 0.19% higher in QUICK-2, and the discharge by the same share. The
  extra power is R^(1/3000): nothing at R = 1 ft, 0.023% at R = 2 ft, 0.077% at 10 ft, 0.19% at
  284 ft. Below R = 1 ft QUICK-2's value is slightly low instead. In a channel of ordinary size
  the difference stays well under the 1% of H-005.
## H-007: circle Critical Depth computes Max Discharge at the critical slope
- **Cases:** cd-circ-000001 and cd-circ-000002. Critical Depth, Diameter 36 in, n .013,
  discharge 40 cfs, slope .005 and .001.
- **QUICK-2 printed:** Max Discharge `53` at both slopes, with Critical Slope `0.0054`. Channel
  Capacity and Normal Depth on the same pipe at slope .005 print Max Discharge `51`
  (cc-circ-000001, nd-circ-000001).
- **What happens:** Max Discharge is Manning's discharge at .9382·D, the peak of the part-full
  curve (circle-outputs requirement 2.3). Critical Depth puts its own critical slope,
  0.0054245, into that formula in place of the entered slope (criteria 5.6, 5.7; ledger Q-009).
  The entered slope is echoed and used for nothing else. The rebuild does the same: 52.843 cfs,
  printed `53`.
- **Exact answer, the pipe's capacity at the slope it is laid on:** 50.73 cfs at .005 (prints
  `51`) and 22.69 cfs at .001 (would print `23`).
- **Difference:** at slope .005, 2.11 cfs (4.2%) higher in QUICK-2; at .001, 30.2 cfs, 2.3 times
  the pipe's capacity. The ratio is √(critical slope / entered slope), so the figure is the
  capacity of the same pipe laid at its critical slope, whatever slope was typed.
## H-008: negative inputs are computed as typed
- **Case:** cc-trap-000015. Channel Capacity, trapezoid, side slopes 1.6 and 84.2, Bottom Width
  -1, n -1, Depth 700.82 ft, slope 4.9621.
- **QUICK-2 printed:** Discharge window `%-3465`, Velocity `-164.5`, Froude # `-1.5`, Flow Type
  `SUBCRITICAL`, Area `%21069`, Wet Perimeter `%60334`, Hyd Radius `349.2`.
- **What happens:** QUICK-2 accepts -1 at every regular prompt (criterion 2.1) and puts the value
  into its formulas unchanged (solver design, Negative values and abandoned calculations). With
  n = -1 the discharge is −3.4654E+09 cfs, the velocity −164.47 ft/s and the Froude number
  −1.55, which is below 1, so the Flow Type reads SUBCRITICAL. The rebuild does the same,
  matches every field and raises `negative_input`.
- **Exact answer:** none. A negative roughness or bottom width has no physical meaning, and a
  correct program would refuse it. Read with n = +1 and the same section, the discharge would be
  +3.4654E+09 cfs and the Froude number +1.55, SUPERCRITICAL.
- **Difference:** Discharge, Velocity and Froude # have the wrong sign, and the Flow Type is
  SUBCRITICAL where the magnitude of the Froude number, 1.55, is supercritical. Normal Depth
  shows the other outcomes of negative inputs: a negative side slope or width gives a result
  (nd-trap-000003 to -000005), n = -1 never finishes (ledger Q-002), and discharge or slope -1
  returns to the shape menu (ledger Q-003). Those two print no value, so they are not hauntings.
- **Flag:** `negative_input`.
## H-009: circle Critical Depth refuses a pipe that could carry the flow
- **Cases:** cd-circ-000043, Critical Depth, Diameter 8 in, n .013, discharge 1 cfs, slope .005;
  cd-circ-000049, 15 in, 7 cfs; cd-circ-000050, 18 in, 12 cfs. All three are n .013 and slope
  .005; the slope does not change a Critical Depth outcome (H-007).
- **QUICK-2 printed:** "DEPTH is Greater than the DIAMETER" on the form, and no result, for all
  three.
- **What happens:** the search steps 0.2 ft from 0.2 ft. When the next trial, the one after the
  last trial inside the pipe or the one 0.2 ft above a short chord, is at or past the diameter,
  QUICK-2 prints the message and stops (circle-short-chord 2.1, 2.4; results/attempts.md A-009,
  A-010, A-012). It does so although the pipe's critical depth lies inside it, a few inches
  below the crown. The rebuild does the same: outcome `rejected` with the message.
- **Exact answer, with the true π, double precision, nothing stored and g = 32.2 (bisection on
  A·√(g·A/T) = q; `node scripts/circle_outputs.mts design`):**

  | Case | Pipe and discharge | Exact critical depth | Share of D | Below the crown |
  |---|---|---|---|---|
  | cd-circ-000043 | 8 in, 1 cfs | 0.4744 ft | 0.712 | 0.1922 ft (2.31 in) |
  | cd-circ-000049 | 15 in, 7 cfs | 1.0600 ft | 0.848 | 0.1900 ft (2.28 in) |
  | cd-circ-000050 | 18 in, 12 cfs | 1.3141 ft | 0.876 | 0.1859 ft (2.23 in) |

- **Difference:** a refusal where an answer exists. The exact critical depth is about 2.2 to
  2.3 in below the crown in each, and QUICK-2 gives no depth at all.
- **The boundary is not one discharge per pipe.** In the same 8 in pipe QUICK-2 refuses 1.6 cfs
  (cd-circ-000064) and answers 1.71 cfs (cd-circ-000065). The exact critical depths are
  0.5867 ft (0.880·D, 0.96 in below the crown) and 0.6002 ft (0.900·D, 0.80 in below); 1.71 cfs
  prints Depth `0.59` because A·√(g·A/T) at the stepped trial 0.6 ft is within 0.5% of 1.71
  cfs, and Depth prints 0.01 ft below the search depth (H-004).

# Limits

The hauntings above compare QUICK-2 with exact hydraulics. This section lists where Quickened
gives no answer because QUICK-2 gave none, and the rule behind it is described but not
explained. The app's limits page shows the paragraph after **Limits page:** of each entry; the
quickened-app spec reads it from here and does not copy it.

### Circle Critical Depth, a discharge under the full-pipe number at a trial on D

- **Cases:** obs-cdmenu-000001, -000002, -000005 to -000012 (behaviour cases; ledger decisions 98, 102, 104, 106).
- **QUICK-2:** went back to its shape menu with no message and no answer, in every run.
- **Quickened:** returns no result and says "QUICK-2 returns to its shape menu with no result for this input."
- **Why it is described, not explained:** circle-short-chord 2.6 (c); results/attempts.md A-017 graded and A-018 graded; the question that carries Q-029.
- **Limits page:** For Critical Depth in a circular pipe of 4.8, 9.6, 12, 50.4, 52.8, 55.2 or 57.6 in, QUICK-2's search can reach a depth equal to the diameter. There, when the discharge is more than 0.5% below what the full pipe carries at critical flow, QUICK-2 went back to its shape menu without a message or an answer. It did this ten times in the 9.6, 12 and 4.8 in pipes, and three of the ten were predicted before they were run. Quickened gives no answer there either, and says that QUICK-2 returns to its shape menu. Why QUICK-2 does this is not known.
