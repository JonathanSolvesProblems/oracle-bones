# Design Document

## Overview

A static Vite and TypeScript site in `app/`. The solver in `app/src/solver/` is shared with the
oracle comparator, so that what is graded is what ships. The site installs a service worker
for offline use.

## Components

- `app/src/solver/`: from the `quick2-solver` spec.
- `app/src/format/`: print and rounding rules, found by the Exhumer.
- `app/src/xsc/`: reads and writes `.XSC` files.
- `app/src/hec2/`: writes the HEC-2 export.
- `app/src/ui/`: mode and shape picker, form, results, print view, proof page.

## Data Models

A `Job` holds the mode, shape, inputs as typed strings, and printed outputs. Strings stay
strings, because the input parsing is part of the behaviour being preserved.

## Correctness Properties

### Property 1: Same code, same answer

The comparator calls the module the UI calls. For any golden, the UI's output fields equal the
comparator's.
**Validates: Requirements 2.1**

### Property 2: File round trip

For any job, saving to `.XSC` and opening it returns the same inputs, and the original program
opens the saved file.
**Validates: Requirements 3.1, 3.3**

### Property 3: Export matches

For any job in the export set, the exported file equals the `HEC2.DAT` the original wrote, byte
for byte, apart from fields shown to vary.
**Validates: Requirements 4.2**

## Error Handling

File errors name the part that failed. The app does not guess at a damaged file.

## Testing Strategy

Vitest with fast-check. Playwright for one end-to-end run at desktop and phone widths. Check
that the notice in Requirement 2.3 appears on the results and print views.
