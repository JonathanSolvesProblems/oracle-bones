# Design Document

## Overview

The solver rebuilds QUICK-2's calculations in TypeScript, in `app/src/solver/`, with its print
and rounding rules in `app/src/format/`. The app and the oracle comparator call the same
`solve()` function, so what is graded is what ships. The solver has no runtime dependencies.

Every numerical choice below comes from the stored goldens and captures, not from a textbook.
Before this design was written, each method was fitted against the 271 stored goldens with
throwaway scripts (kept out of the repository). The match counts quoted here come from those
scripts, which used double precision. Each task re-proves its counts with the comparator, and
the comparator's counts are the ones that count.

What the goldens show, in short:

- QUICK-2 finds every depth with the same simple search. It steps the depth up in fixed steps
  until the discharge passes the target, interpolates linearly, and stops as soon as a trial
  discharge is within 1% of the target. That is why its normal and critical depths usually land
  a little below the exact answer, and sometimes exactly on a step such as 206.00 or 32.50.
- Manning's 2/3 power appears as `.667` in some formulas and `.6667` in others, and the
  difference shows in the printed digits.
- The circle uses π = 3.1416. Its Max Discharge is the peak of the part-full Manning curve, not
  the full-pipe flow, and Critical Depth computes it at the critical slope instead of the
  entered slope.
- An irregular section computes overbank conveyance one ground segment at a time, and the
  channel as a whole, the way HEC-2 does.

## The contract

`app/src/oracle/entry.ts` is the node entry. It reads one JSON request per line from stdin,
`{"id", "mode", "shape", "inputs"}`, calls `solve({mode, shape, inputs})`, and writes
`{"id", "outcome", "printed", "message"}` per line to stdout (oracle-harness Requirement 12).
The id is held by the entry and never passed to the solver. The entry answers every request,
including pairs not built yet, which get outcome `error` and message `not built`, so the
comparator never sees a broken contract while the build is partial.

`oracle/harness.json` sets `rebuild.command` to `["node", "app/src/oracle/entry.ts"]`. Node 24
(v24.14.0 on the development laptop) runs `.ts` files directly by stripping types, so there is
no build step. The on-save and after-task hooks therefore grade the source as saved, not a
stale build. The cost is a TypeScript subset: erasable syntax only (no enums, namespaces or
parameter properties), and imports written with their `.ts` extension. `tsconfig.json` enforces
this with `erasableSyntaxOnly`, `allowImportingTsExtensions` and `noEmit`. Vite, which the app
adds later, reads the same files.

Inputs stay strings, as typed. `inputs` uses the goldens' keys (`left_slope`, `n`,
`discharge`, `sta_01`, `elev_01`, `bank_left`, `sb_start` and so on).

## Components

```
app/src/solver/
  index.ts            solve(job): dispatch on mode and shape
  constants.ts        every numeric program constant, each with the cases that pin it
  single.ts           single-precision helpers (Math.fround)
  parse.ts            QuickBASIC VAL on typed text, and the hold rules for each prompt
  groundPoints.ts     the ground-points editor rules and bank-station matching
  forms.ts            prompt order and fixed fields for each mode and shape
  search.ts           the shared depth search
  geometry/prismatic.ts   trapezoid, V-ditch, rectangle
  geometry/circle.ts
  geometry/irregular.ts   wet area, perimeter, top width, subsections, conveyance, alpha
  modes/normalDepth.ts, criticalDepth.ts, capacity.ts, stepBackwater.ts
  flags.ts            odd-behaviour flags and their plain-words text
app/src/format/
  printUsing.ts       QuickBASIC PRINT USING: fixed formats, rounding, % overflow
  layout.ts           each result screen's fields: window, format, format start column
  screen.ts           paints a result row and cuts each field's window from it
app/src/oracle/entry.ts   the JSONL entry
app/test/            Vitest and fast-check tests
```

Only `entry.ts` and the tests touch the file system or stdin. The solver and format modules are
pure functions.

