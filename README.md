# Oracle Bones and Quickened

QUICK-2 is a flood program FEMA wrote in 1995. It works out the flood elevation at one cross
section, FEMA's list of accepted models still names it, and it needs DOS. This repository holds
two things made from it without its source code:

- **Quickened**, QUICK-2's method in a browser, for a floodplain reviewer checking one cross
  section the way QUICK-2 does. Try it: https://jonathansolvesproblems.github.io/quickened/
- **Oracle Bones**, a Kiro power that does the same job on any dead DOS program: it runs the
  original in an emulator, questions it, and grades a rebuild against what it prints.

Quickened is an independent rebuild of QUICK-2 v1.0. It is not a FEMA product and is not accepted by FEMA: FEMA's list of accepted models names QUICK-2, not Quickened. Use it as a cross-check.

## How to run it

### The app, with nothing to install

Open https://jonathansolvesproblems.github.io/quickened/ and press the first example, "Grapevine
Branch, WV: the 1-percent flood, 1,200 cfs". It prints WS ELEV 594.37, which is what QUICK-2 printed
for the same inputs. No account and no key. The pages also work with the network off after the
first visit.

### The app, from a clone

Needs Node 24 or later. These are the commands of a run in a fresh clone on 2026-11-26:

```
git clone https://github.com/JonathanSolvesProblems/oracle-bones.git
cd oracle-bones/app
npm ci
npm test
npm run build
npx vite preview
```

`npm test` runs the unit and property tests, which grade the solver against every recorded answer
in `oracle/goldens/`. `npx vite preview` serves the built pages at http://localhost:4173/.
`npm run e2e` runs the browser tests in Microsoft Edge through Playwright.

### The checks against the original program's answers

Needs Python 3 and Node 24. From the repository's root:

```
python -m venv .venv
.venv/Scripts/python -m pip install -r oracle/requirements-dev.txt
.venv/Scripts/python scripts/oracle_quick.py --full
.venv/Scripts/python scripts/check_goldens.py
.venv/Scripts/python -m pytest oracle/tests -m "not live"
```

On Linux or macOS the interpreter is `.venv/bin/python`. `oracle_quick.py --full` runs the rebuild
on every recorded case and prints how many match. `check_goldens.py` checks that no recorded
answer was edited. The pytest run is offline and takes 8 to 25 minutes. None of these runs the
1995 program: its answers are already recorded in `oracle/goldens/`, each with the screen it came
from.

Running the 1995 program itself needs Docker. `python scripts/setup.py` downloads FEMA's archive
from the address in `oracle/targets/quick2.json` and stops unless its sha256 is the pinned one.
No file of the program is in this repository.

### The power, in Kiro

These are the steps of the clean install of 2026-11-26, on Windows with Docker running and
`python` on PATH. The record is in `docs/build-log.md`, session 16.

1. Open an empty folder in Kiro and trust it.
2. Kiro panel, POWERS, "Add Custom Power", "Import power from a folder", and choose this
   repository's `powers/oracle-bones` folder. The Installed list shows "oracle-bones", and MCP
   SERVERS shows its oracle server with 12 tools.
3. In chat: "I just installed the oracle-bones power. Set it up in this folder, then run QUICK-2's
   control case: Normal Depth for a trapezoid with side slopes 3 and 2, bottom width 10,
   Manning's n .035, discharge 300 cfs and slope .005. Tell me the depth QUICK-2 prints."
4. Kiro asks before each tool. It sets the workspace, copies the agents, hooks, steering and
   workflow into the folder, downloads and checks the program, and answers 3.27 ft.

In that install the folder was still named `power`, so Kiro registered the power as "power". The
folder has been renamed since, and the renamed package was then driven outside Kiro through the
same three tools, from a copy outside this repository, to the same 3.27. Installing it in Kiro
under its new name has not been repeated yet. Installing from the repository's address has not
been run either: Kiro asks for a public address, and the repository was private at the time.

## What the numbers are

**The headline.** After the solver was frozen, 1,000 inputs were drawn at random. QUICK-2
answered 999 of them. Quickened prints the same outcome and the same text in every field on
980 of 999. The plan was committed before the batch was recorded. Everything is in
[results/headline.md](results/headline.md), which a script writes and a test checks.

**Without the oracle.** The same model was given one prompt, the interface and public knowledge of
the method, with no recorded answers and no spec. Its rebuild matches 48 of 999 on the same cases
by the same rule. See [results/ablation-manual-only.md](results/ablation-manual-only.md) and
[ablation/](ablation/).

**The 19 it gets wrong.** They are in five classes, each named on the app's limits page and in
[results/known-misses.json](results/known-misses.json). No cause is found yet for any of them, and
none is explained beyond what the recorded answers show.

**Predictions before runs.** Each time a rule was proposed, its predictions for new cases were
committed before those cases were run on the program. This is the whole record, misses included,
from [results/held-out.md](results/held-out.md):

