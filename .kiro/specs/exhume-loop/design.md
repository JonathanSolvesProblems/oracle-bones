# Design Document

## Overview

The Exhumer is a Kiro custom agent. Its loop runs in the model's own session: after each
observation it reads the ledger, picks one action, and writes down why. Code supplies the
oracle tools, the ledger and two checks (the profile re-read and the traceability check). No
code orders the actions.

The Exhumer has no shell. Everything it does goes through:

| Tool | What the Exhumer uses it for |
|---|---|
| `boot_target`, `send_keys`, `read_screen`, `shutdown` | probe screens interactively, read the help |
| `run_case`, `run_batch` | exploratory cases (`record` false), recorded cases (`record: true`) |
| `ledger_read` | coverage, open questions, what earlier runs decided |
| `ledger_write` | its own ledger sections (new in this spec) |
| Kiro read | goldens, captures, run logs under `oracle/out/runs/`, the profile |
| Kiro write | the profile, `.kiro/specs/quick2-solver/`, `results/hauntings.md`, bugfix specs |
| skeptic sub-agent | review of a mismatch classification |

It never writes under `oracle/goldens/` and never edits `results/ledger.json` as a file.

## Architecture

```
.kiro/agents/exhumer.md --MCP--> oracle/mcp_server.py --> oracle/tools.py
        |                                                   |-- ledger.py   (only writer of results/ledger.json)
        |                                                   |-- reread.py   (profile re-read, new)
        |                                                   |-- recorder.py (only writer under oracle/goldens/)
        |-- write --> oracle/targets/quick2.json, .kiro/specs/quick2-solver/requirements.md
        '-- subagent --> .kiro/agents/skeptic.md --MCP--> the same server
scripts/check_traceability.py   reads the solver spec, the goldens store and the manifest (new)
.kiro/workflows/resurrect.workflow.json   exhume, then review; the choices inside are the model's
```

## The decision

After each observation the Exhumer reads what it needs from the ledger and picks one action.
It records the choice with `ledger_write` `decide` before acting on it.

| `chose` | When | How |
|---|---|---|
| `probe_screen` | a screen is unknown, or a listed screen has untried keys | `boot_target`, `send_keys`, `read_screen` |
| `run_case` | a field's behaviour is not understood, or a hypothesis needs a test | `run_case` or `run_batch`, `record` false |
| `read_help` | an observation is unexplained and the help may say why | F1 on the main menu |
| `change_profile` | a screen, prompt, region or flow is missing | write the profile; the next run re-reads the goldens |
| `record_case` | a behaviour has been seen and needs a citation | `run_case` with `record: true` |
| `write_requirement` | a behaviour has been seen twice, one of them recorded | write the solver spec, then run the traceability check |
| `triage` | a mismatch class appears | classify, `ledger_write` `triage`, then `ask_skeptic` |
| `ask_skeptic` | a classification is proposed | the skeptic sub-agent, given the case and the class only |
| `stop` | no open question is worth its credits | `ledger_write` `stop` |

Prefer a few sharp cases over many random ones. When a rule is suspected, design the case that
would prove it false.

## Ledger: `ledger_write`

The ledger's schema, the harness's sections and `ledger_read` belong to the oracle-harness spec
(Requirement 13). `ledger_write` adds a writer for the Exhumer sections in the same module.

### Input

One flat object, so that every MCP client can show it. `op` picks the operation; the server
checks which other fields each operation needs and refuses missing or extra ones with
`invalid_arguments`.

| `op` | Fields | Effect |
|---|---|---|
| `decide` | `saw`, `chose`, `why`, `evidence` | appends to `decisions`; clears `stopped` if set |
| `ask` | `question`, `evidence` | appends to `open_questions` with a new id `Q-NNN` |
| `answer` | `question_id`, `answer`, `evidence` | closes that question |
| `stop` | `why` | appends a `stop` decision and sets `stopped` |
| `understood` | `field`, `value`, `evidence` | sets `fields[field].understood` |
| `keys_untried` | `screen`, `keys` | replaces `screens[screen].keys_untried` |
| `triage` | `field`, `classification`, `status`, `why`, `evidence` | sets the triage of `mismatches[field]` |

