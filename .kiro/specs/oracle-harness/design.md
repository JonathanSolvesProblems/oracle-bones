# Design Document

## Overview

A host-side MCP server starts a container per session. Inside the container, a runner starts
emu2 in a pseudo-terminal, feeds the output to a pyte screen, and speaks JSON lines to the
host. Everything specific to one program sits in a target profile.

## Architecture

```
Kiro -- stdio/MCP --> oracle/mcp_server.py (host)
                         |  docker run --network none
                         v
                      oracle/runner/session.py (container)
                         |  pty
                         v
                      emu2 --> QT.EXE --> QUICK2.EXE (chained)
```

## Components

### Target profile

`oracle/targets/quick2.json` holds: archive URL, sha256, drive map (`C:` to a session
directory), directories to create, working directory, entry program, row count, screens
(an id and a text marker for each), and field regions (screen id, row, column range, name).

Known from the spike on 2026-11-06, for QUICK-2:

- Environment: `EMU2_DRIVE_C`, `EMU2_DEFAULT_DRIVE=C`, `EMU2_CWD=QUICK2`, `TERM=xterm`.
- Entry is `QT.EXE`. It shows the main menu: 1 Critical Depth, 2 Channel Capacity, 3 Normal
  Depth, 4 Step-Backwater. `QUICK2.EXE` run directly defaults to Critical Depth.
- The main menu dropped the first two inputs in the spike. This is the case for the retry in
  Requirement 4.2. Find the real cause (likely a keyboard buffer flush or slow start).
- Choosing a mode chains to `QUICK2.EXE`, which takes about a second, then shows the shape
  menu: V, R, T, C, I, each followed by Enter.
- The trapezoid form asks in this order: left slope, right slope, bottom width, Manning's n,
  discharge, slope, then Enter to begin calculations.
- `C:\QUICK2\DATA` must exist, or the program shows a stray file listing and stalls.
- `.XSC` files save cross sections. F5 prints to LPT1. `C:\QUICK2\HEC2.DAT` is written by the
  HEC-2 save.

### Runner

`oracle/runner/session.py` owns one emulator process. It exposes `screen()`, `wait_for(marker,
timeout)`, `send(keys)`, and `kill()`. Waiting polls the pyte screen, not the clock.

### Golden store

One JSON Lines file per mode in `oracle/goldens/`. Only `oracle/runner/record.py` writes to it.

### Case generator

Seeded and shape-aware. Draws channels from plausible engineering ranges, plus boundaries:
smallest and largest accepted values, invalid values, and zero slope. The Exhumer can add
cases by name.

### Comparator

Loads goldens, calls the rebuild through a Node script that prints the same named fields, and
compares strings.

## Data Models

```json
{
  "id": "nd-trap-000001",
  "target_sha256": "...",
  "mode": "normal_depth",
  "shape": "trapezoid",
  "inputs": {"left_slope": "3", "right_slope": "2", "bottom_width": "10",
             "n": ".035", "discharge": "300", "slope": ".005"},
  "printed": {"depth": "3.27", "area": "59.6", "wet_perimeter": "27.7",
              "velocity": "5.0", "hyd_radius": "2.2", "top_width": "26.4",
              "froude": "0.6", "flow_type": "SUBCRITICAL"},
  "recorded_at": "2026-11-19T00:00:00Z"
}
```

Inputs stay as the strings typed, because the program's own parsing is part of its behaviour.

## Correctness Properties

### Property 1: Determinism

For any case, running the oracle twice produces identical printed fields.
**Validates: Requirements 4.4**

### Property 2: Replay

For any stored golden, a fresh run produces the stored printed fields.
**Validates: Requirements 5.1, 5.4**

### Property 3: Worked examples

The harness reproduces the manual: trapezoid with slopes 3 and 2, width 10, n .035, slope
.005 gives depth 3.27 at 300 cfs and 4.22 at 500 cfs. These are the harness's smoke tests.
**Validates: Requirements 3.2, 4.1**

## Error Handling

- Unknown screen: return it and let the caller decide.
- Timeout: kill the session, and report it as a timeout, never as a result.
- Hash mismatch: stop.

## Testing Strategy

Unit-test the screen parser against saved captures. Property 3 runs first, as a smoke test,
in every full run.
