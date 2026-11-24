# Implementation Plan: circle-outputs

The tasks run in order. Each one ends with its own check, and each commit message is written to
a file without a byte-order mark and passed with `git commit -F` (the A-004 to A-006 commits
show how). `scripts/circle_outputs.mts` is the reference: where `app/src` and the script
disagree on an evaluation order or a store, the script is right (design: Overview). The
expected end state is in requirement 2.13: 78 of the 80 circle goldens, and 279 of 284 on the
full set.

- [x] 1. Reproduce the circle misses before any fix
  - [x] 1.1 Add the "circle-outputs" block to `app/test/circle.test.ts`. Each case goes through
    `solve()` and is compared field by field with its golden: cc-circ-000027, cc-circ-000031,
    nd-circ-000007, nd-circ-000010, nd-circ-000016, cd-circ-000010, cd-circ-000011,
    cd-circ-000013, cd-circ-000019 and cd-circ-000030 (design: Testing strategy, item 1).
    Add the table-driven test over every circle result golden. It expects every field to match
    except the two known differences, where it expects exactly the listed rebuild values:
    cc-circ-000035 Max Discharge `101166`; nd-circ-000020 Velocity `5.7` and Froude `2.4`
    (design: Known differences).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 2.8_
  - [x] 1.2 Run `npx vitest run test/circle.test.ts` in `app/` on the unchanged code and show the
    output. Every reproduction case must fail on the fields `bugfix.md` 1.1 to 1.6 names, and
    the table-driven test must fail. If a case passes before the fix, stop and say so; do not
    drop it. Commit the tests, failing, with the failure count in the message.
    - _Requirements: 1.1 to 1.6_

- [x] 2. Record the prismatic and irregular search results before `search.ts` changes
  - [x] 2.1 Write `app/test/searchSnapshot.ts`, a test helper. For every trapezoid, V-ditch,
    rectangle and irregular golden that reaches the search, it records the search's returned
    depth, value and trial count. Write them to `app/test/fixtures/search-snapshot.json`, keyed
    by case id. Values are written as exact decimal strings of the doubles. Generate the file
    from the unchanged `search.ts`, through an explicit script command, not from a test run.
    Add a note at the top of the file naming the commit it was generated at.
    - _Requirements: 3.1, 3.6_
  - [x] 2.2 Add the preservation test to `search.test.ts`. It recomputes each entry and compares
    depth, value and trial count exactly with the snapshot. Run it and show it passing on the
    unchanged code. Commit the snapshot, its generator and the test together, before any edit
    to `search.ts`. Report how many searches the snapshot holds per pair.
    - _Requirements: 3.1, 3.6_

- [x] 3. Constants and geometry
  - [x] 3.1 In `constants.ts`, set `MAX_DISCHARGE_DEPTH` to .9382. Add `CIRCLE_TOL` (0.005),
    `CIRCLE_CD_STEP` (0.2) and `CIRCLE_CD_DEPTH_OFFSET` (0.01). Replace `CIRCLE_STEP`'s comment
    and citation. Use the `@cite` text of the design's constants table. Update
    `guard.test.ts`'s `COINCIDENCES` for every new constant the guard flags, with a one-line
    reason each, and remove "(not settled)" from `CIRCLE_STEP`'s entry.
    - _Requirements: 2.3, 2.5, 2.9, 2.10, 3.7_
  - [x] 3.2 Rewrite `wetCircle` in `geometry/circle.ts` to the sector-minus-triangle form of the
    design, with a header comment citing A-004 C2 and cc-circ-000031. Run the circle tests:
    the Channel Capacity reproduction cases (cc-circ-000027, -000031) now pass on Discharge.
    Show the output.
    - _Requirements: 2.1, 2.2_

- [x] 4. The circle search and the three circle modes
  - [x] 4.1 Add `tol` and `afterShortChord` (`'resume'` | `'narrow'`) to `SearchSpec` in
    `search.ts`. Their defaults are today's rule. Add `search.test.ts` cases for both options on
    a hand-made convex function. Run the task 2 preservation test and show it passing, with
    every snapshot entry identical.
    - _Requirements: 2.6, 2.7, 3.6_
  - [x] 4.2 In `modes/circle.ts`, the trial functions use stored geometry, as the design says
    (and stored √S for Normal Depth). `searchCircle` takes the mode's step: `CIRCLE_STEP` for
    Normal Depth, `CIRCLE_CD_STEP` for Critical Depth. Both use `CIRCLE_TOL` and `'narrow'`.
    `criticalDepthCircle` computes every field at the search depth, with Velocity q/A, Depth =
    store(search depth − `CIRCLE_CD_DEPTH_OFFSET`) and `raw.search_depth`. Rewrite the header
    comment with the rules, their citations, the known differences and Q-026 and Q-028.
    Update `maxDischarge`'s comment in `modes/capacity.ts`.
    - _Requirements: 2.3, 2.5, 2.6, 2.7, 2.9, 2.10, 2.11_
  - [x] 4.3 Add Properties 8 and 9 to `circle.test.ts` (fast-check, 200 runs each, pipes from
    the practical ranges with discharge under the critical discharge at 0.9·D). Run the whole
    of `circle.test.ts` and show it: the reproduction block and the table-driven test pass,
    with the known differences exactly as listed. Property 6 still passes.
    - _Requirements: 2.5 to 2.11, 3.4_
  - [x] 4.4 Run the comparator (`python scripts/oracle_quick.py`, then `--full`). Every mismatch
    left must be a known difference or a Step-Backwater case. If anything else misses, make the
    honest attempt the quick2-solver design describes, against the script's numbers first, and
    record it in `results/attempts.md` as a new section. Commit tasks 3 and 4.
    - _Requirements: 2.13, 3.1, 3.2, 3.3_

