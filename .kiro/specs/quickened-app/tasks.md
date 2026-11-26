# Implementation Plan: quickened-app

The tasks run in order. In each one the test comes first and is shown failing, then the code
that makes it pass. Each task ends with its check: `npx vitest run` in `app/` passing in full,
the solver's tests included, and from task 11 on the Playwright run too. Each commit message is
written to a file without a byte-order mark and passed with `git commit -F`. Every expected
value about QUICK-2 comes from a golden, a capture or a criterion of the solver spec; no task
types a printed value into a test. No task runs the program; tasks 14 and 15 start with an
Exhumer session, which does.

Tasks 1 to 13 are the core path. Tasks 14 and 15, the files, wait for the Exhumer.

- [x] 1. The app shell
  - [x] 1.1 Test: a guard test over `app/src/ui/` that fails on an import from `../solver/`
    outside the design's allowed list, and on `toFixed`, `toPrecision`, `toLocaleString` or
    `Intl.NumberFormat` outside `drawing/axis.ts`. It passes on an empty `ui/`; show it failing
    on a throwaway file that breaks each rule, then delete the file.
    - _Requirements: 2.1_
  - [x] 1.2 Add Vite (pinned dev dependency), `vite.config.ts` with `base: './'`,
    `tsconfig.ui.json` with the DOM library, `index.html` with the Content Security Policy of
    the design, and `src/ui/main.ts` with the hash routes `#/`, `#/limits` and `#/proof`, each a
    placeholder that links the other two. `npm run build` writes `dist/` with relative asset
    URLs. The Vitest suite still passes with no change to `app/src/solver/` or `app/src/format/`.
    - _Requirements: 1.3, 5.5_
  - [x] 1.3 Test: the stylesheet test fails on a colour, font size or spacing literal outside
    `tokens.css`. Then `tokens.css` with every token of the design, and the three IBM Plex
    families as self-hosted woff2 with their `OFL.txt`.
    - _Requirements: 9.4, 1.12_
  - [x] 1.4 Test: for every pair, `isBuilt(mode, shape)` is false exactly when `solve()`
    answers `not built` for that pair's golden inputs, or a probe job where no golden exists.
    Then export `isBuilt` from `app/src/solver/index.ts`, read from the tables `solve()` uses.
    Show the comparator's quick set unchanged (`python scripts/oracle_quick.py`, 195 of 200).
    - _Requirements: 7.4_
  - [x] 1.5 Test: Property 10; `stationError` returns the same string as before for the cases
    of solver criteria 10.3 and 10.4; the row-24 message windows of
    `obs-irrelev-000001/screen-09.txt` and `obs-irrstation-000001/screen-05.txt` split into the
    error text and the key line's rest; every other golden message gives `null`. Then
    `stationErrorText` and `splitStationError` in `app/src/solver/groundPoints.ts`, with
    `stationError` built from them as the design says. Show the comparator's quick set
    unchanged (195 of 200).
    - _Requirements: 6.10_

- [x] 2. The form
  - [x] 2.1 Test Property 8: for every built pair, the form view model's labels occur in that
    pair's result screen rows in `layout.ts`, the field order is the solver's prompt order, and
    the fixed fields of `FIXED_FIELDS` are shown and not editable. Then `ui/forms.ts`.
    - _Requirements: 1.1, 1.4, 1.6_
  - [x] 2.2 Test Property 6 (the plain-decimal rule; no `solve()` call with a bad field). Then
    `ui/validate.ts`.
    - _Requirements: 1.9_
  - [x] 2.3 Test: `ui/job.ts` builds a Job whose inputs are each field's text as typed, keyed by
    the contract's names (`sta_01`, `elev_01`, the `ND_IRREGULAR_PROMPTS`), for the input keys
    of every golden. Then `job.ts`.
    - _Requirements: 1.5_
  - [x] 2.4 The picker and form views: four modes and five shapes in QUICK-2's order and names,
    Step-Backwater with no shape choice, "not built yet" from `isBuilt`, the fields under
    "Your inputs". Check by hand at both widths with `npm run dev` and say what was checked.
    - _Requirements: 1.1, 2.5, 7.1, 7.2_
  - [x] 2.5 Test Property 3, and a test that `realdata/huntington-section-01.tsv` pastes as 40
    rows. Then `ui/paste.ts` and the paste control.
    - _Requirements: 1.7, 1.8_
  - [x] 2.6 Test Property 4, with the keys of obs-irrelev-000001 and obs-irrstation-000001 among
    the cases. Then `ui/grid.ts` and the ground-points table with the not-taken rows named.
    - _Requirements: 1.6, 1.10_

