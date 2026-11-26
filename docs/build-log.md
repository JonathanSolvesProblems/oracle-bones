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

### A-004 to A-006: the circle rules, checked on cases they had never seen

Settings: Claude Opus 5.5 for the spec session and the build; the `exhumer` custom agent for
the A-005 run, in its own session.

**The held-out check.** The circle rules were fitted on the 43 circle results stored at the
time (results/attempts.md A-004). Before the Exhumer ran anything new, Kiro wrote down what 17
unseen cases would print, field by field, and committed it in d9e1a3a (A-005). The Exhumer then
recorded those 17 cases in its own session, typing the inputs as A-005 shows them (decision 73).
15 of the 17 printed exactly as predicted, every field, echoes included (A-006, graded by `node
scripts/circle_outputs.mts grade-a005`, which reads the predictions from d9e1a3a rather than
from the working tree). Critical Depth printed as predicted in 11 of 11. Three of those pipes
were chosen because a 0.2 ft step and a 0.1 ft step predict different Depth and Area, and all
three printed the 0.2 ft prediction (cd-circ-000030 to -000032).

The two misses are left as known differences, not fitted. cc-circ-000035 printed Max Discharge
`101165`, where .9382·D gives 101165.516: one part in a million from a rounding boundary, and
in all three A-005 Channel Capacity pipes .9382·D and a fine scan sit 0.05 to 0.09 cfs either
side of one. No rule is fitted to that (Q-028). nd-circ-000020 printed Velocity `5.8` and
Froude `2.5`, which fit none of Q-026's four candidates for what the search does after a short
chord, and no rule stated in advance explains both it and nd-circ-000010 (Q-026). Both
questions stay open in the ledger.

**What A-004 found.** The circle's area is the sector minus the triangle, r²α − (r − y)·h,
not r²(θ − sin θ)/2: the two are equal with the true π, but QUICK-2's π = 3.1416 cancels in
the second form and not the first, and only the first prints `3783.9` for cc-circ-000031
(hypothesis C2; haunting H-003). Max Discharge is at .9382·D, not .938·D (M2). The circle
search stops within 0.5%, not 1% (Q-025). Critical Depth computes every field at the search
depth and prints Depth 0.01 ft below it (Q-024, Q-027; haunting H-004), and steps 0.2 ft, not
0.1 ft (H5).

**The build** (`.kiro/specs/circle-outputs`, tasks 1 to 5). The reproduction tests were
committed failing first (51 failures), and every prismatic and irregular search result was
snapshotted before `search.ts` changed; all 134 came back identical. Comparator after the
fix: quick set 195 of 200 (174 at fe47275), full set 279 of 284. The five misses are the two
known differences and sb-irr-000001 to -000003, where Step-Backwater is not built.

Credits and times:
- the stale-server guard session: 9.47 credits, 16 min 50 s;
- this spec's session, first prompt: 89.36 credits, 1 h 0 min 58 s;
- second prompt: 98.97, 2 h 19 min 47 s;
- third prompt: 59.6, 34 min 9 s;
- the Exhumer's A-005 run: 5.89, 7 min 6 s;
- a prompt sent to the Exhumer by mistake, which it declined because it has no shell: 2.68,
  1 min 24 s;
- the prompt that wrote tasks.md: 10.74, 1 min 24 s;
- the build, tasks 1 to 7 in a new session: 69.09, 1 h 20 min 49 s.

### Task 3.6: hauntings, and predictions for Q-022 (A-007)

Settings: Claude Opus 5.5, a new session.

Task 3.6 recorded four hauntings in `results/hauntings.md` (bea0505): H-005, the 1% search
stop (nd-trap-000001 prints 3.27 where the exact depth is 3.2853); H-006, the .667 exponent
(cc-vdit-000012 Velocity 5104.8 against 5095.17 with 2/3); H-007, circle Critical Depth's Max
Discharge at the critical slope (cd-circ-000001 prints 53, 50.73 at the entered slope); and
H-008, negative inputs computed as typed (cc-trap-000015). Q-008 and Q-009 were answered.
Comparator: quick set 195 of 200, full set 279 of 284, nothing new to triage. Task 3.6 is not
ticked: Q-002, Q-003 and Q-022 stay open.

For Q-022 the session wrote predictions before anything ran (A-007, dcd4e85). QUICK-2 had
printed "DEPTH is Greater than the DIAMETER" once, and no golden records it. The rebuild rejects
when a 0.2 ft trial would pass the diameter, which fits that one run but says nothing about
where the boundary lies. A-007 chose four cases (10.1 in and 11.9 in pipes at 3 and 4 cfs) on
which the rebuild's rule (R1), a 0.1 ft grid (G1) and any fixed share of the diameter (S(f))
the observed run allows predict different outcomes, and listed every printed field for the
two predicted results.

Credits: 39.74. Time: 50 min 37 s.

### A-007 and A-008: the rejection boundary is wrong

Settings: the `exhumer` custom agent, Claude Opus 5.5, in its own session.

The Exhumer ran A-007's four cases as typed (decision 75). The three rejections store no golden;
each observation is the final screen of its run folder. P3 is golden cd-circ-000033.

Kiro graded them against A-007 as committed (A-008, d766894), with `node
scripts/q022_boundary.mts grade-a007`, which reads A-007 from dcd4e85. R1 got 3 of 4 outcomes:
QUICK-2 rejected P1 (10.1 in, 3 cfs), where R1 and G1 predicted a result, so the rebuild's
boundary is wrong. G1 got 2 of 4. S(f) with 0.750 ≤ f < 0.847 predicted all four. P3 printed
13 of 14 fields as R1 predicted; Critical Slope printed `0.0090` against `0.0089`. The quick set
was rebuilt with the new golden (2dcaf77): 194 of 200, full set 279 of 285.

