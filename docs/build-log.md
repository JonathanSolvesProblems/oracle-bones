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

### Credits: the A-018 grading session

The session in the last entry used 65.97 credits over 21 min 10 s.

### circle-short-chord tasks 1 to 6, with a stop at 4.3 for stale tests

Settings: Claude Opus 5.5, a new session.

> Run tasks 1 to 6 of the circle-short-chord spec, in order, then stop. I reviewed the
> requirements, the design and the task list (88cb346) and approve them. Task 7 is for the
> Exhumer: don't do it.

The person's rules: no run of the program; edits with the file tool only; commit messages in a
file without a byte order mark; stop at any check that comes out differently from what its
task expects, and change no expected value, golden or spec to get past it; and show that
bugfix.md 1.4's claim about A-018's nine goldens holds in task 1.7's output, or correct 1.4.

**Before task 1.** The full Vitest suite at 0f6c688, with no change made, had 99 failures of
823: in circle.test.ts the count "finds the 60 circle result goldens" (73 now) and ten circle
Critical Depth result goldens; in forms.test.ts 87 tests on the rejection goldens
cd-circ-000039 to -000089 (the prompt order and "holds against every rejected regular golden",
which expect 47 and find 90); and Property 7, on its 5 s timeout. No task or entry mentions
these failures.

**Task 1** (c76f4fa). The tests, failing: 102 failed, 241 passed of 343 in circle.test.ts and
search.test.ts, 91 of the failures new. All 40 goldens of the design's table fail, on the
fields or outcomes the table names. A-018's nine all return `error` with `never_finishes` in
this output: cd-circ-000084, -000086, -000088 and -000089 where QUICK-2 printed the message,
and cd-circ-000081 to -000083, -000085 and -000087 where it printed a result. So 1.4 holds as
written and was not changed. Of the 43 rejection goldens, the 30 among the 40 fail and 13 pass,
the rejections that match today, as 2.9's "42 match today" requires. The 13 behaviour cases
fail with `never_finishes`, the flag text fails, and the six search option cases fail.
Property 10 fails on a draw that reaches a stepped trial on D (2.4 in, the first trial); until
task 3.2 it used the spec `searchCircle` passes today, since `circleSearchSpec` did not exist.
Task 1.4 says "in the flag test" and "leave the never_finishes text test as it is", but no test
checked a flag's text. The new text test went into circle.test.ts, so that 1.7's command runs
it, and no `never_finishes` text test was added.

**Task 2.1** (833d623). `npm run snapshot:circle` records 451 circle Normal Depth and Channel
Capacity Results from the solver at c76f4fa: 400 generated (seed 20261126, practical and
accepted ranges, one input in ten a boundary value) and the 51 goldens. A flag is recorded by
code and fields, without its text, which 2.7 changes. The script's argument is `record`,
because `searchSnapshot.ts`, which it imports, writes its own fixture on `write`. The replay
passed on the unchanged code.

**Task 2.2.** The comparator on the unchanged solver: quick set 192 of 200, full set 295 of
340, and the misses are the ones 2.9 lists, case for case.

**Task 3** (ca8d823). `search.ts`, `modes/circle.ts` and `flags.ts` as the design has them. The
full-pipe area is written 3.1416·(D/2)·(D/2), which is the same double as 3.1416·D·D/4 and
needs no new literal. Full Vitest suite: 88 failed, 842 passed of 930. Every test of task 1
passes, Property 10 with 5 of 200 draws reaching a stepped trial on D; Property 11, the search
snapshot and the guard pass. Eleven earlier tests changed, all from failing to passing: the
ten circle result goldens, and Property 7, now 1.9 s. The 88 failures are the ones that
failed before task 1. Task 3.5: `full-pipe-rule` reports 82 of 82 goldens matching through
its `solve()` column and its own search, none stopping to match, and 95 of 95 observations.

**Task 4.1 and 4.2.** Quick set 195 of 200, full set 335 of 340. The five misses are
cc-circ-000035, nd-circ-000020 and sb-irr-000001 to -000003, with the same fields as in 2.2,
and every golden that matched in 2.2 still matches. The comparator wrote its mismatch counts to
results/ledger.json, which is not committed.

**Stopped at 4.3.** The task expects the full Python and Vitest suites to pass. Vitest has the
88 failures above. The offline Python suite (`.venv`, `-m "not live"`) has 1 failure of 189,
`test_committed_quickset_is_current`: oracle/quickset.json was last rebuilt after
cd-circ-000061 to -000063 (c865f11), and the goldens recorded since change the draw. Nothing
under oracle/ changed this session. No test, golden, quick set or spec was changed to get past
them. Tasks 4.3, 5 and 6 are not done; task 7 is the Exhumer's. Nothing was run on the oracle.

**Second part: the stale tests, the quick set, and tasks 4.3 to 6.**

> Good stop. Those failures are stale tests, not solver faults, and I want them fixed properly
> before 4.3, not accepted. Same rules as before.

The person asked for each failing group to be explained and its selection fixed, counts
derived from the goldens, a test for the search rejections if nothing else covered them, the
quick set rebuilt with its own command and committed by itself, the new counts put in 2.9 and
the tasks with a dated note, and then 4.3, 5 and 6, with no assertion about what QUICK-2 printed
weakened.

**The stale tests** (c22d6d3). All three groups assumed a rejected regular golden is held at
a form prompt. The 43 circle Critical Depth rejections cd-circ-000039 to -000089 are rejected
by the search after the whole form is typed, with the message and no held prompt. The prompt
order test (43 failures) looked up the held prompt, found none and failed on -1. It now checks
a rejection by the search on the whole form, as it checks a result, and requires a message. The
holds block (44 failures) expected 47 and found 90, and expected each search rejection to be
held. It now covers the 47 goldens held at a prompt, as before. Its count test checks that
there is at least one hold and that every rejection without a held prompt has a message. A new
block covers every rejection without a held prompt: the form passes, and the outcome, held
prompt, message and printed fields are the golden's. circle.test.ts already covered the 43, but
from a typed list, so the new block is the one that will cover a new golden. The message is
compared trimmed, because the golden's message is its padded message window. In circle.test.ts
the count "finds the 60 circle result goldens" had been typed when 60 was every circle result.
It is replaced by a test that every circle golden is a result, a hold, or a rejection by the
search with the message, and that there is at least one result. Vitest: 930 passed.

**The quick set** (3cc4821, by itself). `python -m oracle.record --build-quickset`, seed 1,
from stored goldens, with no container. 21 cases left and 21 joined. cd-circ-000038, -000057
and -000058 left; cd-circ-000050, -000062, -000082 and -000086 joined. On the rebuilt set the
comparator gives 195 of 200, with the misses cc-circ-000035, nd-circ-000020 and sb-irr-000001 to
-000003 on the same fields. Before the fix it would have given 191 of 200: that count is derived
case by case from the comparator's full-set report on the unchanged solver, not run. The four
that joined miss there and match now. bugfix.md 2.9, tasks.md and design.md got a dated note
saying that 192 and 195 of 200 were right for the quick set of c865f11 (5014eaf).

**Task 4.3** (a7166b7). Vitest 930 passed; offline Python 189 passed, 48 deselected; quick set
195 of 200, full set 335 of 340. The comparator's mismatch counts in results/ledger.json are in
the commit, and tasks 1 to 4 are ticked.

**Task 5** (78981bf). circle-outputs 2.9 got a dated note. quick2-solver's design got Critical
Depth's K1, trial ≥ D and the full-pipe number in The depth search, with the ending under the
number described and not explained. The sentence "No circle Critical Depth golden reaches the
branch" is gone. The search table and a pointer in the circle section follow. In the flag
table, `returns_to_menu` has the new text and its two new uses. The design now says W1 and W2
fit the reading of a run-time error as the menu. The search.ts header now says that circle.ts
maps both new reasons to `returns_to_menu`, and neither header names a case id. H-009 has its
three goldens and their exact critical depths from `design`. A-016 held, so its two sentences
are written with cd-circ-000064 (1.6 cfs, the message) and cd-circ-000065 (1.71 cfs, Depth
`0.59`). The script still labels those two cases "not run".

