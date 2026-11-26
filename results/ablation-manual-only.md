# The ablation: a rebuild from the manual only

Written by `python scripts/headline.py`. No number in this file is typed; `oracle/tests/test_headline.py` fails when the file differs from what the script writes.

Two rebuilds made from one prompt, with no oracle, no recorded answers and no spec, graded on the same goldens as Quickened by the same rule. How they were made is in [ablation/README.md](../ablation/README.md). **Run 2 is the baseline.** Run 1 is shown beside it: its `CONTRACT.md` carried one real answer of the program by mistake, and it searched the web where run 2 did not. Quickened's column is the real rebuild on the same cases. Step-Backwater goldens are left out.

## What each run cost

As `ablation/README.md` states them (made on 2026-11-26).

| Run | Credits | Time (UTC) |
|---|---|---|
| Run 2 | 6.32 | 15:38 to 15:43 |
| Run 1 | 11.37 | 15:13 to 15:24 |

## Matches

| Set | Cases | Run 2 | Run 1 | Quickened |
|---|---|---|---|---|
| The headline batch (seed 201) | 999 | 48 (4.8%) | 33 (3.3%) | 980 (98.1%) |
| The earlier goldens | 337 | 53 (15.7%) | 52 (15.4%) | 335 (99.4%) |

### The headline batch (seed 201), by mode and shape

| Mode and shape | Cases | Run 2 | Run 1 | Quickened |
|---|---|---|---|---|
| channel_capacity/circle | 76 | 24 | 24 | 72 |
| channel_capacity/rectangle | 75 | 0 | 0 | 74 |
| channel_capacity/trapezoid | 64 | 0 | 0 | 64 |
| channel_capacity/v_ditch | 84 | 0 | 0 | 83 |
| critical_depth/circle | 82 | 0 | 0 | 82 |
| critical_depth/rectangle | 73 | 0 | 0 | 72 |
| critical_depth/trapezoid | 70 | 0 | 0 | 70 |
| critical_depth/v_ditch | 75 | 0 | 0 | 75 |
| normal_depth/circle | 76 | 23 | 7 | 69 |
| normal_depth/irregular | 79 | 1 | 2 | 76 |
| normal_depth/rectangle | 84 | 0 | 0 | 83 |
| normal_depth/trapezoid | 80 | 0 | 0 | 80 |
| normal_depth/v_ditch | 81 | 0 | 0 | 80 |

### The earlier goldens, by mode and shape

| Mode and shape | Cases | Run 2 | Run 1 | Quickened |
|---|---|---|---|---|
| channel_capacity/circle | 34 | 18 | 18 | 33 |
| channel_capacity/rectangle | 15 | 4 | 4 | 15 |
| channel_capacity/trapezoid | 22 | 4 | 4 | 22 |
| channel_capacity/v_ditch | 12 | 2 | 2 | 12 |
| critical_depth/circle | 85 | 3 | 3 | 85 |
| critical_depth/rectangle | 20 | 1 | 2 | 20 |
| critical_depth/trapezoid | 22 | 3 | 3 | 22 |
| critical_depth/v_ditch | 23 | 4 | 4 | 23 |
| normal_depth/circle | 17 | 6 | 4 | 16 |
| normal_depth/irregular | 26 | 0 | 0 | 26 |
| normal_depth/rectangle | 25 | 5 | 5 | 25 |
| normal_depth/trapezoid | 19 | 0 | 0 | 19 |
| normal_depth/v_ditch | 17 | 3 | 3 | 17 |

## Outcomes that differ

Cases where the run gave another outcome than QUICK-2 (a result where QUICK-2 rejected, or the reverse), or gave no readable answer.

### Run 2

| Set | Mode and shape | QUICK-2 | Run 2 | Cases |
|---|---|---|---|---|
| The headline batch (seed 201) | critical_depth/circle | rejected | result | 1 |
| The earlier goldens | channel_capacity/trapezoid | rejected | result | 2 |
| The earlier goldens | channel_capacity/trapezoid | result | rejected | 1 |
| The earlier goldens | channel_capacity/v_ditch | rejected | result | 1 |
| The earlier goldens | critical_depth/circle | rejected | result | 43 |
| The earlier goldens | critical_depth/trapezoid | result | rejected | 1 |
| The earlier goldens | critical_depth/v_ditch | rejected | result | 1 |
| The earlier goldens | normal_depth/irregular | error | rejected | 1 |
| The earlier goldens | normal_depth/irregular | rejected | result | 1 |
| The earlier goldens | normal_depth/trapezoid | rejected | result | 1 |
| The earlier goldens | normal_depth/trapezoid | result | rejected | 3 |
| The earlier goldens | normal_depth/v_ditch | rejected | result | 1 |

### Run 1

| Set | Mode and shape | QUICK-2 | Run 1 | Cases |
|---|---|---|---|---|
| The headline batch (seed 201) | critical_depth/circle | rejected | result | 1 |
| The earlier goldens | channel_capacity/trapezoid | rejected | result | 2 |
| The earlier goldens | channel_capacity/trapezoid | result | rejected | 1 |
| The earlier goldens | channel_capacity/v_ditch | rejected | result | 1 |
| The earlier goldens | critical_depth/circle | rejected | result | 43 |
| The earlier goldens | critical_depth/trapezoid | result | rejected | 1 |
| The earlier goldens | critical_depth/v_ditch | rejected | result | 1 |
| The earlier goldens | normal_depth/irregular | error | rejected | 1 |
| The earlier goldens | normal_depth/irregular | rejected | result | 1 |
| The earlier goldens | normal_depth/trapezoid | rejected | result | 1 |
| The earlier goldens | normal_depth/trapezoid | result | rejected | 3 |
| The earlier goldens | normal_depth/v_ditch | rejected | result | 1 |

### Quickened

None.

## Where a run matches and Quickened does not

### Run 2

1 case. Quickened's differing fields, beside QUICK-2's text (which the run printed):

| Case | Mode and shape | Field | QUICK-2 printed | Quickened printed |
|---|---|---|---|---|
| nd-circ-000076 | normal_depth/circle | velocity | `52.2` | `52.3` |

### Run 1

None.

## Overflow fields

Of the 999 stored cases of the batch, QUICK-2 printed at least one field in its overflow form (a leading `%`, as QUICK-2 prints a number too wide for its field) in 568. Below, the matches with every such field left out of the comparison, in the golden and in the answer alike; the outcome and every other field must still be the same.

| Rule | Run 2 | Run 1 | Quickened |
|---|---|---|---|
| Every field | 48 | 33 | 980 |
| Overflow fields left out | 71 | 47 | 981 |

## How large the numeric differences are

Over the batch's fields that differ where both texts read as numbers, the relative difference |answer - QUICK-2| / |QUICK-2|. Fields where QUICK-2 printed zero are counted apart, and so are fields where either text is not a number (overflow forms, flow types). The 90th percentile is the nearest rank.

| | Run 2 | Run 1 | Quickened |
|---|---|---|---|
| Numeric fields that differ | 2485 | 2924 | 21 |
| Median | 0.19% | 0.31% | 0.35% |
| 90th percentile | 3.85% | 2.04% | 1.21% |
| Under 1% | 2009 (81%) | 2379 (81%) | 17 (81%) |
| Fields where QUICK-2 printed zero | 0 | 0 | 0 |
| Fields that differ and are not both numbers | 1366 | 1067 | 4 |

## What this cannot show

Each run is one sample of one model from one prompt; another run from the same prompt could score otherwise, as the two runs here do. The grade says how often a rebuild without the oracle prints QUICK-2's text, not how close its engineering is.