*Correction, 2026-11-25.* S(f) did not predict all four. As committed in A-007, it predicted
P1, P2 and P4; its 0.750 lower bound came from P3's result afterwards, so it fitted P3. The
wording came from my prompt. The paragraph above is left as written (results/attempts.md A-008
carries the same note).

Credits for the Exhumer's run: 4.28. Time: 4 min 55 s.

### cd-circ-000033 and A-009: one rule for both misses

Settings: Claude Opus 5.5, a new session. The laptop closed partway through and the session
resumed with a second prompt. The shell also stopped answering for a while, after a PowerShell
here-string reached it broken and left it waiting for input; scripts were written to files
from then on.

**cd-circ-000033's Critical Slope** (933a546). It is not on a rounding boundary the way
cc-circ-000035 is: 0.0089380 is 0.134% from 0.00895, where cc-circ-000035 sits about three
single-precision steps from its boundary. No constant factor fits the 27 circle Critical Depth
results, five hypotheses from inside the design each leave it at `0.0089` or `0.0092`, and no
rounding rule prints `0.0090` without breaking cd-circ-000001. Every field prints as QUICK-2
printed it at a search depth 0.0004 to 0.0012 ft below the rebuild's chord. The claim for the
Skeptic and its classification (a spec error in the circle Critical Depth search) are
proposed, not reviewed, and it is not listed as a known difference.

**A-009** (80c87fd). In cd-circ-000033 and P1 the first chord is still short of q, a branch
where no earlier Critical Depth golden told the rules apart. The rebuild takes the chord again
on the narrowed bracket (N2), a rule chosen for Normal Depth. If stepping instead resumes from
the chord with the same 0.2 ft step (K1, the shared search's rule for every other shape), P1's
next trial passes the diameter and rejects, and cd-circ-000033 stops at 0.74259, where every
field matches. K1 scores 31 of 31 on the circle Critical Depth results and the four rejections;
the rebuild 29, and three other rules 26 to 29. Two cases already seen chose K1, so A-009
commits predictions for four the Exhumer has not run: two where K1 rejects and the rebuild
prints a result (8 in at 1 cfs, 22.7 in at 23 cfs), and two where both print a result and
differ (37 in at 77 cfs on Depth, 51 in at 4 cfs on Critical Slope, Velocity and Max
Discharge). The solver is unchanged; the Skeptic's review of the cd-circ-000033 claim and the
A-009 runs go to an Exhumer session.

**The live marker** (dd613c4). `pytest -m "not live"` deselected nothing, because the live
tests used the `live` fixture and nothing applied the marker. `conftest.py` now marks every test
whose fixtures include `live`: 34 of 208 are live, 174 offline. The offline run passes in 290 s.
It is not quick: one repository scan
(`test_no_program_file_inside_repository_outside_vendor`) takes 112 s, because it hashes the
gitignored run folders and `node_modules` too. That test is unchanged.

Credits for this session's last message: 49.24. Time: 33 min 23 s. The session's earlier
messages are not included.

### A-009 at the Exhumer, and A-010: K1 holds

Settings: the `exhumer` custom agent, Claude Opus 5.5, in its own session; then Claude Opus 5.5
in a new session for the grading script, the corrections and the commits.

**The Exhumer's session** (decisions 77 to 81). The Skeptic reviewed A-008's claim for
cd-circ-000033 and found that it holds, from four exploratory runs on the same pipe and
discharge (n .013, .13 and .3, and slope .05); the critical_slope triage is accepted as a spec
error. The Exhumer then ran A-009's four cases as typed. Q1 (8 in, 1 cfs) and Q2 (22.7 in,
23 cfs) timed out on the Critical Depth form with "DEPTH is Greater than the DIAMETER" and Depth
`0.00`, and store no golden. Q3 (37 in, 77 cfs) is cd-circ-000035 and Q4 (51 in, 4 cfs) is
cd-circ-000036. One exploratory run outside A-009, a 9.6 in pipe at 2 cfs, went back to the
shape menu with no result and no message; it is Q-029.

Credits for the Exhumer's session: 10.25. Time: 5 min 59 s.

