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

## 2026-11-21, session 3: recording goldens

Settings: Default agent, Claude Opus 5.5, Approve for me. A new session, because the long one
had made every step cost more.

> Continue the oracle-harness spec in .kiro/specs/oracle-harness: tasks 7.2 to 7.7, so the
> control cases are recorded as goldens and the profile cites them instead of the spike. The
> earlier session's three spec changes are accepted: the clock that starts at a fixed date and
> then runs, the corrected menu finding, and the narrower no-DATA case.
>
> Commit after each task with a short plain message, no tool or AI names. docs/build-log.md has
> an update from me; include it in your first commit. Only stop to ask me if a problem would
> change what the spec promises. Stop after 7.7.

Kiro built the recorder, the goldens manifest, the determinism sample, parallel batches and
replay, one commit per task. 98 tests pass.

- **The four control cases are goldens,** each run twice with both runs agreeing, every screen
  captured: depth 3.27 and 4.22 for the trapezoid, the stray listing without the DATA folder,
  and "3" typed on the title screen, which never reaches the main menu.
- **The profile cites them.** Drive layout, screen size and the menu's resend flag (now off)
  point at recorded cases instead of the spike. A new test fails if any citation points at a
  case that is not stored. 15 profile facts are still marked unobserved, for the Exhumer.
- **Its own decisions:** a control case that differs stops the run and stores none of them;
  tests record into a scratch goldens folder so they never touch the real ones; ledger counts
  are grouped by case prefix, so behaviour cases stay apart from depth cases.
- **A bug it found in its own work:** the suite failed now and then because Windows briefly
  refuses to recreate the ledger's lock file while it is being deleted. Ledger writes now retry.

A live batch of 8 generated cases ran at 23.3 cases per minute, and 6 of the 8 timed out. Every
case that timed out held a boundary input (0 or -1), and the profile has no screen yet for a
rejected input, so each one waited the full 10 seconds. Kiro said so rather than reporting the
speed as is: most of a 10,000-case run would time out the same way until the Exhumer maps
those screens.

Credits: 41.46. Time: 38 min 35 s.

## 2026-11-21, session 4: a recorder bug, and the Exhumer's spec rewritten

Settings: Default agent, Claude Opus 5.5, Approve for me. A new session.

Reviewing session 3, I found that every step in every golden said the screen had not changed,
title to main menu included. The harness took the "after" screen the instant the keys went out,
before QUICK-2 redrew. The numbers were right; the record of what happened was not.

> Two things before the Exhumer's first run, then stop.
>
> 1. A harness bug: in oracle/session.py, screen_hash_after comes from the snapshot that "send"
>    returns, before QUICK-2 redraws, so every transcript step in the goldens reads as
>    unchanged, title to main menu included. Record the after hash once the screen has settled.
>    Add a test that fails on the old behaviour, then re-record the four control cases with
>    --rerecord and check the depths are still 3.27 and 4.22.
>
> 2. Get the exhume-loop spec ready for a live run. Its requirements, design and tasks are first
>    drafts written before the harness existed. Review them against what the harness provides
>    now and rewrite all three as your own, the way you did for oracle-harness. Gaps I can see:
>    - The Exhumer has no shell, and no MCP tool writes its ledger sections (decisions, open
>      questions, stopped). Add one through the harness's ledger module so the single-writer
>      rule holds.
>    - "Read the manual" has no manual. The FEMA zip has MAINHLP.EXE, the program's own help,
>      which the Exhumer can read through the oracle. Use that; no manual file goes in the repo.
>    - When the Exhumer finds a new screen it adds it to the profile (Requirement 2.1). Say how,
>      and what that does to the profile version and existing goldens.
>    - A requirement cites a recorded case or capture, and exploratory runs are not goldens. Say
>      how an exploratory finding becomes a citable case (record: true, create-only).
>    - The first-run task should ask something the harness doesn't know yet. Your last batch
>      found one: 6 of 8 cases with 0 or -1 inputs timed out because no rejected-input screen is
>      mapped. The irregular 40-point cross-section (a practitioner's real use, points from
>      QGIS) comes right after.
>    Then do tasks 1.1 and 1.2.
>
> Commit after each task with a short plain message, no tool or AI names, and include
> docs/build-log.md in the first commit. Only stop to ask me if a problem would change what a
> spec promises. Stop before the Exhumer's first live run; I'll start that in its own session
> with the exhumer agent.

