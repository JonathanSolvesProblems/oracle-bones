# Requirements Document

## Introduction

The Exhumer is the agent that questions a dead program and writes down what it finds. Its
output is a Kiro feature spec for the rebuild, where every behaviour traces to an observation.
The solver spec for Quickened is produced by running this loop, not written by hand.

## Glossary

- **Ledger**: `results/ledger.json`, the coverage record. Its schema, its writer and `ledger_read` are owned by the oracle-harness spec (Requirement 13). The Exhumer writes only its own sections: `open_questions`, `decisions`, `stopped`, each field's `understood` flag, each screen's untried keys, and mismatch triage status.
- **Haunting**: a behaviour where the dead program disagrees with the exact answer.

## Requirements

### Requirement 1: The agent chooses its next step

**User Story:** As a developer, I want the model deciding what to ask next, so that it spends its questions on what it does not yet understand.

#### Acceptance Criteria

1. WHEN an observation arrives THE SYSTEM SHALL let the Exhumer choose between probing an unvisited screen, running a named boundary case, reading a manual section, writing a requirement, or stopping.
2. THE SYSTEM SHALL record each choice in the ledger with the observation that prompted it.
3. THE SYSTEM SHALL NOT use code that fixes the order of those steps.
4. WHEN the Exhumer stops THE SYSTEM SHALL record why, and list what remains unexercised.

### Requirement 2: Map the program

**User Story:** As a developer, I want every screen found, so that the rebuild covers the whole program.

#### Acceptance Criteria

1. WHEN the Exhumer reaches a new screen THE SYSTEM SHALL add it to the target profile with its field regions.
2. WHEN a screen offers a key not yet tried THE SYSTEM SHALL list that key as an open question in the ledger.
3. THE SYSTEM SHALL record how the program reacts to invalid input for each field.

### Requirement 3: Write requirements from evidence

**User Story:** As a developer, I want a spec I can trust, so that nothing in it is a guess.

#### Acceptance Criteria

1. WHEN the Exhumer learns a behaviour THE SYSTEM SHALL add an EARS requirement to `.kiro/specs/quick2-solver/requirements.md`.
2. THE SYSTEM SHALL cite a case id or screen capture for each requirement.
3. WHEN a requirement rests on the manual only THE SYSTEM SHALL mark it as unobserved.
4. WHEN a later observation contradicts a requirement THE SYSTEM SHALL change the requirement and keep the case that showed it.

### Requirement 4: Triage every mismatch

**User Story:** As a developer, I want each mismatch classified, so that the rebuild converges instead of being patched at random.

#### Acceptance Criteria

1. WHEN a mismatch class appears THE SYSTEM SHALL classify it as a spec error, a display rule, or a haunting, and give the evidence.
2. WHEN it is a spec error THE SYSTEM SHALL open a bugfix spec with Current, Expected and Unchanged behaviour.
3. WHEN it is a display rule THE SYSTEM SHALL add the rule under `app/src/format/` and a property test.
4. WHEN it is a haunting THE SYSTEM SHALL add an entry to `results/hauntings.md` and keep the printed behaviour.
5. THE SYSTEM SHALL have the Skeptic sub-agent review each classification before it is accepted, with access to the oracle but not to the Exhumer's reasoning.

### Requirement 5: Prove the oracle mattered

**User Story:** As a judge, I want to see what the oracle added, so that the claim can be checked.

#### Acceptance Criteria

1. WHEN the ablation runs THE SYSTEM SHALL build a rebuild from the manual alone, with no oracle access and no spec, in a separate folder.
2. THE SYSTEM SHALL grade that rebuild on the same full case set as the real one.
3. THE SYSTEM SHALL write both results to `results/ablation-manual-only.md`, including any case where the ablation does better.