**A-010** (1d035a7). I graded it against A-009 as committed in 80c87fd: K1 4 of 4 (Q1 and Q2
rejected; Q3 and Q4 match K1's row on every field), the rebuild 0 of 4. S(f) is refuted, since
it predicted a result for Q1. `node scripts/circle_outputs.mts grade-a009` gives the same
grade: it reads A-009 from 80c87fd with `git show`, Q3 and Q4 from their goldens, and Q1 and Q2
from the run folders that decision 80 names. Those are under `oracle/out`, which is not
committed, so Q1 and Q2 can be re-graded only on a machine that holds them. The script scores
S(f) 2 of 4: it also predicted a rejection for Q3. A-010 reports one check found after the
runs, labelled that way: K1's depth for cd-circ-000033 (0.742594) gives Critical Slope `0.8955`
at n .13 and `4.7692` at n .3, which is what the Skeptic's runs 20261125-100502-2c83a6 and
20261125-100602-583c5a printed. Full set: 279 of 287. The three new misses (cd-circ-000033's
Critical Slope, cd-circ-000035's Depth, cd-circ-000036's Critical Slope, Velocity and Max
Discharge) are all where K1 and the rebuild differ. The solver is unchanged.

**The quick set** (844aeb4), rebuilt on its own after the new goldens: 16 of 200 cases swapped,
and it went from 194 to 196 of 200. That is not a fix. cd-circ-000033 and nd-circ-000020 left the
set and neither new golden entered it, so the quick set now holds no circle miss but
cc-circ-000035.

**Corrections** (306703d), as dated notes beside the original text:
- A-008 and this log said S(f) "predicted all four". As committed in A-007 it predicted P1, P2
  and P4, and its 0.750 lower bound came from P3 afterwards, so it fitted that one. The wording
  came from my prompt.
- The ledger's critical_slope triage repeated the Skeptic's limit that with R^.6667 the depth
  would sit about 0.00038 ft below the rebuild's chord, outside the claimed band. The depth that
  prints 0.8955 at n .13 with R^.6667 is 0.74238, 0.00084 ft below the chord and inside the band
  (0.00043 to 0.00119 ft). Kiro checked it with `grade-a009` before correcting the triage with
  `ledger_write`. The runs still do not separate the two exponents.

**The repository scan** (9fd91ec). `test_no_program_file_inside_repository_outside_vendor` now
checks only what git could commit (`git ls-files -co --exclude-standard`) and takes 4 s instead
of 112 s. It still fails when a program file is planted at a committable path: a renamed copy of
QUICK2.EXE under `tmp/` failed it on the hash check, and a stand-in `docs/QT.EXE` on the name
check. Both were removed. The offline run passes 174 tests in 154 s, down from 290 s.

Credits for the grading session (A-010, the quick set, the corrections, the scan and the log
entry above): 35.46. Time: 12 min 51 s. They were left out of the entry when it was written.

### A-011 and the circle-short-chord requirements

Settings: a new session, four messages.

**A-011** (b4950f7). A circle Critical Depth trial that lands exactly on the diameter has top
width 0, so A·√(gA/T) is infinite, and the rebuild never finishes there under N2 or K1. With the
rebuild's trials, a stepped trial lands on the diameter in 6 pipes from 8 to 180 in (9.6, 12,
50.4, 52.8, 55.2 and 57.6 in), and 12 in is the only standard size among them. A-011 compared
five ways QUICK-2 could form its trials (the rebuild's sum, a single-precision .2, a counter, a
double depth, a test before the store) and committed predictions for five standard-size cases,
S1 to S5, before any ran.

**The amendment** (3d9bf3a), in its own commit before any run. Two corrections: the check that
the diameter store does not matter compared a stored value with itself (from the typed text,
`store(VAL/12)` and the rebuild's store differ on 525 of 1721 grid diameters, and 14.4 in
lands on D with the first), and a counter puts 58 of the 72 multiples of 2.4 in on D, not all
of them. S6 to S11, chosen by me, separate K1 from N2 (S6 to S10) and the two diameter stores
(S11).

**circle-short-chord** (054897b), a bugfix spec: K1 for circle Critical Depth, N2 kept for
Normal Depth, the rejection screen mapped in the profile and the six rejections recorded before
any solver change, and the design held until A-012 grades S1 to S11. Approved.

Credits: 18.7 (11 min 35 s), 37.85 (58 min 24 s, about 25 min of it waiting on an approval
prompt), 22.99 (4 min 40 s) and 4.43 (12 s). Total 83.97 credits, 1 h 14 min 51 s.

### The Exhumer on circle-short-chord 2.11: a harness fault

Settings: the `exhumer` custom agent, in its own session.

The Exhumer mapped the rejection screen (`cd_circ_rejected`, decision 82) and the profile
re-read passed. Then every case that reached the screen timed out: the six rejections and nine
of the S cases, 15 runs, none stored (Q-030). S1 and S6 printed results and are cd-circ-000037
and cd-circ-000038. By hand it tried Enter, F2 and F7 on the rejection screen (Q-032) and found
that the screen after Enter would read as a result. It stopped at the fault rather than change
the profile to get past it, and left Q-030 for a person (decision 93).

Credits: 48.4. Time: 19 min 35 s.

### The harness fault fixed, A-012 and A-013

Settings: Claude Opus 5.5, a new session.

**The Exhumer's work, committed** (4773535), and the quick set rebuilt (85efd6a): 2 of 200
cases swapped, cd-circ-000033 and -000036 in. Quick set 196 of 200 before, 194 after; both new
misses were already full-set misses. Full set 280 of 289.

**Q-030 in the harness** (40b8f6d). With S2's inputs the rejection screen received 73 output
chunks in 4 s, the longest gap 98 ms, and its text and cursor never changed (measured by me).
The runner counted quiet from the last output chunk, so the screen never reached settle_ms
(150). A profile screen can now be marked `keeps_output`; it settles once its text has been
unchanged for settle_ms. Every other screen keeps the output rule. `cd_circ_rejected` is
marked. Q-032 (b) is fixed in the same commit: the screen after Enter on the rejection would
have been stored as a result with blank fields, and now reads as the rejection. 15 offline
tests drive the rule on a simulated clock, including a marked screen whose text keeps changing
and does not settle. The live check runs S2 without recording: rejected with the message in
6.1 s, where the same run with the mark removed timed out after 25.5 s. No golden was recorded.
Offline run: 189 passed. Q-030 to Q-032 stay open in the ledger.