Four commits. 122 tests pass, live ones included.

- **The bug is fixed** and a test fails on the old code. A second test checks the committed
  goldens: each step's after screen must be the next step's before screen. The four control
  cases were re-recorded and still print 3.27 and 4.22.
- **A ninth MCP tool, `ledger_write`,** writes the Exhumer's sections under the same lock as
  the harness and refuses any case id, capture or run id that does not exist. Kiro covered six
  sections, not the three I named, because three more had no writer. It amended the harness
  spec for the extra tool.
- **The manual is the program's help.** F1 on the main menu runs MAINHLP.EXE. Kiro verified F1
  with a before and after capture before adding it to the profile's keys. To cite the help, the
  Exhumer records it as a behaviour case.
- **Profile changes are checked.** When the Exhumer edits the profile, the server re-reads every
  stored golden under the new profile before it runs the program again, and refuses if any
  reads differently.
- **`scripts/check_traceability.py`** fails on any acceptance criterion that cites a case or
  capture that does not exist.

The task it wrote for the first run: find what QUICK-2 does with 0 and -1 in each trapezoid
input, map it, record cases, and write the first criteria citing them. If a rejection shows no
screen a marker can match, the Exhumer records an open question and stops, because that is a
harness change for a person to decide.

What it left open, and said so: after leaving the help, "Press <Enter> to continue" stays on
row 0 of the main menu, and it does not know whether that is QUICK-2 or emu2; which
documentation the ablation gets; and that nothing yet stops the Exhumer's write tool from
editing the ledger or a golden as a file, because the guard hook is still off.

Credits: 86.84. Time: 56 min 19 s.

## 2026-11-21, session 5: the Exhumer's first run (day 3 gate)

Settings: the `exhumer` custom agent, Claude Opus 5.5, Approve for me. A new session, after a
window reload so the oracle server listed `ledger_write`.

> Run task 2.1 in .kiro/specs/exhume-loop/tasks.md, the day 3 gate: find what QUICK-2 does with
> 0 and -1 in each trapezoid input, map it in the profile, record cases for it, and write the
> first criteria in .kiro/specs/quick2-solver/requirements.md citing them.
>
> If that's done and the next question is worth its credits, go on to task 2.2: Normal Depth on
> an irregular section of about 40 station and elevation points, the way a practitioner used
> QUICK-2 (points cut along a cross-section line from a DEM in QGIS). Find out whether it takes
> separate Manning's n for the left overbank, channel and right overbank, and how the bank
> stations are set.
>
> When you stop, list the criteria you wrote with their case ids, and the open questions you
> left.

In 26 minutes it wrote 22 acceptance criteria into `.kiro/specs/quick2-solver/requirements.md`,
each one citing a case it recorded in this run, and recorded 13 new goldens. Its first decision,
logged before it touched the program: no screen for a rejected input was known, so it opened
the trapezoid form by hand to see what QUICK-2 draws after a 0 or a -1, rather than running
more cases that would time out. The agent has no shell, so I ran the traceability check
afterwards: 22 criteria, 0 problems.

What the 1995 program does, as observed:

- **A zero is ignored.** At any of the six trapezoid prompts, 0 leaves the prompt where it is,
  with no message and no change on screen. That is why the generated cases timed out.
- **A negative is accepted.** A left side slope of -1 prints a depth of 4.81 ft, with no
  warning. A negative n leaves the form frozen; a negative discharge or slope drops back to
  the shape menu, again with no message.
- **The irregular section takes three Manning's n,** left overbank, channel and right
  overbank, and bank stations that must match a ground-point station or it shows "ERROR! LEFT
  Bank Station DOES NOT MATCH a Ground Point". On a 40-point section, raising the left n from
  .06 to .2 lifts the water surface from 12.22 to 12.52.
- **After the 40th point** the editor moves on to the bank stations by itself.

It mapped two new screens in the profile, and every profile change passed the re-read of the
stored goldens. It left seven open questions in the ledger, two marked as decisions for me:
whether a held prompt should end a case as a refusal instead of a timeout, and whether a
recognised error screen should do the same. It also warned that its new result screen may
match a step in an older case.

It reported its own slip: one decision was logged after the keystroke it covered, because the
first write left out a field, and the ledger entry says so. It did not call the Skeptic, since
it proposed no mismatch classification.

