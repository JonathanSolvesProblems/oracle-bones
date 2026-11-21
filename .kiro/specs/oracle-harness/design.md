# Design Document

## Overview

A Python MCP server on the host starts one Docker container per case or interactive session.
Inside each container a small runner starts emu2 under a pseudo-terminal, feeds its output to a
`pyte` screen, and talks to the host in JSON lines over the container's stdin and stdout. The
host owns everything that persists: goldens, the manifest, the ledger, run logs. The container
owns nothing that outlives it.

All program facts come from the target profile. All harness settings come from the harness
config. The code reads both and holds no QUICK-2 constant.

## Architecture

```
Kiro --stdio/MCP--> oracle/mcp_server.py            (host)
                      |-- oracle/setup (scripts/setup.py)
                      |-- oracle/sessions.py        session ids, limits, cleanup
                      |-- oracle/recorder.py        the only writer under oracle/goldens/
                      |-- oracle/ledger.py          the only writer of results/ledger.json
                      |-- oracle/compare.py  --stdin/stdout JSONL--> rebuild command
                      |
                      |  docker run (flags below), one per case or session
                      v
                   oracle/runner/agent.py           (container, non-root)
                      |  pty sized from profile
                      v
                   emu2 (own executable, pinned commit) --> program from profile
```

Command-line entry points (`scripts/setup.py`, `oracle/record.py`, `scripts/oracle_quick.py`,
`scripts/check_goldens.py`, `scripts/ledger_status.py`) call the same modules as the MCP tools,
so a hook and a tool cannot behave differently. Every script runs under Windows PowerShell and
Linux; none needs bash on the host.

## Repository layout touched by this spec

```
oracle/
  harness.json              harness config
  targets/quick2.json       target profile
  Dockerfile
  runner/agent.py           in-container runner: pty, pyte (the only file baked into the image)
  runner/keys.py            key notation parser and encoder, with verified flags (host side)
  profile.py  config.py  fetch.py  sandbox.py   profile, harness config, setup, containers and drives
  screen.py  session.py  cases.py  runs.py      screen reading, one session, one case, run logs
  sessions.py  ledger.py  generator.py          session manager, ledger, seeded cases
  recorder.py  record.py  compare.py  manifest.py   (tasks 7 and 8)
  tools.py  mcp_server.py  schemas.py  errors.py    the eight tools, stdio protocol, schemas, errors
  tests/                    unit, property and live tests; tests/captures/ holds screen fixtures
  quickset.json             the 200 quick-set case ids
  goldens/
    MANIFEST.json
    cases/<case-id>.json
    captures/<case-id>/screen-NN.txt, files/<path as written>
  vendor/                   gitignored: archive, unpacked program, verified stamp
  out/                      gitignored: mismatches.json, runs/<run-id>/, run log
results/ledger.json
scripts/setup.py  check_goldens.py  guard_goldens.py  oracle_quick.py  ledger_status.py
```

Temporary drives live under the operating system's temp directory, never in the repository.

## Components

### Harness config (`oracle/harness.json`)

```json
{
  "emu2": {"repo": "https://github.com/dmsc/emu2", "commit": "<pinned sha>"},
  "max_sessions": 8,
  "container": {"cpus": "1.0", "memory": "256m", "pids": 64},
  "session_idle_limit_s": 900,
  "rebuild": {"command": ["node", "<rebuild entry>"], "time_limit_s": 25}
}
```

The numbers are starting values, to be tuned on the development laptop. The rebuild entry is
fixed by the quickened-app work; this spec fixes only its contract (Requirement 12).

### Target profile (`oracle/targets/quick2.json`)

The profile is validated against a JSON Schema on load. An unknown key or a program fact with
neither `cite` nor `unobserved` fails with `profile_invalid`.

