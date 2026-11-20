# Implementation Plan

- [x] 1. Config and profile
  - [x] 1.1 Write `oracle/harness.json`: emu2 repo and pinned commit, `max_sessions`, container CPU, memory and pids limits, session idle limit, rebuild command and time limit
    - _Requirements: 2.5, 2.7, 3.2, 3.4, 12.1_
  - [x] 1.2 Write the profile JSON Schema and loader in `oracle/profile.py`: reject unknown keys, and any program fact with neither `cite` nor `unobserved`
    - _Requirements: 6.5_
  - [x] 1.3 Write `oracle/targets/quick2.json`: archive URL and size with `sha256` null, env, drive layout, entry, screen size and pty rows, frozen time, limits, keys, mode and shape codes, screens and markers, form order, ranges and boundaries, and the four control cases from the 2026-11-06 spike, each spike fact marked unobserved with its source
    - _Requirements: 1.1, 2.4, 2.6, 2.8, 2.9, 4.3, 5.4, 5.5, 6.1, 6.5, 7.7, 11.1_

- [x] 2. Fetch the binary
  - [x] 2.1 Write `scripts/setup.py`: download if missing, hash on every run, stop and report both hashes on mismatch, print and stop when no hash is pinned, unpack by rename, write the `verified.json` stamp
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 Run setup once, review the printed sha256, and pin it in the profile by hand
    - _Requirements: 1.4_
  - [x] 2.3 Make session start refuse with `setup_required` when the stamp does not match the profile's hash
    - _Requirements: 1.5_
  - [x] 2.4 Add a test that `oracle/vendor/` and `oracle/out/` are gitignored and that no file from the unpacked program exists elsewhere in the repository
    - _Requirements: 1.6_

- [x] 3. Sandbox
  - [x] 3.1 Write `oracle/Dockerfile`: build stage for emu2 at the pinned commit, runtime stage with Python 3, `pyte`, libfaketime and a non-root user; tag the image with the emu2 commit
    - _Requirements: 2.2, 2.6, 2.7_
  - [x] 3.2 Write the `docker run` argument builder: `--network none`, non-root `--user`, dropped capabilities, read-only root, CPU, memory and pids limits, harness labels, one `-v` for the temp drive. Property 11.
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [x] 3.3 Write temp drive handling: create the profile's layout outside the repository, copy in the unpacked program, snapshot hashes, diff after the case, delete after captures are saved
    - _Requirements: 2.3, 2.4, 9.1_
  - [x] 3.4 Live sandbox check: only loopback, user id not 0, only the temp drive mounted, and the program sees the frozen date. If libfaketime does not reach the program, stop and ask the user for the fallback.
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [x] 4. Runner
  - [x] 4.1 Write `oracle/runner/agent.py`: emu2 under a pty of the profile's size, pyte screen, JSON-lines `screen`, `wait`, `send`, `kill`; enforce the wait timeout and case time limit by killing and reporting `timeout`
    - _Requirements: 2.8, 2.9, 4.1, 5.1_
  - [x] 4.2 Write host-side screen reading: screen id by marker, unknown screens, raw field extraction, prompt detection with the settle time; unit-test on saved captures
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.3 Write `oracle/runner/keys.py`: tokenizer, xterm encoder, `verified` flags, `unsupported_key` for unverified keys, and the start-of-session check of the profile's keys. Property 7.
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 4.4 Verify each key in the profile's key list against QUICK-2 with a capture, and set `verified` only for keys shown to arrive
    - _Requirements: 5.3, 5.4_
  - [x] 4.5 Write host-side sending: wait for the expected prompt, send, log transcript steps without wall-clock time, resend only on screens marked for it up to the retry limit, then `input_ignored`
    - _Requirements: 5.1, 5.5, 5.6_
  - [x] 4.6 Write the stub target and run Properties 5 and 6 against it
    - _Requirements: 4.3, 5.1, 5.5, 5.6_

- [x] 5. Sessions and ledger
  - [x] 5.1 Write `oracle/sessions.py`: session ids, the concurrency semaphore with `session_limit`, idle sweep, exit handler, and removal of containers left by dead servers. Property 12.
    - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4_
  - [x] 5.2 Write `oracle/ledger.py`: the schema, the harness's sections, a locked atomic update that never touches the Exhumer's sections, and the coverage rules for fields and screens
    - _Requirements: 4.4, 6.5, 13.1, 13.2, 13.3, 13.4_
  - [x] 5.3 Write the exploratory run log under `oracle/out/runs/<run-id>/` with transcript, final screen and files
    - _Requirements: 9.1, 14.7_

