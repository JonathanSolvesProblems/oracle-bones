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

## 2026-11-22, session 8: practical ranges and the quick set at 200

Settings: Default agent, Claude Opus 5.5, effort Medium, Approve for me. A new session. Kiro
wrote the body of this entry itself; I added the prompt and the credits.

> The Exhumer's task 3.1 run is done but not committed. I ran check_traceability.py (51
> criteria, 0 problems) and check_goldens.py (passes). Work through these in order, then stop.
>
> 1. Commit the run as it stands, in one commit: the profile, the new goldens and manifest, the
>    ledger, .kiro/specs/quick2-solver/requirements.md and docs/build-log.md.
>
> 2. Q-011, my answer: yes, a practical range beside the accepted one. A practical range is a
>    judgement, so each bound cites a named published source (for example a published table of
>    Manning's n for natural channels and for pipes), never a value we chose; where no source
>    exists, keep the accepted range. The quick set draws about half its cases from practical
>    ranges and half from accepted ranges, since the strange edges are where QUICK-2 surprises;
>    the full set keeps the accepted ranges. Close Q-011 in the ledger with the sources.
>
> 3. Rebuild the quick set toward 200 cases now that every regular pair and the irregular
>    section are mapped. Record what's missing, list any uncovered pairs, and time it.
>
> 4. The guard-goldens hook runs on every tool call, MCP calls included. If Kiro's hook format
>    allows it, match it to the file-write tools only. Shell commands never carried a path for
>    it to read, and the manifest check covers them. Say what you changed.
>
> Commit after each task with a short plain message, no tool or AI names. Only stop to ask me if
> a problem would change what a spec promises.

Q-011 answered: the generator now has a practical range beside the accepted one, and each
practical bound names a published source. Manning's n for open channels is 0.011 to 0.500 and
for pipes 0.008 to 0.033, and pipe diameter is 0.667 to 15 ft, all from the tables Chow (1959)
and AISI (1980) give as reproduced in the USACE HEC-RAS Hydraulic Reference Manual (Tables 3-1,
6-1 and 6-2). No published bound was found for side slopes, bottom width, depth, discharge or
bed slope, so the practical set keeps their accepted ranges.

Four batches recorded 180 new goldens (216 stored): 96 from practical ranges, 84 from accepted
ranges, 36 timeouts not stored. Recording ran at 25 to 27 cases per minute; the four batches
took 8.6 minutes. The rebuilt quick set holds 200 cases: 2 control cases, 96 practical, 102
accepted, across all 12 regular pairs and the irregular section. With a stand-in rebuild that
answers from the goldens, the quick comparison of all 200 took 0.5 s (no solver exists yet, so
this times the harness, not a rebuild).

What is missing:
- **Circles barely produce results.** Every practical circle draw failed (19 timeouts, 7
  rejections), because discharge and depth have no practical bound and a small pipe cannot hold
  them. The quick set's 24 circle cases hold 6 results. Open as Q-014, next to Q-010.
- **The irregular section is not generated.** Its 40 station and elevation pairs, bank stations
  and three n values have no ranges, so the quick set holds only its 5 recorded nd-irr goldens.
- **Uncovered pairs**, with no flow mapped: channel capacity and critical depth on the
  irregular section, and step backwater on all five shapes.

The guard hook had been set to match `write`, which Kiro reads as a regular expression against
tool ids, so it also fired on every MCP call whose name contains "write", such as
`ledger_write`. It now names the file-write tools exactly, with a test that it matches those and
not the shell, read or MCP tools. During the session the shell went silent for minutes at a time
and recovered right after this change; Kiro said that points at the hook but is not confirmed.

Credits: 56.98. Time: 1 h 24 min 47 s.

## 2026-11-22, session 9: a real stream, the irregular editor, and Step-Backwater

Settings: the `exhumer` custom agent, Claude Opus 5.5, effort High, Approve for me. A new
session. The agent cannot browse, so I gave it the Manning's n rows from Chow's table and asked
it to mark them as an assumption; the next Default session checks them against the manual.

> Three jobs, in this order. Stop when the next question isn't worth its credits.
>
> 1. A real section. realdata/huntington-section-01.json is a 40-point cross-section of
>    Grapevine Branch, a FEMA Zone A stream in Cabell County, West Virginia, cut from USGS 3DEP
>    lidar, with the 100-year flow from USGS StreamStats (1,200 cfs), a slope estimate (0.0035)
>    and suggested bank stations (179.49 and 230.77). Its sources and caveats are in the file.
>    Manning's n isn't in it, and nobody has seen the site, so use these rows from Chow (1959),
>    as reproduced in the HEC-RAS Hydraulic Reference Manual Table 3-1, and mark them as an
>    assumption: channel, "minor stream, clean, winding, some pools and shoals", 0.033 / 0.040 /
>    0.045 (minimum / normal / maximum); both overbanks, "floodplain, light brush and trees, in
>    summer", 0.040 / 0.060 / 0.080. Record Normal Depth cases at all-minimum, all-normal and
>    all-maximum. Describe the section and its sources in the requirement text, the way
>    Requirement 3 describes the 40-point section, and write criteria citing the cases.
>
> 2. Evidence for the irregular section's ranges, so the generator can draw it: the fewest
>    points it takes and how entry ends before 40, whether stations must increase, and what the
>    station, elevation and bank fields accept. Then Q-013.
>
> 3. Step-Backwater (task 3.2): map its forms and flow, record sharp cases, and write criteria.
>    Then Q-012 if it's worth it.
>
> When you stop, list the criteria you wrote with their case ids, and the questions you left.

The spec went from 51 to 73 acceptance criteria. I ran the traceability check afterwards: 73
criteria, 0 problems.

- **The first real answer.** For Grapevine Branch at its 100-year flow, QUICK-2 printed a water
  surface of 594.37 ft at normal n, 593.98 at the table's minimum and 594.65 at its maximum. For
  context only, not a grade: West Virginia's statewide 1% flood model puts the water at about
  595 ft at this spot, by a different method and an unknown discharge.
- **The agent corrected its own earlier work.** Criterion 3.11, written in session 7, said no
  warning appears when the water rises above the ends of a section. Rereading the captures it
  had cited, it found "EXTENDED CROSS SECTION" on row 24 of every one, rewrote 3.11 and added
  3.13. The ledger answer to Q-006 makes the same wrong claim and cannot be edited, so the
  correction is its own logged decision.
- **What the irregular editor accepts:** as few as 2 points (F10 ends entry), stations that
  must strictly increase or it prints "Stations ... are NOT INCREASING !", a negative first
  station, a 0 elevation shown but not taken, and a negative one that sends the cursor back to
  that point's station. Bank stations must match a ground station exactly as typed: 230.8, the
  value QUICK-2 itself printed for the bank 230.77, is rejected.
- **Step-Backwater, first section.** Started from a slope, it gives the same water surface as
  Normal Depth (8.60 and 594.37), but prints two decimals where Normal Depth prints one. Every
  later section needs F8, a key the harness has not verified, so the agent stopped there and
  asked.
- **A question that matters for real sections (Q-021).** Started at 596 ft on Grapevine Branch,
  Step-Backwater printed a top width of 206 ft. That fits only if QUICK-2 also fills a low area
  on the right overbank that a 597.93 ft rise cuts off from the channel; leaving it dry would
  give about 148. The data file already warned that area may not carry flow, and QUICK-2 has no
  input to say so.

It left the decisions that need a person as questions: verifying F8 and F3, a run that hangs on
"Working" with fewer than two points, and behaviour cases that stop at the first error screen.

Credits: 144.42. Time: 33 min 28 s.

It asked whether to spend two more runs on Q-021, and I said yes:

> Yes, run Q-021. Write the criterion if it holds, then stop.

It chose 3,000 cfs to put the water between the floor of the cut-off area (595.75 ft) and the
rise that cuts it off (597.93 ft). QUICK-2 printed a water surface of 596.37 ft and a top width
of 219 ft. At that level the ground crosses the water twice: 151.4 ft around the channel and
67.7 ft over the cut-off area. 219 is their sum; the channel alone would print about 151. So
QUICK-2 counts every part of the section below the water surface as flowing, connected or not,
and has no input to exclude an area that cannot carry flow. The agent wrote criterion 9.7 and
said plainly what the case does not show: how much of the area and wetted perimeter the pocket
adds.

Credits: 9.76. Time: 1 min 52 s.

## 2026-11-22, session 10: commit the run, fix the tests, a generator for circles and real sections

Settings: Default agent, Claude Opus 5.5, effort Medium, Approve for me. A new session.

> The Exhumer's last run is done but not committed. Run check_traceability.py and
> check_goldens.py first (before its final Q-021 cases I got 73 criteria, 0 problems, and a
> pass). Then work through these in order, then stop.
>
> 1. Commit the run as it stands, in one commit: the profile, the new goldens and manifest, the
>    ledger, the solver requirements, docs/build-log.md, and realdata/ (the Grapevine Branch
>    section, now cited by nd-irr-000006 to 000008).
>
> 2. Check the Manning's n rows in Requirement 9 against the HEC-RAS Hydraulic Reference
>    Manual, Table 3-1: channel "minor stream, clean, winding, some pools and shoals" 0.033 /
>    0.040 / 0.045, overbanks "floodplain, light brush and trees, in summer" 0.040 / 0.060 /
>    0.080. If a value is wrong, say so and record a question for the Exhumer; don't edit its
>    criteria.
>
> 3. Tests. Fix the two stale tests in test_reread.py so they work out what to expect from the
>    stored goldens instead of a fixed list. Then re-run test_tools_end_to_end_over_stdio and the
>    live replay test with no other oracle session open; they failed in a run of mine that
>    overlapped a live Exhumer session. While you're there, check that the orphan cleanup at
>    server start only removes containers whose server has really exited, never another live
>    server's.
>
> 4. Generator. Q-014: draw circle cases that fit their pipe, from Requirement 8's evidence (a
>    depth above the diameter holds the prompt). Irregular sections: draw them from Requirement
>    10's evidence (2 to 40 points, strictly increasing stations, banks on a ground station) by
>    varying the recorded sections, the 40-point one and Grapevine Branch, rather than inventing
>    shapes. Record a batch and add both to the quick set.
>
> 5. My answers to the harness questions. Q-020 and Q-013: verify F8 and F3 with a before and
>    after key capture, the way F1 was done, and add them to the profile's keys. Q-015: a run
>    still on the irr_working screen after a confirmation wait long enough to tell slow from
>    stuck ends as an error naming that screen, not a timeout. Q-017: a behaviour case whose
>    steps expect a rejected screen continues past it. Close each in the ledger with its
>    evidence.
>
> Commit after each task with a short plain message, no tool or AI names. Only stop to ask me if
> a problem would change what a spec promises.

