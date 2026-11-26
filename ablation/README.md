# The ablation: a rebuild with no oracle and no spec

This folder holds a second rebuild of QUICK-2, made to measure what the oracle adds. The same
model (Claude Opus 5.5 in Kiro, Default agent) wrote it from one prompt, with no access to the
1995 program, its recorded answers, the specs or the solver in this repository. It is graded on
the same cases as the real rebuild, by the same rule.

## What a run was given

- One prompt: `PROMPT.txt`. Nothing was said after it.
- One file: `CONTRACT.md`, the interface the comparator speaks. It names the inputs and the
  printed fields and says how many decimals each field prints. It gives no rule for computing any
  number.
- An empty folder outside this repository, opened in its own Kiro window, so that the run could
  not read the specs, the goldens or the solver. Neither transcript mentions this repository's
  folder.
- Web access. The prompt allows public method documentation.

In a new folder Kiro asks before each shell command and each web request. Those prompts were
answered by hand, and what was answered is listed for each run below.

## The two runs

Both were made on 2026-11-26.

**Run 2 is the baseline** (15:38 to 15:43 UTC, 6.32 credits). It made no web request. It wrote
`entry.mjs` and 14 test cases of its own, and ran them. Four shell commands were asked for and
all four were allowed: a listing of its own folder, and three runs of its own program on its own
inputs.

**Run 1 is kept for the record and is not the baseline** (15:13 to 15:24 UTC, 11.37 credits).
Its `CONTRACT.md` showed one real answer of the program by mistake: the example response carried
Depth `3.27`, and the example request beside it was the recorded case nd-trap-000001. The run's
last message shows it checked its iteration against that number. So it was not a rebuild without
any output of the program, and it was run again with the file corrected: the example response
now holds placeholders, and the example request is not a recorded case.

Run 1 searched the web four times and fetched two pages. It read FEMA's QUICK-2 tutorial text
(https://www.fema.gov/sites/default/files/2020-07/quick-2-tutorial.txt, written for version
2.0) and could not read the PDF of FEMA 265. Its first shell command, a listing of its own
folder, was denied, and it read the file with its file tool instead. The other prompts were
allowed: the web requests, a search of its own file, and runs of its own program and of small
calculations on its own inputs.

The two runs differ in more than the corrected file: run 1 looked things up and run 2 did not.
Nothing told either run to search or not to. Both grades are reported.

## What each run said it had to guess

`run-1/final-message.md` and `run-2/final-message.md` hold each run's last message, as written.

## The grades

They are in `results/ablation-manual-only.md`, beside the real rebuild's on the same cases.
