# Requirements Document

## Introduction

The oracle harness runs an unmodified dead DOS binary inside a sandbox and lets programs and
agents question it. It is the only source of truth for this project. The first target is
QUICK-2 v1.0.

Every fact about one program lives in its target profile: file names, directories, screen
size, prompts, keys, limits and hashes. A requirement below that says "as the profile states"
reads its value from there. The harness code holds no QUICK-2 fact; Requirement 6.5 makes the
profile cite where each program fact came from.

## Glossary

- **Oracle**: the original binary running in the harness.
- **Target profile**: `oracle/targets/<name>.json`. Describes one dead program: archive URL and
  pinned sha256, drive layout, entry program, screen size, screens, prompts, field regions,
  keys, limits, frozen date, control cases, and generator ranges.
- **Harness config**: `oracle/harness.json`. Settings that belong to the harness, not the
  program: emu2 commit, concurrency limit, CPU and memory limits, session idle limit, rebuild
  command and rebuild time limit.
- **Case**: one set of inputs for one mode and shape, typed as strings.
- **Recording run**: a run that the case runner stores as a golden. The only kind that writes
  under `oracle/goldens/`.
- **Exploratory run**: a run made to look at the program. It is logged, never stored.
- **Replay**: a fresh run of a stored golden's inputs, to check it. Never stored.
- **Golden**: the stored result of a recording run. One file per case id.
- **Outcome**: what a case ended in. `result` (the program printed answers), `rejected` (the
  program refused an input), or `error` (the program showed an error screen).
- **Control case**: a case listed in the profile whose outcome was observed before the harness
  existed. Used to prove the harness reads the program correctly.
- **Capture**: the screen text, and the files the program wrote, saved from one run.
- **Session**: one running container with one emulator, named by a session id.
- **Ledger**: `results/ledger.json`, the coverage record (Requirement 13).
- **Rebuild**: the reimplementation under test, called through the contract in Requirement 12.
- **Manifest**: `oracle/goldens/MANIFEST.json`, the sha256 of every file the runner stored.

## Requirements

### Requirement 1: Fetch and verify the binary

**User Story:** As a developer, I want the original program downloaded and checked at setup, so
that the repository never contains someone else's binary and every run uses the same one.

#### Acceptance Criteria

1. WHEN setup runs THE SYSTEM SHALL download the archive from the URL the profile states into `oracle/vendor/` unless it is already there, and unpack it.
2. WHEN setup runs THE SYSTEM SHALL compute the archive's sha256 and compare it with the hash the profile states, on every run, including runs that do not download.
3. WHEN the hashes differ THE SYSTEM SHALL stop, report both hashes, and leave the unpacked program unchanged.
4. WHEN the profile states no hash THE SYSTEM SHALL download, print the computed hash, and stop without unpacking, so that a person pins the hash by hand. THE SYSTEM SHALL NOT write a hash into the profile.
5. WHEN a session starts and setup has not verified the archive against the hash the profile currently states THE SYSTEM SHALL refuse to start and say that setup must run.
6. THE SYSTEM SHALL keep `oracle/vendor/` and `oracle/out/` out of version control, and SHALL NOT copy the program's files anywhere inside the repository outside `oracle/vendor/`.

### Requirement 2: Run the binary in a sandbox

**User Story:** As a developer, I want the binary isolated, so that an old unknown executable
cannot touch my machine or the network.

#### Acceptance Criteria

1. THE SYSTEM SHALL run each session in a container started with no network access.
2. THE SYSTEM SHALL run the emulator and the program as a non-root user inside the container.
3. THE SYSTEM SHALL mount no host path into the container except one fresh temporary directory created for that case or session, outside the repository.
4. WHEN a case or session starts THE SYSTEM SHALL fill its temporary directory with the drive layout the profile states, including empty directories, and a copy of the unpacked program. WHEN it ends THE SYSTEM SHALL delete the directory after the captures in Requirement 9 are saved.
5. THE SYSTEM SHALL start each container with the CPU and memory limits the harness config states.
6. THE SYSTEM SHALL freeze the date and time the program sees at the value the profile states.
7. THE SYSTEM SHALL run emu2 as its own executable, built from the commit the harness config states. Harness code SHALL NOT link emu2, and the repository SHALL NOT contain emu2's source or binary.
8. THE SYSTEM SHALL give the program a pseudo-terminal of the rows and columns the profile states.
9. WHEN a case exceeds the profile's case time limit, or a wait exceeds the profile's wait timeout, THE SYSTEM SHALL kill the session and report a timeout, never a result.