**A-012** (ee6f6a9). `grade-a011` grades S1 to S11 against A-011 and its amendment as
committed: K1 with the rebuild's trials 10 of 11, the rebuild today 5 of 11; on S6 to S10, K1 5
of 5 and the rebuild 0 of 5. K1's one miss is S2, which printed the message where the rebuild's
trial lands on the diameter. Only "tested before the store" got all eleven, and it takes the
9.6 in pipe past the diameter, where QUICK-2 went to the shape menu. Nine of the eleven are run
folders, not goldens. S2 contradicts circle-short-chord 1.4, 2.6 and 2.7; bugfix.md is not
edited.

**A-013** (69338b5). 136 combinations of trial, diameter store and test, on all 47 circle
Critical Depth observations: 16 fit, 14 of them testing the trial in inches against the typed
diameter. Five predictions, two of them practical, give each of the 13 separable groups of
survivors a different answer. Not run. The grid scan takes about 45 minutes, and the shell
stopped answering for a few minutes near its end.

Credits: not counted here; they go in the next entry.

### Credits: the A-012 and A-013 session, and a prompt sent to the wrong agent

The session in the last entry used 266.69 credits over 3 h 16 min 36 s. Part of that time was
spent waiting on an approval prompt and on A-013's grid scan, which ran twice at about 45
minutes each.

I also sent a prompt to the `exhumer` agent by mistake. It declined, since it has no shell:
0.67 credits, 21 s.

### The A-013 amendment

Settings: Claude Opus 5.5, a new session.

I checked A-013 with my own code, written from its prose, and got the same 16 survivors. I
found two problems. R3 and R5 rest on the geometry's last digits: in both, the deciding trial
is a chord plus 0.2 ft, so the chord's last digits decide whether it lands on D. With
A·√(gA/T) multiplied by 1 ± 1e-6 they change outcome for many survivors, while R1, R2 and R4
do not change even at 1 ± 1e-4. And A-013's trials left out the single literal .2 summed in
double, which is what `Y# = Y# + .2` does in QuickBASIC.

**The amendment** (6ecfb3c), in its own section after A-013, before any of its cases runs.
`a013-amendment` agrees with the problem: at 1 ± 1e-6, R3 changes for 35 of 39 survivors and
R5 for 15 (my own counts were 19, 39 with the new trials, and up to 17; the difference was not
traced). R3 and R5 are withdrawn and will not be run. T8 to T10 (.2 a single summed in double,
the geometry given the double or store(y), chords kept or stored) add 23 survivors, 39 in all,
among them T8·D1·X1, the rebuild's diameter and test with only the trial changed. The four
cases I suggested, all multiples of 2.4 in, are kept as R6 to R9: each separates pairs no other
case does, and none changes at 1 ± 1e-4. On R1, R2, R4 and R6 to R9 the 39 fall into 14
groups, each with its own row; 11 groups hold more than one survivor, T1 and T2 among them.
Only R1 and R2 are in the generator's practical range. No survivor prints a result on any of
the seven, so every prediction rests on A-013's reading of a geometry error as the shape menu.
The command prints all of it in under a second. Not run.

Credits: not counted here; they go in the next entry.

### Credits: the A-013 amendment session

The session in the last entry used 21.22 credits over 8 min 17 s.

### The Exhumer on A-013: 22 goldens and the 9.6 in run

Settings: the `exhumer` custom agent, in its own session.

With Q-030 fixed, the Exhumer recorded the six rejections as cd-circ-000039 to -000044
(decision 94), S2 to S5 and S7 to S11 as cd-circ-000045 to -000053 (decision 95), and A-013's
R1, R2, R4 and R6 to R9 as cd-circ-000054 to -000060 (decision 97). All 22 ended rejected with
the message. It replaced `cd_circ_rejected`'s unobserved note with a cite of the first fifteen
(decision 96). For the 9.6 in run it added the control obs-cdmenu-000001, which ended on the
shape menu again; a second run of the same inputs did too and stored nothing (decision 98).
Q-022, Q-029, Q-030 and Q-031 are answered, and Q-033 asks what key leaves the rejection
screen and where its boundary is. R3 and R5 were not run.

Credits: 23.09. Time: 9 min 21 s.

### A-014: one group left, three held-out cases, and the requirements revised

Settings: Claude Opus 5.5, a new session.

**The Exhumer's work, committed** (75897a7), and the quick set rebuilt (0ff5d3e): 17 of 200
cases swapped, cd-circ-000041, -000053, -000055 and -000057 among those in. Quick set 194 of
200 before, 193 after; the new miss is cd-circ-000057, which QUICK-2 rejected and the rebuild
prints. Full set 290 of 311.

**A-014** (f066861). `grade-a013` grades the amendment's 14 groups on cd-circ-000054 to
-000060. QUICK-2 printed the message on all seven, and only G3 (T1·D3·X6, T2·D3·X6) is right on
all seven. Of the 184 combinations, those two alone fit all 54 circle Critical Depth goldens,
which is what my own code, written from A-013's prose, also leaves. That is seven new cases for
one group, and those cases picked it, so A-014 predicts three held-out cases before any runs:
4.8 in and 2.4 in end on the shape menu, 7.2 in prints the message (n .013, slope .005, 1 cfs).
With the stepped trials only, 9.60 in is the only diameter typed to 0.01 in from 8 to 180 in
that ends on the shape menu. The run folders A-012 graded match their new goldens, and
obs-cdmenu-000001 repeats the 9.6 in run's final screen. Report only: holding the diameter as
VAL/12 in double changes none of the 876 printed fields on the 65 circle result goldens, and
changes the outcome of cd-circ-000056 and -000060. Not run.