Credits: 90.36. Time: 26 min.

## 2026-11-21, session 6: answering the Exhumer, the comparator and the hooks

Settings: Default agent, Claude Opus 5.5, Approve for me. A new session, two prompts.

> The Exhumer's first run is done but not committed, since it has no shell. Work through these
> in order, then stop.
>
> 1. Commit the Exhumer's run as it stands, in one commit: the profile, the new goldens and
>    manifest, the ledger, .kiro/specs/quick2-solver/requirements.md and docs/build-log.md. I
>    ran the traceability check: 22 criteria, 0 problems.
>
> 2. My answers to the Exhumer's open questions. Close each one in the ledger with ledger_write
>    when it's done:
>    - Q-005: a screen the profile marks as an error ends the case as rejected, with the message
>      it printed, instead of waiting for the next prompt.
>    - Q-001: a held prompt (same prompt, nothing changed after the settle window) also ends
>      the case as rejected, with no message. Keep 0 in the generator, because the rebuild has
>      to hold a 0 too.
>    - Q-007: make the nd_irr_result marker specific enough that it can't match the screen
>      after Begin in obs-nodata-000001. Then close the gap that let it through: the profile
>      re-read checks only each golden's final capture, so make it check the screen id at every
>      transcript step. Replay every golden afterwards.
>
> 3. Oracle-harness task 8. For 8.4, build the quick set from the modes and shapes mapped so far
>    and list the uncovered pairs.
>
> 4. Oracle-harness tasks 10.1 and 10.2, then enable the four hooks. Test the guard script with
>    piped JSON, not through a chat edit: the first live refusal should happen on camera during
>    the solver build.
>
> Commit after each task with a short plain message, no tool or AI names. Only stop to ask me if
> a problem would change what a spec promises.