### Requirement 3: Manage sessions

**User Story:** As a developer, I want sessions named, limited and cleaned up, so that parallel
work does not collide and nothing is left running.

#### Acceptance Criteria

1. WHEN a session starts THE SYSTEM SHALL give it a session id, and every tool that acts on a session SHALL take that id.
2. WHEN starting a session would exceed the concurrency limit the harness config states THE SYSTEM SHALL refuse with a `session_limit` error.
3. WHEN the server exits THE SYSTEM SHALL stop and remove every container it started. WHEN the server starts THE SYSTEM SHALL remove containers left by a server that is no longer running.
4. WHEN an interactive session is idle longer than the idle limit the harness config states THE SYSTEM SHALL end it as in 3.3 and report that it timed out.

### Requirement 4: Read the screen

**User Story:** As an agent, I want the screen as structured data, so that I can see what the
program shows without guessing column positions.

#### Acceptance Criteria

1. WHEN a screen is read, and after each send, THE SYSTEM SHALL return the full screen text at the size the profile states, the sha256 of that text, and the cursor position.
2. WHEN the profile maps a region of the current screen to a field name THE SYSTEM SHALL return that field's text exactly as printed, padding included, without converting it to a number.
3. WHEN the screen has not changed for the profile's settle time and matches one of the profile's prompt patterns THE SYSTEM SHALL report that the program waits for input, with the prompt id and prompt text. Otherwise it SHALL report no prompt.
4. WHEN the screen matches no screen in the profile THE SYSTEM SHALL return it marked unknown, log it to the ledger with its capture, and not fail.

### Requirement 5: Send input reliably

**User Story:** As a developer, I want input paced by the program, so that the same case gives
the same answer every run.

#### Acceptance Criteria

1. THE SYSTEM SHALL send each input only after the screen or prompt the profile expects is visible, and never by a fixed sleep alone.
2. THE SYSTEM SHALL accept keys in this notation: literal characters as themselves; named keys in braces: `{Enter}`, `{Esc}`, `{Tab}`, `{Backspace}`, `{Up}`, `{Down}`, `{Left}`, `{Right}`, `{Home}`, `{End}`, `{PgUp}`, `{PgDn}`, `{Ins}`, `{Del}`, `{F1}` to `{F12}`; modifiers as `{Shift+F1}`, `{Ctrl+X}`, `{Alt+X}`; a literal brace as `{{` or `}}`. Names are case-insensitive.
3. WHEN a key is not yet verified to reach the program through emu2 THE SYSTEM SHALL refuse it with an `unsupported_key` error rather than send it.
4. WHEN a session starts THE SYSTEM SHALL check that every key the profile lists for the target is valid notation and verified, and refuse to start otherwise.
5. WHEN the profile marks a screen as allowing resend, and the screen hash is unchanged for the settle time after a key, THE SYSTEM SHALL resend the key, up to the profile's retry limit, and record each resend in the transcript. WHEN the limit is reached THE SYSTEM SHALL return an `input_ignored` error.
6. THE SYSTEM SHALL NOT resend on a screen the profile does not mark as allowing resend.

### Requirement 6: Control cases and citations

**User Story:** As a developer, I want the harness proved against answers the binary already
gave, so that I can trust it before trusting its goldens.

#### Acceptance Criteria

1. THE SYSTEM SHALL read control cases from the profile. Each states its inputs, any setup change (for example, a directory left out, or resend turned off), the outcome observed, and where it was observed.
2. WHEN the first recording run starts THE SYSTEM SHALL record every control case, with every screen captured, before any other case.
3. WHEN a control case gives a different outcome or printed value from the one the profile states THE SYSTEM SHALL report a harness failure, store nothing for that case, and stop the batch. The difference is treated as a harness bug first, because the binary already printed the stated value.
4. WHEN control cases are recorded THE SYSTEM SHALL make their case ids and captures available for the profile's citations.
5. THE SYSTEM SHALL require every program fact in the profile (drive layout, screen size, screens, prompts, fields, keys, resend flags) to cite a case id or capture, or to be marked unobserved with its source. THE SYSTEM SHALL list unobserved facts in the ledger.

