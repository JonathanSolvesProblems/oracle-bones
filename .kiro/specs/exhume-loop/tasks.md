# Implementation Plan

- [x] 1. Before the first live run
  - [x] 1.1 Add `ledger_write`: `ledger.update_exhumer` and one writer per operation in `oracle/ledger.py`, the tool and its schema in `oracle/tools.py` and `oracle/schemas.py`, evidence checks against the goldens store, the manifest and `oracle/out/runs/`, and `stopped` with the coverage report. Properties 2 and 3.
    - Amend oracle-harness Requirement 14 and its design for the ninth tool, and update the MCP tests.
    - Tell the Exhumer in `.kiro/agents/exhumer.md` to record every choice with `ledger_write` and never edit the ledger file; tell the Skeptic not to call it.
    - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.7, 7.1_
  - [x] 1.2 Make profile changes and citations safe: `oracle/reread.py` run from the tools and the recording command line (Property 4), F1 verified with a before and after capture and added to the profile's keys, and `scripts/check_traceability.py` (Property 1)
    - Tell the Exhumer in `.kiro/agents/exhumer.md` how to read the help, change the profile, turn a finding into a citable case, and cite it.
    - _Requirements: 1.3, 1.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.3, 5.4, 5.5, 6.2, 6.3, 6.4, 6.5_

- [ ] 2. First live run (day 3 gate)
  - [ ] 2.1 In a new session with the `exhumer` agent: find what QUICK-2 does with 0 and -1 in each trapezoid input (6 of 8 cases in `run_batch` seed 20261120, count 8, timed out on them), map that in the profile, record cases for it, and write the first criteria in `.kiro/specs/quick2-solver/requirements.md` citing them
    - The gate: at least one criterion cites a case recorded in this run, and `python scripts/check_traceability.py` exits 0.
    - If a rejection shows no screen that a marker can match, the Exhumer records an open question and stops; that is a harness change, decided by a person.
    - _Requirements: 1.1, 1.2, 4.1, 4.8, 5.2, 5.6, 6.1, 6.2_
  - [ ] 2.2 Next in the same or a following session: Normal Depth on an irregular section of about 40 station and elevation points, shaped like a natural channel exported from a DEM in QGIS. Map the irregular editor, write its flow, record a case, and cite it.
    - _Requirements: 4.1, 4.2, 5.2, 5.3, 6.1_

- [ ] 3. Exhume the program
  - [ ] 3.1 Critical Depth, Channel Capacity and Normal Depth on every regular shape (V-ditch, rectangle, trapezoid, circle)
    - _Requirements: 3.3, 4.1, 4.7, 4.8, 5.2, 6.1_
  - [ ] 3.2 Step-Backwater and irregular sections; then generate `quick2-solver/design.md` and `tasks.md` from its requirements in Kiro
    - _Requirements: 4.1, 5.2, 6.1_
  - [ ] 3.3 Save sections with F6, read the files the binary writes, and work out the `.XSC` format from them
    - _Requirements: 4.1, 5.2, 6.1_

- [ ] 4. Build the solver from that spec
  - [ ] 4.1 Run the `quick2-solver` tasks; the save hook grades each change (needs oracle-harness tasks 8 and 10)
    - _Requirements: 6.1_
  - [ ] 4.2 Classify each mismatch class, with Skeptic review, until the quick set is clean
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5. Prove it
  - [ ] 5.1 Run the full case set and write `results/headline.md`
    - _Requirements: 8.2_
  - [ ] 5.2 Decide which documentation the ablation gets; build the rebuild with no oracle and no spec, grade it, and write `results/ablation-manual-only.md` by November 26
    - _Requirements: 8.1, 8.2, 8.3_
