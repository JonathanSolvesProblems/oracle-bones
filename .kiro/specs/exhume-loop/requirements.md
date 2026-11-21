# Requirements Document

## Introduction

The Exhumer is a Kiro custom agent that questions QUICK-2 through the oracle MCP tools and
writes what it finds as a Kiro spec, `.kiro/specs/quick2-solver/requirements.md`. Every
requirement in that spec cites a recorded case or capture. The solver spec is produced by
running this loop, not written by hand.

The loop lives in the model's session. Code supplies the tools, the ledger and the checks; the
model decides what to do next from what it has just seen. The Exhumer has no shell. It acts only
through the oracle tools and Kiro's read and write tools.

This spec builds on the oracle-harness spec (the tools, the target profile, goldens, the
manifest and the ledger) and changes it in one place: a ninth tool, `ledger_write`
(Requirement 2).

## Glossary

- **Exhumer**: `.kiro/agents/exhumer.md`. Tools: read, write, the oracle MCP tools, and the
  skeptic sub-agent. No shell.
- **Skeptic**: `.kiro/agents/skeptic.md`. Tools: read and the oracle MCP tools. It is given a
  claim and a classification, never the Exhumer's reasoning.
- **Profile, golden, capture, manifest, ledger, control case, behaviour case, exploratory run,
  recording run**: as in the oracle-harness glossary.
- **Exhumer sections**: the parts of the ledger only the Exhumer writes: `decisions`,
  `open_questions`, `stopped`, each field's `understood` flag, each screen's `keys_untried`,
  and each mismatch's triage (`status`, `classification`).
- **Citable evidence**: the case id of a stored golden, or the path of a file under
  `oracle/goldens/captures/` that the manifest lists. Exploratory run ids and anything under
  `oracle/out/` are not citable: that folder is gitignored and may be deleted.
- **Help**: the program's own help text. `MAINHLP.EXE` in the FEMA archive shows it, and
  `QT.EXE` runs it when F1 is pressed on the main menu (seen in an exploratory run on
  2026-11-21, not yet recorded). It is the only manual the Exhumer reads.
- **Solver spec**: `.kiro/specs/quick2-solver/`, written by the Exhumer.
- **Haunting**: a behaviour where the program disagrees with the exact answer (oracle law 5).

## Requirements

### Requirement 1: The agent chooses its next step

**User Story:** As a developer, I want the model deciding what to ask next, so that it spends
its questions on what it does not yet understand.

#### Acceptance Criteria

1. WHEN an observation arrives THE SYSTEM SHALL let the Exhumer choose its next action from: probe a screen in an interactive session, run an exploratory case, read the help, change the profile, record a case, write a requirement, triage a mismatch, ask the Skeptic, or stop.
2. THE SYSTEM SHALL record each choice in the ledger's `decisions` through `ledger_write`, with what the Exhumer saw, what it chose, why, and the run ids or case ids that prompted it.
3. THE SYSTEM SHALL NOT contain code that fixes the order of those actions. The `resurrect` workflow fixes only the order of its phases.
4. WHEN the Exhumer stops THE SYSTEM SHALL record why in `stopped`, together with the coverage report the harness computes from the ledger at that moment (oracle-harness 13.5), so that what stays unexercised is never stated from memory.
5. WHEN a case ends in `timeout` or `unknown_screen` THE SYSTEM SHALL let the Exhumer record it as an open question, and SHALL NOT let it state a value for a case that did not finish.

### Requirement 2: The Exhumer writes its ledger sections through the harness