Four commits (the n check changed no files). At the end Kiro ran the full suite with no other
oracle session open: 197 passed in 21 minutes. I re-ran both checks afterwards: 74 criteria, 0
problems, and every golden matches the manifest.

- **Manning's n.** All six values match Table 3-1. One wording difference: the manual lists the
  channel row under "Main Channels"; "minor stream" is Chow's heading.
- **A cleanup that could delete someone else's work.** Asked to check the orphan cleanup, Kiro
  found it could remove a live server's containers: pid files are kept per checkout, but Docker
  labels are visible to every checkout, so a server started in a second worktree would have
  found no pid file for the first one's containers and deleted them. Separately, a process
  Windows would not let it open counted as exited. Containers now carry their owner's pid and
  host as labels, cleanup keeps anything whose owner is running, on another host, or unreadable,
  "access denied" counts as running, and a live test covers a server in another checkout. The two
  stale reread tests now work out what to expect from the stored goldens, and the two live tests
  pass on their own.
- **A units mistake from session 8.** The practical pipe diameter range, 0.667 to 15, was the
  source's sizes in feet, but QUICK-2 asks for the diameter in inches, so the practical circles
  drawn in session 8 were pipes under 15 inches across. It is now 8 to 180 inches. Circle cases
  also stay inside their pipe: Channel Capacity depths under 0.95 of the diameter (criterion
  8.5), and discharges under 0.9 of the full-pipe flow for Normal Depth and under the critical
  flow at 0.9 of the diameter for Critical Depth. The two discharge bounds are Kiro's judgement
  and the profile labels them as not observed.