For QUICK-2 the control cases come from a spike on 2026-11-06, run outside this repository:
the trapezoid case (left slope 3, right slope 2, bottom width 10, n .035, slope .005) printed
depth 3.27 at 300 cfs and 4.22 at 500 cfs; the program stalled after a stray file listing
when `C:\QUICK2\DATA` was missing; and the main menu dropped the first two inputs. Until the
harness records them, the profile values for the drive layout (2.4), screen size (2.8) and
menu resend (5.5) are marked unobserved, with the spike as their source. After recording,
those control captures are their citations.

### Requirement 7: Record goldens

**User Story:** As a developer, I want the oracle's answers stored with everything needed to
reproduce them, so that tests run fast and offline and every stored answer can be traced.

#### Acceptance Criteria

1. THE SYSTEM SHALL write under `oracle/goldens/` only from the case runner, and only during a recording run. Exploratory runs and replays SHALL NOT write there.
2. THE SYSTEM SHALL store one golden file per case id, at `oracle/goldens/cases/<case-id>.json`.
3. WHEN a case id is recorded again THE SYSTEM SHALL replace its golden and captures through the runner, and log the old and new hashes in the ledger.
4. WHEN a case is recorded THE SYSTEM SHALL store: case id, mode, shape, inputs as typed strings, outcome, each field's raw text exactly as printed, the program's message for `rejected` and `error` outcomes, seed, generator version, emu2 commit, profile version and profile sha256, archive sha256, keystroke transcript, capture path, files written (Requirement 9), and the time recorded.
5. WHEN a case times out or ends on an unknown screen THE SYSTEM SHALL log it to the ledger and the run log, and SHALL NOT store it as a golden.
6. WHEN a case is recorded THE SYSTEM SHALL save its capture under `oracle/goldens/captures/<case-id>/`: the final screen for every case, and every screen for control cases.
7. THE SYSTEM SHALL generate cases from a seeded generator whose ranges and boundary values the profile states. The same seed and generator version SHALL produce the same cases.
8. WHEN a batch runs THE SYSTEM SHALL run cases in parallel containers up to the concurrency limit, and report cases per minute.
9. THE SYSTEM SHALL assign case ids before cases are dispatched, so that parallel order cannot change which inputs get which id.

### Requirement 8: Check determinism

**User Story:** As a developer, I want repeat runs checked, so that a flaky answer is caught
instead of stored as truth.

#### Acceptance Criteria

1. WHEN a recording batch runs THE SYSTEM SHALL run twice every case whose sequence number is a multiple of 20, and every control case.
2. THE SYSTEM SHALL compare the two runs on outcome, raw field text, and the hashes of files written.
3. THE SYSTEM SHALL store the first run.
4. WHEN the two runs differ THE SYSTEM SHALL log the case id and both values to the ledger as nondeterminism.

### Requirement 9: Capture files the program writes

**User Story:** As a developer, I want the program's files kept, so that save formats such as
`.XSC` and `HEC2.DAT` can be studied and tested.

#### Acceptance Criteria

1. WHEN a case ends THE SYSTEM SHALL compare the temporary drive with its starting contents and save every file created or changed, with its sha256: into the capture for a recording run, and into the run log for an exploratory run.
2. Printer output is out of scope for now. THE SYSTEM SHALL record in the ledger whether emu2 can send LPT1 output to a file.

### Requirement 10: Protect goldens

**User Story:** As a developer, I want edits to goldens refused or caught, so that no typed
value passes for an observation.

#### Acceptance Criteria

1. WHEN a Kiro write tool targets a path under `oracle/goldens/` THE SYSTEM SHALL block it through a hook.
2. WHEN the runner stores or replaces a file under `oracle/goldens/` THE SYSTEM SHALL update the manifest with that file's sha256.
3. WHEN the golden check runs THE SYSTEM SHALL fail if any file under `oracle/goldens/` is missing from the manifest, any manifest entry has no file, or any hash differs.
4. THE SYSTEM SHALL run the golden check before every comparison, and refuse to compare when it fails.