**User Story:** As a developer, I want the Exhumer's notes written by the same ledger module as
the harness's, so that the ledger keeps one writer and the Exhumer needs no shell.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose a ninth MCP tool, `ledger_write`, that writes only the Exhumer sections, through `oracle/ledger.py`, with the same lock and atomic replace as the harness's own writes (oracle-harness 13.4).
2. `ledger_write` SHALL offer these operations: `decide` (append a decision), `ask` (append an open question), `answer` (close an open question with its answer and evidence), `stop` (record a stop), `understood` (set a field's flag), `keys_untried` (set a screen's untried keys), and `triage` (set a mismatch's classification and status).
3. THE SYSTEM SHALL number decisions in order, give each open question an id of the form `Q-001`, and add the time to each entry. The caller supplies none of these.
4. WHEN an operation cites evidence THE SYSTEM SHALL check that each case id is a stored golden, each capture path is listed in the manifest, and each run id or batch id has a run log under `oracle/out/runs/`, and SHALL refuse with `invalid_arguments` otherwise.
5. WHEN `understood` names a field the profile does not map, `keys_untried` names a screen the profile does not list or a key that is not valid notation, `answer` names an open question that does not exist or is closed, or `triage` names a field with no mismatch entry, THE SYSTEM SHALL refuse with `invalid_arguments`.
6. WHEN `understood` sets a field to true THE SYSTEM SHALL require at least one case id among its evidence.
7. WHEN `decide` is called while `stopped` is set THE SYSTEM SHALL clear `stopped`, because a new run has begun. The earlier stop stays in `decisions`.
8. THE SYSTEM SHALL NOT let `ledger_write` change a harness section, and SHALL NOT let a harness writer change an Exhumer section.
9. `ledger_write` SHALL write only `results/ledger.json`. It reads the goldens store and the manifest to check evidence and writes nothing under `oracle/goldens/`.

Limit: the Exhumer's write tool can still edit `results/ledger.json` as a text file, which
bypasses the lock and the checks. The agent's instructions forbid it, and nothing detects it
afterwards. Reviewing changes to the ledger in version control is the remaining safeguard.

### Requirement 3: Read the program's help

**User Story:** As a developer, I want the Exhumer to start from what the program's authors
wrote, without putting a manual in the repository.

#### Acceptance Criteria

1. THE SYSTEM SHALL let the Exhumer reach the help through the oracle, by sending F1 on the main menu. F1 SHALL be verified to reach the program with a capture before it is used (oracle-harness 5.3).
2. THE SYSTEM SHALL NOT add a manual file, or text typed from the help, to the repository. Help text enters the repository only as captures recorded from the binary.
3. WHEN a requirement rests on the help alone THE SYSTEM SHALL mark it unobserved and cite the recorded capture of the help screen (Requirement 5.4).
4. WHEN the help and an observation disagree THE SYSTEM SHALL keep the observed behaviour in the requirement and record the disagreement as an open question (oracle law 3).

### Requirement 4: Map the program in the profile

**User Story:** As a developer, I want every screen the Exhumer finds added to the profile
without changing what a stored golden means.

#### Acceptance Criteria

1. WHEN the Exhumer reaches a screen the profile does not list THE SYSTEM SHALL let it add the screen to `oracle/targets/quick2.json` with its write tool: id, kind, marker, and any prompts, field regions and message region, marked `unobserved` with the run id where it was seen, until a recorded case cites it.
2. THE SYSTEM SHALL treat these profile changes as additive: a new screen, prompt, field or message region on a new screen, a flow for a mode and shape pair that has none, a mode or shape code, a range, a key already verified, a behaviour case, and a citation that replaces an `unobserved` note.
3. WHEN the profile file has changed THE SYSTEM SHALL, before the next tool call that runs the program, validate it (oracle-harness 6.5) and re-read every stored golden's captured final screen under it: the screen id for a behaviour case, and the outcome, every field's raw text and the message for any other case, must come out as stored. It SHALL also read the screen each transcript step started from, wherever the capture holds it, and that screen's id (first match in profile order) must be the screen the step expected. A golden that captured every screen must hold a capture for every step.
4. WHEN the re-read gives a different result for any golden THE SYSTEM SHALL refuse every tool that runs the program with `profile_invalid`, naming each golden and difference, until the profile reads every golden as stored.
5. THE SYSTEM SHALL keep the profile's `version` unchanged for a change that passes the re-read. Goldens recorded before the change keep their `profile_sha256` and stay valid; goldens recorded after it carry the new sha256.
6. A change that the re-read refuses (for example a different marker, region, prompt or flow step that recorded goldens depend on, a screen order that moves a capture to another screen, or a removed screen) SHALL be left to a person, who raises `version` and replaces each affected golden with `python -m oracle.record --rerecord <case-id>`, which logs it in `rerecords`. The Exhumer records the needed change as an open question.
7. WHEN a screen offers a key that the ledger does not list as tried on it THE SYSTEM SHALL let the Exhumer list that key in the screen's `keys_untried`, whether or not the key is verified yet.
8. WHEN the Exhumer maps a form THE SYSTEM SHALL have it record, for each input, at least one case with a boundary value from the profile's ranges, so that how the program reacts to invalid input is stored as a golden.

### Requirement 5: Turn an exploratory finding into a citable case

**User Story:** As a developer, I want every citation to point at something the binary printed
and the repository keeps.

#### Acceptance Criteria

1. THE SYSTEM SHALL treat exploratory runs (`run_case` and `run_batch` with `record` false, and interactive sessions) as evidence for decisions and open questions only, never as citations in the solver spec.
2. WHEN the Exhumer wants to cite a case it has run THE SYSTEM SHALL have it run the same inputs again with `run_case` and `record: true`. That call creates a new case id and never replaces a golden (oracle-harness 7.3, 14.5). The case id in its reply is the citation.
3. THE SYSTEM SHALL record a case only when its mode and shape have a flow in the profile and it ends on a screen of kind `result`, `rejected` or `error` (oracle-harness 7.5). A finding that ends anywhere else needs a profile change first (Requirement 4).
4. WHEN the finding is a behaviour that no flow reaches, such as the help screen, THE SYSTEM SHALL have the Exhumer add a behaviour case `obs-<behaviour>-<sequence>` to the profile's controls, with its steps, the screen it ends on, and the run id it was seen in as its source. The recorder records every control case not yet stored, with every screen captured, at the start of the next recording call (oracle-harness 6.2), and those captures are then citable.
5. WHEN a recorded case's outcome or printed text differs from the exploratory run it repeats THE SYSTEM SHALL have the Exhumer cite neither, and record an open question naming both.
6. THE SYSTEM SHALL count a behaviour as repeated when two runs show it: the exploratory run that found it and the recorded case, or two recorded cases.

### Requirement 6: Write requirements from evidence

**User Story:** As a developer, I want a solver spec I can trust, so that nothing in it is a
guess.

#### Acceptance Criteria

1. WHEN the Exhumer has seen a behaviour repeated (Requirement 5.6) THE SYSTEM SHALL let it add an EARS acceptance criterion to `.kiro/specs/quick2-solver/requirements.md`.
2. THE SYSTEM SHALL end every acceptance criterion in that file with one citation: `_(observed: <case ids or capture paths>)_`, or `_(unobserved; help: <capture path>)_` for a criterion that rests on the help alone.
3. WHEN `scripts/check_traceability.py` runs THE SYSTEM SHALL report, by line, every criterion without a citation, every cited case id that is not a stored golden, every cited capture path the manifest does not list, and every citation of a run id or a path under `oracle/out/`. It SHALL exit 0 when every criterion passes and 1 otherwise.
4. THE SYSTEM SHALL write values in criteria as the program printed them, padding aside, and SHALL NOT state a value computed from an equation as the program's (oracle law 4).
5. WHEN a later observation contradicts a criterion THE SYSTEM SHALL have the Exhumer rewrite the criterion to fit every observation, cite the case that contradicted it, and record the change as a decision.

### Requirement 7: Triage every mismatch

**User Story:** As a developer, I want each mismatch classified, so that the rebuild converges
instead of being patched at random.

This requirement needs the comparator (oracle-harness task 8) and a rebuild to compare.

#### Acceptance Criteria

1. WHEN a mismatch class appears THE SYSTEM SHALL have the Exhumer classify it as a spec error, a display rule, or a haunting, give the evidence, and record it with `ledger_write` `triage` as `proposed`.
2. WHEN it is a spec error THE SYSTEM SHALL open a bugfix spec named after the behaviour, with Current, Expected and Unchanged behaviour.
3. WHEN it is a display rule THE SYSTEM SHALL add the rule under `app/src/format/` with a property test.
4. WHEN it is a haunting THE SYSTEM SHALL add an entry `H-<sequence>` to `results/hauntings.md` with the case, what the program printed, the exact answer and the difference, and keep the printed behaviour.
5. THE SYSTEM SHALL have the Skeptic review each classification before its status becomes `accepted`, with the oracle tools but without the Exhumer's reasoning. WHEN the Skeptic's verdict is `fails` THE SYSTEM SHALL set the status to `disputed`.

### Requirement 8: Prove the oracle mattered

**User Story:** As a judge, I want to see what the oracle added, so that the claim can be
checked.

#### Acceptance Criteria

1. WHEN the ablation runs THE SYSTEM SHALL build a second rebuild in a separate folder, with the same model and one prompt, no oracle access and no spec.
2. THE SYSTEM SHALL grade that rebuild on the same full case set as the real one.
3. THE SYSTEM SHALL write both results to `results/ablation-manual-only.md`, including every case where the ablation does better.

Open: which documentation the ablation is given. The plan says "the manual"; this spec puts no
manual in the repository (Requirement 3.2). To be decided before task 5.2.

## Out of scope

- The help of HEC-2, PLOT-2 and AutoHEC-2 from the same bundle.
- Printer output (oracle-harness 9.2).
- Changes to the harness beyond `ledger_write`, the profile re-read, and verifying F1.