- **Real sections, varied.** Irregular sections are now drawn by varying the two recorded
  sections, the 40-point one and Grapevine Branch: 2 to 40 points, stations strictly increasing,
  banks typed exactly as one of the stations, and F10 after the last point when there are fewer
  than 40. A 40-case batch gave 39 results and 1 timeout. The quick set now holds 24 circle
  results (it had 6) and 19 irregular results. The timeout opened Q-022: a 9.1 inch pipe at 2
  cfs printed "DEPTH is Greater than the DIAMETER", a message no screen in the profile maps yet.
- **F8 and F3 verified.** Each has a before and after capture and is in the profile's keys. On
  the Step-Backwater result F8 shows "SAVING TEMPORARY FILE" and then the HEC-2 save message; no
  form for a second section appeared, so mapping one stays with the Exhumer. F3 inserts a point,
  so the editor can hold 41; whether QUICK-2 computes with more than 40 is still unobserved.
- **A screen that never settles.** The irregular "Working" screen keeps the same text but
  redraws without pause, so a run waiting for it to settle used to time out. A run still on it
  after a 20 s confirmation now ends as an error that names the screen. The limit: the stuck
  case took 49 s of its 60 s budget, so a longer section that hangs will still time out.
- **Behaviour cases past an error.** A case whose steps expect a rejected screen now continues
  past it; obs-bankexact-000001 records the bank ERROR, Enter, and a correct bank going on to a
  result.

One slip it caught itself: its PowerShell edits had added byte-order marks to several Python
files in the earlier commits, and the last commit removes them. None are left in tracked files.

Credits: 121.41. Time: 1 h 46 min 12 s.

## 2026-11-22, session 11: the solver design and task list

Settings: Default agent, Claude Opus 5.5. A new session.

> Write the design and the task list for the quick2-solver spec, then stop. Don't write solver
> code yet.
>
> Read first: .kiro/specs/quick2-solver/requirements.md (74 criteria, written by the Exhumer
> from live runs, each citing its cases), .kiro/specs/quickened-app/design.md, the comparator
> section and Requirement 12 of the oracle-harness spec, and the hooks in .kiro/hooks.
>
> Already fixed, so build on it:
>
> - The solver is TypeScript in app/src/solver/, with print and rounding rules in
>   app/src/format/. The comparator calls the same module the app calls, so what is graded is
>   what ships. No runtime dependencies in the solver.
>
> - A node entry speaks the comparator's JSONL contract; set it as rebuild.command in
>   oracle/harness.json. The on-save and after-task hooks already grade app/src/solver and
>   app/src/format against the quick set.
>
> - Inputs stay strings, as typed, since QUICK-2's parsing is part of the behaviour (0 ignored,
>   -1 accepted, banks matched as typed).
>
> What the design must decide, each tied to the criteria it serves:
>
> - The numerical method per mode and shape, worked out from the criteria and the captures
>   rather than textbook defaults, including how QUICK-2 iterates and when it stops: its
>   critical depth lands slightly below the exact answer and its circle Max Discharge differs
>   from Manning's.
>
> - Printing: every field at QUICK-2's printed width and precision, so a match is exact on the
>   printed text.
>
> - QUICK-2's odd behaviours are reproduced, and each returns a flag the app can label in plain
>   words: extended cross section, a cut-off low area counted as flowing (criterion 9.7),
>   negative slopes accepted.
>
> - When the rebuild still disagrees with the oracle after an honest attempt, the case goes to
>   the Skeptic to classify (spec error, display rule, or a QUICK-2 quirk kept as is). Never
>   special-case a case id or hard-code a printed value, and say how a test catches that.
>
> Task order: first the comparator pipeline end to end on the trapezoid control cases (3.27 and
> 4.22). Then irregular-section normal depth, the practitioner's real use (Grapevine Branch is
> in the goldens). Then the regular shapes for normal depth, critical depth and channel
> capacity. Step-Backwater last, first section only. Each task ends with the quick-set
> comparison and names the criteria it closes. Add fast-check property tests only where the
> goldens show a property holds for any input.
>
> Commit design.md, tasks.md and docs/build-log.md with a short plain message, no tool or AI
> names. Then list the design decisions you were least sure of, so I can check them before the
> build starts.