Kiro committed the Exhumer's run, built both case endings and checked each one live against
the binary (a 0 now ends as rejected instead of a 10-second timeout; a bank station off the
ground points ends on the program's own error message), and closed both questions in the ledger
with the run ids as evidence.

Then it stopped, as asked, because my Q-007 instruction could not be done honestly. The screen
I wanted the marker to exclude was a real result screen (WS ELEV 2.96), identical in layout to
the 40-point result; a marker that excluded it would have refused every short section. It laid
out two options, and found a second gap: only control cases kept every screen, so the every-step
check could only confirm the last step of the other goldens.

> A. Tighten the marker against "SAVING FILE", change obs-nodata-000001's step 21 to expect
> nd_irr_result, and rerecord it from the command line. If the stricter every-step check flags
> any other step, fix the profile order or the expectation with evidence; don't loosen the check.
>
> Screens: capture every screen for control cases and for any case recorded through MCP, since
> those are the ones a requirement cites, and rerecord those 9. Generated batches keep the final
> screen and the hash chain, so the full set stays small enough for the repo.
>
> The older problems:
> - Generator: draw only from mode and shape pairs whose inputs all have ranges, and list the
>   rest as uncovered. Ranges for the irregular inputs will come from the Exhumer, from
>   evidence.
> - nd-trap-000004's broken chain and the 0.75 s risk in the held rule look like the same
>   settle problem. Find the cause and fix it so the chain holds. Before ending a case as held,
>   confirm the hold with a second, longer wait, so only cases that really hold pay for it.
>   Rerecord nd-trap-000004 with the others.
>
> Then run check_traceability.py and the full suite, replay every golden, and carry on with task
> 8, 10.1, 10.2 and the hooks as planned. Same commit rules. Only stop if a fix would change
> what a spec promises.

- **The settle problem had one cause.** After T and Enter, QUICK-2 echoes the T on the shape
  menu before it draws the form. The pause is 14 to 47 ms on its own, but recorded alongside
  another case it ran past the 150 ms settle time. A suspected hold now gets a second wait of
  up to 2 seconds, and only inputs that really hold pay for it.
- **Every step is checked.** The profile re-read now checks the screen at each step of every
  golden, not just the last; the new rule flagged exactly the two steps in question. Eight
  goldens were re-recorded, and none of their printed answers changed. All 17 replay the same
  against the binary.
- **It corrected itself in the ledger.** Its first Q-007 answer said the old replay would have
  failed. It had never run that replay, so it added an entry saying so.
- **The comparator exists** (task 8): the golden check, the rebuild contract with stub
  rebuilds that answer, crash, hang and print bad JSON, and a quick set of 9 cases so far.
  Channel capacity, critical depth and step-backwater are listed as uncovered until the Exhumer
  maps them.
- **The hooks are on.** To build the guard, Kiro read the hooks docs, then put a temporary hook
  on a scratch file to see one real payload rather than guess its shape, and removed it after.
  The guard refuses any write under `oracle/goldens/` with exit code 2, and that code survives a
  PowerShell pipe. The live refusal is left for the solver build, on camera.

Two changes beyond my instructions, both listed for me: it raised the profile version to 2
before re-recording, as the exhume-loop spec requires, and updated the spec text to match my
decisions. 170 tests pass.

Credits: 28.68 and 83.42. Time: spread over the afternoon, with my answers in between.

## 2026-11-22, session 7: the Exhumer maps every regular shape

Settings: the `exhumer` custom agent, Claude Opus 5.5, effort High, Approve for me. A new
session after a window reload, with the four hooks on.

> Run task 3.1 in .kiro/specs/exhume-loop/tasks.md: Critical Depth, Channel Capacity and Normal
> Depth on every regular shape (V-ditch, rectangle, trapezoid, circle). For each mode and shape,
> map the form and its flow in the profile, record a few sharp cases, and write criteria citing
> them. Set each input's range from what the program accepts, with evidence, so the generator
> can draw from it.
>
> Also answer Q-006 on the 40-point section: what does QUICK-2 assume when the water rises above
> an end point?
>
> Stop when the next question isn't worth its credits, and list the criteria you wrote and the
> questions you left.

In 29 minutes it mapped all 12 regular mode and shape pairs (forms, result screens and flows),
recorded 19 new cases, and took the solver spec from 22 to 51 acceptance criteria. I ran the
traceability check afterwards: 51 criteria, 0 problems. Every input now has a range, set to what
the program accepts and prints in its field, each bound cited to a recorded case.

What the 1995 program does, as observed:

- **Water above the end of a section** is held as if each end point rose as a vertical wall,
  and the walls add nothing to the wetted perimeter. At 30,000 cfs the 40-point section printed
  a water surface 7 ft above both ends, with no warning. Every printed number fits that rule; the
  "vertical wall" wording is the agent's inference, and it says so.
- **Critical depth sits just below the exact value** on the V-ditch and trapezoid (2.50 where
  the exact answer is 2.509; 2.45 for 2.456), but rounds on the rectangle. And the 3.27 ft
  normal depth from the first checkpoint prints beside an area that belongs to a slightly
  deeper water line. It logged this as a candidate haunting, to classify with the Skeptic once
  the rebuild first disagrees, not before.
- **A circle's Max Discharge** prints 53 in Critical Depth and 51 in the other two modes for the
  same pipe; Critical Depth may be using its own critical slope instead of the slope typed in.
- **Inputs overflow their fields.** Values too wide for a field echo with a leading `%`, and
  small non-zero values like .00001 are accepted, so only an exact 0 holds the prompt.

It left six open questions, two marked for a person: whether the generator needs a practical
range beside the accepted one, since uniform draws over the accepted ranges give channels no
reviewer would enter (n 7.8, slope 8.7, 8,000 ft wide), and the untried 0 and -1 on the new
forms. It recorded the function keys it had not tried on each new result screen, so the
coverage report stays honest.

Near the end, Kiro reported that Claude Opus 5.5 declined to continue the conversation and
switched it to Claude Opus 4.8, which wrote the stop entry and the summary. I switched the model
back for the next session.

Credits: 71.05. Time: 29 min 4 s.

## 2026-11-22, outside Kiro: a real cross-section

Not a Kiro session, so no credits. The other AI coding assistant fetched one real test case
from USGS services, the way a practitioner builds a QUICK-2 input: a 40-point cross-section
across Grapevine Branch in Cabell County, West Virginia, a FEMA Zone A stream, from the USGS
3DEP 1 m lidar through the same elevation service that Joe Trimboli's TPE tool calls; the
100-year flow from USGS StreamStats (1,200 cfs for 2.70 square miles, from the West Virginia
regression equations in USGS SIR 2025-5110); and a slope and bank stations labelled as
estimates. Every service call is listed in the file. It is a data file, not code: the Exhumer
records it through QUICK-2 before the solver is graded on it.