**circle-short-chord** (b2695bd). The rule for circle Critical Depth goes in 2.4, 2.6 and 2.7:
the inches test against store(VAL), the diameter in feet as VAL/12 in double, and a trial that
passes the test at or past the diameter as `error` with `returns_to_menu`, cited to
obs-cdmenu-000001. 1.4 loses its list of pipes and 2.7 its "not established", 2.5 cites
H-009's goldens, 2.9 takes the comparator's counts, and 2.11 and 2.12 ask for the three held-out
cases before the design, with a revision if any misses. The design is not written.

Credits: not counted here; they go in the next entry.

### Credits: the A-014 session

The session in the last entry used 51.71 credits over 19 min 3 s.

### The Exhumer on A-014: three held-out cases

Settings: the `exhumer` custom agent, in its own session.

The Exhumer ran A-014's H1 to H3 once each with record true and stored them as cd-circ-000061
(4.8 in), -000062 (2.4 in) and -000063 (7.2 in), with every screen kept (decision 100). All
three ended rejected with the message, so no behaviour case was added. Nothing else was run,
graded or written.

Credits: 3. Time: 2 min 52 s.

### A-015: G3 refuted, a rule picked, and the requirements revised

Settings: Claude Opus 5.5, a new session.

**The Exhumer's work, committed** (afb1dc0), and the quick set rebuilt (c865f11): 16 of 200
cases swapped; none of the three new goldens entered, cd-circ-000058 came in and -000055 left.
Quick set 193 of 200 before, 192 after. Full set 291 of 314: H3 matches, and H1 and H2 are
outcome misses (rejected by QUICK-2, `error` from the rebuild).

**A-015** (78278da). `grade-a014` reads A-014 from f066861 and grades H1 to H3. QUICK-2
printed the message on all three, so G3 is right on H3 and wrong on H1 and H2, where it
predicted the shape menu. G3, which fit 54 of 54, is refuted by its first held-out cases, and
circle-short-chord 2.12's revision is triggered. Rescored on all 57 circle Critical Depth
outcomes, none of the 184 combinations fits all of them and 56 miss only obs-cdmenu-000001,
which is what I got. A-015 proposes T1·D1·X2, the rebuild's trial and diameter store with
trial >= D: 10 of 10 on R1, R2, R4, R6 to R9 and H1 to H3, also what I got. It says that A-013
had already found it misses the 9.6 in run and dropped it for that, that the 10 of 10 is derived
after the runs, and that it is picked as the smallest change to the rebuild, not because
anything separates it from the other 55. It leaves one known difference, 9.6 in at 2 cfs, and
Q-029 goes back to open with what was tried, including my search of about 32,000 wider models,
whose 16 fits were chosen by one pipe. Not run.

**circle-short-chord** (ea96487). 2.4 is trial >= D with the trial and D as now. 2.6 is the
9.6 in difference: no special case in the solver, recorded in the ledger and in hauntings.md's
known differences, Q-029 open. 2.7: the app says nothing about the menu, the limits page lists
the difference, and never_finishes is no longer raised by any circle Critical Depth input. 2.9
takes the comparator's counts with H1 to H3 as goldens, 291 of 314 today and 309 after, quick
set 192 and 195 of 200. 2.11 asks for no more runs before the design, 2.12 records the grade,
and 1.5 and 2.10 are brought up to date. K1, N2 and Normal Depth are unchanged. The design is
not written.

Credits: not counted here; they go in the next entry.

### Credits: the A-015 session

The session in the last entry used 45.24 credits over 1 h 20 min 12 s. About 67 min of that
was the session waiting for me to answer a permission prompt.

### My review of the A-015 requirements, A-016 and the design

Settings: Claude Opus 5.5, a new session.

I reviewed circle-short-chord's bugfix.md at ea96487. A-015's numbers matched mine: none of the
184 combinations fits all 57 outcomes, 56 miss only obs-cdmenu-000001, and T1·D1·X2 gets 10 of
10. I approved the requirements with three corrections. Two of them fix errors the session had
written.

- **2.7 was false.** It said `never_finishes` would no longer be raised by any circle Critical
  Depth input. It still is, with K1 and trial >= D, when the discharge is smaller than anything
  the geometry can give: 12 in at 1E-7 cfs, 7254 in at .5, 9999 in at 1. With π = 3.1416 the
  area does not go to 0 as y does while the top width does, so A·√(g·A/T) has a floor.
- **A-015's wording was wrong.** It and its script called R1, R2, R4, R6 to R9 and H1 to H3
  "the ten cases it was not chosen on". A-013 dropped T1·D1·X2 and it was brought back after
  those cases ran, so they are cases it was brought back after seeing, not held-out cases.
- **Discharge going up.** While checking, I found that in the 8 in and 15 in pipes the rule
  refuses a discharge and answers a higher one, because a stepped trial sits within 0.5% of the
  higher one. I asked for those cases as A-016's first predictions.

