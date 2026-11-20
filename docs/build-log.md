# Build log

Every Kiro session on this project, in order: the prompt as sent, the settings, what Kiro did,
and the credits it used.

Before this log starts, the plan, the four first-draft specs, the steering, the hooks and the
agents were drafted with another AI coding assistant, and a spike on 2026-11-06 ran the original program in
emu2 outside this repo. From here on, Kiro builds.

## 2026-11-20, session 1: setup check, blocked

Settings: Default agent, Auto model, Approve for me.

> Before any code, a quick check. List the steering files you have loaded right now and each
> one's inclusion mode. Run validate_workflow on .kiro/workflows/resurrect.workflow.json and
> report every error and warning, without launching it. Then read the oracle-harness spec and
> tell me what in requirements.md is ambiguous, untestable or missing. Don't change any files
> or start any task yet.

Every file read under `.kiro/` was denied. Kiro turns the machine's global git ignore into a
read block, and that file lists `.kiro/` so it never lands in my other repos. So the steering
had not loaded either.

Kiro would not get around the block through the shell. It said it had already read some front
matter through the shell before it knew about the rule, called that a slip, and asked me to
decide. `validate_workflow` is not in this version; `run_workflow` is, so workflows were on.

Fix, outside the repo: the global git config now hands Kiro a copy of the ignore list without
`.kiro/`, while git itself keeps the full list for every repo.

Credits: 0.51.

## 2026-11-20, session 2: steering check and requirements review

Settings: Default agent, Claude Opus 5.5, effort High, Accept file changes.

> Before any code, a quick check. List the steering files you have loaded right now and each
> one's inclusion mode, and confirm you can read files under .kiro/. Then read the
> oracle-harness spec and tell me what in requirements.md is ambiguous, untestable or missing.
> Don't change any files or start any task yet.

Loaded: `oracle-law.md` and `product.md` (always). Available but not triggered: `structure.md`
(auto), `tech.md` and `mascot.md` (fileMatch), `new-target.md` (manual).

Kiro read the harness requirements against the design, the tasks and the steering, and held
the spec to the oracle law I wrote for it:

- Rule 3 broken: three requirements describe program behaviour (the program stalls without
  its DATA folder, the 25-row screen, the menu dropping input) and cite no observation.
- Rule 4 broken: the 3.27 ft and 4.22 ft checkpoint reads as a manual value used as a hard
  gate, with nothing saying what happens if the oracle prints 3.26.
- The spec's own rule broken: QUICK-2 details hard-coded in requirements that are meant to be
  generic.
- Missing: sandbox rules beyond the network, a frozen clock, provenance on goldens, outcomes
  other than a result, the coverage ledger, the rebuild contract, key notation, MCP schemas.
- Untestable: how the harness knows the program waits for input (and no task covers it), and
  a golden-file hook that only sees Kiro's own write tools.
- Traceability: the replay property claims to test seeded generation, and does not.

Credits: 2.33.

## 2026-11-20, session 2 continued: decisions, and Kiro rewrites the harness spec

Settings: Default agent, Claude Opus 5.5, effort High, Supervised.

I answered each finding with a decision and asked Kiro to rewrite the spec as its own:

> Good review. Fix all of it in requirements.md using these decisions, and ask me only about
> anything they don't cover:
>
> 1. Every QUICK-2 detail (C:\QUICK2\DATA, the 25-row screen and 27-row pty, 80x25, the
>    F-keys, prompt patterns, time and retry limits, the zip's sha256) moves into the target
>    profile. Generic requirements say "as the profile states". The hash is checked at every
>    setup and pinned by hand after the first download.
> 2. The 3.27 ft and 4.22 ft checkpoint is an observation, not a manual value: the binary
>    printed both in a spike on 2026-11-06, run outside this repo. The harness's first runs
>    record captures of those two cases, the stall without DATA and the dropped menu input, and
>    those captures become the citations for 2.3, 2.4 and 4.2. If the harness gets a different
>    number, treat it as a harness bug first, since the binary already printed these.
> 3. Goldens: only the case runner writes them, and only when recording. Exploratory runs and
>    replays never store. One file per case id; re-recording replaces it, through the runner
>    only. Each golden records the outcome (result, rejected or error), the raw field text
>    exactly as printed, seed, generator version, emu2 commit, profile version, keystroke
>    transcript and capture path. Timeouts and unknown screens are logged, never stored.
>    Define "directly" in 7.4 that way.
> 4. Comparison: store raw text, compare trimmed text by default. Field width and overflow like
>    **** are display rules.
> 5. Determinism: run twice on a sample (every 20th case plus all control cases), store the
>    first run, log any difference to the ledger.
> 6. Quick set: 200 cases spread across every mode and shape, run against stored goldens only
>    (no container), under 30 seconds on this laptop. Full set target is 10,000 cases.
> 7. Sandbox and sessions: no network, non-root user, no host mounts except a fresh per-case
>    temp directory deleted after, CPU and memory limits, a frozen emulated date. Each session
>    gets an id, there is a concurrency limit, and orphaned containers are cleaned up when the
>    server exits. emu2 runs as its own executable, never linked or vendored, at a commit
>    recorded in the harness config.
> 8. Files: capture what the program writes to its data directory after each case (.XSC,
>    HEC2.DAT). Printer output is out of scope for now; record whether emu2 can send LPT1 to
>    a file.
> 9. The hook only sees Kiro's write tools. Add a second check: the runner writes a manifest of
>    golden hashes, and a script fails if any golden doesn't match it. State the remaining
>    limit plainly.
> 10. Define the coverage ledger, the rebuild contract (input, output, exit codes, crash and
>     missing field), key notation for send_keys, MCP input and output schemas, and a
>     structured error with a category and a retryable flag.
>
> Then rewrite design.md and tasks.md from the updated requirements so they are your own work,
> with a task for every requirement (3.3 included) and correct traceability. Don't start any
> task yet.

Kiro rewrote all three files: 14 requirements and 77 acceptance criteria. Then it checked its
own traceability with a script rather than by reading: every criterion has a task, every cited
id exists, and every property validates real criteria. QUICK-2 facts now live only in the
target profile.

Choices it made on its own, and said so:

- The comparator's exit codes skip 2, because Kiro hooks read exit code 2 as a block.
- A key stays refused until a capture proves it reaches the program through emu2.
- The frozen date uses libfaketime around an unmodified emu2, unverified, so the sandbox task
  stops and asks if it fails.

It left three questions open rather than guessing: the golden layout against `structure.md`,
an outcome for control cases that end in neither a result nor an error, and which spec owns
the coverage ledger.

Credits: 14.81. Time: 14 min 47 s.

## 2026-11-20, session 2 continued: Kiro builds the harness

Settings: Default agent, Claude Opus 5.5, effort Medium, Approve for me.

> Agreed on all of it, with these answers:
>
> 1. Update structure.md to the new golden layout (cases/, captures/, MANIFEST.json).
> 2. Yes to the observed outcome with the expected screen id. Ids for behaviour cases are
>    obs-<behaviour>-<sequence>, for example obs-nodata-000001 and obs-menudrop-000001. The
>    two depth cases are nd-trap-000001 and nd-trap-000002. Observed cases prove the harness,
>    not the rebuild, so keep them out of the comparator and the quick set, and fix 11.6 to
>    say so.
> 3. This spec owns the ledger and ledger_read. Update exhume-loop to point here.
> 4. One limit on recording through MCP: record: true may only create new case ids.
>    Replacing an existing golden happens only from the runner's command line, and is logged
>    in rerecords.
> 5. Commit after each finished task, with a short plain message saying what the task did.
>    No tool or AI names in commit messages.
>
> Then work through the tasks without stopping to ask me, in this order: 1 to 6, then 9, with
> record passed through but unused until 7 exists. The Exhumer needs the MCP tools by
> November 22, so 7, 8, 10 and 11 come after.
> - At 2.2, pin the sha256 yourself once you've checked the archive contains QT.EXE and
>   QUICK2.EXE, and report the hash in your summary. The 6.1 checkpoint is the real proof
>   it's the right program.
> - At 3.4, if libfaketime doesn't reach the program, check whether QUICK-2 shows a date
>   anywhere. If it doesn't, record that in harness_findings and continue without a frozen
>   date. Stop only if it does.
> - At 6.1, don't move on until all four control cases pass. A different number is a harness
>   bug: keep fixing the harness.
> Only stop to ask me if a problem would change what the spec promises.

Kiro worked for 70 minutes without stopping and committed each task on its own: config and
profile, the verified download, the sandbox, the runner, sessions and the ledger, the
checkpoint, and the MCP server. 72 tests pass.

- **Checkpoint passed.** Through the harness, the 1995 binary printed depth 3.27 at 300 cfs
  and 4.22 at 500 cfs, with area 59.6, wetted perimeter 27.7 and velocity 5.0, the same as
  the spike. I re-ran the live tests myself afterwards: 5 of 5 pass.
- **Pinned archive:** `q2v1.zip`, 392,419 bytes, sha256 `6b8028fa...5de5e`, from the Wayback
  Machine's 2012-12-24 capture of FEMA's library.
- **Kiro booted QUICK-2 from its own chat** through the oracle MCP server, then shut the
  session down and checked no container was left.

The moment Kiro changed my plan: my spike notes said the main menu drops its first inputs, and
the plan had a resend workaround for it. Kiro found the real cause. QT.EXE opens on a title
screen that takes typed characters until Enter, so the spike's first two keys went to the
title, not the menu. The menu itself takes keys the moment it appears. No screen needs resend.

It also narrowed another spike note (the program only stalls without its DATA folder when
saving a cross section) and found that emu2 has no printer emulation, so printed output
cannot be captured.

It changed three things the spec promised, and listed each one for me to check: the clock
starts at a fixed date and then runs, because a frozen clock stops emu2's BIOS tick and
QUICK-2 hangs on its title; and the two corrected spike findings above. I accepted all three.

It built the seeded case generator (task 7.1) early because the MCP batch tool needed it, and
said so.

Credits: 210.88. Time: 1 h 9 min 47 s.