Limit: the hook sees only Kiro's write tools. A shell command, another program or a person can
still edit a golden. The manifest catches such an edit afterwards, unless the manifest was
edited to match, which the check cannot detect. Reviewing changes under `oracle/goldens/` in
version control is the remaining safeguard.

### Requirement 11: Compare

**User Story:** As a developer, I want a mismatch report, so that I can see exactly where the
rebuild differs.

#### Acceptance Criteria

1. WHEN the comparison runs THE SYSTEM SHALL compare the outcome first, then each field's text with leading and trailing whitespace trimmed. WHEN the profile marks a field as raw THE SYSTEM SHALL compare it untrimmed.
2. THE SYSTEM SHALL NOT parse field text as numbers, and SHALL NOT special-case field width or overflow text such as `****`. Those are display rules the rebuild must reproduce.
3. WHEN differences exist THE SYSTEM SHALL write each one to `oracle/out/mismatches.json` with case id, kind (`outcome`, `value`, `missing_field`, `extra_field`, `rebuild_error`), field, oracle text and rebuild text. THE SYSTEM SHALL rewrite the file on every run, as an empty list when there are none.
4. WHEN the comparison ends THE SYSTEM SHALL print a summary grouped by field with counts, and update the ledger's mismatch section.
5. THE SYSTEM SHALL exit with 0 when everything matches, 1 when there are mismatches, 3 when the rebuild crashed or broke its contract, and 4 when the harness could not compare (golden check failed, no goldens, bad config). Code 2 is not used, because Kiro hooks treat 2 as a block.
6. THE SYSTEM SHALL offer a quick set of 200 cases, listed in `oracle/quickset.json`, spread across every mode and shape the profile lists and including every control case. It SHALL run against stored goldens only, start no container, and finish in under 30 seconds of wall-clock time, rebuild start included, on the development laptop (Acer Nitro ANV15-52, Intel Core i9-13900H, 32 GB). WHEN goldens do not yet cover a mode and shape THE SYSTEM SHALL report that pair as uncovered.
7. THE SYSTEM SHALL offer a full set of every stored golden, with a target of 10,000 cases, and report the actual count.

### Requirement 12: Rebuild contract

**User Story:** As a developer, I want a fixed interface to the rebuild, so that the comparator
grades exactly what ships.

#### Acceptance Criteria

1. THE SYSTEM SHALL start the rebuild with the command the harness config states, and write one JSON request per line to its stdin: `{"id", "mode", "shape", "inputs"}`, with inputs as the typed strings.
2. THE SYSTEM SHALL read one JSON response per line from its stdout: `{"id", "outcome", "printed", "message"}`, where `printed` maps field names to strings. Stderr is saved to the run log and not parsed.
3. THE SYSTEM SHALL treat exit code 0 with one response for every request as a complete run, including responses whose outcome is `error`.
4. WHEN the rebuild exits nonzero, writes a line that is not valid JSON or has an unknown id, leaves a request without a response, or exceeds the rebuild time limit THE SYSTEM SHALL record every unanswered case as `rebuild_error` and exit with code 3.
5. WHEN a response lacks a field the golden has THE SYSTEM SHALL record `missing_field`. WHEN it has a field the golden lacks THE SYSTEM SHALL record `extra_field`.

### Requirement 13: Coverage ledger

**User Story:** As a developer, I want coverage recorded from observations, so that nobody
claims coverage from memory.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep the ledger at `results/ledger.json`, under version control.
2. THE SYSTEM SHALL write these sections: `screens` (visits, keys tried), `fields` (cases with each field), `cases` (counts by mode, shape and outcome), `unanswered` (timeouts), `unknown_screens`, `nondeterminism`, `rerecords`, `mismatches` (by field, with a triage status), `unobserved` (profile facts without a citation), and `harness_findings` (such as whether LPT1 can go to a file and why the menu drops input). The Exhumer writes `open_questions`, `decisions`, `stopped`, each field's `understood` flag, each screen's untried keys, and mismatch triage status.
3. THE SYSTEM SHALL count a field as exercised only when a stored golden with outcome `result` contains it, and a screen as visited only when the harness observed it.
4. THE SYSTEM SHALL write the ledger from one process at a time, replacing the file atomically.
5. WHEN asked for coverage THE SYSTEM SHALL report unexercised fields, untried keys, unobserved profile facts and untriaged mismatches from the ledger alone.