**circle-short-chord** (b17afe9). `floor` (new, about 1 s) confirms my floor numbers from the
rebuild's stored geometry: 6.34E-8 cfs at 12 in, 1.15E-5 at 96 in, .570 at 7254 in, 1.27 at
9999 in, which is 6.34E-8·D^2.5. The chords on [0, 0.2] fall to y = 0, where T = 0, and in the
12 in pipe the model first finishes at about 2.8 times the floor. 2.7 now says a trial on or
past D no longer raises the flag, so every input of 1.4 is rejected, and a discharge under or
just above the floor still raises it. What QUICK-2 does there is unobserved, "it keeps
searching" is a prediction with no capture, and the nearest golden is 6.9E4 times its floor.
3.8 and the Open points agree. A-015 gets a dated correction line and `grade-a014` a corrected
heading. 2.11 and 2.12 put A-016 before the solver change, with a revision on any miss.

**A-016** (414cad4), committed before anything runs. `a016` (about 3 s) writes out the search
with K1 or N2 and trial > D or >= D, and checks itself against `solve()` and A-015's model on
all twelve cases. n .013, slope .005: 8 in at 1.6, 1.71, 1.8 cfs and 15 in at 10.5, 10.8, 11
cfs give the message, a result, the message (the rebuild today answers 1.6 and 10.5); 9.6 in
at 1.5, 1.8, 3, 10 cfs give a result and then the message three times; 9999 in at .5 and 7254
in at .3 never finish. U1 and U4 separate K1 from N2 on outcome, and 9.6 in at 1.5 on Critical
Slope alone (`0.0086` against `0.0085`). Nothing changes at 1 ± 1e-4. The closest call is 8 in
at 1.71, whose Critical Slope is 0.015% under a rounding boundary. Two things it found
unobserved: the Discharge echo of a fractional discharge (no result golden has one), and
whether the form takes a 9999 in diameter. A-015's script had given its model the typed
discharge as a double instead of the stored single; that changes none of these outcomes.

**circle-short-chord design** (728c662), for my approval. `SearchSpec.rejectAtCeiling`, and
`circleSearchSpec(D, mode)` so the spec object says which rule a mode uses. `design` (about 1 s)
shows 18 goldens starting to match and none stopping, and a largest depth of 0.9999998·D given
to the geometry over 20000 generated circles. It also gives H-009's exact critical depths, 2.2
to 2.3 in below the crown. The limits-page text goes in a new Known differences section of
hauntings.md, and each ledger change is assigned to the comparator or an Exhumer session. One
decision is open: `ledger_write` cannot reopen Q-029. tasks.md is not written, and the solver
is not changed. Not run.

Credits: not counted here; they go in the next entry.

**Correction, 2026-11-26** (the text above is left as written): "Two of them fix errors the
session had written" is wrong. The false 2.7 sentence and "the ten cases it was not chosen on"
were in my prompt to the A-015 session, not written by the session.

### Credits: the review and design session

The session in the last entry used 108.77 credits over 25 min 9 s.

### The Exhumer on A-016: twelve cases

Settings: the `exhumer` custom agent, in its own session.

The Exhumer ran A-016's twelve cases once each with record true (decision 102). Nine are
goldens, cd-circ-000064 to -000072. V2 (9.6 in, 1.8 cfs) and W1 (9999 in, .5 cfs) ended on the
shape menu; each was added as a behaviour case, obs-cdmenu-000002 and -000003, and recorded at
the start of the next case's call, so both ran twice. W2 (7254 in, .3 cfs) ended on the shape
menu too; its behaviour case, obs-cdmenu-000004, is in the profile but not recorded (Q-034).
The three menu runs ended as a timeout after a 10 s wait, none at the 60 s case limit. Nothing
was graded. Decision 103 stops the session.

Credits: 12.36. Time: 6 min 13 s.

### A-016 graded, the requirements revised, and A-017

Settings: Claude Opus 5.5, a new session.

**The Exhumer's work, committed by itself** (89c65a3): the nine goldens, the two behaviour
cases with their captures, MANIFEST.json, the profile and the ledger. The message says
obs-cdmenu-000004 has no golden yet.