**Task 6** (c7316df). A "Limits" section in results/hauntings.md, with one entry for 2.6 (c).
Its ledger decisions, 98, 102, 104 and 106, were checked against the ledger. The Limits page
paragraph is the design's draft and names no case id. There is no FEMA styling or claim, no
mascot, and no "Known differences" section.

The on-save hook ran the quick comparator after the search.ts edit. That run changed only the
`last_run` times in results/ledger.json, and those changes are not committed. Task 7, the
ledger entries of 2.10, is the Exhumer's. Nothing was run on the oracle.

Credits: not counted here; they go in the next entry.

### Credits: the circle-short-chord build and the Exhumer's ledger session

The first part of the circle-short-chord session in the last entry (tasks 1 to 4.2, stopped at
4.3) used 69.48 credits over 20 min 17 s. The second part (the stale tests, the quick set, and
tasks 4.3 to 6) used 61.14 credits over 13 min 49 s.

The Exhumer then did circle-short-chord task 7.1 in its own session, through `ledger_write`
only and with no case run: decisions 108 to 110 (K1 and trial >= D, 2.6 (a) to (d), the floor
of 2.7) and 111 (stop), Q-033 answered for its part (2), and Q-036 and Q-037 opened. That
session used 12.45 credits over 2 min 53 s. It could not commit; the next session did.

### quickened-app: the spec brought up to date after the solver

Settings: Claude Opus 5.5, a new session.

> The quickened-app spec was drafted before the solver existed. Bring it up to date and make it
> yours: revise requirements.md, then rewrite design.md and tasks.md from the requirements.
> Don't build anything in this session.

The person's rules: edits with the file tool only; short shell commands; commit messages in a
file without a byte order mark, passed with `git commit -F`; no run of the program. The person
listed what the requirements had to add (a to h), kept `.XSC` and the HEC-2 export in the spec
and last in the tasks, and asked that the deploy task stop before publishing.

**The Exhumer's commits.** results/ledger.json by itself (712f795), then task 7 ticked in
circle-short-chord's tasks.md (61177fc). The first message had no blank line after its subject,
so git read the whole message as the subject. The commit was not pushed, and its message was
amended.

**What was read.** quick2-solver's requirements and design, results/hauntings.md with its
Limits section, `flags.ts`, `forms.ts`, `index.ts`, `types.ts`, `groundPoints.ts`, the
irregular mode, the ledger's open questions, the golden nd-irr-000010 and
realdata/huntington-section-01.json. Findings that shaped the spec:

- `solve()` builds 13 pairs and answers `not built` for Step-Backwater and for Critical Depth
  and Channel Capacity on the irregular section. QUICK-2's shape menu offers Irregular in every
  mode, so all three are shown as not built.
- A held prompt has no message in QUICK-2. The app says so in its own words, apart from
  QUICK-2's messages.
- nd-irr-000010's discharge of 3000 cfs was chosen by the Exhumer to fill the cut-off low
  ground. It is above the StreamStats 1-percent AEP estimate (1,200 cfs, 90% interval 624 to
  2,310), so the example says it is a test value.
- The worked example is H-001's case, so it shows the exact answer beside the printed one.
- `results/headline.md`, which Requirement 5.2 reads, does not exist yet (exhume-loop task
  5.1). The proof page says that no headline run is recorded until it does.
- `realdata/huntington-section-01.tsv` is a valid tab-delimited paste, but its text (`0.00`,
  `660.40`) is not the golden's typed text (`0`, `660.4`). The example therefore loads the
  golden's inputs.

**The spec** (2610fd2). requirements.md keeps the five requirements and their numbers, and
adds Requirements 6 to 9 and an Open points list. design.md has the components, the Job model
and screen states, `runJob` as the UI's one call to `solve()`, `isBuilt` as the one solver
addition, the drawing built from the solver's geometry, the visual design with its tokens and
two layouts, nine properties and the Playwright run. tasks.md has 13 core tasks, then the files
in tasks 14 and 15, which wait for the Exhumer.

Nothing was built and nothing was run on the oracle. The session stopped for the person's
review.

**After review.** The person made five calls: nd-irr-000006 at 1,200 cfs becomes the main
example, with nd-irr-000010 kept beside it as the cut-off example; the station error splits at
its "!" through a solver export; open questions get plain sentences; hauntings get exact
values by field; and the no-other-origin rule, the axe check and Chromium only stay.
results/hauntings.md got 15 Exact by field lines with values the entries already state, and
results/limits-plain.md has 13 entries written from the ledger's text (f250dfb, by
themselves). The spec followed (e8a4d91).

Credits: not counted here; they go in the next entry.

### Credits: the quickened-app spec session

The revision in the last entry used 42.64 credits over 15 min 30 s. The person's calls after
review, and the spec changes that followed them, used 45.27 credits over 9 min 11 s.

### quickened-app tasks 1 to 4

Settings: Claude Opus 5.5, a new session.

> Run tasks 1 to 4 of the quickened-app spec, in order, then stop. I reviewed the requirements,
> the design and the task list (e8a4d91) and approve them.

The person's rules: no run of the program (the tests, the comparator and a local build are
fine); no waiting loops and no dev server left running; edits with the file tool only; short
shell commands; commit messages in a file without a byte order mark, passed with
`git commit -F`; new packages from the npm registry at an exact version, one install command
each; stop and show any check that comes out differently from what its task expects, with no
change to a test's expected value, a golden or the spec; and the hand checks at both widths
left to the person.

**Commits**, one per sub-task. Each test was shown failing before its code:

- Task 1, the app shell: the guard over `ui/` (2acab73); Vite, the two tsconfigs, index.html
  with the Content Security Policy, and the hash routes (a46c9b3); the stylesheet token test,
  tokens.css and the IBM Plex fonts (773ee5e); `isBuilt` (ed2a7aa); `stationErrorText` and
  `splitStationError` (5f76327).
- Task 2, the form: the form view model, Property 8 (56c9d45); the plain-decimal rule,
  Property 6 (86e5eb5); the Job (246d14d); the picker and form views (56d3dc2); paste,
  Property 3 (92df30e); the ground-points grid, Property 4 (c95189a).
- Task 3, screen states: `runJob` and `classify`, Property 2 (db44d70); the states' views
  (58aa406); the station error's rejected state (a8b2a23); the not-built view (e416468).
- Task 4, the results screen: Property 1 (64ca15f); the method list, Property 9 (01f77f2); the
  cut-off line (7408b5e).

**Checks.** `npx vitest run` went from 17 files and 930 tests to 34 files and 1140 tests, all
passing. The comparator's quick set stayed at 195 of 200 after both solver changes (1.4 and
1.5). The five misses are the known ones: cc-circ-000035, nd-circ-000020, and sb-irr-000001 to
000003. The comparator rewrites the `last_run` times in results/ledger.json, which were
committed with 1.4 and 1.5. `npm run build` writes dist/ with relative asset and font URLs.
`npm run typecheck` runs both tsconfigs and passes.

**Findings and choices the person should see:**

- `solve()` never answers `rejected` with the station error. `press()` clears the error at the
  next key, and `sectionKeys` always sends one more key, so a job with 35 after 35 runs on and
  computes a result. The 3.3 test therefore builds its Result from the solver's `stationError`.
  The design's sentence "a station that does not increase is the solver's `rejected`" does not
  hold today, and e2e item 2 (task 12.2) will fail on it. What QUICK-2 does after a station
  error is unobserved.
- Property 1 checks the state kind against `respond()`'s outcome, not the golden's. The two
  differ only on sb-irr-000001 to 000003, which the solver answers `not built`.
