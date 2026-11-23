# Implementation Plan

Each top-level task ends with the quick-set comparison (`python scripts/oracle_quick.py`, which
the after-task hook also runs) and one full-set run for the pairs it covers. A task is done when
`oracle/out/mismatches.json` has no mismatch for those pairs, or every remaining one has gone
through the honest attempt and the Skeptic and been recorded (design: When the rebuild and the
oracle disagree). Mismatches in pairs a later task covers are expected until then.

- [x] 1. Comparator pipeline end to end on the trapezoid control cases
  - [x] 1.1 Set up the TypeScript package in `app/`: `package.json` (ES modules, no runtime dependencies; TypeScript, Vitest and fast-check as dev dependencies), `tsconfig.json` (strict, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`) and Vitest config. Check that `node app/src/oracle/entry.ts` runs on Node 24 without a build. Leave Vite and the service worker to quickened-app task 1.1.
    - _Requirements: none of the 74; design: The contract_
  - [x] 1.2 Write `single.ts`, `constants.ts` (start with 1.486, .667, 0.01 and the 0.5 ft step, each with its citing cases) and `parse.ts` (VAL to single precision); unit tests with the typed values of criteria 2.1 to 2.4
    - _Requirements: design: Numbers, Parsing and holds_
  - [x] 1.3 Write `printUsing.ts` (fixed formats, rounding, `%` overflow), `screen.ts` (paint a row, cut each window) and the Normal Depth trapezoid entries of `layout.ts`; a test that each window equals `nd_trap_result` in `oracle/targets/quick2.json`
    - _Requirements: design: Printing_
  - [x] 1.4 Write `search.ts`, `geometry/prismatic.ts`, Normal Depth for the trapezoid in `modes/normalDepth.ts`, and `solve()` in `index.ts`, returning outcome `error` with message `not built` for every other pair
    - _Requirements: design: The depth search, Normal Depth prismatic shapes_
  - [x] 1.5 Write `app/src/oracle/entry.ts` and set `rebuild.command` in `oracle/harness.json` to `["node", "app/src/oracle/entry.ts"]`; tests that the entry answers every request once, keeps ids out of `solve()`, and writes only the contract's four keys
    - _Requirements: oracle-harness 12.1 to 12.4_
  - [x] 1.6 Write the guard tests: no case-id pattern and no `goldens` reference in `app/src/solver/` or `app/src/format/`; numeric literals only in `constants.ts`, each constant cited; no literal equal to a printed golden value. Property 7 (renamed and shuffled ids change nothing).
    - _Requirements: design: When the rebuild and the oracle disagree, rules 1 to 3; Property 7_
  - [x] 1.7 Run the quick set. nd-trap-000001 (depth 3.27 at 300 cfs) and nd-trap-000002 (4.22 at 500 cfs) match on every field, the run takes under 30 s, and every other case is an expected `outcome` mismatch. Record the timing and result in `docs/build-log.md`.
    - _Requirements: closes none of the 74; proves oracle-harness Property 4 through the rebuild_

- [x] 2. Normal Depth on an irregular section
  - [x] 2.1 Write `groundPoints.ts` and the irregular prompt order in `forms.ts`: increasing stations with their error text, a negative first station, elevation 0 not taken, a negative elevation back to the station, entry ending after the 40th point, banks matched by value as entered with the ERROR line as the message. Test against the captures of obs-irrelev-000001, obs-irrstation-000001, obs-irrtwopt-000001, obs-bankreject-000001, obs-bankreject-000002 and nd-irr-000009, and the prompt order against the golden transcripts.
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 9.6, 10.3, 10.4, 10.5, 10.6, 10.7_
  - [x] 2.2 Write `geometry/irregular.ts`: wet area, perimeter and top width with vertical end walls that add no perimeter, every wet part counted, the three subsections, overbank conveyance per ground segment, channel conveyance whole, and α. Add .6667 to `constants.ts`. Property 4.
    - _Requirements: 3.12, 9.7_
  - [x] 2.3 Write irregular Normal Depth: the search from the lowest point plus 0.1 ft in 0.5 ft steps, the outputs (Depth, Chan Vel, α Froude), the echoes, and the `nd_irr_result` layout. Return outcome `error` with `never_finishes` for a section that can never carry the discharge (nd-irr-000026). Property 1 for irregular sections.
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 9.2, 9.3, 9.4, 9.5, 10.2_
  - [x] 2.4 Write the `extended_section` and `cut_off_area_counted` flags in `flags.ts`; a test that `extended_section` agrees with row 24 of the final capture for every irregular golden, and that `cut_off_area_counted` is raised for nd-irr-000010 and sb-irr-000003 and no other irregular golden
    - _Requirements: 3.13, 9.7_
  - [x] 2.5 Run the quick set and the full set for normal_depth/irregular; triage any mismatch. Record hauntings for the cut-off low ground (nd-irr-000010) and the vertical walls (nd-irr-000005), and the evidence for ledger Q-006 and Q-021.
    - _Requirements: closes 3.2 to 3.13, 9.2 to 9.7, 10.2 to 10.7_

- [ ] 3. The regular shapes: Normal Depth, Critical Depth and Channel Capacity
  - [x] 3.1 Write the regular forms in `forms.ts` (prompt order, fixed Bottom Width and side-slope fields), the hold rules (0 at any prompt, Diameter -1, Channel Capacity circle Depth above the diameter) and the echo formats with `%` and exponent overflow, and the `layout.ts` entries of every regular result screen. Test `held` against every rejected golden and the prompt order against the transcripts. Properties 2 and 3.
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 3.2 Normal Depth on the V-ditch, rectangle and trapezoid: Velocity = q/A and its Froude; the `negative_input` flag; `never_finishes` for n of -1; `returns_to_menu` for Discharge or Slope of -1. Make the honest attempt at the second interpolation step on the 6 shallow goldens, and hand what remains to the Skeptic. Property 1 for prismatic Normal Depth.
    - _Requirements: 7.1, 7.2, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_
  - [x] 3.3 Critical Depth on the V-ditch, rectangle and trapezoid: the search on A·√(gA/T) with g = 32.2, Velocity √(gA/T), Froude, Flow Type CRITICAL, Critical Slope with .667. Settle the single-precision storage points on cd-trap-000013, cd-vdit-000007 and cd-rect-000009. Property 1 for prismatic Critical Depth.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 3.4 Channel Capacity on the V-ditch, rectangle and trapezoid: discharge with .6667, Velocity with .667, Froude, Flow Type; settle cc-vdit-000002's velocity boundary
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ] 3.5 The circle in all three modes: `geometry/circle.ts` with π = 3.1416; Max Discharge at .938·D with .6667, at the entered slope for Channel Capacity and Normal Depth and at the critical slope for Critical Depth; "DEPTH is Greater than the DIAMETER" as outcome `rejected` with that message. Find the circle search's start and step within the design's search, using nd-circ-000007 (stops on 49.00) and the small pipes, and decide scan or .938 on nd-circ-000007. Property 6.
    - _Requirements: 4.5, 5.6, 5.7, 6.6, 6.7, 7.3_
  - [ ] 3.6 Run the quick set and the full set for every regular pair; triage any mismatch. Record hauntings for the 1% stop (nd-trap-000001, cd-vdit-000001), the .667 velocity (cc-vdit-000012), Critical Depth's Max Discharge (cd-circ-000001) and negative inputs (cc-trap-000015), and the evidence for ledger Q-002, Q-003, Q-008, Q-009 and Q-022.
    - _Requirements: closes 1.1, 1.2, 2.1 to 2.10, 4.1 to 4.5, 5.1 to 5.7, 6.1 to 6.7, 7.1 to 7.3, 8.1 to 8.6_

- [ ] 4. Step-Backwater, first section only
  - [ ] 4.1 Write the start-value rule (below 1 a slope, above 1 an elevation; 1 stays open as ledger Q-018 and returns outcome `error` with message `not observed`) and the Step-Backwater prompt order, with no slope, reach-length or loss-coefficient prompt and those fields blank
    - _Requirements: 11.2_
  - [ ] 4.2 Write the first-section result: WS ELEV from the irregular search or the given elevation, EG ELEV with α, Depth and ChanVel with two decimals, Froud#, Kratio and Flow Regime as observed, and the `sb_result` layout. Property 5.
    - _Requirements: 11.3, 11.4, 11.5, 11.6_
  - [ ] 4.3 Run the quick set and the full set for step_backwater/irregular; triage any mismatch, and record what stays unobserved (later sections, Kratio and Flow Regime rules) in the ledger
    - _Requirements: closes 11.2 to 11.6_
