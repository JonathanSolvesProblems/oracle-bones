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
7499.95 prints `7500.0`. Task 3.3 settled these three: with the second step of the search
(rule 3) and the typed inputs and trial depths held in single precision, none of them sits on
a boundary any more (cd-trap-000013 Top Width 2127.64996, cd-vdit-000007 1561.94997; cd-rect-000009
prints `7496.7` from 7496.70020), and they print the same whether or not Top Width is stored.
The one Critical Depth field a store decides is the Area of cd-vdit-000002: 15808.9498 unstored,
15809.0 stored, printed `%15809`. Storing Wet Perimeter, Top Width or Hyd Radius changes no
Critical Depth golden, so those stores are kept but not pinned. One CC golden,
cc-vdit-000002 (velocity `198.2`, 198.2500 computed), sits on a boundary that the choice of
storage points decides. Task 3.4 settled it: √S held in single precision (Channel Capacity
below).

### Constants

`constants.ts` is the only file in `app/src/solver/` or `app/src/format/` that may hold a numeric
literal other than 0, 1, 2 and -1. Each constant carries the cases that pin it.

| Constant | Value | Used in | Evidence |
|---|---|---|---|
| Manning constant | 1.486 | every Manning formula | CC fields: 0 mismatches with 1.486, 62 with 1.49 |
| g | 32.2 | Froude, critical flow | 32.174 drops Critical Depth from 54 to 22 of 68 matched |
| π | 3.1416 | circle angle | with 3.14159265 two CC circle discharges miss (cc-circ-000020, cc-circ-000023); with 3.1416 none do |
| exponent A | .667 | regular-shape search discharge, CC discharge and velocity on the prismatic shapes, critical slope | ND 47 of 53 matched (16 with .6667); CC velocity 29 misses with 2/3, 0 with .667; CC prismatic discharge 39 of 39 with .667, 3 with .6667 (task 3.4); critical slope 53 of 56 |
| exponent B | .6667 | Max Discharge, CC discharge on the circle, irregular conveyance | CC circles 10 of 10 with .6667, 1 of 10 with .667 (task 3.5); irregular ND 24 of 24 (10 with .667) |
| search tolerance | 0.01 | prismatic and irregular searches | 0.0099 and 0.0101 give the same matches; the exact value is not pinned |
| circle search tolerance | 0.005 | circle Normal Depth and Critical Depth searches | between 0.464% and 0.515% (nd-circ-000015, -000016 against cc-circ-000028; Q-025). Corrected by `.kiro/specs/circle-outputs` |
| circle search steps | 0.1 ft from 0.1 ft (ND), 0.2 ft from 0.2 ft (CD) | circle searches | nd-circ-000007 (49.00); cd-circ-000011 (6.60), cd-circ-000030 to -000032 held out (A-004 H5, A-006). Corrected by `.kiro/specs/circle-outputs` |
| circle CD Depth offset | 0.01 ft | circle Critical Depth's printed Depth | Q-024, A-004 measurement 2. Added by `.kiro/specs/circle-outputs` |
| regular search step | 0.5 ft from depth 0 | prismatic shapes | the depths that land on 206.00, 73.00, 42.00, 32.50, 24.50, 19.50 |
| irregular search start | lowest point + 0.1 ft, then 0.5 ft steps | irregular sections | nd-irr-000015, nd-irr-000021, nd-irr-000023 stop on depths 58.6, 40.6, 47.1 |
| Max Discharge depth | .9382 × diameter | circle | cc-circ-000027 (271099; .938 gives 271098.47), cc-circ-000034, cc-circ-000036; known difference cc-circ-000035 (Q-028). Corrected from .938 by `.kiro/specs/circle-outputs` |

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
   if |F(y) − q| ≤ tol·q, with tol = 0.01 on the prismatic shapes and the irregular section and
   0.005 on the circle (Q-025; corrected by `.kiro/specs/circle-outputs`).
2. When F passes q, take the last trial below q (or the bottom, where F is 0) and the first
   above as a bracket, and interpolate linearly.
3. Check the interpolated depth the same way. If it is still short, stepping resumes from it:
   the next trial is one step above it, and the next bracket runs from it to the first trial
   past q (task 3.2, results/attempts.md A-001). An interpolation that is over q would become
   the new upper end; on a convex F that does not happen, so it is unobserved.