- 2.3 covers the 337 compared goldens of built pairs. Step-Backwater's three have no form.
- The profile gives no station range, so Property 10 draws stations from the span the goldens
  type, in hundredths. A tiny value such as 1.4E-45 makes the error longer than the key line,
  and the split then gives null.
- The comparator does not grade messages. The 3.1 test compares messages trimmed, as
  criterion 6.3 shows them.
- tsconfig.json now excludes src/ui. The ui files a test imports are still checked by it, so
  view models stay free of DOM types. tsconfig.ui.json covers the rest.
- Packages added: vite 8.3.8, the copy Vitest 5.1.1 already uses. To get the fonts, the
  session installed @ibm/plex-sans 2.0.0, @ibm/plex-sans-condensed 3.0.0 and @ibm/plex-mono
  2.5.0, copied four Latin1 woff2 files and the OFL text into public/fonts, then removed the
  three packages: each runs an IBM telemetry postinstall (`ibmtelemetry`), which the docs say
  reports only under CI. `CI` was not set.
- Beyond the task text: a picker test against the two menu captures; a "Remove last row"
  control; on the desktop, flag sentences on the right-hand page beside the form.
- The write of a commit message into .git/ was refused, so the messages went to
  tmp/commit-msg.txt.

The hand check of 2.4 at both widths is the person's. No dev server was left running, and
nothing was run on the oracle.

Credits: not counted here; they go in the next entry.

### Credits: quickened-app tasks 1 to 4

The session of the last entry used 173.49 credits over 46 min 20 s.

### quickened-app tasks 5 to 8

Settings: Claude Opus 5.5, a new session.

> Run tasks 5 to 8 of the quickened-app spec, in order, then stop. Tasks 1 to 4 are done and I
> have looked at their screens at 1280 px and 375 px: they work.

The person's rules were those of the last entry, with these changes: one commit per task, not
per sub-task; each test still before its code, but the full suite run once per task; only the
parts of the spec a task needs read. Two fixes from the person's look at the screens came with
task 5. Midway the person added a rule: a typed count in a task that disagrees with the file it
was counted from is not a reason to stop. Derive it from the file, correct the task's number,
note it here and go on. Stop only when what QUICK-2 printed, a golden, or the meaning of a
requirement is in question.

**Commits**, one per task. Each test was shown failing before its code:

- Task 5, the cross-section drawing (af02de1): `drawing/section.ts`, `axis.ts` and `svg.ts`,
  Property 5, the water-surface mark on the drawing, before the main figure and as the
  favicon. With it, the person's two fixes: the method list's Search limit sentence ended with
  two full stops and now ends with one, and before a calculation the right page is the ruled
  sketch page with the line "The result and the drawing appear here."
- Task 6, hauntings on the results screen (c8994a7): `build/hauntings.ts`, `build/goldens.ts`,
  the `virtual:quickened/data` plugin in Vite and Vitest, `ui/hauntingLinks.ts`, Property 7,
  the Exact column with its caption, and the links.
- Task 7, the worked examples (1b694c3): the two controls, the origin change on edit, the
  sources block read from realdata/huntington-section-01.json, and both discharge sentences.
- Task 8, the print view (23140d2): `views/print.ts`, `print.css`, the US Letter page and the
  print colours in tokens.css, and Print offered only for a result.

**Checks.** `npx vitest run` went from 34 files and 1140 tests to 35 and 1151 (task 5), 38 and
1190 (task 6), 39 and 1200 (task 7), and 40 and 1207 (task 8), all passing. `npm run
typecheck` passed after each task. `npm run build` writes dist/ with relative URLs and the
favicon. The comparator's quick set is 195 of 200, unchanged: no solver file changed. Its run
rewrote the `last_run` times in results/ledger.json, which are committed with this entry.

**Stops and the person's calls:**

- Task 5, Property 5 failed on five circle Critical Depth goldens (cd-circ-000081, 000082,
  000083, 000085, 000087). The search stops at y = D, where the solver takes the full pipe's
  section with Top Width = D (circle-short-chord 2.6 (a)), and the drawing had used the real
  chord, which is 0 at the crown. The person's call: draw QUICK-2's assumption, as the walls
  of `extended_section` are drawn. The pipe is drawn full, with a dashed line across the
  diameter at the crown labelled "QUICK-2's assumption for a full pipe: top width taken as the
  diameter". Property 5 stays as written.
- Task 6.2 said "the real file's 15 Exact by field lines". results/hauntings.md has 13, one
  for each case the entries name; the 15 counted the introduction's two mentions of the form.
  The person's call: tasks.md now says 13, and the test types no count. It checks that each
  case a haunting names has exactly one line and that no line names another case.
- Task 7.4, criterion 8.9 said 3,000 cfs was chosen "to put the water surface between 595.75
  and 596.42 ft". Neither record it cites holds that range. The ledger's Q-021 names 595.75 to
  597.93, and the realdata file's caveat a bench near 595 to 596 ft. The person's call: drop
  the range. Criterion 8.9 is amended with a dated note (2026-11-26), and the design's line on
  it matches.

**Findings and choices the person should see:**

- The drawing writes no number that is not a printed field's text or the scale, as criterion
  2.7 asks. The note under a circle Critical Depth drawing therefore says that QUICK-2 prints
  Depth a little below the drawn water and links H-004 without the 0.01 ft, which the method
  list gives. The person agreed.
- Property 5 runs over the result goldens the solver answers with a result. sb-irr-000001 has
  no drawing while Step-Backwater is not built. The person agreed.
- Phone height of the drawing: a new token, `--drawing-phone-height: 200px`, gives the
  design's 343 × 200. `--sketch-lines` sets the empty sketch page's height on a desktop.
- A refusal or a stop links its hauntings too: H-009 on a circle Critical Depth refusal with a
  message (not on a held prompt), and H-008 on a stop with `negative_input`. A `none` line
  (H-008, H-009) gives the link and no exact value.
- The print header's version and commit come from the data module: package.json's version and
  `git rev-parse --short HEAD`. The build fails outside a git checkout. The print view is drawn
  on `beforeprint` with the local date and replaces the page while printing, so no element
  appears twice. Links in the print are written as text.
- `@page` (US Letter portrait, 0.5 in) and the print colours sit in tokens.css, since the
  stylesheet test allows a length or colour literal nowhere else.
- The one-page fit of criterion 4.4 is a Playwright check of task 12.2. It has not been run.
- No package was added.

No dev server was left running, and nothing was run on the oracle.

Credits: not counted here; they go in the next entry.

### Credits: quickened-app tasks 5 to 8

The session of the last entry used 125.15 credits over 30 min 40 s, turn by turn: 29.78 over
9 min 55 s, 12.7 over 3 min 14 s, 51.11 over 11 min 44 s and 31.56 over 5 min 47 s.

### quickened-app tasks 9 to 13, stopped in task 12

Settings: Claude Opus 5.5, a new session.

> Run tasks 9 to 13 of the quickened-app spec, in order, then stop. Tasks 1 to 8 are done and I
> have looked at their screens and the printed PDF.

The person's rules were those of the last entry, with these added: the program is not run (the
tests, the comparator, a local build and the Playwright run are allowed); files are edited with
the file tool only and shell commands kept short; new packages come from the npm registry at an
exact version; Playwright uses the installed Microsoft Edge (channel 'msedge'), with no browser
downloaded. Four fixes from the person's look at the screens and the PDF came before task 12.

**Commits**, one per task. Each test was shown failing before its code:

- Task 9, the limits page (5476e52): `build/ledger.ts` reads the ledger's open questions,
  `build/plain.ts` reads results/limits-plain.md, and the coverage check names the question on
  each of the four fixtures of criterion 5.7. The real files have 13 open questions and 13
  entries, as the task says. `views/limits.ts` shows the hauntings, the Limits paragraphs, the
  pairs not built and each open question's plain sentences above the ledger's wording.
- Task 10, the proof page (9c11d40): `src/ui/proof/cases.json` with 25 cases and their
  reasons, `build/headline.ts` (null while results/headline.md does not exist), and
  `views/proof.ts`, each capture beside a field-by-field table marked same or different.