| Round | Committed | Right | What was predicted |
|---|---|---|---|
| A-005 | d9e1a3a | 15 of 17 | Every printed field of 17 circle cases nobody had run, by the rules of A-004. |
| A-007 | dcd4e85 | 2 of 4 | The outcome and every printed field of four small pipes in circle Critical Depth, by the rebuild's own search; the outcome alone was right on three. |
| A-009 | 80c87fd | 4 of 4 | One rule, K1, for cd-circ-000033's Critical Slope and for where that refusal begins, on four pipes. |
| A-011 | b4950f7, 3d9bf3a | 10 of 11 | Eleven pipes, at trials that land on the diameter and at standard sizes, by K1 with the rebuild's trials; S6 to S11 came in the amendment's commit. |
| A-013 | 69338b5, 6ecfb3c | 1 of 14 | Fourteen groups of rules on seven pipes, none picked before the runs, so the count is in groups: one, G3, was right on all seven, which made it a fit and not yet a passed test. |
| A-014 | f066861 | 1 of 3 | Three held-out pipes for G3, the group A-013 left standing. |
| A-016 | 414cad4 | 9 of 12 | Twelve pipes by K1 with T1·D1·X2, the rule then proposed to build. |
| A-017 | d57eed5 | 8 of 13 | Thirteen pipes by the rule to build, which gave the message on all thirteen. |
| A-017 | d57eed5 | 12 of 13 | The same thirteen by candidate 1a, a number c·D^2.5 that splits the shape menu from the message; its one miss, E3, refutes it. |
| A-018 | 3a8075b | 12 of 12 | Twelve pipes by candidate 1 with the full-pipe number at the trial on D. |
| A-018 | 3a8075b | 5 of 13 | The same round's thirteen pipes by the rule to build. |

The full-pipe number in A-018's first row came from the person's prompt, not from the agent that wrote these rounds. Why QUICK-2 goes back to its shape menu below that number is still not explained.

## What it does not do

- **Step-Backwater is not built.** The app says so on its first screen.
- **Critical Depth and Channel Capacity on an irregular section are not built**, and QUICK-2's
  behaviour there has not been recorded.
- **Where QUICK-2 itself differs from exact hydraulics, Quickened prints QUICK-2's answer.** That
  is the accepted method. The limits page lists each difference with its size, and the app flags
  the one that matters most on a real section: low ground cut off from the channel is counted as
  flowing.
- **The power cannot start a program its emulator cannot run.** Such a program stays unstarted,
  and the draft profile says why. It writes no profile for you beyond what one boot showed.
- **In a new workspace the power's guard is off until Kiro's hooks are on.** In the clean install
  the copied hooks showed as disabled until the window was closed and opened again.
  `init_workspace` and the skill both say so.
- **Not tested:** whether the Exhumer agent's `@oracle` tool source finds the power's server in a
  new workspace. No Exhumer run was made in a clean folder.

## How it was built

Built in Kiro, in 50 sessions. Kiro wrote the specs, the harness, the solver, the app and the
power, each rule from what the 1995 program printed:

| Kiro feature | Where it is | What it does here |
|---|---|---|
| Specs | `.kiro/specs/` | Seven specs. Requirements cite the recorded case that showed each behaviour; a script fails when a citation is missing. |
| MCP server | `oracle/mcp_server.py`, `.kiro/settings/mcp.json` | The oracle: boots the original in an emulator in Docker and answers one case at a time. |
| Custom agents | `.kiro/agents/` | The Exhumer questions the program and writes requirements. The Skeptic tries to disprove them. |
| Hooks | `.kiro/hooks/` | The guard refuses any edit to a recorded answer. Two more grade the rebuild after each task and on save, and one reports the ledger when a turn ends. |
| Steering | `.kiro/steering/` | The oracle law: the dead program is right about what it does, even where the textbook disagrees. |
| Workflow | `.kiro/workflows/` | Exhume, then let the Skeptic attack the result. |
| Power | `powers/oracle-bones/` | The method packaged for another program: the server, the `resurrect` skill, and the files a new workspace needs. |
| Property tests | `app/test/`, `oracle/tests/` | fast-check and Hypothesis, with expected values taken from the recorded answers. |

[docs/build-log.md](docs/build-log.md) records every session, and
[docs/prompts.md](docs/prompts.md) has every prompt word for word (76 prompts), exported from
Kiro's own session files.

Some pieces were done outside Kiro, and the build log marks each one: the first drafts of the
plan, specs, steering, hooks and agents, written with another AI coding assistant before session
1 and then rewritten by Kiro; the real cross-section data; the headline batch and the two
ablation runs; and, after Kiro's usage limit was reached on 2026-11-26, the fixes that the clean
install called for, three corrected rows of the held-out record, this README and the script that
exports the prompts.

## Licences

The code is under the MIT licence ([LICENSE](LICENSE)). The fonts are IBM Plex, under the SIL Open
Font License (`app/public/fonts/OFL.txt`). The emulator, emu2, is under GPL-2.0: it is fetched at a
pinned commit when the runner image is built, runs as its own program, and is not in this
repository or in the power. QUICK-2 was written at FEMA; no file of it is here.