```json
{
  "name": "quick2", "version": "1",
  "archive": {"url": "<Wayback copy of q2v1.zip>", "bytes": 392419, "sha256": null},
  "env": {"EMU2_DEFAULT_DRIVE": "C", "EMU2_CWD": "QUICK2", "TERM": "xterm"},
  "drive": {"dirs": ["QUICK2", "QUICK2/DATA"],
            "unobserved": "spike 2026-11-06, outside repo: stalls without QUICK2/DATA"},
  "entry": "QT.EXE",
  "screen": {"rows": 25, "cols": 80, "pty_rows": 27,
             "unobserved": "spike 2026-11-06, outside repo: 25-row screen"},
  "frozen_time": "1995-06-01 12:00:00",
  "limits": {"settle_ms": 150, "wait_timeout_s": 10, "case_time_limit_s": 60, "retry_limit": 3},
  "keys": ["{Enter}", "{F2}", "{F5}", "{F7}", "{F9}", "{F10}", "1", "2", "3", "4",
           "V", "R", "T", "C", "I"],
  "codes": {"modes": {"normal_depth": "nd"}, "shapes": {"trapezoid": "trap"}},
  "screens": [
    {"id": "main_menu", "marker": "<text>", "resend": true,
     "unobserved": "spike 2026-11-06, outside repo: first two inputs dropped"},
    {"id": "shape_menu", "marker": "<text>"},
    {"id": "trap_form", "marker": "<text>",
     "prompts": [{"id": "left_slope", "pattern": "<regex>"}],
     "fields": [{"name": "depth", "row": 0, "cols": [0, 0], "compare": "trimmed"}]}
  ],
  "forms": {"normal_depth/trapezoid": ["left_slope", "right_slope", "bottom_width", "n",
                                       "discharge", "slope"]},
  "ranges": {"n": {"min": ".010", "max": ".150", "boundaries": [".000", "-1"]}},
  "controls": [
    {"id": "nd-trap-000001", "mode": "normal_depth", "shape": "trapezoid",
     "inputs": {"left_slope": "3", "right_slope": "2", "bottom_width": "10", "n": ".035",
                "discharge": "300", "slope": ".005"},
     "expect": {"outcome": "result", "printed": {"depth": "3.27"}},
     "source": "spike 2026-11-06, outside repo"},
    {"id": "nd-trap-000002", "...": "as above with discharge 500, depth 4.22"},
    {"id": "obs-nodata-000001", "setup": {"omit_dirs": ["QUICK2/DATA"]},
     "expect": {"outcome": "observed", "screen_id": "stray_listing"}},
    {"id": "obs-menudrop-000001", "setup": {"resend": false},
     "expect": {"outcome": "observed", "screen_id": "main_menu"}}
  ]
}
```

Placeholders in angle brackets, the frozen time, the limits and the ranges are filled during
tasks 1 and 7. Only `T` maps to a shape code so far (`trap`, from `structure.md`); the others are
named when the forms have been seen. When a control case is recorded, its `unobserved` notes are
replaced by `cite` entries naming the control's case id.

The drive layout, the screen size and the main menu's resend flag now cite the recorded control
cases. Seen in exploratory runs in this repository on 2026-11-20 (not yet recorded as a fact's
citation, so still marked unobserved in the profile): `QT.EXE` first shows a title screen, which is a line input that ends
on Enter; then the main menu (1 Critical Depth, 2 Channel Capacity, 3 Normal Depth,
4 Step-Backwater), which takes a digit and Enter; then the shape menu (V, R, T, C or I, and
Enter). The trapezoid form asks left slope, right slope, bottom width, Manning's n, discharge,
slope, then "Begin Calculations <Enter>", and prints the results into the same form. Saving an
irregular section (F6) writes `QUICK2/DATA/<name>.xsc`; without `QUICK2/DATA` it prints
`C:\QUICK2\DATA` and "File(s) Not Found", saves nothing and holds. That is the spike's stray
listing. The spike's dropped menu inputs were typed while the title was showing (see the
ledger's `menu_drop_cause`), so no QUICK-2 screen is marked for resend. F5 Print returns to the
shape menu and produces nothing under emu2, which has no printer emulation.

### Setup (`scripts/setup.py`)

1. Load the profile. If `archive.sha256` is null: download, print the sha256, exit 1 with
   "pin this hash in the profile and run setup again". Never write the profile.
2. Download if `oracle/vendor/<archive>` is missing.
3. Hash the archive. On mismatch print expected and actual, exit 1, leave `unpacked/` alone.
4. Unpack into a new directory, then rename it over `oracle/vendor/<name>/unpacked/`.
5. Write `oracle/vendor/<name>/verified.json` with the hash. Session start compares this stamp
   with the profile's current hash (Requirement 1.5).

### Container launch (`oracle/sessions.py`)

One function builds the `docker run` argument list, so that a unit test can check it:

```
docker run --rm -i --network none --user 10001:10001
  --cap-drop ALL --security-opt no-new-privileges --read-only --tmpfs /tmp
  --cpus <cpus> --memory <memory> --pids-limit <pids>
  --label oracle-bones.server=<server uuid> --label oracle-bones.session=<session id>
  -v <temp drive>:/drive
  oracle-bones-runner:<emu2 commit>
```

The temp drive is the only `-v`. Before launch, the host creates the drive layout from the
profile (minus any control `omit_dirs`), copies the unpacked program into it, and snapshots
every file's sha256. The image tag carries the emu2 commit, so a changed commit means a new
image.

Cleanup: the server registers an exit handler that removes every container labelled with its
uuid. At start it lists containers labelled `oracle-bones.server` and removes those whose server
uuid is not live (each server writes `oracle/out/servers/<uuid>.pid`; a stale pid means a dead
server). Interactive sessions carry a last-used time; a sweep ends idle ones.

Concurrency: a counting semaphore of `max_sessions`. A tool call that cannot acquire it
returns `session_limit` at once; a batch waits for a slot instead.

### Image (`oracle/Dockerfile`)

Two stages. The first clones emu2 at the pinned commit and builds it. The second is a slim
Linux base with Python 3, `pyte`, `libfaketime`, the emu2 binary copied from the first stage,
and the runner. A fixed non-root user. Nothing of the program is in the image.

Fixed start time: the runner starts emu2 with `LD_PRELOAD` of libfaketime and
`FAKETIME="@<frozen_time>"`, so every run's clock starts at the profile's `frozen_time` and then
runs. emu2 stays an unmodified separate process. A fully frozen clock was tried first: emu2
derives its BIOS tick from `gettimeofday`, so the tick stopped and QUICK-2 hung on its title
screen. Task 3.4 checks inside a live container that processes see the profile's date.

The image tag is `<image>:<emu2 commit 12>-<runner hash 8>`, where the runner hash covers the
Dockerfile and `runner/agent.py`, so a changed runner builds a new image.

### Runner (`oracle/runner/agent.py`)

Owns one emu2 process under a pty of `pty_rows` by `cols`, with `EMU2_DRIVE_C=/drive` and the
profile's `env`. A reader thread feeds bytes into a `pyte.Screen(cols, pty_rows)`. The host sees
only the first `rows` rows; extra pty rows exist so a 25-row program never scrolls.

Messages over stdin and stdout, one JSON object per line:

- `screen` returns rows, sha256 of the rows joined with `\n` (trailing spaces kept), cursor.
- `wait {until, timeout_s}` polls the pyte screen every 20 ms until a predicate holds: a screen
  id's marker present, a prompt pattern matched, or the hash changed. It also requires the
  hash to be unchanged for `settle_ms`. That settle check is a condition on the screen, not a
  sleep in place of one. On timeout it returns `timeout`.
- `send {keys}` encodes and writes the bytes, then returns.
- `kill`.

Screen identification, field extraction and prompt detection run on the host, from the
returned rows, so they can be unit-tested on saved captures without a container. A screen
matches when its marker occurs in the text. If more than one screen matches, the host returns
the first in profile order and logs the overlap as a profile problem.

### Keys (`oracle/runner/keys.py`)

A tokenizer turns notation into tokens: literal characters, `{Name}`, `{Mod+Name}`, `{{`, `}}`.
An encoder maps tokens to the byte sequences an xterm sends: `{Enter}` `\r`, `{Esc}` `\x1b`,
`{Up}` `\x1b[A`, `{F1}` to `{F4}` `\x1bOP` to `\x1bOS`, `{F5}` `\x1b[15~`, `{F6}` to `{F10}`
`\x1b[17~` to `\x1b[21~`, `{F11}` `\x1b[23~`, `{F12}` `\x1b[24~`, and so on. Each entry carries
`verified: false` until a capture shows the program received it (task 4.4). Unverified keys are
refused with `unsupported_key`. Whether emu2 decodes Alt and Ctrl combinations from these
sequences is unknown and stays unverified until tested.

### Sending and resend (host side)

For each form input the host waits for the expected prompt, sends the value and `{Enter}`, and
appends a transcript step `{step, expect, keys, screen_hash_before, screen_hash_after,
resend}`. Transcript steps carry no wall-clock time, so transcripts of two identical runs are
equal. `screen_hash_after` is the screen once it has settled after the keys: the runner's reply
to `send` is taken before the program redraws, so the host waits for the hash to change from
`screen_hash_before` and then stay quiet for `settle_ms`. If it does not change within four
times `settle_ms` (the window the resend check uses), the after hash is the unchanged screen.
In a stored golden, each step's after hash is the next step's before hash.