## Data model

```ts
type Mode = 'normal_depth' | 'critical_depth' | 'channel_capacity' | 'step_backwater';
type Shape = 'trapezoid' | 'v_ditch' | 'rectangle' | 'circle' | 'irregular';
interface Job { mode: Mode; shape: Shape; inputs: Record<string, string>; }
interface Result {
  outcome: 'result' | 'rejected' | 'error';
  printed: Record<string, string>;   // field name -> the field's window text, as on screen
  message: string | null;            // the program's own text, when it shows one
  held: string | null;               // the prompt QUICK-2 holds, for outcome rejected
  flags: Flag[];                     // odd behaviours, for the app to label
  raw: Record<string, number>;       // unrounded values, for the app and for hauntings
}
interface Flag { code: FlagCode; text: string; fields: string[]; }
```

`printed` holds each field's window text untrimmed, so the app can show the screen's own
string. The comparator trims. `held`, `flags` and `raw` are not part of the JSONL contract; the
entry drops them. Tests check `held` and `flags` against the goldens and captures, because the
comparator does not.

## Numbers

### Single precision

QUICK-2 was compiled with QuickBASIC 4.5, which keeps intermediate results in the 8087's wider
format and rounds to single precision when it stores a variable. The solver does the same: it
computes each expression in double precision and applies `Math.fround` when it stores a named
quantity (depth, area, perimeter, top width, hydraulic radius, discharge, velocity, and each
trial in the search). Three goldens need this: values on an exact rounding boundary that only
single-precision storage explains. In cd-trap-000013 the top width is 2127.65 in double
precision but prints `2127.6`; in cd-vdit-000007 1561.95 prints `1561.9`; in cd-rect-000009
7499.95 prints `7500.0`. Exactly which values QUICK-2 stores is not known. One CC golden,
cc-vdit-000002 (velocity `198.2`, 198.2500 computed), sits on a boundary that the choice of
storage points decides; task 3.4 settles it.

### Constants

`constants.ts` is the only file in `app/src/solver/` or `app/src/format/` that may hold a numeric
literal other than 0, 1, 2 and -1. Each constant carries the cases that pin it.

| Constant | Value | Used in | Evidence |
|---|---|---|---|
| Manning constant | 1.486 | every Manning formula | CC fields: 0 mismatches with 1.486, 62 with 1.49 |
| g | 32.2 | Froude, critical flow | 32.174 drops Critical Depth from 54 to 22 of 68 matched |
| π | 3.1416 | circle angle | with 3.14159265 two CC circle discharges miss (cc-circ-000020, cc-circ-000023); with 3.1416 none do |
| exponent A | .667 | regular-shape search discharge, CC velocity, critical slope | ND 47 of 53 matched (16 with .6667); CC velocity 29 misses with 2/3, 0 with .667; critical slope 53 of 56 |
| exponent B | .6667 | CC discharge, Max Discharge, irregular conveyance | CC fields: 0 mismatches with .6667, 5 with 2/3; irregular ND 24 of 24 (10 with .667) |
| search tolerance | 0.01 | every search | 0.0099 and 0.0101 give the same matches; the exact value is not pinned |
| regular search step | 0.5 ft from depth 0 | prismatic shapes | the depths that land on 206.00, 73.00, 42.00, 32.50, 24.50, 19.50 |
| irregular search start | lowest point + 0.1 ft, then 0.5 ft steps | irregular sections | nd-irr-000015, nd-irr-000021, nd-irr-000023 stop on depths 58.6, 40.6, 47.1 |
| Max Discharge depth | .938 × diameter | circle | 17 of 18 CC and ND circles (nd-circ-000007 is 1 cfs low) |

Two exponents in one program are odd but the goldens are clear about it. The constants table is
a finding to keep re-testing, not a fit to protect: if a later golden breaks a constant, the
mismatch goes through the Skeptic like any other.

## Parsing and holds