- [x] 6. Checkpoint: reproduce the spike
  - [x] 6.1 Run the four control cases as exploratory runs: depth 3.27 at 300 cfs and 4.22 at 500 cfs, the stray listing without the data directory, and the unchanged menu with resend off. A different number is a harness bug first: fix the harness, not the expectation.
    - Do not continue until all four pass.
    - _Requirements: 6.1, 6.3_
  - [x] 6.2 Find why the main menu drops input (keyboard buffer flush, slow start or other) and record the finding in `harness_findings`
    - _Requirements: 5.5, 13.2_
  - [x] 6.3 Find whether emu2 can send LPT1 output to a file, and record the answer in `harness_findings`
    - _Requirements: 9.2_

- [x] 7. Goldens
  - [x] 7.1 Write `oracle/generator.py`: seeded, versioned, ranges and boundaries from the profile, ids assigned before dispatch. Property 3.
    - _Requirements: 7.7, 7.9_
  - [x] 7.2 Write `oracle/recorder.py` and `oracle/record.py`: the golden schema with the `observed` outcome, one file per case id, captures, written files, atomic writes, a create-only path for MCP, `--rerecord <case-id>` on the command line only with `rerecords`, and no storing of timeouts or unknown screens; connect `record: true` in the MCP server to the create-only path
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 14.5_
  - [x] 7.3 Write `oracle/manifest.py`: update the manifest on every store and replace
    - _Requirements: 10.2_
  - [x] 7.4 Add the determinism sample: run twice every twentieth case and every control case, compare, store the first, log differences. Property 1.
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 7.5 Add parallel batches up to `max_sessions` with a single writer thread, and report cases per minute
    - _Requirements: 7.8, 7.9_
  - [x] 7.6 Record the control cases first, with every screen captured, stopping on any difference; then replace the spike's `unobserved` notes in the profile with `cite` entries for drive layout, screen size and menu resend
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [x] 7.7 Property 2: replay a sample of goldens and check they match and write nothing under `oracle/goldens/`
    - _Requirements: 7.1, 7.4, 9.1_

- [ ] 8. Comparison
  - [ ] 8.1 Write `scripts/check_goldens.py`, which prints the stated limit on pass. Property 8.
    - _Requirements: 10.3_
  - [ ] 8.2 Write the rebuild contract runner in `oracle/compare.py` with stub rebuilds that answer, crash, hang and print bad JSON. Property 10.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [ ] 8.3 Write the comparator: golden check first, skip `observed` goldens, outcome then trimmed or raw fields, `mismatches.json` rewritten every run, summary by field, ledger update, exit codes 0, 1, 3, 4. Property 9.
    - _Requirements: 10.4, 11.1, 11.2, 11.3, 11.4, 11.5_
  - [ ] 8.4 Build `oracle/quickset.json` (control cases except behaviour cases, plus an even spread over every mode and shape, 200 in total, uncovered pairs listed) and the full set; time the quick set on the development laptop
    - _Requirements: 11.6, 11.7_

- [x] 9. Serve over MCP
  - [x] 9.1 Write `oracle/schemas.py` and `oracle/errors.py`: input and output schemas for the eight tools, the error categories and the retryable table
    - _Requirements: 14.2, 14.3, 14.4_
  - [x] 9.2 Write `oracle/mcp_server.py` with the eight tools, `docker_unavailable` handling, and `record` accepted and passed through, answering `invalid_arguments` until task 7.2 connects it
    - _Requirements: 14.1, 14.5, 14.6, 14.7_
  - [x] 9.3 Test that every tool name matches the pattern, every reply validates against its schema, and no tool takes golden content, field values or a path under `oracle/goldens/`
    - _Requirements: 14.2, 14.3, 14.5_
  - [x] 9.4 Set `disabled` to false in `.kiro/settings/mcp.json` and boot QUICK-2 from a Kiro chat
    - _Requirements: 14.1_

- [ ] 10. Hooks
  - [ ] 10.1 Write `scripts/guard_goldens.py`, which reads the hook's stdin JSON and exits with code 2, message on stderr, for any write under `oracle/goldens/`
    - First dump one real stdin payload to `oracle/out/hook-stdin.json` to see where the write tool puts the path.
    - _Requirements: 10.1_
  - [ ] 10.2 Write `scripts/oracle_quick.py` (golden check, then the quick comparison) and `scripts/ledger_status.py` (coverage from the ledger alone)
    - _Requirements: 10.4, 11.6, 13.5_
  - [ ] 10.3 Set `enabled` to true in the four files in `.kiro/hooks/`, and test the refusal by asking Kiro to edit a golden
    - Confirm on Windows that the block happens; PowerShell may not pass exit code 2 through.
    - _Requirements: 10.1_

- [ ] 11. Full set
  - [ ] 11.1 Record the full set toward 10,000 cases, report cases per minute and the actual count, and check the ledger for nondeterminism, unanswered cases and unknown screens
    - _Requirements: 7.8, 8.4, 11.7, 13.3_