- [x] 3. Screen states and flags
  - [x] 3.1 Test Property 2, and a test that `classify` gives every golden the state its
    outcome, held prompt and message call for, with the `failed` fallback reached by none. Then
    `ui/state.ts` (`runJob`, `classify`).
    - _Requirements: 6.1 to 6.6, 6.9, 1.2_
  - [x] 3.2 Test: each state's view model has its text: the held prompt named with the sentence
    of 1.2; QUICK-2's message trimmed and labelled; each flag sentence verbatim, in order, with
    its fields marked; the `failed` message labelled as Quickened's; the notice in all of them.
    Then `views/states.ts`.
    - _Requirements: 1.2, 6.2 to 6.7, 6.9, 2.3_
  - [x] 3.3 Test: a station error's `rejected` state shows the text up to its "!" as QUICK-2's
    message and the key-line sentence with the rest, both taken from `splitStationError`, and
    the state's Result keeps `message` whole. Then the station-error part of `classify` and
    `views/states.ts`.
    - _Requirements: 6.3, 6.10_
  - [x] 3.4 Test: the not-built view for Step-Backwater names what QUICK-2 asks for (solver
    11.1, 11.2) and the first-section limit; for Critical Depth and Channel Capacity on the
    irregular section it says the pair is not observed; each links the limits page and has no
    calculable form. Then the view.
    - _Requirements: 7.3_

- [x] 4. The results screen
  - [x] 4.1 Test Property 1 over every golden: the shown text of each printed field equals
    `respond()`'s printed text, trimmed. Then `views/results.ts`: the main figure, the printed
    fields under QUICK-2's labels, inputs and outputs labelled as the design says.
    - _Requirements: 2.1, 2.5_
  - [x] 4.2 Test Property 9. Then `ui/method.ts` and the method list, with `SEARCH_DEPTH_LIMIT`
    labelled as Quickened's.
    - _Requirements: 2.6_
  - [x] 4.3 Test: the cut-off line appears beside Area, Top Wid and Wet Per exactly when the
    Result has `cut_off_area_counted`, over every irregular golden. Then the line.
    - _Requirements: 6.8_

- [x] 5. The cross-section drawing
  - [x] 5.1 Test Property 5 over every result golden and generated jobs, prismatic and circle
    shapes first, with circle Critical Depth drawn at `raw.search_depth`. Then
    `drawing/section.ts` for the regular shapes.
    - _Requirements: 2.7_
  - [x] 5.2 Extend the Property 5 test to the irregular section: water width, wet spans against
    `cut_off_area_counted`, walls against `extended_section`. Then the irregular drawing model.
    - _Requirements: 2.7, 2.8, 6.8_
  - [x] 5.3 Test: `axis.ts` writes stations in survey stationing and the vertical exaggeration
    as "Vertical scale ×N"; every other text on the drawing model is a printed field's text;
    the model has a text alternative. Then `axis.ts`, `svg.ts`, the water-surface mark, and the
    drawing on the results screen.
    - _Requirements: 2.7, 1.11_

