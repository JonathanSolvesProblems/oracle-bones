# Requirements Document

## Introduction

Quickened is the browser app wrapped around the rebuilt solver. It covers what a person does
with QUICK-2: open a job, enter a channel, read the answer, print it, pass it on. Solver
behaviour is defined by the `quick2-solver` spec, which the Exhumer generates. This spec covers
everything around it.

Design this app with its own identity, drawn from channels and survey sheets. It is not a
retro terminal, and it must not imitate a federal site.

## Requirements

### Requirement 1: Enter a channel

**User Story:** As a permit reviewer, I want the same inputs I know, so that I can check an answer quickly.

#### Acceptance Criteria

1. WHEN a user picks a mode and a shape THE SYSTEM SHALL show the input fields that the program asks for.
2. WHEN an input is one the original rejects THE SYSTEM SHALL reject it in the same way, using the behaviour recorded by the Exhumer.
3. WHEN the page has loaded once THE SYSTEM SHALL work offline.

### Requirement 2: Read the answer

**User Story:** As a permit reviewer, I want the printed answer, so that it matches what I would have got from QUICK-2.

#### Acceptance Criteria

1. WHEN a calculation finishes THE SYSTEM SHALL show the output fields as QUICK-2 prints them.
2. WHEN a case has a known haunting THE SYSTEM SHALL offer the exact value beside the printed one, labelled, and keep the printed one as the default.
3. THE SYSTEM SHALL show on every results screen that this is an independent rebuild, not accepted by FEMA, and to be used as a cross-check.

### Requirement 3: Keep old jobs

**User Story:** As a permit reviewer, I want my old job files to open, so that years of work are not stranded.

#### Acceptance Criteria

1. WHEN a user opens an `.XSC` file THE SYSTEM SHALL load its cross section.
2. WHEN a file cannot be read THE SYSTEM SHALL say which part failed and load nothing.
3. WHEN a user saves THE SYSTEM SHALL write a file the original program can open, proved by the harness.

### Requirement 4: Pass the job on

**User Story:** As a permit reviewer, I want the result in my file and in my next tool, so that the work does not stop at this page.

#### Acceptance Criteria

1. WHEN a user prints THE SYSTEM SHALL produce a page with the inputs, outputs, the date, and the Requirement 2.3 notice.
2. WHEN a user exports THE SYSTEM SHALL write the HEC-2 file that the original writes to `HEC2.DAT`, with matching contents proved by the harness.

### Requirement 5: Show the proof

**User Story:** As a judge, I want the side-by-side view, so that I can see the original and the rebuild agree.

#### Acceptance Criteria

1. THE SYSTEM SHALL show a page with recorded oracle screens beside the rebuild's answers for chosen cases.
2. THE SYSTEM SHALL state the case count and the date of the run, read from `results/headline.md`.
3. THE SYSTEM SHALL state limits inside the product, including behaviours not exercised.