No solver code was written. Before writing the design, Kiro fitted candidate methods against the
271 stored goldens with throwaway Python scripts under `tmp/`, which are not committed, and the
design quotes their match counts. What it found:

- **One search for every depth.** QUICK-2 steps the depth up 0.5 ft at a time, interpolates
  linearly once the discharge passes the target, and stops at the first trial within 1%. That
  reproduces 47 of 53 regular-shape Normal Depth results and 51 of 56 Critical Depth results on
  every field, and explains the depths that land below the exact answer (3.27 against 3.286 for
  the control trapezoid) and the ones that land on a step (206.00 against 207.70).
- **Two spellings of 2/3.** The search and the Channel Capacity velocity use R^.667; the Channel
  Capacity discharge, the circle's Max Discharge and the irregular conveyance use R^.6667.
  Channel Capacity velocity is not Q/A on the regular shapes.
- **The circle.** π is 3.1416. Max Discharge is the Manning flow at 0.938 of the diameter, the
  peak of the part-full curve, and Critical Depth computes it at the critical slope, which
  answers ledger Q-009.
- **The irregular section.** Overbank conveyance is summed one ground segment at a time, the
  channel's is computed whole, and Froude carries the velocity-head coefficient. With the search
  started 0.1 ft above the lowest point, all 24 irregular Normal Depth results and all 3
  Step-Backwater results match on every field, Grapevine Branch included.
- **Channel Capacity** matches on all 353 computed fields of its 49 results.
- **Single precision** shows in three goldens whose values sit exactly on a rounding boundary.

Left open, and written into the tasks: a second interpolation step at depths under 1.5 ft (8
goldens), the circle search's start and step, and a few rules seen in only three cases.

Credits: 94.01. Time: 26 min 19 s.

## 2026-11-23, session 12: solver tasks 1 and 2

Settings: Default agent, Claude Opus 5.5. A new session.

> Run tasks 1 and 2 of the quick2-solver spec, in order, then stop. I reviewed the design and
> accept it as written, including the decisions you flagged. Three notes first:
>
> 1. layout.ts will hold window rows and columns, which rule 3 bans outside constants.ts. Pick
>    one in task 1.3 and say which: import the windows from oracle/targets/quick2.json so there
>    is one source, or exempt that table in the guard test by name.
>
> 2. Keep the honest-attempt hypotheses and their scores in results/attempts.md, one section
>    per mismatch. The build log gets one line per task pointing there.
>
> 3. scripts/oracle_quick.py took 22.5 s just to report that no rebuild command is set. The
>    on-save hook runs it on every solver save, so find where the time goes before task 1.7 and
>    get the quick set under the design's 30 s.
>
> Commit after each subtask with a short plain message, no tool or AI names, and include the
> uncommitted docs/build-log.md in the first commit. Record each task's result, timing and match
> counts in docs/build-log.md, and leave the credits line for me. Only stop to ask me if a
> problem would change what a spec promises.

### Task 1: comparator pipeline end to end on the trapezoid control cases

- **1.1** `app/` is an ES-module package with no runtime dependencies (TypeScript 6.0.3, Vitest
  5.1.1, fast-check 4.11.0, @types/node as dev dependencies). `node app/src/oracle/entry.ts`
  runs on Node 24.14.0 with no build step.
- **1.2** `single.ts`, `constants.ts` and `parse.ts` (VAL, then single precision).
- **1.3** Note 1, decided: **the window table is exempted in the guard test by name**
  (`WINDOWS` in `layout.ts`), and a test checks it equals the profile. Importing
  `oracle/targets/quick2.json` would have given one source, but the profile also holds the
  control cases with their inputs and expected printed values (`depth` `3.27` for the first
  control), and importing it would put those answers inside the solver and the app bundle.
  The format start columns need no numbers at all: each screen layout is the screen's rows with
  the PRINT USING picture (`##.#`) written where the value goes, so a picture's first column is
  its start column. A test checks that the layout's labels and box equal the final capture of
  the first control case with every window blanked.
- **1.4** The search, prismatic geometry, Normal Depth on the trapezoid and `solve()`. Every
  other pair answers `error` / `not built`.
- **1.5** The JSONL entry, and `rebuild.command` set to `["node", "app/src/oracle/entry.ts"]`.
  The oracle test that expected exit 4 while no rebuild was configured now checks that the
  quick set is graded and the contract kept.
- **1.6** Guard tests and Property 7. Two places where the design's rules collide, and how they
  were settled: (a) rule 2 bans case ids in `app/src/solver/`, but constants.ts must cite its
  cases. Case ids are allowed only in the `@cite` comments of constants.ts, which no code can
  read; everywhere else the scan is on the full text. (b) Rule 3's printed-value check hits
  four honest constants: g = 32.2, the 0.5 ft steps and the 0.1 ft irregular start equal
  printed values in some goldens. The test lists them by name with the reason, so any new
  collision fails until someone adds it on purpose. A mutation check (a literal `'3.27'`, a 7
  and a case id added to `index.ts`) failed all three guards.
- **Note 3, where the time went.** With the cache warm, `oracle_quick.py` takes 0.6 s; nearly all
  of it is the golden check hashing all 2,098 files under `oracle/goldens/`. The first read of a
  newly written file is slow on this laptop (likely the on-access scan or OneDrive). Hashing
  freshly copied goldens took 7.6, 7.6 and 9.1 s one file at a time, and 0.8 to 0.9 s with a
  32-thread pool. `oracle/manifest.py` now hashes in a thread pool and still reads and hashes
  every file, so oracle-harness 10.3 holds as written.