- [x] 5. Records
  - [x] 5.1 Add H-003 (QUICK-2's π = 3.1416 in the circle's area, cc-circ-000031) and H-004
    (Critical Depth prints Depth 0.01 ft below its fields, cd-circ-000019) to
    `results/hauntings.md`, with the numbers of the design's hauntings section. Do not add
    cc-circ-000035 or nd-circ-000020.
    - _Requirements: 2.2, 2.4, 2.12_
  - [x] 5.2 Correct `.kiro/specs/quick2-solver/design.md` as the design's parent-design section
    lists: circle geometry, the search table's circle row and the short-chord option, the
    circle section, Property 8 and 9 beside Property 1, and the open points. Add a pointer to
    this spec in each corrected place. Tick task 3.5 of `.kiro/specs/quick2-solver/tasks.md`,
    noting that it was closed by circle-outputs.
    - _Requirements: 2.3, 2.9, 2.10, 2.11_
  - [x] 5.3 With `ledger_write`, answer Q-027 with the rule of 2.9 to 2.11. Evidence:
    cd-circ-000019 to -000021, cc-circ-000031 to -000033, cd-circ-000011 and cd-circ-000022 to
    -000032. Leave Q-026 and Q-028 open, and report nothing as observed for the short-chord rule
    in Critical Depth. Commit task 5.
    - _Requirements: 2.14_

- [ ] 6. Build log: A-004 to A-006
  - [ ] 6.1 Add a section to `docs/build-log.md` after "A-003, second Exhumer session: the
    Skeptic holds, and the circle search measured" and its stale-server guard paragraph. The
    held-out check comes first and is the point of the section:
    - The rules were fitted on 43 stored circle results (A-004).
    - Predictions for 17 cases they had never seen were committed in d9e1a3a before the
      Exhumer ran them (A-005). The Exhumer recorded them in its own session (decision 73).
    - 15 of 17 printed exactly as predicted, every field, echoes included (A-006, graded by
      `node scripts/circle_outputs.mts grade-a005`).
    - Critical Depth printed as predicted in 11 of 11, including the three pipes chosen to
      separate the fitted 0.2 ft step from 0.1 ft.
    - The two misses and why they are left. cc-circ-000035's Max Discharge sits one part in a
      million from a rounding boundary, and no rule is fitted to it (Q-028). nd-circ-000020's
      Velocity and Froude fit none of Q-026's candidates, and no rule stated in advance
      explains both branch cases (Q-026).

    Then, briefly: what A-004 found (the area formula, .9382·D, the 0.5% stop, Critical Depth's
    0.01 ft split and 0.2 ft step), and the comparator counts from task 4.4 (task 7.2
    corrects them if the final run differs). Write it in the build log's
    existing style: plain prose, case ids, numbers, the attempts.md sections cited. Give credits
    and times in this order, as given by the person running the task:
    - the stale-server guard session: 9.47 credits, 16 min 50 s;
    - this spec's session, first prompt: 89.36 credits, 1 h 0 min 58 s;
    - second prompt: 98.97, 2 h 19 min 47 s;
    - third prompt: 59.6, 34 min 9 s;
    - the Exhumer's A-005 run: 5.89, 7 min 6 s;
    - a prompt sent to the Exhumer by mistake, which it declined because it has no shell:
      2.68, 1 min 24 s.

    Commit the build log on its own.
    - _Requirements: none; the record of A-004 to A-006_

- [ ] 7. Final check against 2.13
  - [ ] 7.1 Run, and show the output of each:
    - `node scripts/circle_outputs.mts grade-a005`. It must still report 15 of 17 for A-005's
      stated rules and 58 of 60 for the adopted rules, with the same two misses.
    - `python scripts/oracle_quick.py` and `python scripts/oracle_quick.py --full`. Report the
      quick set before (174 of 200 at fe47275) and after.
    - The full Python suite (`python -m pytest oracle/tests`, live tests included) and the full
      Vitest suite.
    - _Requirements: 2.13, 3.1 to 3.7_
  - [ ] 7.2 Report the counts against requirement 2.13 in one table: full set (expected 279 of
    284), circle goldens (78 of 80), each circle pair, and every other pair at 100%. List each
    mismatch left and say which known difference or Step-Backwater case it is. If any count
    differs from 2.13, say so plainly and do not tick this task. Update the build-log section
    of task 6 if its counts changed.
    - _Requirements: 2.13_
