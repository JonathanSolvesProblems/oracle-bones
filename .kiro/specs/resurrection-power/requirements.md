# Requirements Document

## Introduction

The Kiro power is what a developer installs to run a resurrection on their own dead program.
It packages the oracle server, the steering law and the method. The current power format is a
directory with `plugin.json`, an optional `mcp.json`, and `skills/`.

## Requirements

### Requirement 1: Install

**User Story:** As a developer, I want one install, so that I can try this on my own binary.

#### Acceptance Criteria

1. THE SYSTEM SHALL ship a valid `power/plugin.json` with name `oracle-bones`, version, description, author and keywords.
2. THE SYSTEM SHALL ship `power/mcp.json` that starts the oracle server.
3. WHEN Docker is not running THE SYSTEM SHALL say so plainly and stop.

### Requirement 2: Run on a new target

**User Story:** As a developer, I want to start from my own program, so that this is not tied to QUICK-2.

#### Acceptance Criteria

1. WHEN a user points the power at a binary THE SYSTEM SHALL draft a target profile by booting it.
2. THE SYSTEM SHALL ship a `resurrect` skill describing the method and the oracle law.
3. WHEN the program needs something the emulator lacks THE SYSTEM SHALL report what failed rather than pretend it ran.

### Requirement 3: Prove the install

**User Story:** As a judge, I want it to work from clean, so that the claim is real.

#### Acceptance Criteria

1. WHEN the power is installed in a fresh Kiro workspace THE SYSTEM SHALL reproduce the QUICK-2 smoke test.
2. THE SYSTEM SHALL document the exact install and run commands in the README's "How to run it" section, copied from that clean test.

### Requirement 4: Identity

**User Story:** As a developer browsing powers, I want to recognise this one at a glance, so that I remember it and come back to it.

#### Acceptance Criteria

1. THE SYSTEM SHALL use Kotsu (`docs/mascot.md`) as the power's icon and README header.
2. THE SYSTEM SHALL keep Kotsu out of the reviewer app, its results screen and its printout.
3. THE SYSTEM SHALL credit the art and state its licence (CC BY 4.0) in the README.