`chose` is one of the actions in the table above except `stop`, which has its own operation.
`classification` is `spec_error`, `display_rule` or `haunting`. `status` is `proposed`,
`accepted` or `disputed`. `evidence` is a list of case ids, capture paths, run ids and batch
ids, each checked:

| Evidence | Pattern | Must exist |
|---|---|---|
| case id | `nd-trap-000003`, `obs-help-000001` | `cases/<id>.json` in the goldens store |
| capture path | `oracle/goldens/captures/<id>/...` | listed in `MANIFEST.json` |
| run id | `20261121-115234-d34a50` | `oracle/out/runs/<run-id>/` |
| batch id | `batch-20261121-115234-d34a50` | `oracle/out/runs/<batch-id>.json` |

Evidence may be empty for `decide` and `ask` (the first decision of a run may rest on the
ledger alone), and must hold a case id when `understood` sets true.

### Stored entries

```json
{
  "decisions": [{"n": 1, "saw": "6 of 8 cases with 0 or -1 timed out", "chose": "run_case",
                 "why": "no rejected screen is mapped", "evidence": ["batch-20261121-115234-d34a50"],
                 "at": "2026-11-22T09:00:00Z"}],
  "open_questions": [{"id": "Q-001", "question": "What does QUICK-2 show for a left slope of -1?",
                      "evidence": [], "status": "open", "asked_at": "...",
                      "answer": null, "answer_evidence": [], "answered_at": null}],
  "stopped": {"why": "...", "decision": 14, "at": "...", "coverage": {"unexercised_fields": []}},
  "fields": {"depth": {"cases": 2, "understood": false, "understood_evidence": []}},
  "screens": {"main_menu": {"visits": 20, "keys_tried": ["literal"], "keys_untried": ["{F1}"]}},
  "mismatches": {"area": {"count": 4, "last_run": "...", "status": "proposed",
                          "classification": "display_rule", "why": "...", "evidence": []}}
}
```

`stopped.coverage` is `ledger.coverage()` computed when the stop is written, so the list of what
stays unexercised comes from the ledger, not from the model.

### Writer

`ledger.update_exhumer(change)` mirrors `ledger.update(change)`: the same file lock, read,
change, temporary file and rename. It snapshots the harness's view of the ledger (every
harness section, minus the Exhumer keys inside `fields`, `screens` and `mismatches`) and
refuses with `internal` if the change touched it. `ledger.update` already refuses changes to
the Exhumer's view; that view grows to cover `understood_evidence`, `classification`, `why`
and `evidence` inside mismatches. `tools.Oracle.ledger_write` validates the arguments, checks
the evidence, and calls one writer function per operation.

The MCP server is one process, and the CLI recorder takes the same lock, so the single-writer
rule (oracle-harness 13.4) holds for every path that goes through `ledger.py`.

## Reading the help

On the main menu, `send_keys` `{F1}` runs `MAINHLP.EXE`, which shows "MAIN MENU HELP SCREEN"
with a paragraph for each of the four modes, then "Press <Enter> to continue". Enter returns to
the main menu (exploratory run, 2026-11-21, not recorded). F1 is verified with a pair of key
captures in task 1.2 before the Exhumer can send it.

The help screen's text matches the main menu's marker `MAIN\s+MENU`, and the first matching
screen in profile order wins. A `main_help` screen must therefore come before `main_menu` in the
profile, with a marker such as `MAIN MENU HELP SCREEN`.

To cite the help, the Exhumer adds a behaviour case such as `obs-help-000001` (title, Enter,
F1, end on `main_help`) to the profile's controls. The next recording call records it with every
screen captured, and a criterion resting on the help cites
`oracle/goldens/captures/obs-help-000001/screen-NN.txt`. No help text is typed into the
repository.

Other screens may have their own help. The shape menu shows F7 but no F1, so where else help
exists is for the Exhumer to find.

## Changing the profile

The Exhumer edits `oracle/targets/quick2.json` with its write tool. The rules:

1. A new screen gets `id`, `kind`, `marker`, and `unobserved` naming the run id it was seen in.
   Prompts, fields and a message region are added when known. `kind` is `rejected` or `error`
   for a screen that ends a case wherever it appears (`cases._stop_screens`).
2. Order matters: a screen whose text also matches a more general marker goes before it.
3. A recorded case that shows the screen replaces `unobserved` with `cite`.
4. A new flow is written for a mode and shape pair that has none, with its codes. A flow is a
   fixed list of steps, so an irregular section of 40 points is a flow with one input step per
   station and elevation. A step that repeats over a list of points would be a harness change,
   outside this spec.