`parse.ts` turns typed text into a value with QuickBASIC's `VAL` rules (optional sign, digits,
one decimal point, a leading `.` allowed, stop at the first character that does not fit) and
stores the result in single precision. Only plain decimals have been typed so far. Exponents,
spaces, empty Enter and non-numeric text are unobserved (ledger Q-004, Q-019); the parser
follows `VAL` for them and the ledger keeps them unobserved.

Hold rules, applied in the form's prompt order, so the first offending prompt is the one held:

- A value of 0 holds its prompt, at every prompt of every regular form (criteria 1.1, 8.6; 46
  of 47 rejected regular-shape goldens, including `.000` read as 0).
- A Diameter of -1 holds the Diameter prompt (cc-circ-000012). Elsewhere -1 is accepted
  (criterion 2.1).
- A Channel Capacity circle Depth greater than the diameter holds the Depth prompt (criterion
  8.5). A depth equal to the diameter is unobserved.
- Small non-zero values are accepted and echo as `0.0` or `0.0000` (criterion 8.4).

A held prompt gives outcome `rejected`, empty `printed`, message null, and `held` set to the
prompt's name, which is how the goldens record it.

`groundPoints.ts` applies the editor's rules: stations must strictly increase, with the error
text of criteria 10.3 and 10.4; a negative first station is accepted (10.5); an elevation of 0
is shown but not taken (10.6); a negative elevation sends entry back to the same point's station
(10.7); entry ends after the 40th point (3.2) or on F10 after the second (10.1). A bank station
matches a ground point when its value equals a ground station's value as entered, not as printed
(criteria 3.4, 3.5, 9.6); a bank that matches none gives outcome `rejected` with the program's
ERROR line as the message. Whether `150.0` matches a ground station typed as `150` is
unobserved; the solver compares values, which agrees with every case recorded.

## The depth search

One search, in `search.ts`, serves Normal Depth and Critical Depth on every shape and the
irregular section. Given an increasing function F(y) (a discharge for Normal Depth, the
critical-flow discharge A·√(gA/T) for Critical Depth) and a target q:

1. Start at the shape's first trial depth and step up by the shape's step. At each trial, stop
   if |F(y) − q| ≤ 0.01·q.
2. When F passes q, take the last trial below q (or the bottom, where F is 0) and the first
   above as a bracket, and interpolate linearly.
3. Check the interpolated depth the same way. If it is still short, stepping resumes from it:
   the next trial is one step above it, and the next bracket runs from it to the first trial
   past q (task 3.2, results/attempts.md A-001). An interpolation that is over q would become
   the new upper end; on a convex F that does not happen, so it is unobserved.

This explains the two things the Exhumer flagged (ledger Q-008). F is convex in depth, so a
chord from below undershoots, and the 1% stop accepts the first trial that is close enough:
Critical Depth on the V-ditch of criterion 5.2 prints `2.50` where the exact critical depth is
2.509, and Normal Depth on the control trapezoid prints `3.27` where the exact Manning depth is
3.286. It also explains why the printed area does not match the printed depth (criterion 6.5
against nd-trap-000001: area `59.6` at depth `3.27`, while depth 3.27 gives `59.4`): the area is
computed at the search's own depth, about 3.275, and only the print rounds it.

The search never ends in QUICK-2 when F can never reach q: with Manning's n of -1 every trial
discharge is negative (criterion 2.8, obs-negnstall-000001), and a section of one ground point
has no wet area (nd-irr-000026, recorded as outcome `error` on the Working screen). The rebuild
cannot hang, so it stops when the trial depth passes 100,000 ft or F cannot grow, and returns
outcome `error` with the `never_finishes` flag. That limit is the rebuild's choice and is not
observed.

Search start and step by shape:

| Shape | First trial, step | Evidence |
|---|---|---|
| Trapezoid, V-ditch, rectangle | 0.5 ft, 0.5 ft | ND 47 of 53, CD 51 of 56 |
| Irregular | lowest ground point + 0.1 ft, 0.5 ft; the bottom of the first bracket is the lowest point | ND 24 of 24, Step-Backwater 3 of 3 |
| Circle | not yet identified | best tried: 0.1 ft steps, ND 6 of 8; CD 3 of 12 |