Resend applies only on screens with `"resend": true`: if the hash is unchanged after the
settle time, the same key is sent again, up to `retry_limit`, each one logged as `resend: true`.
Then `input_ignored`. The cause of the dropped menu input is investigated separately
(task 6.2) and written to `harness_findings`. Resend stays as a guard, not as the explanation.

### Case generator (`oracle/generator.py`)

`generate(seed, count, modes, shapes)` uses `random.Random(seed)` only, with a
`GENERATOR_VERSION` constant raised on any change to the output. For each mode and shape pair
in the profile's forms it draws in-range values from the profile's `ranges`, formatted as typed
strings, and mixes in each listed boundary value. Ids are assigned here: the next free sequence
for `<mode code>-<shape code>`, read from the existing goldens, so ids are fixed before
dispatch.

### Recorder (`oracle/recorder.py`, `oracle/record.py`)

The only code that opens files under `oracle/goldens/` for writing. For a recording run it:

1. Runs the case in a fresh container. A timeout or unknown final screen goes to the run log and
   the ledger, and nothing is stored.
2. For sampled cases (sequence number divisible by 20, and all control cases) runs it a second
   time and compares outcome, raw fields and file hashes. A difference goes to the ledger's
   `nondeterminism`; the first run is stored.
3. Diffs the temp drive against its snapshot and copies new or changed files into
   `captures/<case-id>/files/`.
4. Writes the capture screens and the golden to temporary names, renames them into place,
   then updates the manifest.

Replacing a golden is a separate path: `python -m oracle.record --rerecord <case-id>`, from the
command line only. It reruns the stored inputs, replaces the golden and captures, and logs the
old and new hashes in `rerecords`. The function the MCP server calls has no replace mode and
refuses with `invalid_arguments` if an id it is about to create already exists.

The first recording run records the control cases first. A control case whose outcome or
printed values differ from `expect` stops the batch with a harness failure and stores nothing.

Batches use a thread pool bounded by `max_sessions`. The recorder thread is the single writer of
goldens and the manifest; workers hand it results through a queue. Cases per minute is
completed cases divided by elapsed wall-clock minutes.

Exploratory runs (`record: false`) and replays use the same runner and write only to
`oracle/out/runs/<run-id>/`.

### Manifest and golden check (`oracle/manifest.py`, `scripts/check_goldens.py`)

`MANIFEST.json` maps every path under `oracle/goldens/` (except itself) to its sha256. The
check walks the directory and fails on an unlisted file, a listed file that is missing, or a
hash that differs, printing each problem. `compare` and `oracle_quick.py` run it first and stop
with exit code 4 if it fails. The check prints the limit stated under Requirement 10 when it
passes, so a pass is not mistaken for proof.

### Ledger (`oracle/ledger.py`)

```json
{
  "screens": {"main_menu": {"visits": 3, "keys_tried": ["1"], "keys_untried": ["F1"]}},
  "fields": {"depth": {"cases": 12, "understood": false}},
  "cases": {"nd-trap": {"result": 10, "rejected": 2, "error": 0, "observed": 0}},
  "unanswered": [{"run_id": "...", "case": {}, "waited_for": "trap_form"}],
  "unknown_screens": [{"run_id": "...", "hash": "...", "capture": "oracle/out/runs/..."}],
  "nondeterminism": [{"case_id": "...", "first": {}, "second": {}}],
  "rerecords": [{"case_id": "...", "old": "<sha256>", "new": "<sha256>", "at": "..."}],
  "mismatches": {"depth": {"count": 4, "last_run": "...", "status": "untriaged"}},
  "unobserved": [{"profile_path": "screens[main_menu].resend", "source": "spike 2026-11-06"}],
  "harness_findings": {"lpt1_to_file": null, "menu_drop_cause": null, "frozen_time": null},
  "open_questions": [], "decisions": [], "stopped": null
}
```

The harness updates its sections through one function that takes a file lock, reads the
current file, applies the change, writes to a temporary name and renames it. It never removes
or rewrites the Exhumer's sections (`open_questions`, `decisions`, `stopped`, `understood`,
`keys_untried`, mismatch `status`). `fields[*].cases` counts only stored goldens with outcome
`result`.

