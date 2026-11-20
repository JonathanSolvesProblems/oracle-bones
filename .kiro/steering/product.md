---
inclusion: always
---

# Product

Oracle Bones is a Kiro power that rebuilds dead programs for which no source code exists.
It runs the original binary in an emulator, learns its behaviour by questioning it, writes
a Kiro spec from what it observes, and uses the original as the test oracle for the rebuild.

The first resurrection is QUICK-2 v1.0, FEMA's 1995 DOS program for flood water-surface
elevations in open channels. The rebuilt browser app is called Quickened ("quick" is the old
word for alive: QUICK-2, brought back to life).

## Users

The reviewer comes first in every screen, README section and demo. The developer is how it
scales.

- A floodplain permit reviewer who needs QUICK-2's answers without keeping an old Windows
  machine alive.
- A developer who has inherited a dead tool with no source.

## What success looks like

A rebuild that prints what the original prints, across thousands of inputs, with a spec in
which every requirement can be traced to an observed answer.

## Hard limits

- Quickened is not FEMA-accepted. FEMA's list names QUICK-2, not this rebuild. The results
  screen must say so.
- Quickened must not look like a FEMA product. No FEMA logo or federal styling.
- No FEMA binary and no Microsoft runtime in this repository. Ever.
- This project does not cover HEC-2, PLOT-2 or AutoHEC-2 from the same bundle.
- Kotsu, the power's mascot, never appears in the app, its results screen or its printout.
