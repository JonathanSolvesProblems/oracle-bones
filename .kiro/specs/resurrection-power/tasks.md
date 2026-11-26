# Implementation Plan

Each task writes its tests first. "Live" means it boots the program; the rest run offline.

- [ ] 1. The package and the harness copy
  - [ ] 1.1 Test the format rules of 1.1 to 1.4 on `power/`, then write `plugin.json`, `mcp.json` and the `resurrect` skill. Offline.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2_
  - [ ] 1.2 Test `build_power.py --check` and the standard-library check, then write the script and generate `power/oracle/`. Offline.
    - _Requirements: 5.1, 5.2, 5.3, 1.4_

- [ ] 2. The server from the installed layout
  - [ ] 2.1 Test that the server, copied to a temporary folder and started as `mcp.json` says, answers `initialize`, lists its tools and writes nothing there; then split the code root from the workspace root. Offline.
    - _Requirements: 6.1, 6.2_
  - [ ] 2.2 Test roots, `set_workspace` and the no-workspace message with a fake client, and that every user path falls under the workspace; then build them. Offline.
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 3. The workspace files
  - [ ] 3.1 Test `init_workspace` on an empty and a non-empty folder, the widened drift test and the hook commands; then generate `power/workspace/` and write the tool. Offline.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 4. Docker, the image and the download
  - [ ] 4.1 Test the two Docker messages with a fake `docker`, and that no other process starts; then write the check. Offline.
    - _Requirements: 8.1_
  - [ ] 4.2 Test that the Dockerfile fetches emu2 at a pinned commit and that the image is built from the package; then change them. Offline.
    - _Requirements: 8.2, 8.3_
  - [ ] 4.3 Test the download into the workspace and the hash refusal against a local file server; then wire `fetch.py` in. Offline.
    - _Requirements: 9.1, 9.2_

- [ ] 5. The new-target command
  - [ ] 5.1 Test the draft and the failure report from recorded screens and a runner that fails; then write `draft_target`. Offline.
    - _Requirements: 2.1, 2.3_
  - [ ] 5.2 Boot MAINHLP.EXE and compare its draft with what the boot showed. Live.
    - _Requirements: 2.4_

- [ ] 6. The clean install (the person)
  - [ ] 6.1 In an empty folder in a new Kiro window, install the power and reproduce the control case; paste back what happened, and record it in the build log. Live.
    - _Requirements: 3.1_
  - [ ] 6.2 Write the README's "How to run it" from that record only. Offline.
    - _Requirements: 3.2_

- [ ] 7. Identity
  - [ ] 7.1 Test that `app/` names neither Kotsu nor any file in `art/`. Offline; does not wait for the art.
    - _Requirements: 4.2_
  - [ ] 7.2 When `art/` holds the art: the README header, the credit and the licence. Offline; blocks nothing.
    - _Requirements: 4.1, 4.3, 4.4_

- [ ]* 8. Second target (optional)
  - [ ]* 8.1 Point the power at USNO's Interactive Computer Ephemeris, only if everything else is done by December 1. Live.
    - _Requirements: 2.1_
