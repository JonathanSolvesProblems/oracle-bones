# Requirements Document

## Introduction

The oracle harness runs an unmodified dead DOS binary inside a sandbox and lets programs and
agents question it. It is the only source of truth for this project. The first target is
QUICK-2 v1.0, but nothing specific to QUICK-2 may live outside a target profile.

## Glossary

- **Oracle**: the original binary running in the harness.
- **Target profile**: a file describing one dead program: start command, drive layout, prompt
  patterns, and how its screens map to named fields.
- **Case**: one set of inputs and the outputs the oracle printed for them.
- **Golden**: a stored case, recorded only by the harness.

## Requirements

### Requirement 1: Fetch the binary safely

**User Story:** As a developer, I want the original program downloaded at setup, so that the
repository never contains someone else's binary.

#### Acceptance Criteria

1. WHEN setup runs THE SYSTEM SHALL download the program archive from the URL in the target profile into `oracle/vendor/`.
2. WHEN the archive hash differs from the hash in the target profile THE SYSTEM SHALL stop and report both hashes.
3. THE SYSTEM SHALL keep `oracle/vendor/` out of version control.

### Requirement 2: Run the binary in a sandbox

**User Story:** As a developer, I want the binary isolated, so that an old unknown executable cannot touch my machine or the network.

#### Acceptance Criteria

1. THE SYSTEM SHALL run the binary in a container started with no network access.
2. THE SYSTEM SHALL build the emulator from a pinned commit and run it as a separate process.
3. WHEN a session starts THE SYSTEM SHALL create the drive layout the target profile names, including empty directories such as `C:\QUICK2\DATA`.
4. THE SYSTEM SHALL give the program a pseudo-terminal of at least 27 rows, so that its 25-row screen does not scroll.
5. WHEN a session exceeds the profile's time limit THE SYSTEM SHALL kill it and report a timeout, not a result.

### Requirement 3: Read the screen

**User Story:** As an agent, I want the screen as structured data, so that I can see what the program shows without guessing column positions.

#### Acceptance Criteria

1. WHEN a screen changes THE SYSTEM SHALL return the full 80 by 25 text and a hash of it.
2. WHEN a target profile maps a region to a field name THE SYSTEM SHALL return that field's exact printed string, without converting it to a number.
3. WHEN the program waits for input THE SYSTEM SHALL report the current prompt text.
4. WHEN the screen matches no known screen in the profile THE SYSTEM SHALL return it as unknown rather than failing.

### Requirement 4: Send input reliably

**User Story:** As a developer, I want input paced by the program, so that the same case gives the same answer every run.

#### Acceptance Criteria

1. THE SYSTEM SHALL send each input only after the expected prompt is visible, and never by a fixed sleep alone.
2. WHEN a menu ignores input THE SYSTEM SHALL resend it until the screen changes or a retry limit is reached.
3. THE SYSTEM SHALL support function keys, including F2, F5, F7, F9 and F10.
4. WHEN the same case runs twice THE SYSTEM SHALL produce identical printed fields, and SHALL report any difference as nondeterminism.

### Requirement 5: Record goldens

**User Story:** As a developer, I want the oracle's answers stored, so that tests run fast and offline.

#### Acceptance Criteria

1. WHEN a case runs THE SYSTEM SHALL store the inputs, printed outputs, target hash, and a timestamp.
2. THE SYSTEM SHALL write goldens only from the runner, never from an agent's file edit.
3. WHEN a golden file is edited outside the runner THE SYSTEM SHALL block the edit through a hook.
4. THE SYSTEM SHALL generate cases from a seeded generator, so that a run can be reproduced.
5. WHEN a batch runs THE SYSTEM SHALL run cases in parallel containers and report cases per minute.

### Requirement 6: Compare

**User Story:** As a developer, I want a mismatch report, so that I can see exactly where the rebuild differs.

#### Acceptance Criteria

1. WHEN the comparison runs THE SYSTEM SHALL compare the printed strings for each field.
2. WHEN fields differ THE SYSTEM SHALL write the case id, field, oracle value and rebuild value to `oracle/out/mismatches.json`.
3. WHEN mismatches exist THE SYSTEM SHALL exit nonzero and print a summary grouped by field.
4. THE SYSTEM SHALL offer a quick set of no more than 200 cases that finishes in under 30 seconds, and a full set.

### Requirement 7: Serve the oracle over MCP

**User Story:** As Kiro, I want tools for the oracle, so that I can question the binary during a session.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose `boot_target`, `read_screen`, `send_keys`, `run_case`, `run_batch`, `compare`, `ledger_read`, and `shutdown` over stdio.
2. THE SYSTEM SHALL use tool names matching `^[a-zA-Z][a-zA-Z0-9_]*$`.
3. WHEN a tool fails THE SYSTEM SHALL return a structured error saying whether a retry may help.
4. THE SYSTEM SHALL NOT expose any tool that writes a golden directly.