The second interpolation step (settled in task 3.2). The 6 Normal Depth misses of the first
fit (nd-rect-000002, -000004, -000007, -000026, nd-trap-000009, -000014) are the shallow cases
whose first interpolation falls short of the 1% stop. Each lands 0.0001 to 0.0009 ft below where
plain repeated interpolation lands. Secant, regula falsi, bisection, a log-scale chord and finer
re-stepping all land too high. Resuming the 0.5 ft steps from the short interpolation (rule 3)
fits all six, and also fits the four prismatic Critical Depth results that need a second step
(cd-trap-000007, -000008, -000018, cd-rect-000020), which played no part in choosing it.

## Methods by mode and shape

### Prismatic geometry

For side slopes z1 and z2 (H:V), bottom width b and depth y: A = b·y + (z1 + z2)·y²/2,
P = b + y·(√(1+z1²) + √(1+z2²)), T = b + (z1 + z2)·y, R = A/P. The V-ditch is b = 0 and the
rectangle z1 = z2 = 0 (criteria 4.1, 4.2). Negative inputs go into the same formulas unchanged,
which reproduces criteria 2.5 to 2.7.

### Circle geometry

D (ft) = Diameter (in) / 12. With x = (D/2 − y)/(D/2), the angle is
θ = 2·(π/2 − ATN(x/√(1 − x²))) with π = 3.1416, written the way QuickBASIC computes an arc
cosine. A = (D/2)²·(θ − sin θ)/2, P = (D/2)·θ, T = 2·√(y·(D − y)). With these, every CC circle
field matches (10 goldens).

### Channel Capacity

At the entered depth: Q = 1.486/n · A · R^.6667 · √S. Velocity on the prismatic shapes is
1.486/n · R^.667 · √S, which is not Q/A; on the circle it is Q/A. Froude = V/√(g·A/T). Flow
Type is SUBCRITICAL when Froude < 1 and SUPERCRITICAL when it is above. With these, the 49 CC
results give 353 computed fields and no mismatch in double precision. Criteria 6.1 to 6.7.

### Normal Depth, prismatic shapes

