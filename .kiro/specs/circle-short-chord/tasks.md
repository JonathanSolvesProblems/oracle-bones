# Implementation Plan: circle-short-chord

The tasks run in order. Each one ends with its own check. Each commit message is written to a
file without a byte-order mark and passed with `git commit -F`. Every expected value in a test
comes from a golden or a behaviour case: the golden's outcome and printed fields, or the
behaviour case's ending and its typed keys. No expected value is computed by
`scripts/circle_outputs.mts` or any other model. The script is the reference for how the search
is written (design: Overview, Reference implementation), not for what a test expects. The
expected end state is in requirement 2.9: 82 of the 82 circle Critical Depth goldens that reach
the search, 195 of 200 on the quick set and 335 of 340 on the full set. No task runs the
program.

**Note (2026-11-26): the quick set was rebuilt** (3cc4821) after tasks 2.2 to 4.2 ran. 192 and
195 of 200 were right for the quick set of c865f11, and the comparator confirmed both. On the
rebuilt quick set the counts are 191 of 200 before the fix (derived from 2.2's full-set report)
and 195 of 200 after it (the comparator), with the same five misses; bugfix.md 2.9 has the
details. The full-set counts do not change.

- [x] 1. Tests first, on the unchanged solver
  - [x] 1.1 Add the block "circle-short-chord" to `app/test/circle.test.ts`. It runs the 40
    goldens of the design's table (Expected result) through `solve()` and compares each with its
    golden as the comparator does: the outcome, and every printed field of a result. The five
    results at D, cd-circ-000081 to -000083, -000085 and -000087, are among them.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.4, 2.6 (a), (b), (d)_
  - [x] 1.2 In the same file, add a block over the 43 rejection goldens, cd-circ-000039 to
    -000064, -000066, -000067, -000069, -000071 to -000080, -000084, -000086, -000088 and
    -000089. Each expects outcome `rejected`, the message "DEPTH is Greater than the DIAMETER"
    and no printed field, as its golden has them.
    - _Requirements: 1.5, 2.4, 2.6 (b), (d), 3.6_
  - [x] 1.3 Add a block over the behaviour cases of 2.6 (c), obs-cdmenu-000001, -000002 and
    -000005 to -000012, and the floor's, obs-cdmenu-000003, -000004 and -000013. Each test reads
    the typed Diameter, n, Discharge and Slope from the behaviour case's transcript, names the
    case, and expects outcome `error` with the `returns_to_menu` flag and no printed field, since
    each case ended on the shape menu. The block also expects no `never_finishes` flag on any of
    the thirteen.
    - _Requirements: 2.6 (c), 2.7, 3.8_
  - [x] 1.4 In the flag test, expect the text of `returns_to_menu` to be "QUICK-2 returns to its
    shape menu with no result for this input." Leave the `never_finishes` text test as it is.
    - _Requirements: 2.7, 3.8_
  - [x] 1.5 In `app/test/search.test.ts`, add the search option cases of the design's testing
    step 5 on a hand-made increasing F: `rejectAtCeiling` with a stepped trial and a resumed
    trial on the ceiling; `ceilingValue` within tol, over, under, and under with the ceiling as
    the first trial. The expected result of each is the design's definition of the option on that
    F (found at the ceiling, `past_ceiling` or `under_ceiling_value`, and whether F was called at
    the ceiling). No QUICK-2 value is computed.
    - _Requirements: 2.4, 2.6_
  - [x] 1.6 Add Property 10 to `app/test/circle.test.ts` (design: Correctness properties): no
    depth at or past D is given to `circleCriticalDischarge(D)`, with fast-check, 200 runs.
    - _Requirements: 2.4, 2.6, 2.7_
  - [x] 1.7 Run `npx vitest run test/circle.test.ts test/search.test.ts` in `app/` and show the
    output. Each test of 1.1 to 1.6 must fail on the unchanged code: the 40 goldens on the fields
    or outcomes the design's table names, the 13 behaviour cases with `never_finishes`, the flag
    text, and the new search options. Property 10 fails only if a draw reaches a stepped trial on
    D; if it passes, report how many draws did. If any other test passes before the fix, stop
    and say so; do not drop it. Commit the tests, failing, with the failure
    count in the message.
    - _Requirements: 1.1 to 1.5_

- [x] 2. Records before the solver changes
  - [x] 2.1 Write the Property 11 fixture: `npm run snapshot:circle` (new, in `app/`) records
    circle Normal Depth and Channel Capacity `Result`s for a seeded list of generated inputs from
    the unchanged solver, doubles as exact decimals, with a note naming the commit. Add the test
    that replays it and compares exactly. Show it passing on the unchanged code. Commit the
    fixture, its generator and the test before any edit to `app/src`.
    - _Requirements: 3.2, 3.3_
  - [x] 2.2 Run the comparator on the unchanged solver: `python scripts/oracle_quick.py` and
    `python scripts/oracle_quick.py --full`. Keep both reports. Expect 192 of 200 and 295 of 340,
    with the misses 2.9 lists. If either count or any miss differs from 2.9, stop and report it
    before task 3. (2026-11-26: 192 is for the quick set of c865f11; the rebuilt quick set of
    3cc4821 gives 191, derived, as 2.9's note says.)
    - _Requirements: 2.9_

- [x] 3. The solver change
  - [x] 3.1 `app/src/solver/search.ts`: add `rejectAtCeiling` and `ceilingValue` to
    `SearchSpec`, the reason `under_ceiling_value` to `SearchResult`, and the flag that marks a
    trial resumed from a short chord, as the design says. Rewrite the header comment (design:
    `search.ts`). The default path does not change.
    - _Requirements: 2.4, 2.6, 2.8, 3.1_
  - [x] 3.2 `app/src/solver/modes/circle.ts`: add `fullPipeCriticalDischarge(D)` and
    `circleSearchSpec(D, mode)`; call `search` with the spec in both modes; make Critical Depth's
    F return NaN where 1 − x² ≤ 0; take the full-pipe section when the result is at y = D;
    update `notFound`'s comment and the header comment (design: `modes/circle.ts`). No constant
    is added.
    - _Requirements: 2.1, 2.4, 2.6, 2.7, 2.8, 3.2, 3.3, 3.9_
  - [x] 3.3 `app/src/solver/flags.ts`: the new text of `returns_to_menu`.
    - _Requirements: 2.7_
  - [x] 3.4 Run the full Vitest suite in `app/` and show the output: every test of task 1
    passes, Property 11's replay passes, the search snapshot and the guard tests pass, and no
    other test changes. Commit.
    - _Requirements: 2.1 to 2.7, 3.1 to 3.9_
  - [x] 3.5 Run `node scripts/circle_outputs.mts full-pipe-rule` and show the 2.9 section: 82 of
    82 goldens matching through its `solve()` column, none stopping to match. This checks the
    rebuild against the script's own copy of the search; it is not a test's expected value.
    - _Requirements: 2.12_

- [x] 4. The comparator after the fix
  - [x] 4.1 Run `python scripts/oracle_quick.py` and show the report: 195 of 200, the misses
    cc-circ-000035, nd-circ-000020 and sb-irr-000001 to -000003, with the same fields as before.
    Every golden that matched in 2.2 still matches. (2026-11-26: the same count and misses on the
    rebuilt quick set of 3cc4821, where cd-circ-000050, -000062, -000082 and -000086 start to
    match.)
    - _Requirements: 2.9, 3.1, 3.4_
  - [x] 4.2 Run `python scripts/oracle_quick.py --full` and show the report: 335 of 340, the same
    five misses. Every golden recorded from A-011 to A-018 matches.
    - _Requirements: 2.9, 3.1 to 3.5_
  - [x] 4.3 Run the full Python and Vitest suites and show that they pass. Commit the reports'
    counts in the message.
    - _Requirements: 2.9, 3.9_

- [x] 5. The records of 2.8, and H-009
  - [x] 5.1 `.kiro/specs/circle-outputs/bugfix.md` 2.9: after "A short chord SHALL be handled as
    in 2.7", a note that circle Critical Depth now uses K1, trial ≥ D and the full-pipe number at
    a stepped trial on D, pointing to circle-short-chord.
    - _Requirements: 2.8_
  - [x] 5.2 `.kiro/specs/quick2-solver/design.md`: in "The depth search", the paragraph on
    `afterShortChord` (K1 with `rejectAtCeiling` and `ceilingValue` for circle Critical Depth, N2
    for circle Normal Depth, each with its evidence; the comparison at a stepped trial on D named,
    with 2.6 (c) described and not explained); remove "No circle Critical Depth golden reaches
    the branch". In the flag table, the new text of `returns_to_menu` and its two new uses, 2.7
    and 2.6 (c). In "Negative values and abandoned calculations", that W1 and W2 are the first
    observations that fit the reading of a run-time error as the menu.
    - _Requirements: 2.8_
  - [x] 5.3 Check that the header comments of `search.ts` and `circle.ts` written in 3.1 and 3.2
    say everything 2.8 lists, and that neither has a case id.
    - _Requirements: 2.8, 3.9_
  - [x] 5.4 `results/hauntings.md`: haunting H-009 as the design writes it, with cd-circ-000043,
    -000049 and -000050 and their exact critical depths from `node scripts/circle_outputs.mts
    design`. Write the A-016 sentences only with their golden ids, as the design says.
    - _Requirements: 2.5_
  - [x] 5.5 Commit 5.1 to 5.4 together.
    - _Requirements: 2.5, 2.8_

- [x] 6. The limits text for the app
  - [x] 6.1 `results/hauntings.md`: add the section "Limits" after the hauntings, with one entry
    for 2.6 (c) in the design's shape: the ten behaviour cases and their ledger decisions, what
    QUICK-2 did, what Quickened returns, why it is described and not explained, and the
    **Limits page:** paragraph from the design's draft. The paragraph says, in plain words, that
    QUICK-2 was seen to do this ten times in three pipes, that three of the ten were predicted
    before they ran, and that why is not known. No case id in the paragraph.
    - _Requirements: 2.6 (c), 2.7_
  - [x] 6.2 Check the section against 2.7 and the product rules: no FEMA styling or claim, no
    mascot, and no "Known differences" section added for circle Critical Depth. Commit.
    - _Requirements: 2.7, 2.12_

- [x] 7. The ledger entries of 2.10 (an Exhumer session, through `ledger_write` only)
  - [x] 7.1 After 4.2 confirms 335 of 340, an Exhumer session records the following and runs no
    case. The default agent does not edit `results/ledger.json`.
    - `decide`, chose `write_requirement`: K1 and trial ≥ D as what circle Critical Depth does,
      evidence cd-circ-000033, -000035, -000036 and cd-circ-000039 to -000044.
    - `decide`, chose `write_requirement`: 2.6 (a) to (d), the person's full-pipe reading and A-018
      graded, saying that (c) has no mechanism; evidence cd-circ-000081 to -000083, -000085,
      -000087, cd-circ-000084, -000086, -000088, -000089, obs-cdmenu-000001, -000002, -000005 to
      -000012, and cd-circ-000080.
    - `ask`: Q-033 (1), the key that leaves `cd_circ_rejected`, carried to a new question and
      recorded as unobserved.
    - `answer` Q-033 with 2.4 and 2.6 as the rules the rebuild uses, that 56 combinations fit
      trial ≥ D equally on the observations before A-018, and that the full-pipe number is the
      person's reading, tested by A-018; evidence the 43 rejection goldens.
    - `ask`: the question that carries Q-029. It names Q-029, states 2.6 (a) to (d), asks what
      sends a discharge under the full-pipe number back to the shape menu, and lists what was
      tried (A-015, A-016 graded, A-017 graded, A-018 graded); evidence obs-cdmenu-000001,
      -000002, -000005 to -000012 and cd-circ-000080 to -000083. Q-029's answer stays as it is.
    - `decide`, chose `write_requirement`: the floor's outcome of 2.7 and the person's decision,
      saying that F1 is above the floor only if the form kept the fourth decimal (Q-035);
      evidence obs-cdmenu-000003, -000004 and -000013.
    - Nothing for Q-026, Q-032 (a) and Q-035, which stay open; no known difference for a trial on
      D; A-009's 79 generated circles and F1 above the floor are not reported as coverage. The
      mismatch counts are the comparator's, written in 4.1 and 4.2.
    - _Requirements: 2.6, 2.7, 2.10_