- [x] 6. Hauntings on the results screen
  - [x] 6.1 Test: `build/hauntings.ts` reads every `## H-NNN` entry of the real
    `results/hauntings.md` (title, case ids, printed, the Exact answer label, difference, flag),
    H-005 to H-009 included, and every Limits entry's **Limits page:** paragraph; and fixtures
    with a missing field fail with the entry and the field. Then the reader.
    - _Requirements: 5.3, 5.4_
  - [x] 6.2 Test: the reader gives the real file's 13 Exact by field lines, values as text; and
    the build fails, naming the haunting and the line, on a fixture for each case of criterion
    5.6: no line for a named case, two lines for one case, a line for a case not named, a line
    that does not match the form, a field not in the case golden's `printed`, a field twice, a
    value that is not a number. Then the Exact by field part of the reader.
    - _Requirements: 5.6, 2.2_
  - [x] 6.3 Test: `build/goldens.ts` gives each haunting case's inputs and printed keys,
    read-only, and fails the build on a missing golden. Then the reader and the
    `virtual:quickened/data` plugin, used by Vite and Vitest.
    - _Requirements: 2.2, 5.6_
  - [x] 6.4 Test Property 7, and that every haunting is in `hauntingLinks.ts` and every mapping
    names a haunting in the file. Then the Exact column of the printed fields, its caption and
    the links.
    - _Requirements: 2.2, 2.4_

- [x] 7. The worked examples
  - [x] 7.1 Test: the main example's inputs equal nd-irr-000006's, key for key and text for
    text; calculated, it shows the golden's printed fields and no exact value. Then
    `views/example.ts` and the first of the two controls on the first screen.
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 7.2 Test: the cut-off example's inputs equal nd-irr-000010's, which differ from
    nd-irr-000006's only in `discharge`; calculated, it shows the golden's printed fields, the
    cut-off line and H-001's Exact by field values on their fields' rows. Then the second
    control, beside the first, with its label.
    - _Requirements: 8.1, 8.4, 8.5_
  - [x] 7.3 Test: after one edit to either example, the job is said to be no longer the recorded
    case and no exact value is shown. Then the origin change in `job.ts` and the sentence.
    - _Requirements: 8.6_
  - [x] 7.4 Test: the sources block names every source of 8.7, read from
    `realdata/huntington-section-01.json` where the file has it, for both examples; the main
    example has the 1-percent discharge sentence of 8.8 with the file's estimate, interval and
    citation, and the cut-off example the test-discharge sentence of 8.9. Then the block.
    - _Requirements: 8.7, 8.8, 8.9_

- [x] 8. The print view
  - [x] 8.1 Test: the print view model holds the echoed inputs, the outputs, every flag
    sentence, the drawing, the date as yyyy-mm-dd, the version and commit, the notice, the
    exact values where the results screen shows them, the sources and discharge sentence for
    either worked example, ground points four pairs to a row, and no control; Print is offered
    only for outcome `result`. Then `views/print.ts` and `print.css`.
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 2.3_

- [x] 9. The limits page
  - [x] 9.1 Test: `build/ledger.ts` reads every `open_questions` entry with status `open` from
    the real `results/ledger.json`, id and text verbatim. Then the reader.
    - _Requirements: 5.3_
  - [x] 9.2 Test: `build/plain.ts` reads each `## Q-NNN` entry of the real
    `results/limits-plain.md` with its text; the coverage test fails, naming the question, on a
    fixture with an open question that has no entry, on one with an entry for an answered
    question, on one with an entry for an id not in the ledger, and on an empty entry; and it
    passes on the real files (13 open questions, 13 entries). Then the reader.
    - _Requirements: 5.3, 5.7_
  - [x] 9.3 Test: the limits page data has every haunting, every Limits paragraph verbatim,
    every pair `isBuilt` calls not built, and every open question with its plain sentences
    before the ledger's wording; and a test fails when an entry of the real files is missing
    from it. Then `views/limits.ts`.
    - _Requirements: 5.3, 5.4, 7.3_