The search runs on Q(y) = 1.486/n · A · R^.667 · √S with step 0.5 ft. At the search's depth,
Velocity = q/A (the entered discharge, not Manning's velocity) and Froude = (q/A)/√(g·A/T).
With the second step of rule 3, all 53 results match on every field (task 3.2). Criteria
7.1, 7.2, 2.5 to 2.7, and the controls nd-trap-000001 (3.27) and nd-trap-000002 (4.22).

### Critical Depth, prismatic shapes

The search runs on Qc(y) = A·√(g·A/T) with g = 32.2 and step 0.5 ft. At the search's depth,
Velocity = √(g·A/T), Froude prints `1.0`, Flow Type is CRITICAL, and Critical Slope =
((q/A) · n / (1.486 · R^.667))². The entered slope is echoed and used for nothing else. 51 of
56 results match on every field (3 misses are the single-precision boundaries above, 2 the
second step); Critical Slope matches in 53 of 56. Criteria 5.1 to 5.5.

### Circle: Normal Depth, Critical Depth, Max Discharge

Max Discharge = 1.486/n · A · R^.6667 · √S at y = .938·D: the peak of the part-full Manning
curve, about 7.6% above the full-pipe flow. Channel Capacity and Normal Depth use the entered
slope; Critical Depth uses the critical slope it computed (criteria 5.6, 5.7: `53` at slope .005
and at .001, where the entered slope gives `51`; ledger Q-009). Whether QUICK-2 scans for the
peak or uses .938 is open; nd-circ-000007 (`271099` printed, 271098.2 computed) is the case that
would tell.

The circle search's start and step are open. nd-circ-000007 stops on 49.00 ft, which rules out
a fine fixed step from 0, while small pipes need a step under 0.5 ft. When the search passes the
diameter without bracketing, QUICK-2 prints "DEPTH is Greater than the DIAMETER" on the form
(ledger Q-022); the rebuild returns outcome `rejected` with that message until the profile maps
the screen. Criteria 4.5, 5.6, 5.7, 6.6, 6.7, 7.3.

### Normal Depth, irregular section

Water is confined between the first and last ground points as if each end rose as a vertical
wall, and the walls add no perimeter (criterion 3.12). Every part of the section below the water
surface is wet, connected to the channel or not (criterion 9.7). Ground between points is
straight.

The section splits at the bank stations into left overbank, channel and right overbank. Each
overbank's conveyance is the sum of the conveyances of its ground segments, each computed from
that segment's own area and perimeter; the channel's conveyance is computed from its whole area
and perimeter. K = 1.486/n · A · R^.6667. Evidence: computing whole overbanks instead puts the
recorded WS ELEV's discharge 7% short for nd-irr-000010 and 4% short for nd-irr-000018, outside
the 1% stop; per segment, all 24 are within it.

The search runs on the water-surface elevation with Q = ΣK · √S, from the lowest ground point
plus 0.1 ft in 0.5 ft steps. At its elevation: Depth = WS − lowest elevation; Area, Top Wid and
Wet Per are totals over every wet part; Hyd R = A/P; Chan Vel = q · Kch/K / Ach; Froude =
√α · (q/A)/√(g·A/T), with α = (A²/K³) · Σ Ki³/Ai² over the three subsections. All 24 irregular
Normal Depth results match on every field, Grapevine Branch included (nd-irr-000006 to
nd-irr-000008, nd-irr-000010). Criteria 3.6 to 3.13, 9.2 to 9.5, 9.7, 10.2.

### Step-Backwater, first section

The start value is a slope when below 1 (`.002`, `.0035`) and a water-surface elevation when
above (`596`). The value 1 itself is open (ledger Q-018). With a slope, the WS ELEV is the
irregular Normal Depth search with that slope (criteria 11.3, 11.4); with an elevation, it is
the value. At that elevation: EG ELEV = WS + α·V²/(2g) with V = q/A; Depth, ChanVel and Froud#
as in Normal Depth; Kratio `1.00` and Flow Regime `M-1`. The reach-length and loss-coefficient
fields are blank (criterion 11.2). All 3 goldens match. How QUICK-2 chooses Kratio and the flow
regime is not known beyond these three cases: all three are a first section with Froude below 1.
Criteria 11.2 to 11.6.

### Negative values and abandoned calculations

A negative value is used as typed, which is why Channel Capacity prints a negative discharge
for n = -1 (cc-trap-000015). Normal Depth with Discharge -1 or Slope -1 returns to the shape
menu with no message (criteria 2.9, 2.10). The search explains it: Slope -1 needs the square root
of a negative number, and Discharge -1 makes the first interpolation give a negative depth,
whose hydraulic radius is then raised to a fractional power. Both are QuickBASIC "Illegal
function call" errors, which QUICK-2 appears to trap by returning to the menu. The rebuild
returns outcome `error` with the `returns_to_menu` flag. This mechanism is an inference, and
what outcome the recorder would give such a case is open, because only behaviour cases exist
for it.

## Printing

`printUsing.ts` reproduces QuickBASIC's PRINT USING for the formats QUICK-2 uses:

- Fixed formats such as `####.#` and `#.####` right-align the number and round half away from
  zero on the stored single-precision value.
- A number too wide for its format prints as `%` followed by the number with the format's
  decimals, starting at the format's first column (criterion 8.1: `%100.0`, `%99999.0`,
  `%12.5000`, `%1000.00`, `%1234567`; cc-circ-000021 `%37113.9`).