What a short chord does is a per-shape option of `search.ts` (`afterShortChord`). The
prismatic shapes and the irregular section resume stepping, as rule 3 says (`'resume'`, the
default). The circle repeats the chord on the narrowed bracket, from the short chord to the same
upper trial, until a chord is within 0.5% (`'narrow'`, Q-026 candidate N2). Q-026 is open:
N1 (resume) prints the same three branch cases, and nd-circ-000020 fits no candidate. No circle
Critical Depth golden reaches the branch. Added by `.kiro/specs/circle-outputs` (2.7, 2.9).

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
| Trapezoid, V-ditch, rectangle | 0.5 ft, 0.5 ft | ND 53 of 53, CD 56 of 56 (tasks 3.2, 3.3) |
| Irregular | lowest ground point + 0.1 ft, 0.5 ft; the bottom of the first bracket is the lowest point | ND 24 of 24, Step-Backwater 3 of 3 |
| Circle | Normal Depth 0.1 ft, 0.1 ft; Critical Depth 0.2 ft, 0.2 ft; 0.5% stop; short chord repeated on the narrowed bracket; the diameter is a ceiling | ND 13 of 14 and CD 26 of 26 results (the miss is the known difference nd-circ-000020). Corrected by `.kiro/specs/circle-outputs` (A-004 to A-006) |

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

D (ft) = Diameter (in) / 12. With r = D/2 and x = (r − y)/r, the half angle is
α = π/2 − ATN(x/√(1 − x²)) with π = 3.1416, written the way QuickBASIC computes an arc cosine.
With h = √(y·(D − y)), half the top width: A = r²·α − (r − y)·h (the sector minus the
triangle), P = 2·r·α, T = 2·h. Nothing in between is stored; A, P and T are.

Corrected by `.kiro/specs/circle-outputs` (2.1, 2.2). The first draft had
A = r²(θ − sin θ)/2 with θ = 2α. The two forms are equal with the true π, but QUICK-2's π error
cancels in that form and not in this one. With the old form, the 2200 in and 2215.5 in pipes
miss (cc-circ-000031 prints `3783.9`, the old form gave 3783.2); with this one every Channel
Capacity circle matches, 20 of 20 (results/attempts.md A-004 C1 to C3; haunting H-003).

### Channel Capacity

At the entered depth: Q = 1.486/n · A · R^.667 · √S on the prismatic shapes (task 3.4; the
first draft had .6667, which 36 of the 39 prismatic results break once the ten-digit
discharges print in full). Velocity on the prismatic shapes is 1.486/n · R^.667 · √S, which is
not Q/A; on the circle it is Q/A. √S is held in single precision, as QuickBASIC's SQR returns
it for a single argument: cc-vdit-000002's velocity is 198.2500 with √S unstored and
198.249985 stored, printed `198.2`. None of the other stores tried (R, R^.667, 1.486/n, the
product 1.486/n·√S, A and P unstored) fixes it. Froude =
V/√(g·A/T). Flow Type is SUBCRITICAL when Froude < 1 and SUPERCRITICAL when it is above. All 39
prismatic results match on every field (task 3.4). Whether the circle's discharge uses .667 or
.6667 is task 3.5's to check. Criteria 6.1 to 6.7.

### Normal Depth, prismatic shapes