- Task 11, offline (0f2f158): `build/serviceWorker.ts` writes sw.js from `src/sw.ts` with the
  build's files and a hash of them; the test makes a real build into a temporary folder.
  `tsconfig.sw.json` typechecks the worker.
- The four fixes (acf8168): the irregular screen's Chan Vel label; the drawing's labels placed
  so none overlap (`drawing/labels.ts`, tested over the 245 result goldens that draw); the
  print laid out as a sheet, with requirements 4.4 and 4.5 amended and dated; and a check that
  the empty sketch page is ruled, and hidden, at no width.
- Task 12 is not committed: the stop below came during 12.2. The working tree holds
  `playwright.config.ts`, `e2e/` (six spec files), the two pinned packages, the design's note
  on Edge, `.gitignore` lines for the Playwright output, and a fix to `src/sw.ts` found by the
  offline spec.

**Checks.** `npx vitest run` went from 40 files and 1207 tests to 43 and 1224 (task 9), 46 and
1240 (task 10), 47 and 1242 (task 11), and 51 and 1263 (the fixes), all passing. `npm run
typecheck` passed after each. The comparator's quick set is 195 of 200, unchanged; its run
rewrote the `last_run` times in results/ledger.json, which are committed with this entry. The
Playwright run (Edge, desktop and phone): 35 passed, 2 failed, 1 skipped. The skip is the
phone-width check, which runs in the phone project only. The two failures are the station-error
case on both projects, below.