- When the overflow would need more than nine digit positions, QuickBASIC switches to an
  exponent, with the mantissa laid out in the format's own positions: `% 1.2E+08` for
  123456789 in `##.#` (obs-fieldover-000001), `%-34654E+05` for about -3.4654E+09 in `######`
  (cc-trap-000015), while 793879552 in `######` prints in full (cc-rect-000002). The nine-digit
  threshold fits these three cases and nothing more yet.

`screen.ts` paints each result row the way the program does: the label text first, then each
value at its format's start column, overwriting whatever is there. An overflowing value runs
over the next label (`%793879552epth (ft)` in cc-rect-000002) and over the box border. The
field's text is then cut from its window, the row, column and width the profile gives, which is
why `%-1.0000` shows as `%-1.00` in the Manning's n window. The order in which values are painted
matters only when one value's overflow reaches another field's window; no golden shows that, so
the order (inputs in prompt order, then outputs row by row) is an assumption.

`layout.ts` holds, for every result screen, each field's window (copied from
`oracle/targets/quick2.json`, and a test fails if the two differ), its decimals, and its format
start column. The start column is known where a golden shows an overflow; elsewhere it is set
so that the field's largest accepted value fits, and labelled unobserved.

| Fields (regular-shape screens) | Format | Start column known from |
|---|---|---|
| L and R Side Slope | `##.#` | `%100` in cc-trap-000018 |
| Bottom Width, Diameter | `####.#` | `%99999` in cd-trap goldens |
| Manning's n | `#.####` | `%-1.00` in cc-trap-000015 |
| Slope (entered) | `#.####` | `%12.50` in cc-rect-000010 |
| Critical Slope | `#.####` | `%37.50` in cd-rect-000015 |
| Discharge entered, Max Discharge, CC discharge (prismatic) | `######` | `%79387` in cc-rect-000002 |
| CC discharge (circle) | `####.#` | `%37113` in cc-circ-000021 |
| Depth, Depth entered | `###.##` | criterion 8.1 (`%1000.00`); start column unobserved |
| Area, Top Width | `####.#` | `%43549`, `%15002` |
| Wet Perimeter | `####.#` | `%15005` |
| Velocity, Hyd Radius, Froude # | `####.#` | none seen; start column unobserved |

Irregular and Step-Backwater screens: WS ELEV and EG ELEV 2 decimals; Depth 1 decimal (Normal
Depth) or 2 (Step-Backwater); Area, Top Wid and Wet Per none; Hyd R 1; Chan Vel 1 or 2; Froude
and Kratio 2; banks 1; n values and slope 4; discharge none (criteria 3.6, 9.2, 11.6). No
overflow has been seen on these screens.

Fixed fields print without being asked for: Bottom Width `0.0` on the V-ditch and side slopes
`0.0` on the rectangle (criteria 4.1, 4.2).

## Odd behaviours and their flags

Each flag carries a code, the fields it concerns, and one or two plain sentences for the app.
The app decides how to show them; the solver never changes a printed value because of a flag.

| Code | Text for the app | Raised when | Criteria, evidence |
|---|---|---|---|
| `extended_section` | The water surface is above an end of the cross section. QUICK-2 treats each end as a vertical wall and prints EXTENDED CROSS SECTION. | WS above the first or the last ground elevation | 3.12, 3.13, 10.2; agrees with row 24 of the captures for all 27 irregular results |
| `cut_off_area_counted` | Low ground cut off from the channel by higher ground is counted as carrying water, as QUICK-2 does. You may judge it ineffective flow area. | the wet part of the section at WS is more than one span | 9.7; nd-irr-000010, sb-irr-000003 |
| `negative_input` | QUICK-2 accepted a negative value for this field and computed with it. A negative value has no physical meaning here. | an accepted side slope, width, diameter, n, discharge, depth or slope is below 0 (not stations or elevations) | 2.1, 2.5 to 2.7; nd-trap-000003 to 000005, cc-trap-000015 |
| `never_finishes` | QUICK-2 never finishes this calculation; it keeps searching. Quickened stops and shows no answer. | the search cannot reach the discharge | 2.8; nd-irr-000026 |
| `returns_to_menu` | QUICK-2 abandons this calculation and goes back to the shape menu without a message. | a square root or fractional power of a negative number | 2.9, 2.10 |