**A-016 graded** (f03afe6). `grade-a016` (about 2 s) reads A-016 from 414cad4 and every
golden, behaviour case and run folder decision 102 lists; the model rerun gives the committed
outcome on 12 of 12 and the committed field on 42 of 42. 9 of 12, which is my count: V2, W1 and
W2 ended on the shape menu, and the other nine as predicted, the three results on every field
(V1's Critical Slope `0.0086`; 1.71 cfs shows as `2`). In the 9.6 in pipe, 1.8, 2, 3 and 10 cfs
take the same three trials and reach trial 4, which equals D, which confirms my check. None of
the 184 combinations fits all 69 observations; A-015's 56 fit 65 and miss the four menu endings.
The section lists candidates for the discharge dependence without choosing one: q compared with
a number met at the trial on D (with a variant scaling as D^2.5), q acting through the chord
after trial 4, and a test on q from n or the slope whose written form 8 results refute. A cap at
a fixed share of D, the ratio to the last trial and a straight-line look-ahead are ruled out by
goldens; cd-circ-000045 and obs-cdmenu-000001 sit at ratios 1.1405 and 1.1408 and ended
differently. A scan of 0.1 to 180 in finds eight pipes whose stored diameter is a stepped trial.
Under the floor the model's chords reach y = 0 at chords 17 and 18, the first observation that
fits A-013's reading of a run-time error as the shape menu.

**circle-short-chord** (6f4c2d0). 2.7: under the floor QUICK-2 ends on the shape menu, so "it
keeps searching" is refuted there; what the system returns instead is an open decision, and the
flag stays until it is made. 2.6 and 2.10: the 9.6 in difference is 1.8 and 2 cfs; Q-029 stays
answered and is carried to a new question that names it, as I chose. 2.4 says K1 and trial >= D
stand for results and rejections, 65 of 65 with A-016's nine predicted, and are kept as the rule
that reproduces them, not as how QUICK-2 tests a trial on D. 2.9: 295 of 323 today, 318 after,
quick set unchanged at 192 and 195 of 200. 2.11 and 2.12: A-017 and the recording of
obs-cdmenu-000004 run next, and A-017 is graded before the solver changes. The design still
holds the open decision on reopening Q-029; it is not updated here.

**A-017** (d57eed5), committed before anything runs. `a017` (about 1 s). Thirteen cases: 9.6 in
at 2.1 to 2.9 cfs; 12 in at 3.6, 4.8 in at .2 and 2.4 in at .05 cfs; 9.6 in at 2 cfs with n .02.
The rule to build gives the message on all thirteen. The D^2.5 variant puts the 9.6 in change
between 2.01 and 2.28 cfs and predicts the menu at 4.8 and 2.4 in; B3 is its closest call, 0.45%.
E1 is 2.1% over the discharge that reaches its trial on D. Nothing moves at 1 ± 1e-4.

Two comparator runs (full set and quick set) rewrote the mismatch counts in results/ledger.json
as a side effect; I restored the committed file. tasks.md is not written, the solver is not
changed, and nothing was run on the oracle.

Credits: not counted here; they go in the next entry.

### Credits: the A-016 grading session

The session in the last entry used 94.32 credits over 35 min 25 s.

### The Exhumer on A-017: thirteen cases

Settings: the `exhumer` custom agent, in its own session.

The Exhumer ran A-017's thirteen cases once each with record true (decision 104). B3 to B9 and
E3 printed the message and are goldens, cd-circ-000073 to -000080. B1, B2, E1, E2 and N1 ended
on the shape menu; each was added as a behaviour case, obs-cdmenu-000005 to -000009, and
recorded in the next call, so each ran twice. W2's behaviour case, obs-cdmenu-000004, was
recorded in B1's call, which answers Q-034. N1's behaviour case was recorded by one more
recording call that then refused its own arguments and ran no case. Nothing was graded. Decision
105 stops the session.

Credits: 13.57. Time: 8 min 45 s.

### A-017 graded, the full-pipe reading, the requirements and design revised, and A-018

Settings: Claude Opus 5.5, a new session.

**The Exhumer's work, committed by itself** (811f3a5): the eight goldens, the six behaviour
cases with their captures, MANIFEST.json, the profile and the ledger.

**A-017 graded** (51ae65a). `grade-a017` (about 3 s) works as `grade-a016` does: it reads A-017
from d57eed5 and every record decision 104 lists, and the model rerun gives the committed cell
on 26 of 26. Everything I reported held: the change at 9.6 in is between 2.2 and 2.3 cfs; E1
and E2 ended on the menu and E3 printed the message; N1 ended as n .013 did; no result. The rule
to build is right on 8 of 13, candidates 1 and 2 on their two predictions, and 1a on 12 of 13,
missing E3, so no c·D^2.5 fits once 2.4 in is counted.

**The full-pipe reading came from my prompt**, not from the session: at a trial on D, QUICK-2
compares q with A·√(g·A/T) of the full pipe with T = D, which is 3.9497·D^2.5. The session
checked it rather than adopting it. Its numbers and its split hold: all 14 messages that reach
a trial on D are over the number, and the 7 menu endings and E3 are under it. Added to the 184
combinations, with a run-time error read as the shape menu and the trial resumed from a short
chord tested or not, that makes 736 variants; none fits all 82 observations, and the best fit
75. W1 and W2 end on the menu in every variant, by a chord so near 0 that x rounds to 1. In the
model, the discharges under the number never end on the menu: 1.8 cfs at 9.6 in, E1 and E2 find
a result at the chord below D, and 2 to 2.2 cfs resume past D and get the message. Leaving the
resumed trial untested gives those four the menu but turns 12 rejection goldens, E3 among them,
into menus too.

**circle-short-chord** (e4d1e18), bugfix.md and design.md together. 2.7 takes my decision on the
floor: `error` with `returns_to_menu`, whose text becomes "QUICK-2 returns to its shape menu
with no result for this input.", shown under the form; `never_finishes` is not used where a run
was seen to end. The session chose to reuse the existing flag code and change its text for every
use, and to get the outcome from the search (circle Critical Depth's F returns NaN where
x/√(1−x²) has no value) rather than from a test of q against the floor. Under that rule the
model also ends on the menu just above the floor in pipes up to 3072 in, which nobody has
observed. Nothing in 3a fits, so 2.6 stays and lists all seven menu endings in pipes with a trial
on D; I had said six. design.md: Q-029 is carried to a new question, and the open decision is
gone. 2.12: A-018 is the last held-out round; after it the solver is built with the rule that
fits best, an ending it gets wrong becomes a known difference on the limits page, and a wrong
printed number still blocks the build. The counts for A-017's eight goldens (331 in the full
set, 295 today, 326 after) are derived, not a comparator run. `a018` went into the script in
this commit, because 2.7 cites its floor scan.

**A-018** (3a8075b), committed by itself before anything runs. Thirteen cases: 2.24 to 2.28 cfs
at 9.6 in, 3.91, 3.95 and 3.99 at 12 in, .395, .4 and .405 at 4.8 in; 50.4 in at 216 cfs; 768 in
at .0023 cfs, 1.11 times the floor. The rule to build prints the message on the first twelve and
ends F1 on the menu. The full-pipe reading prints a result at the trial on D on M2 to M4, M7 and
M10, with every field given. M2 is 0.014% inside its band, and M7's Hyd R sits on a rounding
boundary set by an assumed P = 3.1416·D.

