# Implementation Plan

- [ ] 1. Package
  - [ ] 1.1 Write `power/plugin.json` and `power/mcp.json`
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write the `resurrect` skill and copy in the oracle law, with the drift test
    - _Requirements: 2.2_

- [ ] 2. New targets
  - [ ] 2.1 Add a command that boots an unknown binary and drafts a target profile
    - _Requirements: 2.1, 2.3_
  - [ ] 2.2 Add the Docker check
    - _Requirements: 1.3_

- [ ] 3. Clean install
  - [ ] 3.1 Install into an empty workspace and reproduce the smoke test
    - _Requirements: 3.1_
  - [ ] 3.2 Write the README, with "How to run it" near the top, using commands copied from that test
    - _Requirements: 3.2_
  - [ ] 3.3 Add Kotsu's icon and header from `art/`, the art credit and `art/LICENSE`
    - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 4. Second target
  - [ ]* 4.1 Point the power at USNO's Interactive Computer Ephemeris, only if everything else is done by December 1
    - _Requirements: 2.1_