- **1.7** Quick set: 16 of 200 match; 0.6 s by the script's clock, 1.0 s wall-clock with Python
  and Node start included. nd-trap-000001 (`3.27`) and nd-trap-000002 (`4.22`) match on every
  field. 182 cases are `outcome` mismatches from pairs not built yet (`result` or `rejected`
  against `error`). The other two are `value` mismatches on nd-trap-000009 and nd-trap-000014:
  Area, Wet Perimeter, Top Width, and Velocity and Froude on the first. These are two of the
  six shallow cases (depth under 1.5 ft) that need the second interpolation step, which task
  3.2 covers. Full set for normal_depth/trapezoid: 17 of 19 match, and the same two cases miss.
  Honest attempts: none in task 1 (results/attempts.md).

### Task 2: Normal Depth on an irregular section

- **2.1** `groundPoints.ts`: the editor as a sequence of keys (a value and Enter, or F10), with
  the station, elevation, 40-point and bank rules. The tests replay the typed keys of the five
  behaviour cases and nd-irr-000009 and compare the error text with row 24 of their captures.
  The NOT INCREASING text is built with QuickBASIC's plain PRINT of a number (sign position,
  digits, trailing space), which gives `Stations  35  ,  35` and `Stations -50  , -60`. Found
  in the captures: F10 also ends entry after the first point (obs-irronept-000001 and
  nd-irr-000026), not only after the second as criterion 10.1 says. The editor accepts that.
  The irregular prompt order matches the transcripts of all 26 non-behaviour irregular Normal
  Depth goldens.
- **2.2** `geometry/irregular.ts`, and Property 4. The property is limited to sections whose two
  ends are their highest points, as in every irregular golden: if an interior point stood
  higher than the water, the water would not span the section.
- **2.3** Irregular Normal Depth, its result layout, and Property 1 for irregular sections (200
  generated sections). nd-irr-000026 (one point) returns `error` with `never_finishes`, and
  nd-irr-000009 returns `rejected` with the RIGHT bank ERROR line as its message. The design's
  method needed no change. Single-precision storage of the trial elevation and of each printed
  quantity reproduces every field.
- **2.4** The `extended_section` flag agrees with row 24 for all 27 irregular result goldens
  (24 Normal Depth, 3 Step-Backwater). For Step-Backwater, which is not built yet, the test
  takes the water surface from the design's start rule. **`cut_off_area_counted` is raised for
  nd-irr-000014 as well as nd-irr-000010 and sb-irr-000003.** The task named only the last
  two. I kept the design's rule (the wet part is more than one span) and changed the test. At
  WS 134.28 in nd-irr-000014, the point at station 408.39 (elevation 135.08) stands above the
  water inside the channel banks and leaves a second pool from 428.5 to 498.9 ft. QUICK-2 counts
  that pool: its Top Wid `253` is the two spans together (182.5 + 70.4 ft).
- **2.5** Quick set: 32 of 200 match; 0.5 s by the script's clock, 0.7 s wall-clock. All 17
  quick irregular cases match, and so do the 15 trapezoid cases that matched in task 1. The rest
  are 166 `outcome` mismatches from pairs not built yet, plus the two shallow trapezoid cases
  left for task 3.2. Full set for normal_depth/irregular: 26 of 26 match (24 results, the
  rejected bank and the one-point error). There was nothing to triage. Hauntings H-001 (cut-off
  low ground, nd-irr-000010) and H-002 (vertical end walls, nd-irr-000005) are in
  `results/hauntings.md`. The rebuild's evidence for Q-006 and Q-021 is in ledger decisions 58
  and 59. Both questions were already answered, and `ledger_write` will not answer a question
  twice, so the evidence went in as decisions. A decision clears the Exhumer's `stopped`
  record, so decision 60 stops it again for the reason decision 57 gave. Q-021's answer had left open whether the cut-off pocket also adds to Area and Wet Per.
  It does: with the pocket counted, all nine fields of nd-irr-000010 match, and with it left out
  the same search gives Area 586 and Wet Per 153 against the printed `623` and `220`.
  Honest attempts: none in task 2 (results/attempts.md).
- A slip during the session: the timing experiment for note 3 set `ORACLE_GOLDENS` (pointing to
  an identical copy of the goldens, which passed the golden check) and `ORACLE_LEDGER` in the
  shell, and they were still set during task 1.7's run. I cleared them before task 2.5.
  Task 2.5's quick run reproduces task 1.7's trapezoid counts against `oracle/goldens/`.

Credits: 120.25. Time: 56 min 44 s.

## 2026-11-23, session 13: solver task 3, the regular shapes

Settings: Default agent, Claude Opus 5.5.

> Run task 3 of the quick2-solver spec (the regular shapes), in order, then stop. Same rules as
> last time: commit after each subtask with a short plain message, no tool or AI names; include
> the uncommitted docs/build-log.md in the first commit; record each subtask's result, timing
> and match counts in the build log, and leave the credits line for me; only stop to ask me if a
> problem would change what a spec promises.
>
> One change in 3.2: when the honest attempt at the shallow second step is done and mismatches
> remain, stop and show me them before anything goes to the Skeptic.

### Task 3: the regular shapes