The "A-016 graded" section of results/attempts.md cited my untracked `tmp/v2_trace.mts`; it now
cites `grade-a016`, which prints the same trials. My check for this session,
`tmp/a017_check.mts`, is not cited anywhere. tasks.md is not written, the solver is not changed,
and nothing was run on the oracle.

Credits: not counted here; they go in the next entry.

### Credits: the A-017 grading session

The session in the last entry used 122.41 credits over 28 min 18 s.

### The Exhumer on A-018: thirteen cases

Settings: the `exhumer` custom agent, in its own session.

The Exhumer ran A-018's thirteen cases once each with record true (decision 106). M2 to M4, M7
and M10 gave a result and M5, M8, M11 and L1 printed the message; the nine are goldens,
cd-circ-000081 to -000089. M1, M6, M9 and F1 ended on the shape menu; each was added as a
behaviour case, obs-cdmenu-000010 to -000013, and recorded in the next case's call, so each ran
twice. It opened Q-035: the Discharge field showed `0` after .395, .405 and .0023 were typed.
Nothing was graded. Decision 107 stops the session.

Credits: 16.94. Time: 7 min 58 s.

### A-018 graded, the full-pipe rule, the requirements and design revised, and tasks.md

Settings: Claude Opus 5.5, a new session.

**The Exhumer's work, committed by itself** (0f7e517): the nine goldens, the four behaviour
cases with their captures, MANIFEST.json, the profile and the ledger.

**A-018 graded** (1452889). `grade-a018` (about 4 s) works as `grade-a017` does: it reads A-018
from 3a8075b and every record decision 106 lists, and reruns A-018's models on the 82
observations A-018 had, which give the committed cell on 52 of 52 and the committed printed
field on 70 of 70. Everything I reported held. M1, M6, M9 and F1 ended on the shape menu; M2,
M3, M4, M7 and M10 gave a result; M5, M8, M11 and L1 printed the message. Candidate 1 with the
full-pipe number is right on all twelve cases it predicts, and the five results match its table
on every printed field, 70 of 70, M7's Hyd R `0.3` among them. The rule to build is right on 5
of 13 and T1·D1·X1 F on 10 of 13. Of the 203 tied variants none is right on all 13; the best 20
are right on 10.

**Where the pieces came from.** The full-pipe number came from my prompt to the A-017 grading
session. The result bands at 0.5% of it, the table of printed fields for the five results, and
the assumption that P = 3.1416·D at D were that session's. The reading named A and T only. The
five results print with that P, but M7's Hyd R sits at A/P = 0.25 exactly, so the grade agrees
with the assumption without singling it out.

**Q-035.** M9, M10 and M11 ended three ways, so the form stored three numbers, and any
two-decimal reading of the typed discharge is ruled out; a two-decimal reading would also store
F1 as 0, which the form holds (cd-circ-000007), and F1's form moved on. Whether the fourth
decimal of .0023 is kept is not known: with three decimals F1 is under the floor, where the rule
gives the same menu. So F1 does not show what QUICK-2 does just above the floor, and Q-035 stays
open.

**The full-pipe rule.** `full-pipe-rule` (about 3 s) runs the rule I asked for inside the
rebuild's search: at a stepped trial equal to D, a result at D within 0.5% of the number, the
message more than 0.5% over it, the shape menu more than 0.5% under it in a pipe with a stepped
trial inside D, and the message under it at 2.4 in. It ends all 95 stored circle Critical Depth
observations as QUICK-2 did, every field of the 39 results among them, with no miss. 34 of the
95 reach a stepped trial on D. Nothing moves at 1 ± 1e-4.

**circle-short-chord** (88cb346). bugfix.md: 2.6 is the rule above, with (c) saying it was seen
ten times in three pipes, that M1, M6 and M9 were predicted before they ran, and that no
mechanism was found; 2.7 gives the limits page the same. The trial-on-D known difference is
withdrawn, and 2.12 records that no ending and no printed number is left wrong. 2.9: full set
295 of 340 today and 335 after, quick set 192 and 195 of 200 (none of A-018's goldens is in the
quick set); both "after" counts and the 295 are derived, not comparator runs. design.md: the
session chose how to build it: `search.ts` gets a `ceilingValue` option and a new reason,
`under_ceiling_value`, which `circle.ts` already maps to `returns_to_menu`; `circle.ts` gets
the full-pipe section at y = D; the limits text goes in a new "Limits" section of
`results/hauntings.md`, since nothing is left as a known difference. It dropped the earlier
design's test of 12 in at 1E-7 cfs, whose expected value came from the model, and did not add a
property for 2.6, whose expected outcomes would too. tasks.md: seven tasks. The comparator's
"before" run is task 2.2, before the solver changes, so the counts in 2.9 are checked before any
edit; the ledger entries of 2.10 are one Exhumer task.

The claim in bugfix.md 1.4 that `solve()` returns `never_finishes` on A-018's nine goldens today
comes from the session's untracked check, `tmp/a018_today.mts`; `full-pipe-rule` shows the `error` outcome but not
the flag. One shell command that spliced the open points was rejected, and the session
redid the edits with the file tool. The solver is not changed, no task was run, and nothing was run on the
oracle.

Credits: not counted here; they go in the next entry.