- [x] 10. The proof page
  - [x] 10.1 Test: `proof/cases.json` has at least one result golden per built pair, every
    haunting case, nd-irr-000006 and nd-irr-000010, a held prompt, a bank message, the circle
    message, and
    cc-circ-000035 and nd-circ-000020, each with a reason; each id's golden and final capture
    exist. Then the list.
    - _Requirements: 5.1_
  - [x] 10.2 Test: `build/headline.ts` returns `null` with no `results/headline.md` and reads the
    `Cases:` and `Run:` lines of a fixture. Then the reader.
    - _Requirements: 5.2_
  - [x] 10.3 Test: for each listed case the proof view model holds the capture text, the golden's
    printed text and `runJob`'s, marked same or different, with the two known differences marked
    different. Then `views/proof.ts`.
    - _Requirements: 5.1, 5.2_

- [x] 11. Offline
  - [x] 11.1 Test: the service-worker plugin's precache list equals the files of a build, and
    `sw.js` carries the build's version hash. Then `build/serviceWorker.ts`, `src/sw.ts` and the
    registration in `main.ts`.
    - _Requirements: 1.3, 1.12_

- [x] 12. The Playwright run
  - [x] 12.1 Add `@playwright/test` and `@axe-core/playwright` (pinned), `playwright.config.ts`
    with the `desktop` and `phone` projects against `vite preview` of the build, and
    `npm run e2e`.
    - _Requirements: 1.3, 1.11_
  - [x] 12.2 Write the specs of the design's Testing Strategy, items 1 to 9, and run them at both
    widths. Show the report. A failure is fixed in the code, not in the spec's expectation.
    - _Requirements: 1.2, 1.3, 1.7, 1.8, 1.11, 1.12, 2.1 to 2.3, 2.7, 4.1, 4.4, 5.1 to 5.3, 6.1 to 6.10, 7.2, 7.3, 8.1 to 8.9_
  - [x] 12.3 The identity test over `dist/`: no USWDS prefix or federal banner, the FEMA sentence
    list, nothing from `art/` and no Kotsu, no `.EXE`, `.COM` or `.DLL` and no file hashed like
    one in `oracle/vendor/`. Show it failing on a throwaway file of each kind, then delete it.
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [x] 13. Deploy check, stopping before publishing
  - [x] 13.1 `npm run build`, then `vite preview`. In a private window with no account signed
    in: load, run both worked examples, print the main one, go offline, reload, run the main
    example again. Report what was seen at both widths. Stop: the person picks the host, and
    nothing is published.
    - _Requirements: 1.3, 4.1, 8.1_

- [ ] 14. `.XSC` files (waits for the Exhumer)
  - [ ] 14.1 An Exhumer session records cases in which the original saves a job as `.XSC` and
    opens one, keeps the files in the cases' captures, and records what is and is not observed
    of the format in the ledger. The default agent does not do this task.
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 14.2 Write the `.XSC` design section from those records, and stop for the person's
    review before any code.
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 14.3 Test: each recorded `.XSC` file opens to a job whose `solve()` gives its case's
    golden; a damaged copy of each says which part failed and loads nothing; the file round trip
    property. Then `app/src/xsc/` and the open and save controls.
    - _Requirements: 3.1, 3.2_
  - [ ] 14.4 A harness case opens a file Quickened saved in the original and prints the golden's
    fields. Recorded by the Exhumer.
    - _Requirements: 3.3_

- [ ] 15. The HEC-2 export (waits for the Exhumer)
  - [ ] 15.1 An Exhumer session records cases in which the original writes `HEC2.DAT`, keeps the
    files, and records in the ledger which fields vary between runs.
    - _Requirements: 4.2_
  - [ ] 15.2 Test: for each recorded case the export equals its `HEC2.DAT` byte for byte, apart
    from the fields shown to vary. Then `app/src/hec2/` and the export control.
    - _Requirements: 4.2_
  - [ ]* 15.3 Check whether HEC-RAS imports the export, and record the result in `results/`.
    - _Requirements: 4.2_