### Requirement 14: Serve the oracle over MCP

**User Story:** As Kiro, I want tools for the oracle, so that I can question the binary during a
session.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose `boot_target`, `read_screen`, `send_keys`, `run_case`, `run_batch`, `compare`, `ledger_read`, and `shutdown` over stdio.
2. THE SYSTEM SHALL use tool names matching `^[a-zA-Z][a-zA-Z0-9_]*$`.
3. THE SYSTEM SHALL declare an input and output JSON Schema for every tool, with these fields:

   | Tool | Input | Output |
   |---|---|---|
   | `boot_target` | `profile` (optional, default from `ORACLE_TARGET`) | `session_id`, `screen` |
   | `read_screen` | `session_id` | `screen` |
   | `send_keys` | `session_id`, `keys` (notation in 5.2), `expect` (optional screen or prompt id), `timeout_s` (optional, capped by the profile) | `screen`, `resends` |
   | `run_case` | `mode`, `shape`, `inputs`, `record` (default false) | `run_id`, `case_id` (when recorded), `outcome`, `printed`, `message`, `files`, `capture_path` |
   | `run_batch` | `seed`, `count`, `modes`, `shapes` (optional), `record` (default false) | `batch_id`, `cases_run`, `recorded`, `timeouts`, `unknown_screens`, `nondeterministic`, `cases_per_minute`, `report_path` |
   | `compare` | `set` (`quick` or `full`), `case_ids` (optional) | `total`, `matched`, `by_kind`, `by_field`, `uncovered`, `report_path`, `exit_code` |
   | `ledger_read` | `section` (optional) | the ledger, or that section |
   | `shutdown` | `session_id` (optional; all sessions when absent) | `closed` |

   where `screen` is `{rows, hash, cursor, screen_id or null, unknown, prompt or null, fields}`.
4. WHEN a tool fails THE SYSTEM SHALL return `{"error": {"category", "message", "retryable", "detail"}}`. Categories: `invalid_arguments`, `setup_required`, `hash_mismatch`, `docker_unavailable`, `session_not_found`, `session_limit`, `timeout`, `input_ignored`, `unsupported_key`, `emulator_failed`, `profile_invalid`, `golden_check_failed`, `rebuild_failed`, `internal`. `retryable` is true only for `session_limit`, `timeout`, `input_ignored` and `emulator_failed`.
5. THE SYSTEM SHALL NOT expose any tool that writes a golden directly. A tool writes directly if it accepts golden content, field values or a path under `oracle/goldens/` from the caller. `run_case` and `run_batch` with `record: true` are allowed, because the runner stores only what the binary printed.
6. WHEN Docker is not running THE SYSTEM SHALL return `docker_unavailable` with a plain message.
7. THE SYSTEM SHALL log every exploratory run under `oracle/out/runs/<run-id>/` with its transcript, final screen and files, so that what an agent saw can be found again.

## Out of scope

- Printer output (F5 to LPT1), beyond recording whether emu2 can send it to a file (9.2).
- Screen display attributes such as colour and highlighting. The harness reads text only.
- HEC-2, PLOT-2 and AutoHEC-2 from the same bundle.

## Open questions

- **Golden layout versus `structure.md`.** The steering file says goldens are one file per mode.
  This spec stores one file per case id, plus `captures/` and `MANIFEST.json`. Provisional:
  this spec wins and `structure.md` is updated.
- **Control captures that are not ordinary cases.** The no-DATA stall and the dropped menu input
  have no `result`, `rejected` or `error` outcome, and the stall would otherwise count as a
  timeout or unknown screen, which is never stored. Provisional: the profile defines the stray
  listing as a known screen, each such control case gets the outcome `observed` with the
  expected screen id, and they are stored like other goldens. Their ids are not yet settled;
  `structure.md` only defines mode-shape-sequence ids.
- **Ledger ownership.** The exhume-loop spec also defines the ledger and a task for
  `ledger_read`. Provisional: this spec owns the schema and `ledger_read`.