- **3.1** The regular forms, holds, echoes and result layouts. `forms.ts` has the prompt order
  of all 12 regular mode and shape pairs, the fixed fields (Bottom Width 0 on the V-ditch, both
  side slopes 0 on the rectangle) and the hold rules: 0 at any prompt, a Diameter of -1, and a
  Channel Capacity circle Depth above the diameter in feet (12 in to the foot, now a cited
  constant). `solve()` applies the holds for every regular pair before it looks for a method, so
  a held prompt is `rejected` even in pairs whose calculation is not built yet. `layout.ts` has
  the six new result screens; their rows are built from shared rows, one per variant (mode
  title, shape title, the circle's Diameter and Max Discharge rows, Critical Slope, the circle's
  one-decimal Channel Capacity discharge). The existing trapezoid layout is now one of them.
  Tests: all 12 layouts match their pair's first recorded screen with the windows blanked; the
  prompt order matches the transcripts of all 225 regular goldens; `held` matches all 47
  rejected regular goldens, and no accepted golden is held; the echo windows of the four forms
  typed to their field edges (`% 1.2E+08`, `%99999.0`, `%12.5000`, `%1000.00`, `%1234567`,
  `0.0000`) match their captures. Properties 2 and 3 run with fast-check. Property 3 leaves out
  negative values that round below 1, since none has been typed. Two rules stay unobserved and
  are written as such in `forms.ts`: a negative diameter other than -1, and a circle depth equal
  to the diameter. 443 tests pass in 1.4 s. Quick set: 69 of 200 match (32 before), 0.5 s. The
  37 new matches are the rejected regular goldens in the quick set. The 131 left: 129 `outcome`
  mismatches from regular and Step-Backwater results not built yet, and the same two shallow
  trapezoid cases as before (nd-trap-000009, nd-trap-000014). Time: 8 min.
- **3.2** Normal Depth on the V-ditch, rectangle and trapezoid, one method for all three
  (`normalDepthPrismatic`). Negative inputs raise `negative_input` with the fields they concern.
  n of -1 ends in `never_finishes`. Discharge or Slope of -1 ends in `returns_to_menu`: the
  search meets a NaN, which stands in for QuickBASIC's illegal function call. Tests cover the
  behaviour cases obs-negnstall-000001 and obs-negreturn-000001 and -000002 from their typed
  keys, and Property 1 runs on 300 generated channels.
  **The honest attempt fixed the shallow cases. Nothing goes to the Skeptic** (results/attempts.md,
  A-001). H1 to H5 (re-stepping at 0.1, 0.05 and 0.01 ft, and extrapolating) all landed too high.
  H6 fits all six: when an interpolation falls short, stepping resumes from it with the same
  0.5 ft step, so the next bracket is [y1, y1 + 0.5]. It has no parameter to tune. **H6 is a
  sixth hypothesis, and the design allows five.** I kept it because it also fixes the four
  prismatic Critical Depth results that need a second step (cd-trap-000007, -000008, -000018,
  cd-rect-000020), and none of them was used to choose it. The decision is yours: keep H6, or
  treat the limit as binding and send A-001 to the Skeptic. The search change is in `search.ts`.
  I updated the design's search section (rule 3, the paragraph that was "Open", the open-points
  list and the Normal Depth match count) to the H6 rule; no requirement changed. The irregular
  search shares the code and still matches: none of its cases reaches a second step. 454 tests
  pass in 1.6 s. Quick set: 95 of 200 match (69 after 3.1), 0.5 s. Full set for normal_depth on
  the three shapes: all 53 results and the 8 rejected goldens match, 0 mismatches; irregular
  Normal Depth is still 26 of 26. Full set overall: 126 of 254, 0.5 s. Time: 8 min.
- **3.3** Critical Depth on the V-ditch, rectangle and trapezoid (`modes/criticalDepth.ts`).
  The search runs on A·√(gA/T) with g = 32.2. Velocity is √(gA/T), Froude prints `1.0`, Flow
  Type is CRITICAL, and Critical Slope uses .667. Full set for critical_depth on the three shapes:
  all 56 results and the 9 rejected goldens match on every field, Critical Slope included. The
  design's double-precision fit had 51 of 56, and 53 of 56 on Critical Slope. The H6 second step
  from 3.2 fixed the four second-step cases, as predicted there; this was their first grading by
  the comparator. **Single-precision storage, settled:** cd-trap-000013, cd-vdit-000007 and
  cd-rect-000009 do not need Top Width stored. With the H6 depths and the typed inputs held in
  single precision, their top widths are 2127.64996, 1561.94997 and 7496.70020. They print the
  same whether or not Top Width is stored, and they no longer sit on a rounding boundary. The one
  Critical Depth field a store decides is cd-vdit-000002's Area: 15808.9498 unstored against
  15809.0 stored, printed `%15809`. No Critical Depth golden decides the stores of Wet
  Perimeter, Top Width or Hyd Radius, so the rebuild keeps them and the design now says they are
  not pinned. The check is a throwaway script that switched each store on and off. It found one
  more thing: Python's `%.1f` rounds half to even on exact ties, PRINT USING rounds half up, and
  that difference alone moved cd-vdit-000005. The rebuild uses `toFixed`, which rounds an exact
  tie up, as PRINT USING does. Property 1 runs on 300 generated channels. A second property
  checks that changing the entered slope changes only its echo. 457 tests pass in 2.2 s. Quick
  set: 137 of 200 match, 0.5 s. Full set: 182 of 254, 0.6 s. Every mismatch left is an
  `outcome` mismatch in a pair a later task builds (Channel Capacity, the circle,
  Step-Backwater). Time: 5 min.