5. Keys go into `keys.list` only once verified; an unverified key goes into the screen's
   `keys_untried` with `ledger_write`.

### Re-read (`oracle/reread.py`)

`reread.check(profile, store)` reads each stored golden's final capture (the last
`screen-NN.txt` in its capture folder) and reads it again under the given profile with the same
functions the case runner uses (`screen.identify`, `screen.fields`, `screen.message` and the
outcome rule in `cases._ending`). It returns one difference per golden whose screen id (for a
behaviour case), outcome, printed fields or message differ from what is stored. It starts no
container and writes nothing.

`tools.Oracle` runs it from `_profile()` for `boot_target`, `run_case` and `run_batch` whenever
the profile's sha256 differs from the last one that passed, and caches the passing sha256.
`oracle/record.py` runs it for `--controls` and `--seed`, but not for `--rerecord` and
`--replay`, which are how a person repairs and checks goldens after a deliberate change. On
any difference the call fails with `profile_invalid` and a `detail` listing each golden and
field.

### Version and existing goldens

- An additive change that passes the re-read keeps `version`. Existing goldens keep their
  `profile_sha256`, which records the profile that produced them; the re-read is the evidence
  that the new profile reads them the same. New goldens carry the new sha256.
- A change the re-read refuses is a person's job: raise `version`, then rerecord each golden
  named in the refusal. The Exhumer records the change it needs as an open question and works on
  something else.
- Sessions already open keep the profile they started with; the change applies from the next
  `boot_target` or case.

## From exploratory finding to citable case

```
exploratory run (run id)  -->  is there a flow for this mode and shape?
                                 no  --> add the flow and screens (change_profile)
                               does it end on a result, rejected or error screen?
                                 no  --> add or fix that screen (change_profile)
                               run_case(record: true)  --> new case id, create-only
                               same outcome and printed text as the exploratory run?
                                 no  --> ask: an open question naming both
                                 yes --> cite the case id
behaviour no flow reaches (help, a key's effect)
                           -->  add obs-<behaviour>-NNNNNN to controls, source = run id
                           -->  the next record: true call records it first, every screen captured
                           -->  cite oracle/goldens/captures/obs-<behaviour>-NNNNNN/screen-NN.txt
```

A control case the recorder cannot reproduce stops that recording call with a harness failure
and stores nothing (oracle-harness 6.3). A new behaviour case therefore goes in only after an
exploratory run has shown exactly the screen it expects.

## The solver spec and its citations

`.kiro/specs/quick2-solver/requirements.md` uses the same layout as the other specs. Each
acceptance criterion ends with one citation:

```
1. WHEN the left side slope is -1 THE SYSTEM SHALL reject it with the message the program prints. _(observed: nd-trap-000003, nd-trap-000004)_
2. WHEN Normal Depth gives a supercritical flow THE SYSTEM SHALL ... _(unobserved; help: oracle/goldens/captures/obs-help-000001/screen-02.txt)_
```

The example criteria above are placeholders, not findings.

`scripts/check_traceability.py [spec path]` (default: the solver spec) finds every numbered
line under an "Acceptance Criteria" heading and checks its citation against the goldens store
and the manifest. It prints one line per problem with the file and line number and exits 0 or
1. A missing solver spec is a pass with zero criteria and says so. The Exhumer cannot run it
(no shell): a person runs it after a run, and a hook can run it later.

## First questions for the Exhumer

These are questions, not answers. None belongs in the solver spec until observed.

1. **Rejected input.** A batch of 8 generated trapezoid cases (`run_batch` seed 20261120, count
   8, run on 2026-11-20 and again in tests since) had 6 timeouts, and every one held a
   boundary input (0 or -1). The profile maps no screen for a rejected input, so each case
   waited the full 10 seconds. What does QUICK-2 do with 0 and with -1 in each of the six
   trapezoid inputs? If it rejects by showing no message at all (the same prompt again),
   no `rejected` screen can be mapped by marker, and that is a harness finding to record as an
   open question rather than work around.
