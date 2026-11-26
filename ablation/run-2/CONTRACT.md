# The interface

The program is run as `node entry.mjs` (or `node entry.ts`). It reads one JSON request per line
on standard input and writes one JSON response per line on standard output, in the same order.

## Request

```json
{"id": "any-string", "mode": "normal_depth", "shape": "trapezoid", "inputs": {"left_slope": "2", "right_slope": "2", "bottom_width": "8", "n": ".03", "discharge": "150", "slope": ".002"}}
```

- `mode`: `critical_depth`, `channel_capacity` or `normal_depth`.
- `shape`: `v_ditch`, `rectangle`, `trapezoid` or `circle`. `irregular` only with `normal_depth`.
- `inputs`: every value is a string, exactly as a person typed it into the program.

Units: feet, cubic feet per second, feet per foot. A pipe's `diameter` is in inches. Side slopes
are horizontal to vertical.

| Mode | Shape | Inputs |
|---|---|---|
| critical_depth | v_ditch | left_slope, right_slope, n, discharge, slope |
| critical_depth | rectangle | bottom_width, n, discharge, slope |
| critical_depth | trapezoid | left_slope, right_slope, bottom_width, n, discharge, slope |
| critical_depth | circle | diameter, n, discharge, slope |
| channel_capacity | v_ditch | left_slope, right_slope, n, depth, slope |
| channel_capacity | rectangle | bottom_width, n, depth, slope |
| channel_capacity | trapezoid | left_slope, right_slope, bottom_width, n, depth, slope |
| channel_capacity | circle | diameter, n, depth, slope |
| normal_depth | v_ditch | left_slope, right_slope, n, discharge, slope |
| normal_depth | rectangle | bottom_width, n, discharge, slope |
| normal_depth | trapezoid | left_slope, right_slope, bottom_width, n, discharge, slope |
| normal_depth | circle | diameter, n, discharge, slope |
| normal_depth | irregular | sta_01, elev_01 to sta_40, elev_40 (1 to 40 ground points, station then elevation), bank_left, bank_right (the stations of the channel banks), n_left, n_channel, n_right, discharge, slope |

## Response

```json
{"id": "the-same-string", "outcome": "result", "printed": {"depth": "<text>", "area": "<text>"}, "message": null}
```

`<text>` stands for the printed text of a field; no real value of the program is shown in this
file. A real response carries every field listed below.

- `outcome`: `result` when the program prints an answer; `rejected` when the program refuses the
  input; `error` for anything else.
- `printed`: for a `result`, one entry for each field below, as the text the program prints.
  For `rejected` and `error` it is `{}`.
- `message`: the text of the program's message when it prints one, otherwise `null`.

A field named `in_...` is an input as the program prints it back on the result screen.

### Printed fields, regular shapes

| Field | Printed as |
|---|---|
| in_left_slope, in_right_slope, in_bottom_width | 1 decimal (v_ditch, rectangle, trapezoid). A V-ditch prints a bottom width of 0.0, and a rectangle prints both side slopes as 0.0 |
| in_diameter | 1 decimal (circle) |
| in_n | 4 decimals |
| in_slope | 4 decimals |
| in_discharge | whole number (critical_depth, normal_depth) |
| in_depth | 2 decimals (channel_capacity) |
| depth | 2 decimals (critical_depth, normal_depth) |
| discharge | whole number, or 1 decimal on the circle (channel_capacity) |
| critical_slope | 4 decimals (critical_depth) |
| area | 1 decimal |
| wet_perimeter | 1 decimal |
| velocity | 1 decimal |
| hyd_radius | 1 decimal |
| top_width | 1 decimal |
| froude | 1 decimal |
| max_discharge | whole number (circle only) |
| flow_type | text: SUBCRITICAL, CRITICAL or SUPERCRITICAL |

### Printed fields, normal_depth on the irregular section

| Field | Printed as |
|---|---|
| in_bank_left, in_bank_right | 1 decimal |
| in_n_left, in_n_channel, in_n_right | 4 decimals |
| in_irr_discharge | whole number |
| in_irr_slope | 4 decimals |
| depth | 1 decimal |
| ws_elev | 2 decimals (the water-surface elevation) |
| area | whole number |
| top_width | whole number |
| wet_perimeter | whole number |
| hyd_radius | 1 decimal |
| chan_velocity | 1 decimal (velocity in the channel, between the banks) |
| froude | 2 decimals |
| flow_type | text: SUBCRITICAL, CRITICAL or SUPERCRITICAL |

A response is compared with the program's own screen field by field, as text with leading and
trailing spaces removed.
