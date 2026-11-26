---
name: resurrect
description: Rebuild a dead DOS program that has no source code, using the original binary as the test oracle. Use when the user wants to question an old DOS executable, write a spec from what it prints, or grade a rebuild against it. Covers setup (Docker, Python, set_workspace, init_workspace), the first hand-checked answer, the Exhumer and the Skeptic, and the oracle law.
---

# Resurrect a dead program

The oracle runs the original program in emu2, a DOS emulator, inside a Docker container with
no network. You ask it questions through the oracle tools, write down what it prints, and
grade your rebuild against those recorded answers. The program is never edited and never
shipped: it is downloaded into your workspace and checked against a pinned sha256.

## What you need

- Docker, installed and running. The first tool that needs it builds the runner image on
  your machine; that build fetches emu2 at a pinned commit and takes a few minutes.
- Python 3 on your PATH as `python`. The oracle uses only the standard library.
- The program's archive (a .zip), or a profile that names where to download it and its sha256.

If Docker is missing or stopped, the tools say which and do nothing else. Start Docker and
ask again.

## The steps, in order

1. **Set the workspace.** If Kiro gives the oracle one workspace folder, it uses that. If not,
   every tool answers that you must call `set_workspace` first. Call it with the absolute path
   of your project folder. Everything the oracle writes goes under that folder, never into
   the power.
2. **Initialise it.** Call `init_workspace`. It copies the Exhumer and Skeptic agents, four
   hooks, the oracle law steering file, the `resurrect` workflow, the scripts the hooks call,
   the QUICK-2 profile (`oracle/targets/quick2.json`, a worked example) and a `.gitignore`
   line for the downloads folder. A file that already exists with other content is left alone
   and listed in the reply.
3. **Fetch and check the program.** For a profile with an address and a hash, the first
   tool that runs the program downloads it into `oracle/vendor/` and checks the hash. On a
   mismatch it deletes the download, prints both hashes and boots nothing. For your own
   archive, call `draft_target` with the archive path and the executable in it. It boots the
   executable once and writes `oracle/targets/<name>.json` marked `draft`, with the archive's
   sha256, whether the program started, the first screen as read, and what failed. Read the
   first screen yourself before going on.
4. **Find one answer you can reproduce by hand.** A worked example from the manual or a saved
   printout. Run it through the oracle and check the printed value by hand. This is the first
   checkpoint; nothing else is trusted until it passes. For QUICK-2 it is Normal Depth for the
   trapezoid at 300 cfs, which prints 3.27 ft.
5. **Let the Exhumer write the requirements.** Start the `resurrect` workflow with the target
   name. The Exhumer boots the program, maps its screens, runs cases and writes requirements
   from what the program prints. Each requirement cites the case id or screen capture that
   produced it. Do not write them yourself.
6. **Let the Skeptic try to break them.** The workflow's second step picks the requirements
   most likely to be wrong and runs new cases against the program to disprove them.
7. **Commit predictions before running their cases.** When you grade the rebuild on a new
   batch, commit what the rebuild predicts first, then run the batch on the program. A
   prediction written after the answer is not evidence.
8. **Write down the limits you found.** `ledger_read` with section `coverage` lists what was
   never exercised. Record each difference from the exact answer as a haunting, and record
   with `ledger_write` op `stop` why you stopped. Report coverage only from the ledger.

## The oracle law

1. The dead program is always right about what it does. When the rebuild and the original
   disagree, the rebuild is wrong, even when the original looks wrong.
2. Never edit a golden file. Goldens are recorded from the binary by `run_case` or `run_batch`
   with `record: true`. If one looks wrong, record it again from the binary.
3. Never invent a requirement. Every requirement about behaviour cites an observation. A
   manual may be cited for intent, but an observation beats the manual.
4. Do not guess from the textbook. The program may round, truncate or stop iterating early.
   Find out which.
5. When the program disagrees with physics or arithmetic, keep its behaviour and record a
   haunting in `results/hauntings.md`: the case, what it printed, the exact answer and the
   size of the difference.
6. A mismatch is one of three things, decided from evidence: the spec is wrong, it is a display
   rule (rounding, truncation, field width), or it is a haunting.
7. Say what you do not know. If a behaviour was not exercised, the ledger says so.

## What the power cannot do

- It cannot start a program the emulator cannot run. Such a program stays unstarted: the
  draft is marked not started, and its report gives the failure as the emulator or the runner
  reported it. No profile says a program ran unless a screen was read from it.
- It does not write the profile for you. A draft holds what one boot showed; the screens,
  their markers, the input flows and the field positions come from questioning the program.
- It ships no program. You supply the archive or its address.