The search runs on Q(y) = 1.486/n · A · R^.667 · √S with step 0.5 ft. At the search's depth,
Velocity = q/A (the entered discharge, not Manning's velocity) and Froude = (q/A)/√(g·A/T).
With the second step of rule 3, all 53 results match on every field (task 3.2). Criteria
7.1, 7.2, 2.5 to 2.7, and the controls nd-trap-000001 (3.27) and nd-trap-000002 (4.22).

### Critical Depth, prismatic shapes

The search runs on Qc(y) = A·√(g·A/T) with g = 32.2 and step 0.5 ft. At the search's depth,
Velocity = √(g·A/T), Froude prints `1.0`, Flow Type is CRITICAL, and Critical Slope =
((q/A) · n / (1.486 · R^.667))². The entered slope is echoed and used for nothing else. With the
second step of rule 3 and single-precision storage, all 56 results match on every field,
Critical Slope included (task 3.3). Criteria 5.1 to 5.5.

### Circle: Normal Depth, Critical Depth, Max Discharge

This section was corrected by `.kiro/specs/circle-outputs` (requirements 2.3 to 2.11; A-004 to
A-006). The first draft's .938·D, its open search step, and its single depth for every
Critical Depth field are replaced below.

Max Discharge = 1.486/n · A · R^.6667 · √S at y = .9382·D: the peak of the part-full Manning
curve, about 7.6% above the full-pipe flow. .938·D sits below the peak and prints `271098` in
the 2215.5 in pipe where QUICK-2 printed `271099` (cc-circ-000027 to -000029, nd-circ-000007,
-000015 to -000017); .9382·D prints it, and also `83414` and `31823` in cc-circ-000034 and
-000036, where a 0.01 ft scan for the peak prints one less (A-004 M1 to M5, A-006). Channel
Capacity and Normal Depth use the entered slope; Critical Depth uses the critical slope it
computed (criteria 5.6, 5.7: `53` at slope .005 and at .001, where the entered slope gives `51`;
ledger Q-009).

Normal Depth searches on the Channel Capacity discharge from stored geometry and stored √S,
1.486/n · store(√S) · A · store(A/P)^.6667, in 0.1 ft steps from 0.1 ft with the 0.5% stop and
the narrowed chord (The depth search). Velocity = q/A.

Critical Depth searches on A·√(g·A/T) from stored A and T, in 0.2 ft steps from 0.2 ft with the
same stop and chord rule. Every field is computed at the search depth y: Area, Wet Perimeter,
Top Width, Hyd Radius, Velocity = q/A, Froude = Velocity/√(g·A/T), Critical Slope
((q/A)·n/(1.486·R^.667))² and Max Discharge. Depth prints store(y − 0.01): QUICK-2's printed
Depth is 0.01 ft below the depth its other fields describe (Q-024, Q-027; haunting H-004). The
rule was fitted on the 15 Critical Depth circles recorded before A-005, and all 11 held-out
A-005 cases printed as predicted (A-006).

Known differences, expected to miss and listed in circle-outputs' design: cc-circ-000035's
Max Discharge (`101165`, the rebuild `101166`; Q-028) and nd-circ-000020's Velocity and Froude
(`5.8`, `2.5`, the rebuild `5.7`, `2.4`; Q-026).

When the search passes the diameter without bracketing, QUICK-2 prints "DEPTH is Greater than
the DIAMETER" on the form (ledger Q-022); the rebuild returns outcome `rejected` with that
message until the profile maps the screen. Criteria 4.5, 5.6, 5.7, 6.6, 6.7, 7.3.

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
- When the overflowing text (sign, digits, point and decimals) is longer than ten characters,
  QuickBASIC switches to an exponent, with the mantissa laid out in the format's own positions:
  `% 1.2E+08` for 123456789.0 in `##.#` (obs-fieldover-000001), `%-34654E+05` for about
  -3.4654E+09 in `######` (cc-trap-000015), `% 19078E+06` for about 1.9078E+10 (cc-trap-000005).
  793879552 prints in full (cc-rect-000002), and so do the ten-digit 3578117632, 4207745280 and
  1062046336 (cc-vdit-000002, cc-rect-000005, cc-trap-000003). Task 3.4 replaced the first
  draft's nine-digit threshold, which those three ten-digit cases break: a digit count does not
  fit, a character count does. The ten-character rule fits these cases and nothing more yet.

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

The circle has its own versions, Properties 8 and 9, stated in `.kiro/specs/circle-outputs`
design and tested in `app/test/circle.test.ts`:

### Property 8: The circle search stops within 0.5%

For any circle input that gives a Normal Depth or Critical Depth result, the search's own
function (the Channel Capacity discharge for Normal Depth, A·√(g·A/T) for Critical Depth) at the
search depth is within 0.5% of the entered discharge.
**Validates: circle-outputs Requirements 2.5, 2.6, 2.7, 2.9**

### Property 9: Circle Critical Depth prints Depth one hundredth of a foot below its fields

For any circle Critical Depth result, `raw.depth` = store(`raw.search_depth` − 0.01), and Area,
Wet Perimeter and Top Width are those at `raw.search_depth`.
**Validates: circle-outputs Requirement 2.10**

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
- What QUICK-2 does after a short chord on the circle (ledger Q-026). N2 is used; N1 to N4 have
  been scored, and nd-circ-000020 fits none of them (`.kiro/specs/circle-outputs`).
- cc-circ-000035's Max Discharge, one unit below .9382·D (ledger Q-028; circle-outputs).
- The short-chord rule in circle Critical Depth: no golden reaches it, so the Normal Depth rule
  is used unobserved (circle-outputs 2.9).
- Which quantities QuickBASIC stores in single precision. Settled case by case in each task.
- The ten-character threshold for exponent overflow, and the paint order of overflowing values.
- Whether QuickBASIC's SQR result is held in single precision everywhere. It is pinned only in
  Channel Capacity (cc-vdit-000002); storing √S in Normal Depth changes no golden, and the
  rebuild stores it only where a golden needs it.
- Step-Backwater start value 1 (Q-018), Kratio and Flow Regime beyond a subcritical first
  section.
- The outcome a "returns to the shape menu" case would be recorded with.
- Whether a bank typed as `150.0` matches a station typed as `150`.
- Froude exactly 1 in Normal Depth and Channel Capacity: SUBCRITICAL, SUPERCRITICAL or CRITICAL.
- The 100,000 ft search limit, which is the rebuild's own and not observed.