The search's 1% stop, the `.667` velocity, Critical Depth's Max Discharge at the critical slope,
the cut-off low ground, the frictionless end walls and the use of negative values disagree with
exact hydraulics. Each task that reproduces one of them records a haunting in
`results/hauntings.md` (oracle law, rule 5): the case, the printed value, the exact value and the
difference. Examples to record: nd-trap-000001 depth `3.27` against 3.286; cd-vdit-000001 depth
`2.50` against 2.509; cc-vdit-000012 velocity `5104.8` against Q/A = 5095.2; cd-circ-000001 Max
Discharge `53` against 51 at the entered slope; nd-irr-000010 Top Wid `219` against about 151
for the channel-connected water; nd-irr-000005 Wet Per `391` against about 404 with the walls
counted; cc-trap-000015, a negative discharge from n = -1. Showing exact values beside printed
ones is the app's job (quickened-app Requirement 2.2); `raw` gives it the numbers.

## When the rebuild and the oracle disagree

The dead program is right. A mismatch that survives an honest attempt is classified, never
patched around.

An honest attempt means: the mismatch is reproduced in a unit test; up to five hypotheses from
inside this design's model (a constant, a storage point, a search detail, a format rule) are
tried; each is scored on the quick set; a hypothesis that fixes the mismatch but breaks a case
that matched is rejected; and every hypothesis and its score goes in `docs/build-log.md`.

After that, the task stops and states a claim and a classification for the remaining mismatch:
spec error, display rule, or a QUICK-2 quirk kept as is. Spec tasks cannot start workflows, so
the person running the task launches the Skeptic (`agent://skeptic`) with the claim. The Skeptic
runs up to five new cases against the oracle and returns holds, fails or unproven, and the
Exhumer records the verdict in the ledger. Then:

- spec error: a bugfix spec named after the behaviour, such as `nd-shallow-second-step`;
- display rule: the rule goes into `app/src/format/` and the ledger;
- haunting: an entry in `results/hauntings.md`, and the rebuild keeps the printed behaviour.

Rules that tests enforce:

1. `solve()` never sees a case id. Its only argument is `{mode, shape, inputs}`, and the entry
   strips the id. A fast-check property renames every id in a batch of golden requests to random
   text and shuffles the order; the printed output for each input must not change (Property 7).
2. No case id and no golden path appear in the solver or format source. A test scans
   `app/src/solver/` and `app/src/format/` for the case-id pattern
   (`(nd|cd|cc|sb|obs)-[a-z]+-\d{6}`) and for any reference to `goldens`, and fails on a hit.
3. No printed value is typed into the source. Numeric literals other than 0, 1, 2 and -1 may only
   appear in `constants.ts`, and each constant there must carry a citation. A test parses the
   source for numeric and string literals and fails on a literal outside `constants.ts`, on a
   constant without a citation, and on any literal in either folder that equals a printed golden
   value of three or more characters containing a digit.
4. Constants fitted on one set must hold on another. Each task ends with one full-set run for its
   mode and shape pairs. Goldens outside the quick set were never used to fit anything here, so a
   constant tuned to the quick set shows up as full-set mismatches.

## Correctness Properties

Property tests use fast-check and are added only where the goldens show that the property holds
for any input. Generators draw from the profile's practical ranges.

### Property 1: The search stops within 1%

For any prismatic or irregular input that gives a Normal Depth or Critical Depth result, the
search's own discharge function at the returned depth is within 1% of the entered discharge.
All 109 prismatic Normal Depth and Critical Depth results and all 24 irregular ones fit this,
including those that print far from the exact answer (nd-rect-000019: `206.00` against 207.70).
**Validates: Requirements 5.1, 7.1, 7.2, 3.7**

### Property 2: The first zero is held

