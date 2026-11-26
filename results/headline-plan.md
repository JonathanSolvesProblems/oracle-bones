# The headline run: the plan

Written and committed before the batch is recorded. Nothing in this file changes after the run;
the result goes in `results/headline.md`.

## What is measured

Of the cases QUICK-2 v1.0 answers, how many the rebuild answers the same way: the same outcome
(a result or a rejection) and every printed field as the same text. Messages are not compared.
The comparison is the comparator's (`oracle/compare.py`, `python scripts/oracle_quick.py --full`).

## The batch

`python -m oracle.record --seed 201 --count 1000 --ranges practical --modes critical_depth channel_capacity normal_depth`

- 1,000 generated cases. Seed 201 has not been used: the stored goldens that were generated come
  from seeds 101 to 104 and 20261123.
- The generator draws a mode and shape, then each input from the ranges in
  `oracle/targets/quick2.json`. In the practical set only Manning's n and the pipe diameter are
  narrowed to published ranges. Discharge, depth, slope and the section's dimensions are drawn
  from everything the form accepts, so many cases are not channels an engineer would enter, and
  many pipes will be given more water than they carry. The result file reports the outcomes
  QUICK-2 gave, by mode and shape.
- Step-Backwater is left out. The rebuild does not compute it, and the app says so. It is
  reported as not built, not counted as a match or a miss.

## The rebuild is frozen first

`app/src/solver` and `app/src/format` are at commit 5f76327 (2026-11-26, 08:00). No rule
changes between that commit and the grading. If a rule changes afterwards, the headline stays
as measured here, and the changed rebuild is graded as a new run with its own date.

## What gets reported

- The count drawn, the count QUICK-2 answered and stored, and the count it did not finish within
  the runner's wait. A case that stores no golden is listed with its inputs and its last screen.
  It is not left out silently.
- The matches out of the stored cases, and every miss with its case id and the fields that
  differ. No miss is dropped, and none is explained away before it is listed.
- Beside it, the 340 goldens stored before this run (335 of 340 match at this commit). They are
  not a random sample: 121 of them were typed by hand or chosen by predictions, not drawn by the
  generator, so they are reported separately and are not the headline.
- The same 1,000 cases grade the ablation: a second rebuild made from one prompt, with no
  oracle and no spec (`results/ablation-manual-only.md`).

## What this run cannot show

It grades the rebuild against one program on one emulator, on inputs drawn by this generator.
It says nothing about inputs outside these ranges, about Step-Backwater, or about whether
QUICK-2's own answers are right.