### Comparator (`oracle/compare.py`)

1. Run the golden check; if it fails, exit 4.
2. Load the chosen goldens: every golden for `full`, the ids in `quickset.json` for `quick`.
   Goldens with outcome `observed` are dropped here; they prove the harness, not the rebuild.
3. Start the rebuild command once, write all requests, close stdin, read responses until EOF
   or the time limit.
4. For each golden: no response means `rebuild_error`; a different outcome means `outcome`;
   otherwise compare each field trimmed, or raw where the profile says so, recording `value`,
   `missing_field` or `extra_field`.
5. Write `oracle/out/mismatches.json`, print counts grouped by field, update the ledger's
   `mismatches`, exit 0, 1, 3 or 4. A crash outranks plain mismatches.

`quickset.json` is built by `oracle/record.py --build-quickset`: the control cases that are
not behaviour cases, then a seeded, even spread over every mode and shape pair in the
profile, up to 200 in total. No `observed` golden is ever listed. Pairs
with no goldens are written under `uncovered` and reported on every quick run.

### MCP server (`oracle/mcp_server.py`, `oracle/tools.py`, `oracle/schemas.py`, `oracle/errors.py`)

Stdio transport, JSON-RPC 2.0, written with the standard library only. It answers
`initialize` (protocol versions 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05), `ping`,
`tools/list` and `tools/call`; each call runs on a worker thread and returns both text content
and `structuredContent`, with `isError` set for error replies. The session manager starts right
after `initialize`, which is when orphaned containers are removed. `tools.py` holds the tools
without any protocol code, so tests call them directly. Each tool's input and output schema lives in `schemas.py` and is checked on
every call and every reply. Tool fields are as in Requirement 14.3. `send_keys` caps
`timeout_s` at the profile's `wait_timeout_s`. `compare` runs the same function as the script.
`record: true` goes to the recorder's create-only function; no tool takes a case id.

Errors are one exception class carrying `category`, `message`, `retryable` and `detail`.
`retryable` comes from a fixed table, true only for `session_limit`, `timeout`, `input_ignored`
and `emulator_failed`. Unexpected exceptions become `internal`, not retryable, with the
traceback saved to the run log rather than sent to the caller.

## Data Models

### Golden (`oracle/goldens/cases/nd-trap-000001.json`)

```json
{
  "id": "nd-trap-000001",
  "control": true,
  "expected_screen": null,
  "mode": "normal_depth", "shape": "trapezoid",
  "inputs": {"left_slope": "3", "right_slope": "2", "bottom_width": "10",
             "n": ".035", "discharge": "300", "slope": ".005"},
  "outcome": "result",
  "printed": {"depth": "  3.27", "...": "raw text of every mapped field"},
  "message": null,
  "seed": null, "generator_version": null,
  "emu2_commit": "<sha>", "profile_version": "1", "profile_sha256": "<sha>",
  "archive_sha256": "<sha>",
  "transcript": [{"step": 1, "expect": "main_menu", "keys": "3",
                  "screen_hash_before": "...", "screen_hash_after": "...", "resend": false}],
  "capture_path": "oracle/goldens/captures/nd-trap-000001/",
  "files": [{"path": "QUICK2/HEC2.DAT", "sha256": "..."}],
  "recorded_at": "2026-11-20T00:00:00Z"
}
```

A behaviour case such as `obs-nodata-000001` has outcome `observed`, `expected_screen` set to
the profile's screen id, empty `printed`, and every screen in its capture.

Inputs stay as typed strings, because the program's own parsing is part of its behaviour.
Printed fields stay raw, because padding is part of what it printed. The values shown for
`printed` are illustrative until recorded.

### Mismatch (`oracle/out/mismatches.json`)

```json
[{"case_id": "nd-trap-000001", "kind": "value", "field": "area",
  "oracle": " 59.6", "rebuild": " 59.4"}]
```

### Rebuild protocol

```
request : {"id": "nd-trap-000001", "mode": "normal_depth", "shape": "trapezoid", "inputs": {...}}
response: {"id": "nd-trap-000001", "outcome": "result", "printed": {"depth": "3.27"}, "message": null}
```

## Correctness Properties

### Property 1: Determinism
For any case, two runs give the same outcome, raw fields and file hashes.
**Validates: Requirements 8.1, 8.2**