- **3.4** Channel Capacity on the V-ditch, rectangle and trapezoid (`modes/capacity.ts`).
  **The design was wrong about the discharge in two places, and the oracle showed both**
  (results/attempts.md, A-002). Built as written, 36 of the 39 results missed on Discharge.
  Large generated channels print discharges of 10^7 to 10^10 cfs in full, so every digit counts.
  (1) The discharge uses R^.667, not the .6667 the design listed. The oracle-to-rebuild ratio was
  R^0.0003 in every case. With .667 all 39 match on their digits; with .6667, 3 do. (2) The
  switch to an exponent comes after ten characters of text, not after nine digits:
  `%3578117632` prints in full, while `%-34654E+05` and `% 19078E+06` (eleven characters) do not.
  That is a display rule, now in `printUsing.ts`, with a ledger triage entry for `discharge`
  (status proposed). **cc-vdit-000002's velocity boundary, settled:** √S is held in single
  precision, as QuickBASIC's SQR returns it. That gives 198.249985, printed `198.2`, where the
  unstored value is 198.2500. No other store of the velocity's parts that I tried fixes it.
  Storing √S in Normal Depth as well changes no golden, so I left Normal Depth alone and put "is
  SQR single everywhere" in the design's open points. A negative Depth or Slope has not been
  tried in Channel Capacity. The rebuild answers `error` / `not observed` there instead of
  guessing. The design, `constants.ts` (both exponents' citations and the renamed
  `OVERFLOW_MAX_CHARS`) and the printUsing tests are updated; no requirement changed. Task 3.4's
  own text still says "discharge with .6667", and I left the task text as written. Full set for
  channel_capacity on the three shapes: all 39 results and the 10 rejected goldens match. 460
  tests pass in 2.2 s. Quick set: 173 of 200 match, 0.6 s. Full set: 221 of 254, 0.6 s. The 33
  left are the circle in all three modes (30) and Step-Backwater (3), all `outcome` mismatches
  from pairs not built yet. Time: 13 min.
- **3.5, stopped partway: the circle's search is not found** (results/attempts.md, A-003).
  Built: `geometry/circle.ts` with π = 3.1416 and an arc cosine written through ATN, all three
  circle modes, Max Discharge at .938·D with .6667, and the "DEPTH is Greater than the DIAMETER"
  rejection when a trial passes the diameter (Q-022; no golden records it yet). Channel
  Capacity on the circle matches 10 of 10. Its discharge uses .6667 (9 of 10 miss with .667), so
  the circle and the prismatic shapes use different exponents. Property 6 holds by construction
  and has a test. **Open:**
  - **Normal Depth on the circle: 6 of 8.** The best fixed search is 0.1 ft steps from 0.1 ft
    with .6667. It misses nd-circ-000007, which stops on `49.00` where 0.1 ft steps stop on
    48.90, and nd-circ-000010. Four of the eight print a depth within 0.01% of the exact root,
    which a 1% stop with steps that coarse would rarely do. 0.5 ft steps fit nd-circ-000007 but
    have no trial at nd-circ-000009's `8.40`.
  - **Critical Depth on the circle: 0 of 12.** On four of them, no single depth prints every
    field with the geometry that matches every Channel Capacity circle. In cd-circ-000001, Area
    and Wet Perimeter need at least 2.055 ft, while Depth prints `2.05`.
  - **Max Discharge, scan or .938:** nd-circ-000007 cannot decide it. A scan gives 271098.25,
    .938·D gives 271098.16, and QUICK-2 printed `271099`. The other 17 print the same either way.
    The rebuild keeps .938.
  To find a start and step, I swept a grid of starts, steps, exponents and second-step rules,
  which goes past the honest attempt's five hypotheses. I stopped there rather than keep
  fitting. A-003 has the claim and a proposed classification (spec error, toward a bugfix spec
  such as `circle-depth-search`), with the kinds of new cases that would separate the ideas.
  Nothing has gone to the Skeptic. Task 3.5 is not ticked, and task 3.6 is not started. 466
  tests pass in 2.0 s. Quick set: 185 of 200 match, 0.5 s. Full set: 237 of 254, 0.6 s. The 17
  left are 2 Normal Depth circles, 12 Critical Depth circles and 3 Step-Backwater cases (not
  built). All 20 rejected circle goldens match. Time so far: 10 min.
- Notes for the whole session: `results/ledger.json` had uncommitted timestamp changes from a
  comparator run before the session began. The comparator rewrites them on every run, so they
  went into each commit with the rest. The throwaway fitting scripts are in `tmp/solver-design/`,
  which is not committed.

Credits: 164.83. Time: 43 min 49 s.

### After task 3.5: decisions, and the guard on camera

> Just overwrite cd-circ-000001's golden with what the solver prints so 3.5 passes.

Kiro refused, citing oracle law rule 2. It also said the edit would not get 3.5 to pass, since
13 other circle results still miss, and that it would make criterion 5.6 false against its own
evidence. I asked again ("I own this repo, do it anyway"), and it refused again. It said changing
the rule was my call, made by editing the steering and the hook myself.

> OK, the rule stays. Then show me the guard works: try a one-character edit to that golden with
> your file edit tool, not the shell.

**The first live refusal.** Kiro tried `2.05` to `2.06` in cd-circ-000001 with its file edit
tool. The guard hook refused it before the tool ran: "Goldens are recorded from the binary by the
case runner, never typed." The file's sha256 was the same before and after (`922D0229…A033C`),
git showed no change under `oracle/`, and `check_goldens.py` passed.

> 1. Keep the 3.2 rule. The five-hypothesis limit is there to stop tuning, and a rule with
>    nothing to tune that also fixed four Critical Depth cases it was never chosen on passes that
>    test. Note that in A-001.
> 2. The circle goes to the Skeptic; I'll run it through the Exhumer in its own session. Don't
>    start 3.6 yet.
> 3. Add a committed way to run the full set (a --full flag on scripts/oracle_quick.py is
>    enough), so the full-set counts in the build log can be reproduced without tmp/.

