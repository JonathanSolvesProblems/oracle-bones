# Implementation Plan

- [ ] 1. Fetch the binary
  - [ ] 1.1 Write `oracle/targets/quick2.json` with the URL, hash and drive layout
    - URL: the Wayback copy of FEMA's `q2v1.zip`, 392,419 bytes. Compute the sha256 on first download and review it before pinning.
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write `scripts/setup.py` to download, verify and unpack into `oracle/vendor/`
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Build the sandbox
  - [ ] 2.1 Write `oracle/Dockerfile`, with emu2 at a pinned commit, Python and pyte
    - _Requirements: 2.2_
  - [ ] 2.2 Write `oracle/runner/session.py`: pty of 27 rows or more, wait on screen markers, kill on timeout
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 4.1_
  - [ ] 2.3 Add function keys and resend-until-changed input
    - _Requirements: 4.2, 4.3_

- [ ] 3. Checkpoint: reproduce the manual
  - [ ] 3.1 Script the trapezoid worked example at 300 and 500 cfs, asserting 3.27 and 4.22
    - Do not continue until this passes.
    - _Requirements: 3.2, 4.1_
  - [ ] 3.2 Property test: determinism across two runs of 20 cases
    - _Requirements: 4.4_

- [ ] 4. Read fields
  - [ ] 4.1 Define screens and field regions for all five shape forms in the profile
    - _Requirements: 3.1, 3.2, 3.4_
  - [ ] 4.2 Unit-test the parser against saved captures
    - _Requirements: 3.2_

- [ ] 5. Goldens and comparison
  - [ ] 5.1 Write the seeded case generator, with boundary cases
    - _Requirements: 5.4_
  - [ ] 5.2 Write `oracle/runner/record.py` and parallel batches, and report cases per minute
    - _Requirements: 5.1, 5.2, 5.5_
  - [ ] 5.3 Write the comparator and `oracle/out/mismatches.json`, with quick and full sets
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Serve over MCP
  - [ ] 6.1 Write `oracle/mcp_server.py` with the eight tools and structured errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 6.2 Set `disabled` to false in `.kiro/settings/mcp.json` and test from a Kiro chat
    - _Requirements: 7.1_

- [ ] 7. Turn on the hooks
  - [ ] 7.1 Write `scripts/guard_goldens.py`, which reads the hook's stdin JSON and exits with code 2 (message on stderr) for any write under `oracle/goldens/`
    - Exit code 2 is the documented block. Other nonzero codes only warn.
    - First dump one real stdin payload to `oracle/out/hook-stdin.json` to see where the write tool puts the path.
    - _Requirements: 5.3_
  - [ ] 7.2 Write `scripts/oracle_quick.py` and `scripts/ledger_status.py`
    - _Requirements: 6.3, 6.4_
  - [ ] 7.3 Set `enabled` to true in the four files in `.kiro/hooks/`, and test the refusal by asking Kiro to edit a golden
    - Confirm on Windows that the block actually happens. The docs warn PowerShell may not pass exit code 2 through.
    - _Requirements: 5.3_