### Property 2: Replay
For any stored golden, a replay gives the stored outcome, raw fields and file hashes, and
writes nothing under `oracle/goldens/`.
**Validates: Requirements 7.1, 7.4, 9.1**

### Property 3: Generator reproducibility
For any seed and count, two calls with the same generator version return identical case lists
and ids.
**Validates: Requirements 7.7, 7.9**

### Property 4: Control cases
Each control case gives the outcome the profile expects: depth 3.27 at 300 cfs and 4.22 at
500 cfs for the QUICK-2 trapezoid, the stray listing without the data directory, and the
unchanged main menu with resend off.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: Pacing
Against a stub program that shows each prompt after a random delay and drops input sent
before its prompt, every input arrives after its prompt, and the stub never drops one.
**Validates: Requirements 5.1, 4.3**

### Property 6: Resend bounds
Against a stub that ignores the first k keys, the harness sends exactly min(k, retry limit) + 1
times on resend screens, never more than once on other screens, and logs every resend.
**Validates: Requirements 5.5, 5.6**

### Property 7: Key notation
For any token list, formatting then parsing returns the same tokens, and every named key
encodes to a fixed, non-empty byte sequence.
**Validates: Requirements 5.2**

### Property 8: Manifest integrity
After any sequence of recordings the golden check passes. Changing, adding or deleting any one
file under `oracle/goldens/` without the runner makes it fail.
**Validates: Requirements 10.2, 10.3**

### Property 9: Trimmed comparison
For any field text, adding leading or trailing spaces on either side never creates a mismatch
for a trimmed field and always does for a raw field. No text is parsed as a number.
**Validates: Requirements 11.1, 11.2**

### Property 10: Rebuild failure
For a stub rebuild that crashes, hangs or prints bad JSON after k responses, every case after
the k-th is `rebuild_error` and the exit code is 3.
**Validates: Requirements 12.3, 12.4**

### Property 11: Sandbox arguments
For any profile and config, the `docker run` arguments contain `--network none`, a non-root
`--user`, CPU, memory and pids limits, and exactly one `-v`, pointing at the temp drive.
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 12: No leftovers
After a session ends, a batch ends, or the server is killed and restarted, no container with
the harness label remains and no temp drive remains.
**Validates: Requirements 2.4, 3.3, 3.4**

## Error Handling

| Situation | Behaviour |
|---|---|
| No pinned hash | Setup prints the computed hash and stops (exit 1). |
| Hash mismatch | Setup stops; session start returns `hash_mismatch` or `setup_required`. |
| Docker not running | `docker_unavailable`, with a one-line message saying to start Docker. |
| Wait or case over its limit | Kill the container; `timeout`; logged to `unanswered`; never stored. |
| Unknown screen | Returned as unknown and logged; at the end of a case, never stored. |
| Menu ignores input past the retry limit | `input_ignored`, retryable. |
| Control case differs | Harness failure; batch stops; nothing stored for it. |
| Golden check fails | `golden_check_failed`; comparator exit 4. |
| Rebuild crashes or hangs | Unanswered cases are `rebuild_error`; exit 3. |
| Session id unknown | `session_not_found`. |

## Testing Strategy

- **Without Docker:** unit tests for the profile schema, key notation, `docker run` arguments,
  the generator, the manifest, the comparator with stub rebuilds, and screen identification
  and field extraction on saved captures. Properties 3, 7, 8, 9, 10 and 11 run here with
  Hypothesis.
- **Stub target:** a small Python program run in the pty in place of emu2, which prints
  prompts after random delays and can drop input. Properties 5 and 6 run against it.
- **Live:** the control cases (Property 4) run first in every full run and gate the rest.
  Properties 1, 2 and 12 run live on a sample.
- **Sandbox check:** inside a live container, show that only loopback exists, the user id is
  not 0, the only mount is the temp drive, and the program sees the frozen date.
- **Quick-set timing:** time `scripts/oracle_quick.py` end to end on the development laptop.

## Unverified assumptions

- emu2 decodes the xterm sequences above for F-keys and arrows. Checked per key in task 4.4.
- libfaketime changes the date and time emu2 gives the program. Checked in task 3.4.
- emu2 can send LPT1 to a file. Checked in task 6.3; printing stays out of scope either way.
- Container start time allows 10,000 recorded cases in a reasonable time. Measured in task 7.5
  and reported as cases per minute.