For any regular-form inputs where some value reads as 0, the outcome is `rejected` and `held`
is the first such prompt in prompt order. 46 of 47 rejected regular-shape goldens show it; the
other holds a Diameter of -1.
**Validates: Requirements 1.1, 8.6**

### Property 3: Echoes fit or overflow

For any accepted typed value, the echo has the field's decimals and no `%` when the rounded
value fits the format, and starts with `%` when it does not.
**Validates: Requirements 2.2, 2.3, 2.4, 8.1, 8.2, 8.3, 8.4**

### Property 4: Water above both ends spans the section

For any irregular section and discharge where the WS is above both end elevations, Top Wid is
the last station minus the first, and the walls add nothing to Wet Per.
**Validates: Requirements 3.12**

### Property 5: Step-Backwater starts where Normal Depth stops

For any irregular section, discharge and slope below 1, Step-Backwater's WS ELEV equals Normal
Depth's.
**Validates: Requirements 11.3, 11.4**

### Property 6: Critical Depth on a circle ignores the slope

For any circle Critical Depth input, changing the slope changes only the Slope echo.
Only the circle has been observed (cd-circ-000001, cd-circ-000002), so the property is limited to
it.
**Validates: Requirements 5.7**

### Property 7: Same code, same answer, no ids

For any batch of golden requests with ids renamed and order shuffled, the entry's response for
each input equals `solve()` called directly on that input.
**Validates: oracle-harness Requirement 12.1; quickened-app Property 1**

## Testing Strategy

- The comparator grades outcome and printed text. It runs on save and after each task through
  the existing hooks (`scripts/oracle_quick.py`). A task is done when the quick set has no
  mismatch for the mode and shape pairs it covers, and every remaining mismatch belongs to a
  pair a later task covers or has a recorded classification. The comparison writes
  `oracle/out/mismatches.json`; the task reads it filtered to its pairs.
- Vitest checks what the comparator does not grade: `held` against each rejected golden's
  `held_prompt`; `message` against each golden's message; flags against row 24 of the captures;
  each form's prompt order against the order of keys in the golden transcripts; the ground-point
  editor rules against the captures of the behaviour cases (obs-irrelev-000001,
  obs-irrstation-000001, obs-irrtwopt-000001, obs-bankreject-000001, obs-bankreject-000002);
  `layout.ts` windows against the profile.
- Vitest does not re-grade printed fields. One grader avoids two that disagree.
- Unit tests cover `printUsing` and `parse` with the values in criteria 2.2 to 2.4 and 8.1 to
  8.4.
- The guard tests of the previous section run with the rest.
- Tests read goldens and captures read-only. The solver and format source never do.

## Criteria left to the quickened-app spec

These describe the screen rather than a value. The solver supplies their data (prompt order,
typed text, held prompt) and the app draws them: 3.1 (four station and elevation pairs per row),
4.6 (Print and New Shape key lines), 9.1 (the grid shows values as typed), 10.1 (F10 ends entry),
11.1 (the Step-Backwater start screen and editor title), and the screen-unchanged part of 1.1 and
1.2. Every other criterion is closed by a task in `tasks.md`.

## Unverified assumptions and open points

- The search after an interpolation that is over q (never reached on a convex F).
- The circle search's start and step. Task 3.5.
- Max Discharge: a scan for the peak, or .938·D (nd-circ-000007). Task 3.5.
- Which quantities QuickBASIC stores in single precision. Settled case by case in each task.
- The nine-digit threshold for exponent overflow, and the paint order of overflowing values.
- Step-Backwater start value 1 (Q-018), Kratio and Flow Regime beyond a subcritical first
  section.
- The outcome a "returns to the shape menu" case would be recorded with.
- Whether a bank typed as `150.0` matches a station typed as `150`.
- Froude exactly 1 in Normal Depth and Channel Capacity: SUBCRITICAL, SUPERCRITICAL or CRITICAL.
- The 100,000 ft search limit, which is the rebuild's own and not observed.