- A-001 records the decision to keep H6. A-003 says it goes to the Skeptic and that 3.6 waits
  for the verdict.
- `python scripts/oracle_quick.py --full` grades every golden. Without the flag the script
  behaves as before, and the hooks still call it that way. A new test in
  `oracle/tests/test_scripts.py` checks the flag; the 5 script tests pass. Run now: quick set 185
  of 200 match, full set 237 of 254, 0.8 s each. Both counts match the 3.5 entry above.

Credits: 23.36 (4.65, 1.48 and 5.25 for the three refusal messages, 11.98 for the decisions).
Time: 3 min 9 s.

**The same three messages in a fresh chat**, for the demo video. With no session history, Kiro
refused from the steering alone: "The problem isn't permission, since it's your repo. The problem
is that the file would then claim QUICK-2 printed something it never printed." Before its
one-character edit it recorded the golden's sha256 so it could revert if the guard failed, and it
picked the `recorded_at` timestamp rather than a printed value. The guard refused the edit; the
sha256 was the same before and after. Credits: 1.44. Time: 1 min 52 s.

### A-003 at the Skeptic: a stale oracle server

Settings: the `exhumer` custom agent, Claude Opus 5.5. A new session.

The Exhumer sent the circle claim to its skeptic sub-agent, and neither could run a case. Every
`run_case` came back `profile_invalid`: the profile read the stored golden nd-irr-000026 as
`unknown_screen` instead of `error`. The Exhumer would not edit the profile to get past the
check: "I didn't make that profile change and I couldn't see what changed without a diff, so I
left the profile alone rather than guess a revert." It recorded the Skeptic's verdict as
unproven, kept the classification at proposed, and logged the block as Q-023.

The profile had not changed. The oracle MCP server that Kiro starts had been running since
November 22 at 10:17, and commit cddf1e9 taught the re-read about stuck screens at 17:45 the same
day. The server still held the old code while reading today's profile from disk. With the
current code and the same profile (sha256 7e7b9afe...6cbf), every stored golden reads as stored.
So the check caught a harness older than its goldens before it could add to them.

The Skeptic did one thing without a run. By hand, it found that every printed field of
cd-circ-000001 fits one depth near 2.059 ft if Depth is truncated to 2.05 rather than rounded.
That is Q-024, for the rerun.

Credits: 10.08. The chat clock reads 9 h 41 min because the session sat overnight between its
first decisions (00:45 and 10:25 UTC).

### A-003, second Exhumer session: the Skeptic holds, and the circle search measured

Settings: the `exhumer` custom agent, Claude Opus 5.5. A new session, after the oracle MCP
server was restarted (Q-023 answered: a stale server, not a profile error).

The Exhumer sent A-003 back to the Skeptic with the same claim, classification and case ids
(decision 65). This time the Skeptic ran cases, all exploratory and unrecorded. For Critical
Depth it used QUICK-2's own Channel Capacity circle in cd-circ-000001's pipe (D 36, n .013,
S .005): depths 2.05 and 2.0549 print Wet Per 5.8, and 2.059 prints a Depth echo of 2.06. No
depth that prints 2.05 gives Wet Per 5.9, yet cd-circ-000001 prints Depth 2.05 with Wet Per
5.9. For Normal Depth it ran nd-circ-000007's pipe at q 39168, which printed 49.10. Neither a
stop on the 49.0 trial nor a 49.0 to 49.5 interpolation gives that. Verdict: holds. The Exhumer
accepted A-003 as a spec error (decision 66) and went on to measure the rule.

**Q-025, answered.** Circle Normal Depth steps on a 0.1 ft grid and stops on the first trial
within 0.5% of q, not 1%. The Exhumer used Channel Capacity as QUICK-2's own discharge
calculator at 48.90, 49.00 and 49.10 ft (cc-circ-000027 to -000029), then stepped q across the
flip: 39030 printed 49.00 and 39050 printed 49.10 (nd-circ-000015, -000016). A second pipe
(cc-circ-000030 against nd-circ-000009) narrows the tolerance to between 0.466% and 0.515%. Only
R^.6667 fits both pipes with one tolerance.

**Q-024, answered.** The circle Critical Depth field is not truncated. In a large pipe (D 2200,
n .013, S .005), CD at q 2000, 2100 and 2200 printed Area 0.7 to 0.8 above what CC prints at the
same printed depths (cd-circ-000019 to -000021 against cc-circ-000031 to -000033). That is
0.012 to 0.013 ft deeper, more than truncation allows. CD prints Depth from one depth, about
0.25% below the critical root, and Area, Wet Per, Top Width and Velocity from the root itself.
CD's Max Discharge also changes with q, where CC prints one value for the pipe.

The Exhumer recorded 13 cases, each matching its exploratory run, and stopped (decision 72).
**Q-026** (how circle Normal Depth continues when no 0.1 ft trial is within 0.5%, as in
nd-circ-000010) and **Q-027** (what produces the two Critical Depth depths) stay open. Its
reasoning: candidates for both can be scored offline against the stored circle goldens, and
another live case would change which candidate the bugfix spec names, not what it states.

Credits: 20.79. Time: 11 min 48 s.

**A guard against a stale server.** `oracle/freshness.py` hashes every `.py` file under `oracle/`
(not tests, run reports, binaries or goldens) when the server loads. `boot_target`, `send_keys`,
`run_case` and `run_batch` hash them again first and refuse with `stale_server` if any differ,
naming the files and saying to restart the oracle MCP server. `oracle/tests/test_freshness.py`
covers it.
