# Implementation Plan

- [ ] 1. Ledger
  - [ ] 1.1 Record the Exhumer's decisions, open questions and stop reason in its ledger sections, through the oracle-harness ledger module (the schema and `ledger_read` are oracle-harness tasks 5.2 and 9.2)
    - _Requirements: 1.2_
  - [ ] 1.2 Write `scripts/check_traceability.py`, which fails on any requirement that cites a missing case
    - _Requirements: 3.2_

- [ ] 2. First live run (day 3 gate)
  - [ ] 2.1 Run the Exhumer on the Normal Depth trapezoid form until it writes one requirement citing a live case
    - This is the gate. Save the transcript under `results/transcripts/`.
    - _Requirements: 1.1, 3.1, 3.2_

- [ ] 3. Exhume the program
  - [ ] 3.1 Run the Exhumer across Critical Depth, Channel Capacity and Normal Depth on all regular shapes
    - _Requirements: 2.1, 2.2, 2.3, 3.1_
  - [ ] 3.2 Run it on Step-Backwater and irregular sections, then generate `quick2-solver/design.md` and `tasks.md` from its requirements in Kiro
    - _Requirements: 2.1, 3.1_
  - [ ] 3.3 Have it save, read and work out the `.XSC` format from files the binary writes
    - _Requirements: 2.1, 3.1_

- [ ] 4. Build the solver from that spec
  - [ ] 4.1 Run the `quick2-solver` tasks. The save hook grades each change.
    - _Requirements: 3.1_
  - [ ] 4.2 Classify each mismatch class, with Skeptic review, until the quick set is clean
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 5. Prove it
  - [ ] 5.1 Run the full case set and write `results/headline.md`
    - _Requirements: 5.2_
  - [ ] 5.2 Build the manual-only rebuild with no oracle, grade it, and write `results/ablation-manual-only.md` by November 26
    - _Requirements: 5.1, 5.2, 5.3_
