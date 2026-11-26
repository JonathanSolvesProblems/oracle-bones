Cases: 980 of 999
Run: 2026-11-26

# The headline run: the result

Written by `python scripts/headline.py` from the stored goldens and the rebuild's answers. No number in this file is typed; `oracle/tests/test_headline.py` fails when the file differs from what the script writes. The plan, committed before the batch was recorded, is [results/headline-plan.md](headline-plan.md).

The two lines above are the ones the app's proof page reads: the cases where Quickened prints what QUICK-2 printed, of the batch's stored cases, and the date the batch was recorded (the latest `recorded_at` of its goldens).

A case matches when the rebuild gives the same outcome (a result or a rejection) and every printed field as the same text, by the comparator's rule (`oracle.compare.compare_one`). Messages are not compared.

- Rebuild graded: `node src/oracle/entry.ts` in `app`, with `app/src/solver` and `app/src/format` at their last commit, `5f76327 2026-11-26 08:00`.
- Batch: `python -m oracle.record --seed 201 --count 1000 --ranges practical --modes critical_depth channel_capacity normal_depth`

## Drawn, stored, not finished

| | Cases |
|---|---|
| Drawn by the generator (seed 201, range set `practical`) | 1000 |
| The batch report's outcome `result` | 998 |
| The batch report's outcome `rejected` | 1 |
| The batch report's outcome `timeout` | 1 |
| Stored as goldens (the batch report's `recorded`) | 999 |
| Goldens in `oracle/goldens/cases` with seed 201 | 999 |
| Not finished within the runner's wait | 1 |

### Not finished: nd-circ-000036

normal_depth, circle, run `20261126-151351-7f218b`. The runner stopped on screen `nd_reg_form`: waited 10.0s for ['nd_circ_result', 'irr_station_rejected', 'irr_bank_rejected', 'cd_circ_rejected']. No golden is stored for it, so it is not in the count above.

Inputs as typed: diameter `38.3`, n `.0241`, discharge `13`, slope `4.9766`.

QUICK-2's last screen:

```text


           ╔═════════════════════════════════════════════════════╗
           ║                    NORMAL  DEPTH                    ║██
           ║                  CIRCULAR  CHANNEL                  ║██
           ║                                                     ║██
           ║                   INPUT VARIABLES                   ║██
           ║                                                     ║██
           ║                                                     ║██
           ║ Diameter (in)       38.3   Manning's n       0.0241 ║██
           ║ Discharge (cfs)       13   Depth (ft)          0.00 ║██
           ║ Slope (ft/ft)     4.9766                            ║██
           ╟─────────────────────────────────────────────────────╢██
           ║                  OUTPUT VARIABLES                   ║██
           ║                                                     ║██
           ║ Area (sq ft)               Wet Perimeter (ft)       ║██
           ║ Velocity (ft/s)            Hyd Radius (ft)          ║██
           ║ Top Width (ft)             Froude #                 ║██
           ║ Max Discharge(cfs)         Flow Type                ║██
           ╟─────────────────────────────────────────────────────╢██
           ║ Begin Calculations  <Enter>                         ║██
           ║                                                     ║██
           ║ <- Back Tab  <F2>                  Main Menu  <F7>  ║██
           ╚═════════════════════════════════════════════════════╝██
            ████████████████████████████████████████████████████████
```

Quickened's answer for the same inputs: outcome `result`

| Field | Quickened printed |
|---|---|
| area | `0.3` |
| depth | `0.26` |
| flow_type | `SUPERCRITICAL` |
| froude | `17.5` |
| hyd_radius | `0.2` |
| in_diameter | `38.3` |
| in_discharge | `13` |
| in_n | `0.0241` |
| in_slope | `4.9766` |
| max_discharge | `1018` |
| top_width | `1.7` |
| velocity | `41.9` |
| wet_perimeter | `1.9` |

QUICK-2 printed nothing to compare this with, so it is neither a match nor a miss.

## Matches by mode and shape

| Mode and shape | Stored | Match | Miss |
|---|---|---|---|
| channel_capacity/circle | 76 | 72 | 4 |
| channel_capacity/rectangle | 75 | 74 | 1 |
| channel_capacity/trapezoid | 64 | 64 | 0 |
| channel_capacity/v_ditch | 84 | 83 | 1 |
| critical_depth/circle | 82 | 82 | 0 |
| critical_depth/rectangle | 73 | 72 | 1 |
| critical_depth/trapezoid | 70 | 70 | 0 |
| critical_depth/v_ditch | 75 | 75 | 0 |
| normal_depth/circle | 76 | 69 | 7 |
| normal_depth/irregular | 79 | 76 | 3 |
| normal_depth/rectangle | 84 | 83 | 1 |
| normal_depth/trapezoid | 80 | 80 | 0 |
| normal_depth/v_ditch | 81 | 80 | 1 |
| all | 999 | 980 | 19 |

By QUICK-2's outcome:

| QUICK-2's outcome | Stored | Match |
|---|---|---|
| rejected | 1 | 1 |
| result | 998 | 979 |

## Every miss

Each field that differs, with the text QUICK-2 printed beside the text Quickened printed, both trimmed as the comparator compares them. A case with several differing fields has several rows. No miss is left out and none is explained here.

19 cases, 25 fields.

| Case | Mode and shape | Field | QUICK-2 printed | Quickened printed |
|---|---|---|---|---|
| cc-circ-000073 | channel_capacity/circle | max_discharge | `54287` | `54288` |
| cc-circ-000091 | channel_capacity/circle | max_discharge | `19540` | `19541` |
| cc-circ-000102 | channel_capacity/circle | max_discharge | `359` | `360` |
| cc-circ-000105 | channel_capacity/circle | max_discharge | `19975` | `19976` |
| cc-rect-000028 | channel_capacity/rectangle | flow_type | `CRITICAL` | `SUBCRITICAL` |
| cc-vdit-000071 | channel_capacity/v_ditch | discharge | `%41694` | `%41695` |
| cd-rect-000058 | critical_depth/rectangle | area | `536.7` | `534.8` |
| cd-rect-000058 | critical_depth/rectangle | critical_slope | `0.7375` | `0.7464` |
| nd-circ-000024 | normal_depth/circle | froude | `16.5` | `16.6` |
| nd-circ-000024 | normal_depth/circle | velocity | `38.5` | `38.8` |
| nd-circ-000049 | normal_depth/circle | froude | `18.6` | `18.4` |
| nd-circ-000049 | normal_depth/circle | velocity | `37.1` | `36.8` |
| nd-circ-000070 | normal_depth/circle | froude | `20.0` | `20.1` |
| nd-circ-000070 | normal_depth/circle | velocity | `52.5` | `52.7` |
| nd-circ-000076 | normal_depth/circle | velocity | `52.2` | `52.3` |
| nd-circ-000079 | normal_depth/circle | max_discharge | `34422` | `34423` |
| nd-circ-000087 | normal_depth/circle | depth | `0.34` | `0.33` |
| nd-circ-000087 | normal_depth/circle | froude | `7.0` | `7.1` |
| nd-circ-000097 | normal_depth/circle | max_discharge | `14050` | `14051` |
| nd-irr-000052 | normal_depth/irregular | flow_type | `CRITICAL` | `SUBCRITICAL` |
| nd-irr-000084 | normal_depth/irregular | area | `5892` | `5893` |
| nd-irr-000102 | normal_depth/irregular | froude | `1.51` | `1.50` |
| nd-irr-000102 | normal_depth/irregular | ws_elev | `145.16` | `145.17` |
| nd-rect-000059 | normal_depth/rectangle | area | `2439.3` | `2439.4` |
| nd-vdit-000091 | normal_depth/v_ditch | flow_type | `CRITICAL` | `SUPERCRITICAL` |

## QUICK-2's outcomes

What QUICK-2 did with the stored cases of the batch.

| Mode and shape | rejected | result | Total |
|---|---|---|---|
| channel_capacity/circle | 0 | 76 | 76 |
| channel_capacity/rectangle | 0 | 75 | 75 |
| channel_capacity/trapezoid | 0 | 64 | 64 |
| channel_capacity/v_ditch | 0 | 84 | 84 |
| critical_depth/circle | 1 | 81 | 82 |
| critical_depth/rectangle | 0 | 73 | 73 |
| critical_depth/trapezoid | 0 | 70 | 70 |
| critical_depth/v_ditch | 0 | 75 | 75 |
| normal_depth/circle | 0 | 76 | 76 |
| normal_depth/irregular | 0 | 79 | 79 |
| normal_depth/rectangle | 0 | 84 | 84 |
| normal_depth/trapezoid | 0 | 80 | 80 |
| normal_depth/v_ditch | 0 | 81 | 81 |
| all | 1 | 998 | 999 |

Of the stored cases, QUICK-2 printed at least one field in its overflow form (a leading `%`) in 568.

## The earlier goldens

The goldens stored before this batch. They are not a random sample, so they are reported separately and are not the headline.

| | Cases |
|---|---|
| Earlier goldens (behaviour cases left out) | 340 |
| Generated from a seed (101, 102, 103, 104, 20261123) | 219 |
| Not generated: typed by hand or chosen by predictions | 121 |
| Step-Backwater: not built, not graded | 3 |
| Graded | 337 |
| Match | 335 |

Step-Backwater is not computed by Quickened, and the app says so. These goldens are not counted as matches or misses: sb-irr-000001, sb-irr-000002, sb-irr-000003.

| Mode and shape | Graded | Match | Miss |
|---|---|---|---|
| channel_capacity/circle | 34 | 33 | 1 |
| channel_capacity/rectangle | 15 | 15 | 0 |
| channel_capacity/trapezoid | 22 | 22 | 0 |
| channel_capacity/v_ditch | 12 | 12 | 0 |
| critical_depth/circle | 85 | 85 | 0 |
| critical_depth/rectangle | 20 | 20 | 0 |
| critical_depth/trapezoid | 22 | 22 | 0 |
| critical_depth/v_ditch | 23 | 23 | 0 |
| normal_depth/circle | 17 | 16 | 1 |
| normal_depth/irregular | 26 | 26 | 0 |
| normal_depth/rectangle | 25 | 25 | 0 |
| normal_depth/trapezoid | 19 | 19 | 0 |
| normal_depth/v_ditch | 17 | 17 | 0 |

Misses among the earlier goldens:

| Case | Mode and shape | Field | QUICK-2 printed | Quickened printed |
|---|---|---|---|---|
| cc-circ-000035 | channel_capacity/circle | max_discharge | `101165` | `101166` |
| nd-circ-000020 | normal_depth/circle | froude | `2.5` | `2.4` |
| nd-circ-000020 | normal_depth/circle | velocity | `5.8` | `5.7` |

## What this run cannot show

It grades the rebuild against one program on one emulator, on inputs drawn by this generator from the practical ranges in `oracle/targets/quick2.json`. It says nothing about inputs outside those ranges, about Step-Backwater, or about whether QUICK-2's own answers are right. A match means the printed text is the same; it does not show that the hidden values behind the text are the same. The case QUICK-2 did not finish has no golden, so nothing is known about what it would have printed.
