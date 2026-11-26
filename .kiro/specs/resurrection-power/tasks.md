# Implementation Plan

Each task writes its tests first. "Live" means it boots the program; the rest run offline.

- [x] 1. The package and the harness copy
  - [x] 1.1 Test the format rules of 1.1 to 1.4 on `power/`, then write `plugin.json`, `mcp.json` and the `resurrect` skill. Offline.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2_
  - [x] 1.2 Test `build_power.py --check` and the standard-library check, then write the script and generate `power/oracle/`. Offline.
    - _Requirements: 5.1, 5.2, 5.3, 1.4_

- [x] 2. The server from the installed layout
  - [x] 2.1 Test that the server, copied to a temporary folder and started as `mcp.json` says, answers `initialize`, lists its tools and writes nothing there; then split the code root from the workspace root. Offline.
    - _Requirements: 6.1, 6.2_
  - [x] 2.2 Test roots, `set_workspace` and the no-workspace message with a fake client, and that every user path falls under the workspace; then build them. Offline.
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 3. The workspace files
  - [x] 3.1 Test `init_workspace` on an empty and a non-empty folder, the widened drift test and the hook commands; then generate `power/workspace/` and write the tool. Offline.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Docker, the image and the download
  - [x] 4.1 Test the two Docker messages with a fake `docker`, and that no other process starts; then write the check. Offline.
    - _Requirements: 8.1_
  - [x] 4.2 Test that the Dockerfile fetches emu2 at a pinned commit and that the image is built from the package; then change them. Offline.
    - _Requirements: 8.2, 8.3_
  - [x] 4.3 Test the download into the workspace and the hash refusal against a local file server; then wire `fetch.py` in. Offline.
    - _Requirements: 9.1, 9.2_

- [x] 5. The new-target command
  - [x] 5.1 Test the draft and the failure report from recorded screens and a runner that fails; then write `draft_target`. Offline.
    - _Requirements: 2.1, 2.3_
  - [x] 5.2 Boot MAINHLP.EXE and compare its draft with what the boot showed. Live.
    - _Requirements: 2.4_

- [ ] 6. The clean install (the person)
  - [x] 6.1 In an empty folder in a new Kiro window, install the power and reproduce the control case; paste back what happened, and record it in the build log. Live.
    - _Requirements: 3.1_
  - [ ] 6.2 Write the README's "How to run it" from that record only. Offline.
    - _Requirements: 3.2_

- [ ] 7. Identity
  - [x] 7.1 Test that `app/` names neither Kotsu nor any file in `art/`. Offline; does not wait for the art.
    - _Requirements: 4.2_
  - [ ] 7.2 When `art/` holds the art: the README header, the credit and the licence. Offline; blocks nothing.
    - _Requirements: 4.1, 4.3, 4.4_

- [ ]* 8. Second target (optional)
  - [ ]* 8.1 Point the power at USNO's Interactive Computer Ephemeris, only if everything else is done by December 1. Live.
    - _Requirements: 2.1_

- [x] 9. What the clean install found (from the command line, outside Kiro, 2026-11-26)
  - [x] 9.1 Test that the package's folder carries the manifest's name; then move `power/` to `powers/oracle-bones/` and make the script, the tests and the paths follow. Offline.
    - _Requirements: 1.5_
  - [x] 9.2 Test `init_workspace`'s `next`, the grading script with no rebuild and with `oracle/rebuild.json`, the guard's message in both places, the first recording's note and the skill's words; then write them. Offline.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 9.3 Drive the server from a copy of the package outside this repository through `set_workspace`, `init_workspace` and the control case. Live.
    - _Requirements: 6.1, 3.1_
