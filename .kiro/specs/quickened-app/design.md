# Design Document

## Overview

Quickened is a static site built with Vite and TypeScript in `app/`. It has no server and no
runtime dependency. The browser imports the same `solve()` that the oracle comparator calls
through `app/src/oracle/entry.ts`, so what is graded is what ships. A service worker keeps the
site working offline after the first load.

The app does three things around the solver:

1. It turns what the user types into a solver `Job` and turns the solver's `Result` into one
   screen state. It computes no hydraulic value and formats no printed value of its own.
2. It draws the entered cross section with the water surface, from the same numbers the result
   prints.
3. It feeds three pages from committed records: the limits page from `results/hauntings.md`
   and `results/ledger.json`, the proof page from the goldens and their captures, and the worked
   example from the golden nd-irr-000010 and `realdata/huntington-section-01.json`.

### What changed since the first draft

The first draft was written before the solver existed. Since then:

- The solver answers every job with one of `result`, `rejected` (with a held prompt or with
  QUICK-2's message) or `error` (with a flag, or with `not built`), and carries flags with
  plain sentences (`app/src/solver/flags.ts`). The app now has a screen state for each.
- Step-Backwater, and Critical Depth and Channel Capacity on the irregular section, are not
  built. The app shows them as not built instead of leaving them out.
- `results/hauntings.md` has nine hauntings and a Limits section written for this app.
- `.XSC` and `HEC2.DAT` are still unobserved, so their work moves to the end.

## Components

```
app/
  index.html                 the one page; hash routes inside it
  vite.config.ts             base './', the data plugin, the service-worker plugin
  build/
    data.ts                  Vite plugin: the virtual module `virtual:quickened/data`
    hauntings.ts             reads results/hauntings.md (hauntings and Limits entries)
    ledger.ts                reads the open questions of results/ledger.json
    headline.ts              reads results/headline.md, or reports it missing
    goldens.ts               reads the goldens and captures the pages need, read-only
    serviceWorker.ts         Vite plugin: writes sw.js with the precache list of the build
  src/
    solver/                  from quick2-solver; one addition, isBuilt (below)
    format/                  from quick2-solver
    oracle/entry.ts          the comparator's entry, unchanged
    ui/
      main.ts                starts the app, registers the service worker, routes
      job.ts                 the app's Job, built from the form
      validate.ts            the plain-decimal rule (criterion 1.9)
      paste.ts               the tab-delimited paste reader (criteria 1.7, 1.8)
      state.ts               runJob and classify: Job -> ScreenState
      forms.ts               the form view model: prompts, labels, fixed fields
      grid.ts                the ground points as QUICK-2's editor took them (1.10)
      method.ts              the method values for a pair, from constants.ts (2.6)
      hauntingLinks.ts       which haunting a flag or pair links to (2.4)
      drawing/
        section.ts           the drawing model: ground, walls, water spans, labels
        axis.ts              Quickened's scale and station ticks; the only number formatting in ui/
        svg.ts               renders the model as SVG
      views/
        picker.ts, form.ts, results.ts, states.ts, print.ts, limits.ts, proof.ts, example.ts
      proof/cases.json       the proof page's case list, each case with its reason
      styles/
        tokens.css           every colour, size and space (Visual design)
        app.css, print.css
    sw.ts                    the service worker
  public/fonts/              IBM Plex Sans, Sans Condensed and Mono, woff2, with OFL.txt
  e2e/                       Playwright specs
  playwright.config.ts
  tsconfig.json              solver, format, oracle, tests: no DOM types (unchanged)
  tsconfig.ui.json           ui, build, e2e: adds the DOM library
```

`src/solver/` and `src/format/` keep their rules (quick2-solver design: When the rebuild and
the oracle disagree): no case id, no golden path, no literal outside `constants.ts`. The guard
test that enforces them is unchanged. `tsconfig.json` stays without the DOM library, so the
solver cannot reach the browser; `tsconfig.ui.json` covers the rest.

No UI framework. The views are small TypeScript functions that build DOM nodes from a view
model. The view models are pure functions, tested in Vitest under Node without a DOM; the DOM
is tested by the Playwright run. This keeps the shipped code to the solver, the views and the
service worker, with nothing to update for security.

### The one solver addition

`app/src/solver/index.ts` exports `isBuilt(mode, shape): boolean`, read from the same
`METHODS` and `REGULAR_METHODS` tables `solve()` dispatches on. It changes no Result. The app
uses it to mark pairs as not built (criterion 7.4). A test checks, for every pair, that
`isBuilt` is false exactly when `solve()` answers `not built` for that pair's golden inputs, or
for a probe job where no golden exists.

## The Job model

```ts
// app/src/ui/job.ts
import type { Mode, Shape } from '../solver/index.ts';

interface AppJob {
  mode: Mode;
  shape: Shape;                       // 'irregular' for Step-Backwater, as the solver keys it
  inputs: Record<string, string>;     // typed text, keyed by the contract's input names
  origin: 'typed' | 'example';        // 'example' until any input is edited (8.6)
}
```

Inputs stay strings, as typed, because QUICK-2's parsing is part of what is preserved: the
ground-point grid shows text as typed (solver 9.1) and a bank matches a station by its value as
entered (solver 9.6). Ground points use the contract keys `sta_01`, `elev_01` and so on, in row
order; the irregular form's other keys are `ND_IRREGULAR_PROMPTS` from the solver's
`forms.ts`. The Job is held in memory only. Nothing is stored in the browser, so nothing a
reviewer types outlives the tab (criterion 1.12).

The solver sees `{ mode, shape, inputs }` and nothing else. `origin` never reaches it.

## How the UI calls solve()

```ts
// app/src/ui/state.ts
import { solve, NOT_BUILT, type Result } from '../solver/index.ts';

export function runJob(job: AppJob): Result {
  return solve({ mode: job.mode, shape: job.shape, inputs: job.inputs });
}
```

This is the only call to `solve()` in `ui/`. The comparator calls the same function through
`entry.ts`, which strips the case id; the UI never has one to strip. Two tests hold the two
paths together:

- Property 1 (below) runs every golden through `runJob` and `classify`, and through
  `respond()` from `app/src/oracle/contract.ts`, and requires the shown text of every field to
  equal the entry's printed text, trimmed.
- A guard test over `app/src/ui/` fails on an import from `../solver/` other than `index.ts`
  (`solve`, `isBuilt`, `NOT_BUILT`, types), `forms.ts` (prompt order, fixed fields),
  `groundPoints.ts` (`enter`, `sectionKeys`), `geometry/*` (for the drawing), `constants.ts`
  (for the method list) and `parse.ts` (`readSingle`, for the drawing's bank stations). It also
  fails on `toFixed`, `toPrecision`, `toLocaleString` or `Intl.NumberFormat` anywhere in `ui/`
  except `drawing/axis.ts`, so the app cannot print a QUICK-2 value its own way.

### Screen states

```ts
type ScreenState =
  | { kind: 'idle' }
  | { kind: 'invalid'; fields: string[] }                    // 1.9: solve() not called
  | { kind: 'result'; result: Result; exact: ExactAnswer | null; links: HauntingLink[] }
  | { kind: 'held'; prompt: string }                         // 1.2, 6.2
  | { kind: 'rejected'; message: string }                    // 6.3, QUICK-2's text
  | { kind: 'stopped'; flags: Flag[] }                       // 6.4
  | { kind: 'not_built'; mode: Mode; shape: Shape }          // 6.5, Requirement 7
  | { kind: 'failed'; message: string };                     // 6.6, Quickened's text
```

`classify(job, result)` maps every Result to one state, in this order: `result`; `rejected`
with `held` set gives `held`; `rejected` with a message gives `rejected`; `error` with flags
gives `stopped`; `error` with message `not built` gives `not_built`; any other `error` gives
`failed`. A Result that fits none of these (for example `rejected` with neither a held prompt
nor a message) gives `failed` with a sentence that says so, and a test makes that branch
unreachable for every golden. A held prompt that also carries a message shows both.

Messages are shown trimmed and otherwise as the solver returns them, in the figures font, in
quotation marks and labelled "QUICK-2's message". Flag sentences are shown verbatim, in the
solver's order, under the form, with the fields each names marked by the pencil-red rule
(Visual design).

## The form

The picker offers the four modes of QUICK-2's main menu and the five shapes of its shape menu,
in QUICK-2's order and with its names. Step-Backwater has no shape choice. A pair for which
`isBuilt` is false carries the words "not built yet" in the picker; it is never hidden or
disabled.

`ui/forms.ts` builds the view model for a pair: one field per prompt in the order of
`regularPrompts(mode, shape)` or `ND_IRREGULAR_PROMPTS`, with QUICK-2's label for it, and the
fixed fields of `FIXED_FIELDS` shown as text, not inputs. The labels are taken from the result
screen's rows in `app/src/format/layout.ts`; a test checks that every label appears in the row
text of that pair's screen, so a label cannot drift from QUICK-2's.

Fields are grouped under "Your inputs" with the engineer's parts named: the section, the bank
stations, Manning's n, the discharge or depth, the slope (criterion 2.5).

### Validation

`validate.ts` applies the plain-decimal rule, `^-?(\d+\.?\d*|\.\d+)$`, to every field before
`solve()` is called. An empty field or any other text gives the `invalid` state: the fields are
marked and the page says that what QUICK-2 does with such text has not been observed (ledger
Q-004, Q-019). Zero and negative values are plain decimals and go to the solver, which holds,
rejects or computes them as QUICK-2 did.

### Ground points

The irregular form shows the ground points as a table of rows, station then elevation, with
row numbers 1 to 40 and an "Add row" control that stops at 40. "Paste rows" opens a text area;
`paste.ts` reads it:

- split on LF, with a trailing CR removed from each line; empty lines are skipped;
- each line must be two plain decimals separated by exactly one tab;
- more than 40 rows, or one bad line, loads nothing and says which line failed (its number and
  text) or how many rows the paste had and that QUICK-2 takes at most 40;
- otherwise the pasted rows replace the table's rows, text as pasted.

`realdata/huntington-section-01.tsv` is a valid paste (40 rows, two decimals each).

The rows are entered the way QUICK-2's editor takes keys: `sectionKeys(inputs)` gives the key
sequence and `enter()` the points it keeps. `grid.ts` compares the kept points with the typed
rows. Where they differ, because an elevation of 0 was shown and replaced by the next value or
a negative elevation sent entry back to the station (solver 10.6, 10.7), the grid names the row
and the rule. A station that does not increase is the solver's `rejected` with QUICK-2's
message (solver 10.3, 10.4).

## The results screen

In order, top to bottom on a phone and on the right-hand page on a desktop:

1. **The main figure.** WS ELEV on the irregular section, Depth on the regular shapes for
   Normal Depth and Critical Depth, and Discharge for Channel Capacity, each as the printed
   field's text in the figure size, with the water-surface mark before it.
2. **The drawing** (below).
3. **The printed fields**, as a two-column table of QUICK-2's label and the printed text,
   inputs as QUICK-2 echoed them (`in_*` fields) under "Your inputs, as QUICK-2 read them", and
   outputs under "Computed by QUICK-2's method". Fields a flag names carry the pencil-red rule
   and the flag's number.
4. **Flags**, numbered, verbatim. The `cut_off_area_counted` flag also puts a short line beside
   Area, Top Wid and Wet Per: "Includes low ground cut off from the channel, which QUICK-2
   counts as flowing."
5. **Exact answer**, only for a haunting's recorded case (criterion 2.2): the entry's
   "Exact answer" line verbatim, labelled with the entry's assumption, beside the printed
   fields, and a link to the entry. Otherwise, links to the hauntings that describe this kind
   of result (criterion 2.4), with no value.
6. **QUICK-2's method for this pair** (criterion 2.6): a short list read from `method.ts`. Each
   item names the value and its role and imports the value from `constants.ts`, for example
   "Manning constant 1.486" from `MANNING_K` and "g 32.2 ft/s²" from `G`. The list ends with
   one item labelled as Quickened's, not QUICK-2's: the search limit `SEARCH_DEPTH_LIMIT`,
   after which Quickened stops where QUICK-2 would keep searching.
7. **The notice** (criterion 2.3), and the Print control, offered only for a result (4.3).

### Which haunting a result links to

`hauntingLinks.ts` maps flags and pairs to haunting ids. Flags come first, from each entry's
**Flag:** line: `cut_off_area_counted` to H-001, `extended_section` to H-002, `negative_input`
to H-008. Pairs come next, from each entry's text: the prismatic shapes in Normal Depth and
Critical Depth to H-005, the prismatic shapes in all three modes to H-006, every circle to
H-003, circle Critical Depth to H-004 and H-007, and a circle Critical Depth rejection to H-009.
A test fails if a haunting in `hauntings.md` is in no mapping, or a mapping names one that is
not in the file.

### Exact answers

`build/hauntings.ts` reads each entry's case ids from its **Case:** or **Cases:** line, and its
**Exact answer** line as text. `build/goldens.ts` gives each case's inputs. A job is a
haunting's recorded case when its inputs equal the golden's, key for key and text for text.
The exact answer is shown as the entry's text, not split into fields: the entries are prose,
and parsing numbers out of them would put a second author between the file and the page. If
the person wants the exact value placed beside each field, the entries need a line in a fixed
form, which is a change to `results/hauntings.md`, not to the app.

## The cross-section drawing

`drawing/section.ts` builds a drawing model from the Job and the Result. `svg.ts` renders it.
Every value written on the drawing is a printed field's text; the scale and the station ticks
are Quickened's, drawn by `axis.ts` and labelled as the scale.

**Irregular section.** The ground is the polyline of the points the editor kept
(`enter(sectionKeys(inputs))`), x by station and y by elevation, with the ground-hatch fill
below it. The bank stations, read with `readSingle` as the solver reads them, are short
vertical ticks above the ground, labelled with the printed `in_bank_left` and `in_bank_right`.
The water is drawn at `raw.ws_elev`: `flowAt(section, raw.ws_elev).spans` from
`geometry/irregular.ts` gives the wet spans, and each span is filled between the water line and
the ground. With `cut_off_area_counted`, the spans that do not contain the channel (between
the banks) are filled with the cut-off pattern and labelled "cut off, counted by QUICK-2".
With `extended_section`, a wall is drawn at each end the water is above, from the end point up
to the water line, dashed and labelled "QUICK-2's vertical wall".

**Regular shapes.** The shape is drawn at its entered dimensions, in feet: the trapezoid,
V - Ditch and rectangle from the side slopes and bottom width (`geometry/prismatic.ts`), the
circle from the diameter in inches over 12 (`diameterFeet`). The water is drawn at the depth at
which Area and Top Width were computed: `raw.depth` in Normal Depth and prismatic Critical
Depth, the entered Depth in Channel Capacity, and `raw.search_depth` in circle Critical Depth,
where the printed Depth is 0.01 ft lower (haunting H-004). The depth label is the printed
Depth, and in circle Critical Depth the drawing notes the 0.01 ft and links H-004.

**Scale.** Horizontal and vertical scales are chosen so the section fills the drawing's box,
and the vertical exaggeration is written on the drawing as "Vertical scale ×N", as plotted
cross sections are labelled. Stations on the axis use survey stationing (`1+79.49` for
179.49 ft), and elevations carry the benchmark style "El. 596.37" only where the value is a
printed field.

**Agreement with the print.** For every result, the total width of the drawn water surface,
stored in single precision and printed in the Top Width field's picture with the solver's
`printed()`, equals the printed `top_width` (Property 5). The drawing is built from the same
solver geometry as the result, so a disagreement is a drawing bug, found by the property.

The drawing is an SVG with a text alternative: one sentence naming the shape, the water
surface and each wet span, so that it is readable without sight (criterion 1.11).

## The print view

Print is the browser's print of the results route with `print.css`. It hides the picker, the
navigation and every control, and adds a header with "Quickened", the date of printing as
yyyy-mm-dd (set on `beforeprint` from the local date), and the version: `package.json`'s
version and the build's short commit, injected at build. The page holds the engineer's inputs
as QUICK-2 echoed them, the outputs, every flag sentence, the exact answer where one is shown,
the drawing, the worked example's sources when the job is the example, and the notice. Ground
points print four station and elevation pairs to a row, as QUICK-2's editor shows them
(solver 3.1). The page is set for US Letter portrait with 0.5 in margins, and the Playwright run
checks that it prints to one page for a 40-point section and for a regular shape.

Print uses black ink on white: the paper colour is dropped, the water fill turns to a light
tint that survives a monochrome printer, and the pencil-red rule turns to a heavy black rule.

## The limits page

Built from `virtual:quickened/data` at build time (Requirement 5.3, 5.4):

1. **Where QUICK-2 differs from exact hydraulics**: every `## H-NNN` entry of
   `results/hauntings.md`, with its title, Case(s), QUICK-2 printed, the exact answer and the
   difference, as the file words them. The reader accepts the file as it is today, including
   entries with no blank line before their heading (H-005 to H-009).
2. **Where Quickened gives no answer**: each `###` entry under `# Limits`, by its
   **Limits page:** paragraph only, verbatim, as the file asks.
3. **Not built yet**: every pair for which `isBuilt` is false, with the sentence of
   criterion 7.3.
4. **Not observed yet**: every open question of `results/ledger.json` (`open_questions` with
   status `open`), id and question text verbatim, under the heading "Behaviours not observed
   yet".

The parsers are pure functions in `app/build/`, tested on the real files and on small
fixtures. A test fails when an `## H-` heading or a Limits entry of the real file is missing
from the page data, so a new haunting cannot be left off.

## The proof page

`src/ui/proof/cases.json` is the committed list, each case with a one-line reason. It starts
with: one result golden per built pair; the case of every haunting; the worked example; one
golden for each rejection kind (a held prompt, a bank message, the circle message); and the two
known differences, cc-circ-000035 and nd-circ-000020. A test checks each rule of that list
against the goldens.

For each case, `build/goldens.ts` gives the golden's inputs, its printed fields, its
`recorded_at`, and the capture of the transcript's last step
(`oracle/goldens/captures/<id>/screen-<step>.txt`, read as UTF-8). The page shows the capture as
recorded, in a frame labelled "QUICK-2's screen, recorded <date>", and beside it a table of each
printed field: QUICK-2's text, Quickened's text computed in the browser by `runJob`, and "same"
or "different". The known differences show as different.

The page's header states the case count and the date of the run from `results/headline.md`.
The file does not exist yet (exhume-loop task 5.1). `build/headline.ts` reads two labelled
lines, `Cases:` (matched of total) and `Run:` (yyyy-mm-dd); when the file is missing it returns
`null`, and the page says "No headline run has been recorded yet" and shows no count. If task
5.1 writes another form, this reader changes with it.

The goldens are read only by `app/build/`, at build time and in tests. Nothing writes to
`oracle/goldens/`.

## Offline

`build/serviceWorker.ts` is a small Vite plugin. At `generateBundle` it lists every file of the
build and writes `sw.js` from `src/sw.ts` with that list and a version hash. The worker
precaches the list on install, serves cache first, and on activate deletes caches of other
versions. There is no runtime caching, because the site makes no request to another origin:
the fonts are self-hosted, and there are no analytics and no CDN. `index.html` carries a
Content Security Policy of `default-src 'self'`, with `img-src 'self' data:` for the inline
SVG mark, which also enforces criterion 1.12.

Routes are hash routes (`#/`, `#/limits`, `#/proof`) and Vite's `base` is `'./'`, so the build
works from any host and any sub-path without rewrite rules. The host is the person's choice.

## Visual design

The identity comes from the papers an engineer carries to and from a channel: the surveyor's
field book with its ruled pages and red centre line, the cross-section plot on gridded paper,
and benchmark and stationing notation. It is not a retro terminal: no black screens, no
phosphor green, no box-drawing borders in Quickened's own UI. QUICK-2's captured screens on the
proof page are shown as recorded, inside a frame that names them as QUICK-2's. It is not a
dashboard template: no cards with shadows, no tiles of big numbers, no icon set, no gradients,
no chart other than the cross section.

### Tokens

All in `app/src/ui/styles/tokens.css` as custom properties. A stylesheet test fails on a
colour, font size or spacing literal anywhere else (criterion 9.4).

**Colour**

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4EFE2` | page background, the field book's buff page |
| `--paper-rule` | `#D9CFB8` | the horizontal rules of tables and the ruled page |
| `--grid` | `#C9DCCB` | the cross-section paper grid behind the drawing |
| `--ink` | `#1F2A36` | text, ground line, borders |
| `--ink-muted` | `#5A6470` | secondary text, scale labels |
| `--pencil` | `#B23A2E` | the red centre rule, flags and the fields they mark |
| `--water` | `#2F6FA3` | the water-surface line and mark, links, focus ring |
| `--water-fill` | `#CFE0EE` | water connected to the channel |
| `--water-cutoff` | `#CFE0EE` with `--water` hatching at 45° | cut-off water counted by QUICK-2 |
| `--ground` | `#6B4E2E` | the ground hatch |

Contrast on `--paper`, computed with the WCAG formula: `--ink` 12.7:1, `--ink-muted` 5.2:1,
`--pencil` 5.2:1, `--water` 4.7:1, each at or above WCAG AA for body text. The axe check of
the Playwright run confirms them on the rendered pages. Colour never carries meaning alone: a flag has its
number and words, cut-off water has its hatching and label.

**Type**

Three families, self-hosted woff2 under the SIL Open Font License, Latin subset:

| Token | Value | Use |
|---|---|---|
| `--font-label` | IBM Plex Sans Condensed, then Arial Narrow, sans-serif | column heads and field labels, as lettered on a field book's page; upper case, `letter-spacing: 0.06em` |
| `--font-body` | IBM Plex Sans, then system-ui, sans-serif | Quickened's sentences |
| `--font-figures` | IBM Plex Mono, then ui-monospace, monospace | every printed field, QUICK-2's messages and labels, typed values; tabular by nature, so columns of figures align |
| `--text-xs` | 12px / 16px | scale labels, footnotes |
| `--text-sm` | 14px / 20px | labels, table text on phones |
| `--text-md` | 16px / 24px | body, inputs, table text |
| `--text-lg` | 20px / 28px | section heads |
| `--text-xl` | 28px / 32px | page titles |
| `--text-figure` | 40px / 48px | the main figure (32px / 40px under 480px) |

**Space**

| Token | Value |
|---|---|
| `--rule` | 24px: the ruled line. Body line height, table row height and the vertical rhythm |
| `--space-1` to `--space-12` | 4, 8, 12, 16, 24, 32, 48px (`--space-1`, `-2`, `-3`, `-4`, `-6`, `-8`, `-12`) |
| `--margin-rule` | 2px solid `--pencil`: the field book's red centre line |
| `--radius` | 0 on surfaces; 2px on inputs and buttons |
| `--tap` | 44px: the least height and width of anything that can be pressed |
| `--focus` | 2px solid `--water`, 2px offset |

### The signature element: the water-surface mark

The mark drawn on cross sections to show a water surface: an inverted triangle standing on
the water line, with two shorter lines under it. It is one SVG symbol, `#ws-mark`, at 16px
beside text and 24px on the drawing, in `--water`. It appears in exactly three places: on the
drawing at the water surface, before the main figure on the results screen, and as the
favicon. It is not used as decoration anywhere else, so that wherever it appears it means
"this is the water surface QUICK-2 computed".

### Desktop layout (960px and wider)

A field-book spread, at most 1200px wide and centred on `--paper`:

- **Top line**: "Quickened" in `--font-label` at `--text-lg`, and the links Calculate,
  Limits and Proof on the right. No logo.
- **Left page, 5 of 12 columns: field notes.** The picker (modes as a row of text tabs,
  shapes as a row of radio buttons with "not built yet" where it applies), then the form as a
  ruled table: QUICK-2's label left of the red centre rule, the typed value right of it, one
  `--rule` per row. The worked-example control sits above the picker. Ground points are a
  ruled table of rows with the paste control above it.
- **Right page, 7 of 12 columns: sketch and results.** The main figure, the drawing (full
  width of the page, 2:1), the printed fields, flags, exact answer or links, method list,
  notice and Print.
- The two pages are separated by a `--space-8` gutter and a 1px `--paper-rule` line, as the
  binding of the book.

### Phone layout (375px)

One column with `--space-4` margins, so content is 343px wide:

- Top line: "Quickened" and the three links in one row at `--text-sm`.
- The worked-example control, the picker (modes as a two-by-two grid of tabs, shapes as a
  wrapped row), the form (label above value, the red rule on the left edge of each value), and
  a full-width Calculate button.
- After a calculation the page scrolls to the results: the main figure at 32px, the drawing at
  343 × 200px, the printed fields as label and value rows, flags, exact answer or links,
  method list, notice, Print.
- Ground points: a two-column table (station, elevation) with row numbers; the paste text area
  is full width.
- Nothing is wider than the screen: the Playwright run checks that the page's scroll width is
  375px, and that every control is at least `--tap` in both directions.

## Error handling

- Every solver outcome has a state (Screen states); an unexpected Result shape is shown as
  `failed`, never as a blank page.
- A paste that cannot be read loads nothing and says which line failed (criterion 1.8).
- A build that cannot read `results/hauntings.md`, `results/ledger.json`, a golden on the proof
  list or nd-irr-000010 fails the build with the file and the reason, so a broken record cannot
  ship as an empty page. A missing `results/headline.md` is not an error (criterion 5.2).
- The app never guesses at a value it was not given: no default discharge, no default n.

## Correctness Properties

Property tests use fast-check, as the solver's do, with generated inputs drawn from the
profile's practical ranges, as the solver's property tests draw them. Properties over the goldens run on every
golden, not a sample.

### Property 1: Same code, same answer

For every golden, the text shown for each printed field by `classify(runJob(job))` equals the
entry's response `printed`, trimmed, and the state kind matches the golden's outcome.
**Validates: Requirements 2.1, 6.1 to 6.6**

### Property 2: Every Result has exactly one state

For any Result (generated over every combination of outcome, held, message and flags),
`classify` returns exactly one state, the state the classification rule gives, and the view of
that state contains every flag sentence verbatim and the notice.
**Validates: Requirements 6.1 to 6.9, 2.3**

### Property 3: Paste reads what was copied

For any list of 1 to 40 pairs of plain decimals, joining them as tab-delimited lines (LF or
CRLF) and pasting gives the same rows, text for text. For 41 or more rows, or any line that is
not two plain decimals and one tab, the paste loads nothing and the error names the line or
the count.
**Validates: Requirements 1.7, 1.8**

### Property 4: The grid shows what QUICK-2's editor kept

For any rows, the grid's points are `enter(sectionKeys(inputs)).points` with their typed text,
and a row is flagged exactly when it is not among them as typed.
**Validates: Requirements 1.10**

### Property 5: The drawing agrees with the print

For every result golden and for any generated job with outcome `result`, the drawn water
surface's total width, stored and printed in the Top Width picture, equals the printed
`top_width`; on the irregular section the drawing has more than one wet span exactly when the
Result has `cut_off_area_counted`, and a wall exactly where `extended_section` applies.
**Validates: Requirements 2.7, 2.8, 6.8**

### Property 6: Plain decimals only

For any string, `validate` accepts it exactly when it matches the plain-decimal rule, and for
any job with a rejected field `solve()` is not called.
**Validates: Requirements 1.9**

### Property 7: Exact answers only for recorded cases

For any job whose inputs differ from every haunting case's inputs in at least one key or text,
the result state has no exact answer; for each haunting case's golden, it has that entry's
exact-answer text.
**Validates: Requirements 2.2, 2.4, 8.6**

### Property 8: Labels are QUICK-2's

For every built pair, every field label in the form view model occurs in the row text of that
pair's result screen in `layout.ts`, and the field order equals the solver's prompt order.
**Validates: Requirements 1.1, 1.4, 1.6**

### Property 9: Method values are the solver's

For every built pair, every value in the method list is the export of `constants.ts` it names,
compared by identity, and no numeric literal appears in `method.ts`.
**Validates: Requirements 2.6**

## Testing Strategy

- **Vitest** (`app/test/` for the view models and parsers, under Node): Properties 1 to 9; the
  `isBuilt` test; the guard test over `ui/`; the parsers of `app/build/` on the real files and
  on fixtures; the proof list rules; the haunting mappings; the stylesheet token test. Vitest
  does not re-grade the solver: the comparator stays the one grader of printed fields, and
  Property 1 only checks that the UI shows what the solver returned.
- **Playwright** (`app/e2e/`), run against `vite preview` of the production build, so the
  service worker, the base path and the Content Security Policy are the shipped ones. Two
  projects: `desktop`, Chromium at 1280 × 800, and `phone`, Chromium at 375 × 812 with touch
  and the mobile viewport. Each spec runs in both:
  1. the worked example in one click, its printed fields equal to nd-irr-000010's golden, the
     cut-off line, H-001's exact answer, the drawing, and its sources;
  2. one job for each state, from recorded cases: a result (cd-vdit-000001), a held prompt
     (Diameter 0, nd-circ-000008), QUICK-2's message (bank 230.8, nd-irr-000009), an error with
     a flag (Discharge -1, obs-negreturn-000001), and Step-Backwater not built;
  3. a paste of `realdata/huntington-section-01.tsv`, and a paste of 41 rows that loads
     nothing;
  4. the print view (`emulateMedia({ media: 'print' })` and `page.pdf()` in Chromium): one US
     Letter page, the date, the version, the notice, no controls;
  5. the limits page (every haunting id of the file, every Limits paragraph) and the proof page
     (each listed case, the known differences shown as different, the headline sentence);
  6. offline: load, wait for the service worker, set the context offline, reload, run the
     worked example again;
  7. no request to another origin on any page;
  8. axe (`@axe-core/playwright`) on every page and state with WCAG 2.2 A and AA rules;
  9. at the phone width, no horizontal scroll and every control at least 44px.
- **The identity test** runs over `dist/` after the build: no USWDS class prefix (`usa-`), no
  "official website of the United States", no file from `art/` and no file with the hash of
  one, no "Kotsu", no `.EXE`, `.COM` or `.DLL` and no file with the hash of one in
  `oracle/vendor/` when that folder exists, and every sentence with "FEMA" on the allowed list
  (criteria 9.1 to 9.3, 9.5).
- Tests read goldens and captures read-only. No test runs the program.

## Files, later

`app/src/xsc/` (reads and writes `.XSC`) and `app/src/hec2/` (writes the HEC-2 export) are
designed only once the Exhumer has recorded cases in which the original saves and opens an
`.XSC` file and writes `HEC2.DAT`, with the files kept under the cases' captures. Until then
their format is unobserved, and a design here would be a guess. Their properties, kept from the
first draft:

- **File round trip.** For any job, saving to `.XSC` and opening it gives the same inputs, and
  the original opens the saved file (Requirements 3.1, 3.3).
- **Export matches.** For any job in the export set, the exported file equals the `HEC2.DAT`
  the original wrote, byte for byte, apart from fields shown to vary (Requirement 4.2).

## Deploy

`npm run build` writes `app/dist/`. The deploy check serves it with `vite preview`, opens it in
a private window with no account signed in, runs the worked example, prints it, goes offline
and reloads. It stops there. Publishing needs a host, which the person picks; nothing in the
build depends on which.

## Open points

- The `results/headline.md` format (exhume-loop task 5.1), which the proof page's reader
  assumes.
- Whether the station error's key-line remainder is shown (requirements, Open points).
- Plain-words summaries for the ledger's open questions on the limits page.
- Placing exact values beside each field needs a fixed-form line in `results/hauntings.md`.
- WebKit is not in the Playwright run. Adding a WebKit phone project is cheap except for the
  offline spec, which depends on Playwright's service-worker support in WebKit.