2. **The irregular 40-point section.** A practitioner's real use: a natural channel of about
   40 station and elevation points exported from a DEM in QGIS, with its n values and the
   discharge, run for Normal Depth. The `obs-nodata-000001` steps show the irregular editor's
   key sequence for three points; how it takes 40, and whether it limits the count, is not
   known.
3. **The depth and the area.** Printed depth 3.27 sits beside area 59.6, but a depth of 3.27 ft
   gives 59.4. Is the depth truncated for display while the area uses a hidden value? Does the
   solver stop at a tolerance? At 3.27 ft the channel carries 297.2 cfs, not 300.
4. **Constants and precision.** 1.486 or 1.49 for Manning's constant? Single precision, as
   compiled QuickBASIC suggests?
5. **After the help.** The help fills rows 2 to 24, with "Press <Enter> to continue" on row
   24. When Enter left it, the main menu came back on the same rows as before, but "Press
   <Enter> to continue" was left on row 0, so the screen no longer matches the main menu seen
   before the help (exploratory runs, 2026-11-21, not recorded). Is that the program, or a
   terminal scroll in emu2? Does any later screen keep the stray row, and does it ever move a
   field region?

## Correctness Properties

### Property 1: Traceability
Every acceptance criterion in the solver spec cites a stored case id or a capture path the
manifest lists, and none cites a run id or a path under `oracle/out/`.
**Validates: Requirements 5.1, 6.2, 6.3**

### Property 2: One writer, two owners
For any sequence of harness writes and `ledger_write` calls, the harness sections after the
sequence equal what the harness writes alone would give, and the Exhumer sections equal what
the `ledger_write` calls alone would give.
**Validates: Requirements 2.1, 2.8**

### Property 3: Evidence exists
For any evidence list, `ledger_write` accepts it exactly when every entry is a stored case id,
a capture path in the manifest, or an existing run or batch log.
**Validates: Requirement 2.4**

### Property 4: Re-read
For any stored goldens, a profile identical to the one that recorded them except for screens
added after every existing screen passes the re-read; changing the region of a field a golden
printed, or moving a screen whose marker also matches a golden's final screen ahead of that
golden's screen, fails it and names that golden.
**Validates: Requirements 4.3, 4.4, 4.5**

## Error Handling

| Situation | Behaviour |
|---|---|
| A case times out or ends on an unknown screen | The Exhumer records an open question with the run id. No value is stated. |
| Evidence that does not exist | `ledger_write` refuses with `invalid_arguments`, listing each entry. |
| The profile fails validation | `profile_invalid` from the next tool that loads it, with the errors. |
| The profile reads a golden differently | `profile_invalid` from every tool that runs the program, naming each golden. |
| A new behaviour case does not reproduce | The recording call fails as a harness failure and stores nothing. |
| A key is not verified | `unsupported_key`; the Exhumer lists it in `keys_untried`. |
| Rejection shows no screen to map | An open question and a harness finding, not a workaround. |

## Testing Strategy

- **Unit, no Docker:** `ledger_write` for every operation, its refusals, and evidence checks
  against a scratch goldens store and run folder (Property 3, with Hypothesis). Property 2 with
  Hypothesis over random interleavings of harness writers and `ledger_write` calls.
- **Re-read:** Property 4 on the four committed goldens: the current profile passes; a copy
  with a shifted `depth` region fails on `nd-trap-000001` and `nd-trap-000002`; a copy with an
  extra screen whose marker matches the result screen, placed ahead of it, fails.
- **Traceability:** fixture specs with a good citation, a missing one, an unknown case id, a
  capture path missing from the manifest, and a run id (Property 1).
- **Live:** the F1 key capture pair, and the MCP stdio test extended to `ledger_write`.
- **The run itself:** the first live run is the integration test; the person checks it with
  `scripts/check_traceability.py` and the ledger's `decisions`.

## Known limits

- The Exhumer's write tool can still edit `results/ledger.json` and files under
  `oracle/goldens/` as text. The guard hook for goldens is oracle-harness task 10 and is not
  on yet; the manifest catches a changed golden afterwards. Nothing catches a hand-edited
  ledger except review in version control.
- Recording a new behaviour case needs a recording call for some case, because missing control
  cases are recorded at the start of `run_case` or `run_batch` with `record: true`.
- The re-read checks final screens only. A profile change that alters how an earlier screen of
  a flow is recognised shows up in the next live run, not in the re-read.