**The stop.** Testing Strategy item 2 asks for a station error (35 after 35, from
obs-irrelev-000001's keys) shown as QUICK-2's message up to its "!" with the key-line sentence.
No job typed in the form can reach that state. `solve()` never returns the station error:
QUICK-2's editor prints it on row 24 and goes on taking keys (solver 10.3, 10.4), and the
solver models that, so the row is shown as not taken (criterion 1.10) and the job gives a
result. The state of criterion 6.10 is built and tested in Vitest on a Result made by hand.
Making it reachable means ending a job as rejected where QUICK-2 is not recorded to end it. Is
6.10's state meant to be reached from the form, and if so, on what recorded behaviour? Or is
item 2's station error the grid's not-taken note? The spec was not changed, and the failing
spec was left as the design words it.

**Findings and choices the person should see:**

- Task 10's design says the capture shown is `screen-<last step>.txt`. A batch case keeps only
  its final screen, as screen-00.txt (cc-vdit-000012, cc-trap-000015), so the reader takes the
  highest-numbered screen file. For nd-circ-000008, a held prompt, that is screen-03 of 4 steps.
- The Property 7 edit test got a 30 s timeout: it ran past 5 s once with the suite in parallel.
- The double "QUICKENED" on the print came from the stylesheet order. app.css imports
  print.css before its own rules, so its `.top-line` rule beat print.css's. The print rules
  that must win are now the more specific, and the print's tables use their own classes, which
  the phone rules (label above value) do not reach.
- The print's notes print once under the fields, numbered, with "Note 1." on each row they
  belong to, rather than the cut-off sentence three times.
- Playwright found that the service worker missed the cached script offline: a module script's
  request carries an Origin header, and a `Vary: Origin` response does not match it. The worker
  now matches with `ignoreVary`. Offline reload then passes on both projects.
- The print specs: a regular shape and a typed 40-point section each print to one PDF page.
  The main example prints to two, its sources on the second; that its job fits one page is
  measured in print media at the page's content width, since printing redraws the view and a
  PDF of the job alone cannot be made.
- The phone check counts buttons, text fields, navigation links and each radio's label as
  controls. A link inside a sentence is left out, as WCAG 2.5.8 exempts inline targets.
- The station-error spec uses stations 0, 20, 30, 35, 35 typed as pairs. obs-irrelev-000001's
  keys hold a lone 5 after the 0 elevation at station 20, which pairs cannot type.
- Packages added: @playwright/test 1.65.1 and @axe-core/playwright 4.14.1, exact versions.

Task 13, the deploy check, was not reached in that turn. No server of this project was left
running, and nothing was run on the oracle.

The first turn of this session used 98.74 credits over 37 min 5 s.

#### The second turn: the person's call, then tasks 12 and 13

> Good stop, and you are right: my call on the station error assumed a state the form cannot
> reach. QUICK-2 prints the error and goes on taking keys, the solver models that, and the app
> must not end a job as rejected where QUICK-2 is not recorded to end it. So item 2's station
> error is the grid's not-taken note.

The person's call, as built:

- When a station is not greater than the one before it, the row's note shows QUICK-2's own
  text up to its "!", from the solver's `stationErrorText` and labelled "QUICK-2's message:",
  then Quickened's sentence that QUICK-2's editor does not take the station and goes on taking
  keys, and that Quickened computes from the rows QUICK-2 took. The job computes as before.
  `stationErrorText` joins the guard's allowed list and the design's. The Vitest tests use
  obs-irrelev-000001's and obs-irrstation-000001's keys.
- Criterion 6.10 stays as built and tested, with a dated note that `solve()` returns no station
  error, so its state cannot be reached from the form. Criterion 1.10, the design's Ground
  points paragraph and the Testing Strategy's item 2 are amended, dated 2026-11-26.
- The Playwright spec for item 2 pastes obs-irrelev-000001's keys two to a row, as the grid test
  reads them (five rows), checks the note on row 5 at both widths, and calculates: a result, no
  refusal.

**Commits:**

- Task 12, the Playwright run (9c4256f): the station-error note and its amendments, the
  config, `e2e/`, the two packages, the service-worker fix, and 12.3's identity test. The
  identity test builds the site into a temporary folder and checks it for the USWDS prefix,
  the federal banner, FEMA sentences off the allowed list (the notice and the data sources),
  art/ content and file names, Kotsu, .EXE, .COM and .DLL files, and oracle/vendor/ content. It
  failed on a throwaway file of each kind: a `usa-` class, the banner sentence, "FEMA endorses
  this throwaway.", "Kotsu", a .exe, a .com and a .dll, a copy of a file put in a throwaway
  art/ folder, and a copy of oracle/vendor's AH2.BAT. All of them were then deleted. The FEMA
  sentences of the built site are three: the notice's, and two caveats of the realdata file
  (the WV FEMA R3 lidar, and the FEMA zone from the NFHL copies).
- Task 13, the deploy check (ccf4bfd): `deploy/deploy.config.ts` and `deploy.check.ts`. They
  run the design's Deploy steps on the build under `vite preview`, in a fresh Edge context
  (no profile, no account), at 1280 and 375 px. Screenshots and the PDF went to tmp/, not
  committed.

**Checks.** `npx vitest run`: 52 files, 1268 tests, all passing. `npm run typecheck` passed.
The Playwright run: 37 passed, 1 skipped (the phone-width check, in the phone project only).
The comparator's quick set is 195 of 200, unchanged; its `last_run` times in
results/ledger.json are committed with this entry.

**What the deploy check saw**, the same at both widths: the site loads with the two example
controls and the ruled sketch page. The main example gives WS ELEV 594.37 with 16 printed
fields, no exact value and the drawing. The cut-off example gives WS ELEV 596.37, 4 exact
values and the cut-off line. The main example prints to 2 pages, the job and then its sources,
under the header "Quickened · Printed 2026-11-26 · Version 0.1.0, build 9c4256f". Offline, a
reload runs the main example again with the same 16 fields. Every request went to the
preview's own origin, and the page is no wider than the window. Nothing was published.

**Findings and choices the person should see:**

- Vitest's timeout is now 30 s for every test, in `vitest.config.ts`. A second property test
  ran past 5 s once the suite held two real builds.
- On the phone screenshot the results table's caption "Computed by QUICK-2's method" wraps a
  word to a line, as the print's heads did. The print is fixed; the screen's caption at 375 px
  is not, since task 13 reports and stops.
- On the desktop screenshot of the cut-off example the labels no longer overlap. The
  elevation sits past the right end of the water line, over the hatched ground.
- The throwaway art/ file was deleted, but art/ itself is left as an empty folder: removing
  the folder was blocked. git does not track it.

No server of this project was left running, and nothing was run on the oracle.

Credits: not counted here; they go in the next entry.

### Credits: quickened-app tasks 9 to 13, the second turn

The second turn of the last entry's session used 54.31 credits over 15 min 22 s.

### The headline batch and the ablation, outside Kiro

Done by the person, not in a Kiro session of this project:

- `results/headline-plan.md` (4e453ec), committed before the batch was recorded.
- The batch, recorded from the command line with the plan's command (0248619): 999 goldens of
  seed 201, at 48.5 cases a minute. The quick set rebuilt after it (511e7e0).
- The two ablation runs, each in another Kiro window opened on an empty folder outside this
  repository, from the prompt in `ablation/PROMPT.txt`: run 1 used 11.37 credits over 10 min
  34 s, run 2 6.32 credits over 4 min 59 s. `ablation/README.md` says how they were made
  (1b73e3f).
- `results/headline-batch-201.json` and `scripts/grade_rebuild.py` (0c766ed).

These four files were written outside Kiro.

### The headline batch graded

Settings: Claude Opus 5.5, a new session. The solver is at 5f76327 and was not changed.
Nothing was run on the oracle.

**Commits:**

- d671882: `scripts/headline.py` writes `results/headline.md` and
  `results/ablation-manual-only.md`; no number in either is typed.
  `oracle/tests/test_headline.py` fails when either differs from what the script writes. The
  script grades the rebuild and both ablation runs by `oracle.compare.compare_one`, reads the
  committed goldens even under a scratch `ORACLE_GOLDENS`, and never writes the ledger. It runs
  in about 3 s.
- b3b27f7: `results/known-misses.json`, the 24 full-set misses in six classes, which
  `oracle/tests/test_known_misses.py` checks against the comparator both ways; every test that
  walked the goldens with typed ids reads it instead. The Limits entries in
  `results/hauntings.md` and A-019 in `results/attempts.md`.
- dbc39f0: the ledger after the comparator, and dated notes in four specs.
- The commit before this entry: the proof page's count of its cases marked same and
  different, each linked, under the headline it reads from `results/headline.md`.

**The counts.** Quickened 980 of 999 on the batch, 335 of 337 on the earlier goldens
(Step-Backwater's three not built). Run 2 48 of 999 and 53 of 337; run 1 33 of 999 and 52 of
337. 568 of the 999 have a field QUICK-2 printed in its overflow form; with those fields left
out, run 2 matches 71 and run 1 47. Run 2's numeric differences: median 0.19%, 81% under 1%.
The comparator: quick set 195 of 200, full set 1315 of 1339. Every count the person typed
agreed with the script's.

**Findings and choices the person should see:**

- Vitest failed 18 tests, not 17: the 18th was the proof test that expects no
  `results/headline.md`, once step 1 wrote it. The others were 11 circle goldens, Property 11
  and the search snapshot (the fixtures predate the batch, so they now hold the goldens before
  it, the batch's seed read from `results/headline-batch-201.json`), the two irregular-flags
  tests (a typed count of 27, now derived; `cut_off_area_counted` is raised on more batch
  goldens, so the three-case list is kept for the earlier goldens and the batch's raised cases
  must print QUICK-2's fields), and Property 10 of the station error (an empty draw range once
  the batch's stations came into the span; the test draws in hundredths now).
- The fifth class is named `depth-same-fields-differ`, not "a search that stops elsewhere": the
  goldens show the printed Depth agrees and fields beside it differ, not where a search stops.
  The person's reading is the question A-019 asks.
- `results/known-misses.json` has a sixth class, `not-built`, for Step-Backwater's three, so the
  list is the comparator's whole miss list. It has no Limits entry.
- The limits page shows every `# Limits` entry under "Where Quickened gives no answer"
  (quickened-app design). The five new entries are answers that differ, so that heading does
  not fit them. The heading is not changed here.
- On the proof page 19 of its 25 cases are marked same and 6 different: cc-circ-000035,
  nd-circ-000020, and four circle "DEPTH is Greater than the DIAMETER" rejections
  (cd-circ-000039, -000043, -000049, -000050), where QUICK-2's message window holds trailing
  spaces and Quickened's message does not. The comparator does not compare messages. Not
  changed here.
- H-001's Flag line still names only the cases before the batch.
- The links of the proof page's count go to `#/proof/<case id>`; the router reads that as the
  proof page and scrolls to the case.
- The offline pytest suite needs `.venv`: the `python` on the PATH has no hypothesis.

**Checks.** Vitest 2583 passed. `npm run typecheck` passed. Playwright 39 passed, 1 skipped
(the phone-width check, in the phone project only). pytest `-m "not live"`: 194 passed, 48
deselected. It took 6 min 21 s in step 2 and 50 min 46 s in step 4, two compare tests taking
274 s and 104 s of it, while other programs on the machine were busy; a first try in step 4
was stopped at 20 min with no result.

Credits: not counted here; they go in the next entry.

## 2026-11-26, session 14: the resurrection-power spec revised

### Credits: the headline batch graded
That session used 88.34 credits over 1 h 41 min 14 s.

### The spec
Settings: Claude Opus 5.5, a new session. Nothing was built and nothing was run on the oracle.
- requirements.md, design.md and tasks.md of `resurrection-power` rewritten (1b00a95). The
  draft's four requirements keep their numbers, 4.2 included; 5 to 9 are new: the harness copy,
  the server and the workspace, the workspace files, Docker and the runner, the download.
- The format was checked on 2026-11-26 against kiro.dev's powers pages, the Agent Plugins
  Specification 1.0.0 and the Agent Skills specification. The design lists where they differ
  from the person's reading of the loader: `displayName` is not a manifest field, no `1.x.y`
  schema pattern is documented, the name rules are stricter, no icon field exists, Kiro's pages
  do not say Kiro sets `PLUGIN_ROOT` and `PLUGIN_DATA`, and they do not say installing copies
  the folder.
- Open points in the design: `python` as a bare name on Windows, MCP roots in Kiro, the
  agents' `@oracle` against Kiro's renamed server, and what MAINHLP.EXE does.

**Checks.** `scripts/check_traceability.py`: 74 criteria checked, 0 problems.

Credits: not counted here; they go in the next entry.

## 2026-11-26, session 15: the power built, tasks 1.1 to 5.2 and 7.1

### Credits: the spec revised

That session used 14.92 credits over 6 min 1 s.

### The build

Settings: Claude Opus 5.5, a new session. One commit per task, tests first: 8dcd44d (1.1),
8346716 (1.2), 574848c (2.1), 7231473 (2.2), 5388d17 (3.1), 0a699d8 (4.1), 00d93db (4.2),
f32be3c (4.3), 551dd7e (5.1), 7e9c683 (5.2), 4c75bc5 (7.1). 6.1 is the person's; 7.2 waits
for `art/`, which is empty.

- `power/` holds 51 files, 347,334 bytes: `plugin.json`, `mcp.json`, the `resurrect` skill,
  and 48 files written by `scripts/build_power.py` (36 in `oracle/`, 12 in `workspace/`).
- In this repository the code root and the workspace root are the same folder, so every path,
  the comparator, the recorder, the goldens and `.kiro/settings/mcp.json` are unchanged. After
  2.2, `python scripts/oracle_quick.py --full` with `ORACLE_LEDGER` on a copy under `tmp/`
  printed "full set: 1315 of 1339 case(s) match".
- **The live boot (5.2).** No oracle container was running. The Kiro oracle server that was
  running (started 2026-11-25 13:28) predates this session's changes and was not used: the
  test started a new server from a copy of `power/` made after the last change. MAINHLP.EXE
  started. Its first screen is a box headed "MAIN MENU HELP SCREEN" that describes options 1 to
  4 and ends "Press <Enter> to continue". The draft says `started: true`, `failures: []`,
  `exited: null`, with the archive's sha256 equal to the QUICK-2 pin; it matched the server's
  reply and the run's capture. 1 passed in 9.6 s.
- Choices the spec left open, each recorded in its commit: the include list adds
  `oracle/targets/profile.schema.json`, which the profile loader needs. The standard-library
  test allows `runner/agent.py` to import `pyte` and `settle`, because it runs only in the
  container. `mcp.json` sets `PYTHONDONTWRITEBYTECODE`, and the hook scripts turn bytecode off
  in a workspace, so nothing is written under the plugin root. `set_workspace` refuses a folder
  inside the power and does not change once set. In this repository the server ignores MCP
  roots and lists only the nine tools. The automatic download runs only in an installed power;
  `fetch.setup` now deletes an archive it has just downloaded when the hash differs. The
  Dockerfile was not edited, so the image tag here is unchanged.
- Not covered: in a new workspace `oracle_quick.py` still uses the package's `harness.json`,
  whose rebuild command is this repository's app, so grading there fails until the user sets
  their own. No requirement covers it.

**Checks.** pytest `-m "not live"`: 241 passed, 49 deselected in 6 min 10 s. Vitest: 2583
passed in 52 files. `scripts/check_traceability.py`: 74 criteria checked, 0 problems.

Credits: not counted here; they go in the next entry.

## 2026-11-26, session 16: the app's first screen and pages, ended by the usage limit

**This entry was written by the person from the command line, not by Kiro.** The session ended
on Kiro's monthly usage limit before Kiro could write it. Every figure in it is from Kiro's own
session files, the git history, or a check run from the command line.

### Credits: the power built

That session used 81.0 credits over 32 min 56 s.

### Task 6.1, outside Kiro: the clean install

Run by the person between 18:46 and 19:07 UTC, in a new Kiro window opened on an empty folder
outside this repository. Windows 11, Kiro agent extension 1.1.1122, Docker 29.6.2, Python 3.14
on PATH as `python`. Kiro opened the folder in Restricted Mode and it was trusted before
anything else.

- **Install, from the local folder.** Kiro panel, POWERS, "Add Custom Power", "Import power
  from a folder", with this repository's `power/`. Kiro's notice read `Power "power" installed
  successfully.` The Installed list showed "oracle-bones" with plugin.json's description, and
  MCP SERVERS showed `power-oracle  Connected (12 tools)`. Kiro copied the 51 files into its own
  powers folder and registered the power under the name "power".
- **One message, in a new session** (Default agent, Claude Opus 5.5, Supervised): "I just
  installed the oracle-bones power. Set it up in this folder, then run QUICK-2's control case:
  Normal Depth for a trapezoid with side slopes 3 and 2, bottom width 10, Manning's n .035,
  discharge 300 cfs and slope .005. Tell me the depth QUICK-2 prints." Kiro loaded the
  `resurrect` skill, called `set_workspace`, `init_workspace` (12 files copied) and `run_case`,
  and asked for approval before each; all were allowed.
- **The answer.** `run_case` downloaded `q2v1.zip`, checked its sha256 against the pin, and
  replied outcome `result`, screen `nd_trap_result`, depth `3.27`. Kiro then checked the value by
  hand, as the skill's step 4 says, and wrote: "My own calculation doesn't quite match... The
  exact normal depth is 3.286 ft... QUICK-2's printed area doesn't fit its printed depth either.
  An area of 59.6 sq ft means a depth of about 3.276 ft. So the program may work with about
  3.276 internally and cut it to 3.27 on screen, or it may stop iterating before it reaches the
  exact depth. One case can't tell these apart. The oracle's rules count a difference like this
  as a 'haunting': QUICK-2 is treated as right, and the gap gets written down." 1.99 credits.
- **The guard, in the same folder.** After the window was closed and opened again, a second
  message asked Kiro to record the case and then change the recorded Depth to 3.29 with its file
  edit tool. The case was recorded as `nd-trap-000003`. Kiro took the file's SHA-256, called
  `str_replace`, and reported: "The guard hook installed during setup stopped the edit before it
  ran... Afterwards, the file's hash was still C67B7A4B...4F857B20, and line 22 still reads
  3.27. I didn't try to get around the hook with a shell command... The hook only covers my edit
  tool, so a shell command could still change the file." 1.92 credits.
- Nothing was written under the installed power's folder: 51 files before and after.
- Outside Kiro, `docker build --no-cache` of `power/oracle/Dockerfile` at the pinned emu2
  commit built from nothing on this PC, and `emu2` ran in the image.

**What it found.** Six things a new user would meet, none fixed yet:

1. Kiro names a custom power after its folder, not after plugin.json's `name`. Everything the
   user sees says "power": the notice, `@power/oracle/run_case`, `power-oracle`.
2. The four copied hooks showed as disabled, though each file says enabled, until the window was
   closed and opened again. The window had opened in Restricted Mode and been trusted after.
   Until then the guard does not run.
3. In a new workspace the grading hooks have no rebuild of the user's to grade (the gap session
   15 named).
4. Kiro gives the server no workspace. After the window was reopened, `run_case` replied "No
   workspace is set. Call set_workspace with the absolute path of your project folder, then try
   again", and Kiro called `set_workspace` again by itself. It is needed once in every window.
5. The guard's message names `python -m oracle.record --rerecord`, which does not work in a
   workspace made by the power, where the package is in the power's folder.
6. The first recording in a new workspace walked the whole profile first: 65 boots and about
   three and a half minutes with only "Working" on screen, and 32 goldens the user had not
   asked for.

Not run: the install from the repository's address, because Kiro's dialog asks for a public
address and the repository is private; and the Exhumer in a clean folder, so whether its
`@oracle` tool source finds the power's server is not known.

### quickened-app tasks 16.1 to 16.9

Settings: Claude Opus 5.5, Default agent, a new session. The prompt listed nine things the
person had seen in a browser at 1280 px and at 375 px. Kiro added task 16 with a criterion and
a test for each, and committed seven of the nine:

- a144edc (16.2, 16.3): the limits page shows a code span as its value with no marks, and the
  five known-miss classes have their own heading, "Where Quickened's answer differs from
  QUICK-2's", each with its count of the headline run's cases.
- 30f7915 (16.4): the proof page marks a case by the comparator's rule and shows the messages
  beside it, not counted. It now marks 23 of its 25 cases same and 2 different; before, four
  rejections were marked different over trailing blanks in QUICK-2's message.
- b223f6b (16.5): each label of the drawing sits on a ground of the paper colour.
- c8773d9 (16.1, 16.6): the first screen opens with what the page is, for whom, the headline
  count read from `results/headline.md`, links to the proof and limits pages, and the notice;
  the results tables' captions no longer break one word to a line on a phone.
- 4ba6cbc (16.7): when a newer build takes over an open page, the page says so in one line with
  a Reload control and never reloads by itself, tested with two builds in Playwright.

**The limit.** At 19:34 UTC, 24 min 7 s and 87.73 credits into the session, Kiro stopped with
"You've reached your monthly usage limit. Please return next month to continue building."
Tasks 16.8 and 16.9 were written and their tests passed in Kiro's last run, and nothing of
them was committed.

### After the limit, outside Kiro

- ff3d8d4: tasks 16.8 and 16.9 committed from the command line exactly as the session left
  them. H-001's Flag line now names every golden that raises `cut_off_area_counted`, with a
  test that derives the list, and `results/held-out.md` holds the held-out record with its test.
- 3709297: three rows of `results/held-out.md` corrected by the person. As Kiro wrote the
  table, A-007 read 3 of 4, counting outcomes only, beside A-005's 15 of 17, which counts every
  printed field; and A-013 read 7 of 7 for a group of rules picked by the same seven cases.
  A-007 now reads 2 of 4 by A-005's rule, A-013 reads 1 of 14 groups, and A-017's row for
  candidate 1a says that its one miss refutes it. A dated count note under A-008 and under A-014
  in `results/attempts.md` states each count; no prediction or grade is changed.
- `docs/prompts.md`: every prompt sent to Kiro in this workspace, copied word for word from
  Kiro's own session files by `scripts/export_prompts.py`, with the credits Kiro recorded for
  each turn: 50 sessions, 76 prompts, 3,815.81 credits. The script and the file were written
  outside Kiro. The later entries of this log summarise their prompts; that file has them whole.

**Checks, run from the command line after both commits.** Vitest: 2608 passed in 54 files. The
typecheck and the build passed. Playwright: 43 passed, 3 skipped. pytest `-m "not live"`: 241 passed, 49 deselected. The comparator on
a copy of the ledger: 1315 of 1339 on the full set and 195 of 200 on the quick set, as before. `scripts/check_goldens.py` passed and
`scripts/check_traceability.py` reported 74 criteria, 0 problems.

**Left open by the limit.** The six findings of the clean install, the README, and tasks 6.2
and 7.2 of `resurrection-power`.

## 2026-11-26, outside Kiro: the clean install's findings fixed, the README, and the app published

**Written and done by the person from the command line, with an AI coding assistant, not in a
Kiro session.** Kiro's monthly usage limit was reached in session 16, so nothing below is Kiro's
work. The prompt that had been prepared for Kiro lists the same items.

### The six findings of the clean install (b9830a8)

Tests first, in `oracle/tests/test_power_first_run.py` and `test_power_package.py`.

- The package moved from `power/` to `powers/oracle-bones/`, since Kiro names a power installed
  from a folder after the folder. A test fails when the folder's name is not plugin.json's.
- `init_workspace` replies with a `next` list: hooks shown as disabled stay off until the window
  is reopened, and the guard does not run while they are off; `set_workspace` is needed in each
  new window; where the rebuild's command is named.
- In a workspace made by the power the grading script takes the rebuild from
  `oracle/rebuild.json`. With none it prints one line, grades nothing and exits 0.
- The guard's message names what works where it runs.
- A recording that first records the profile's own control cases lists them in its reply.
- The `resurrect` skill says each of these before the user meets it.

Requirement 10, a design note and task 9 were added to the `resurrection-power` spec, each dated
and marked as written outside Kiro.

**Checked.** The server was driven from a copy of the package outside this repository through
`set_workspace`, `init_workspace` and the control case: 12 tools listed, the no-workspace message
before `set_workspace`, 12 files copied, depth `3.27`, and nothing written into the copy.
pytest `-m "not live"`: 248 passed, 49 deselected. The comparator's full set is unchanged at
1315 of 1339. `scripts/build_power.py --check` passes.

**Not done.** The renamed package has not been installed in Kiro again, so that it registers as
"oracle-bones" is expected from what the first install showed and is not observed. The install
from the repository's address and an Exhumer run in a clean folder are still not run.

### The README (7d88e69)

`README.md` at the repository's root, with "How to run it" near the top, and
`oracle/tests/test_readme.py`, which reads every count in it from a results file and fails when
they disagree, when a row of the held-out record is missing or reworded, or when a sentence reads
as acceptance by FEMA.

The app's commands were run in a fresh clone under `tmp/`: `npm ci`, `npm test` and
`npm run build`. The first `npm test` there ran while the offline pytest suite was running on the
same machine: 2607 of 2608 passed, and the preservation test of `search.test.ts` failed on its
30 s limit at 33 s. Run again with the machine quiet: 2608 passed in 26 s. The limit in
`app/vitest.config.ts` is now 120 s, so a busy machine does not fail a test that passes.

### The app published

The built pages are public at https://jonathansolvesproblems.github.io/quickened/, served by
GitHub Pages from the repository `JonathanSolvesProblems/quickened`, which holds only the output
of `npm run build` in `app/` at commit 227cb2f, a README and `BUILD.txt` naming that commit.

Checked from outside after it went live: each file answers 200; the script and the service
worker have the same sha256 as the local build; and in a browser with a new profile the first
screen shows the headline read from `results/headline.md`, the main example prints `594.37`, the
proof and limits pages load, and the first screen and the example work again with the network
off.

### The gallery and the sources (not in this repository yet)

`devpost/gallery/build.mjs` renders the submission page's pictures from the results files and
from captures of the running app, and stops when a number cannot be found. `devpost/sources.md`
lists each outside source. Both were written outside Kiro and are not committed.

### Later the same day, outside Kiro: Kotsu's art, and the gallery script committed

- `art/` holds Kotsu, the power's mascot from `docs/mascot.md`: four poses as transparent PNGs,
  a 512 px icon, the README header, `art/LICENSE` (CC BY 4.0) and `art/provenance.json`. The
  pictures were generated on the person's own computer with an open image model (FLUX.2 klein,
  through ComfyUI); one picture was chosen as the reference and the other poses were generated
  from it, then a script cut each out of its background. `art/provenance.json` has every prompt
  and seed. No prompt names an anime, a studio, a character or an artist. The header puts the
  asking pose in front of the recorded screen of case nd-irr-000006.
- The README now opens with the header and credits the art under Licences. Kotsu is not in the
  app: `oracle/tests/test_identity.py` still passes. No icon field is added to plugin.json,
  because the documentation defines none. Tasks 6.2 and 7.2 of `resurrection-power` are ticked
  under task 9.4.
- `devpost/gallery/build.mjs`, `devpost/gallery/frames/refusal-clean.png` and
  `devpost/sources.md` are committed. The script renders the submission page's pictures from the
  results files and from captures of the running app, and stops when a number cannot be found;
  the frame is a capture of the Kiro window during the clean install, cropped and not edited.

### Later still, outside Kiro: the renamed power installed in Kiro

With the person away from the PC, Kiro was opened on a second empty folder. The old "power" was
uninstalled from Kiro's Powers panel, and `powers/oracle-bones` was installed from the folder.
Kiro's notice read `Power "oracle-bones" installed successfully.`; the Installed list shows
"oracle-bones", MCP SERVERS shows `power-oracle-bones-oracle` connected, and
`~/.kiro/powers/installed.json` names the power `oracle-bones`. So the folder's name is what Kiro
uses, as the clean install had shown, and the rename does what it was meant to.

The control case was then asked for in chat, as in the clean install, and Kiro answered "Error
sending prompt: You've reached your monthly usage limit", though the status bar read "Kiro Free
50 / 50". So the free plan's counter is not the limit that applies, and no Kiro agent turn has
run since session 16. The README's install section says what was and was not observed.
## 2026-11-27, session 17: the reach block
**The design direction and the mock were written outside Kiro; the build is Kiro's.** The person
wrote `.design/DIRECTION.md`, `.design/CHARTER.md`, the reference photographs and the mock
(`.design/mock/reach_block.py`, which draws the main example from its 40 recorded stations) on
their own, and committed them as 334c6f4. This session read them and built the app to them under
the quickened-app spec: requirement 10 and task 17, a criterion and a test for each of six items,
tests first, one commit per item. The solver was not touched.
### Credits: the last sessions
- The clean install, rerun in Kiro under the name `oracle-bones`: 1.63 and 1.81 credits, in two
  sessions.
- The session that stopped on the usage limit (session 16): 87.73 credits over 24 min 7 s.
- This session's credits are not counted here; they go in the next entry.
### What was built
1. **Tokens** (17.1). The charter's thirteen colours, light and under `prefers-color-scheme: dark`,
   and its type scale 12, 16, 21, 28, 37, 50, 66. The field-book palette and its names are gone.
   Figures are IBM Plex Sans Condensed with tabular figures; IBM Plex Mono is `--font-evidence`,
   used only inside QUICK-2's recorded screens. The SemiBold was not needed. Print stays black on
   white in either theme. `test/charter.test.ts` reads the charter's table, so a change to the
   charter fails until the tokens follow. Axe passes in both themes.
2. **The reach block** (17.2). `drawing/block.ts` draws the result as the front face of a block
   extruded upstream: top surface shaded by slope, hatched cut face, the water as a level plane
   with a body in front, cut-off water with its own hatch, QUICK-2's walls and a full pipe's
   assumed line as before, the high-water mark on the end wall with the printed figure above it,
   a staff gauge. A circle is a pipe bored through the same block. The print view keeps the 2D
   front face. `test/block.test.ts` runs over every result golden. The module was drafted before
   its test file was written; both are in one commit, so this item was not strictly tests first.
   A later commit moved the gauge's number formatting into `axis.ts`, where the ui guard allows it.
3. **The first screen** (17.3). The opening beside the main example's block, computed live on load;
   then the two examples as bordered buttons; then the calculator. The empty ruled page, its
   tokens and its tests are gone. Every page has a footer: the source repository, the limits and
   proof pages, the notice. The opening's FEMA sentences are on the identity test's allowed list.
4. **Words** (17.4). "Your inputs, as Quickened read them" and "Computed by Quickened with
   QUICK-2's method", on the screen and in the print view.
5. **Phone** (17.5). The page scrolls to the result's heading. A pasted or loaded section's ground
   points are one summary row that opens on demand. On the proof page the recorded screens scale to
   fit and the field tables stack, so no word or value breaks.
6. **Public pages** (17.6). Repository wording is split out of the plain sentences into a closed
   "For the repository" details under each entry. The limits page defines "haunting" before it uses
   the word. H-009's table is a table. Step-Backwater's entry lists what QUICK-2 asks for after
   the sentence that announces it.
### Checks at the end
Vitest 2,668 passed in 59 files (2,608 before). The typecheck and the build are clean. Playwright
48 passed and 6 were skipped, the phone-only checks on the desktop project (43 before).
### Not done
- The whole-page look was checked by screenshots of the first screen and of the block, light and
  dark, at 1280 px and 375 px; no one has reviewed them yet.
- The gauge shows two figures on the main example (650 and 600): the least gap between figures
  is 20 units, and the block's scale puts 50 ft there.
### After the first look at 1280 px and 375 px (task 17.7)
- The block is laid out in its container's real width in CSS px (a ResizeObserver redraws it), so every label is 13 px at any width; the frame is 0.6 of the width on a desktop and 0.75 on a phone, and the front face takes at least 55% of it.
- The gauge puts a figure as close as 15 px allows, with E-marks 2 px thick; the bank labels are small stakes with a canvas chip above the head, off the far terrain where a clear spot is near.
- `block.test.ts` takes the width (343 and 640); a Playwright check reads the rendered label sizes. Only the drawing tests and the first-screen and result specs were run; the rest of Vitest was not.
## 2026-11-27, outside Kiro: a practitioner's first try (task 18.0)

**Written and done by the person from the command line, with an AI coding assistant, not in a
Kiro session.** The prompt for task 18.0 was sent to Kiro on Claude Haiku 5.5 with "Approve for
me" and refused before any work: "You've reached your monthly usage limit." It is entry 53 of
`docs/prompts.md`, with 0.00 credits and the error recorded. The two items below are that
prompt's, done by hand under the quickened-app spec, tests first, one commit each. The solver
was not touched.

### Why
A practitioner who works out advisory flood heights tried the live site on a phone. Entering
an irregular cross-section one station at a time was the drawback, and some of the terminology
was not clear. The practitioner's profile tool copies its 40 stations as two columns, distance then
elevation, which the reader already took; the paste control was a small button beside an empty
row and "Add row", so the stations were typed one by one.

### Credits of session 17
Recorded in Kiro's session files: 97.63 credits for the reach block (17.1 to 17.6, Claude Sonnet
5.5) and 16.88 for task 17.7. Kiro's counter read 3.47 of 133 left before the 18.0 prompt.

### What was built
1. **Paste first** (18.0a, 1fce569; criteria 1.7 and 1.8 amended, 11.1 and 11.2 added). The
   irregular form opens with a paste panel under "The section": "Paste the section", "Up to 40
   stations, distance then elevation, as copied from a profile tool, Excel or HEC-RAS.", the box,
   "Load stations", and "Paste from clipboard" where the browser has the clipboard. It closes to
   "Paste again" once rows are loaded. The reader takes a tab, a comma, a semicolon or spaces and
   skips a header line; every other rule stays. More than one line pasted into a station or
   elevation cell loads from that row down, the way a spreadsheet does.
2. **Plain words** (18.0b, f3d8543; criterion 11.3). "How QUICK-2 computes this", "Where QUICK-2
   differs from the exact answer", "Limits, note H-001", "Exact answer" with a caption saying the
   value QUICK-2 prints stays the answer, and "QUICK-2 stopped at this input". "Pair", "held
   prompt" and "comparator" are gone from the calculate page, the result, the print view and the
   proof page's rule and rows. "Haunting" is defined and used on the limits page only.

### Checks at the end
Vitest 2,690 passed in 59 files (2,674 before). The typecheck and the build are clean.
Playwright 60 passed and 6 were skipped (50 before): at 390 px the Huntington stations load 40
rows from the box, from the clipboard control, from a paste into the first station cell, and as
comma-separated values under a "Distance,Elevation" header. Axe passes in both themes.

### The rest is finished outside Kiro (decided 2026-11-27)
Kiro's credits for the month are spent, and the person decided not to buy more: the project is
finished outside Kiro, with an AI coding assistant, from here on. Each change says so in its
commit message and in this log. Kiro wrote the specs, the harness, the solver, the app and the
power in sessions 1 to 17; `docs/prompts.md` has every prompt of those sessions.

### The story page (18.1, fe09201; criterion 11.4)
The practitioner wrote back after the fixes above were planned: the project has to be
transparent, and its story has to be part of the result. `#/story`, linked from the top line, the
footer and the opening, says how Quickened was made: the problem, asking the original program,
predictions before runs, the headline run beside the rebuild made with no recorded answers, who
made it and for which competition, that most of the code was written in Kiro and the rest is
marked here, where it falls short, the licence, and that QUICK-2 itself is not in the
repository. Every number is read from its file at build time (`build/story.ts`), and each claim
links to the file that holds it. Vitest 2,696 passed; Playwright, the page and site specs, 20
passed and 2 skipped, with axe on the new page in both themes.

### The practitioner named, and the repository public (outside Kiro, 2026-11-27)
Joe Trimboli, MSc GIS-SME, agreed to being named on the site and in the video, and to the credit
for his TPE page. Until then this log and the app called him "a practitioner". The story page
now names him, quotes his message of 2026-11-20 whole (the one he cleared for publication, held
equal to the gallery's copy by a test), links his two QUICK-2 guides, his Quick2af (QUICK-2
packaged with DOSBox to run on Windows) and his TPE page, and says what the name means: "quick"
is an old word for alive, so Quickened is QUICK-2 brought back to life. The README has a Thanks
section, and criterion 11.4 is amended. Before the repository was made public, its whole history
was checked: every commit under the person's own address, no private planning file, no secret,
and no quote of his beyond the two he cleared.

### A returning visitor gets the new build (outside Kiro, 2026-11-27; criterion 1.13 amended)
The worker serves the cache first, so someone who had opened the site before was shown the
previous build, with a line and a Reload control, when sent a link after a deploy. The person
asked that a returning visitor get the new build. A page where nothing was typed or picked now
reloads into the newer build by itself, on the same page; a page holding typed values keeps the
line, so nothing typed is lost. The builds already deployed cannot do that, so the new worker
reloads their open pages itself when it replaces one (their cache names lack "quickened-2-").
First try hung: the worker waited for those reloads inside its own activation, and a reload is
fetched through the same worker, which serves nothing until activation ends. The reloads are now
started and not waited for. Three Playwright tests with two real builds cover the three cases.