# Requirements Document

## Introduction

Quickened is the browser app wrapped around the rebuilt solver. It covers what a person does
with QUICK-2: pick a mode and a shape, enter a channel, read the answer, print it, pass it on.
What QUICK-2 computes, accepts and refuses is defined by the `quick2-solver` spec and its
bugfix specs (`circle-outputs`, `circle-short-chord`). This spec covers everything around it:
which screen state each answer gets, where each value on the page comes from, and what the
product says about its own limits. It restates no value the solver computes.

Revised on 2026-11-26, after the solver was built, and again that day with the person's
decisions on the two worked examples, the station error, the plain-words limits and the exact
values by field. Today `solve()` computes the three regular
modes (Critical Depth, Channel Capacity, Normal Depth) on the four regular shapes, and Normal
Depth on the irregular section. It answers `not built` for Step-Backwater and for Critical Depth
and Channel Capacity on the irregular section.

The app has its own identity, drawn from channels and survey sheets. It is not a retro
terminal, and it must not look like a federal site.

### How criteria cite their source

- _(solver N.M)_: a criterion of `.kiro/specs/quick2-solver/requirements.md`, which cites the
  observation behind it. _(solver design: section)_ is a section of its design.
- _(circle-short-chord N.M)_: a criterion of that bugfix spec.
- _(observed: id)_: a recorded case or capture.
- _(ledger Q-NNN)_: an open question in `results/ledger.json`.
- _(product)_: `.kiro/steering/product.md`.
- _(person, 2026-11-26)_: the person's request that started this revision.
- _(this spec)_: a choice this spec makes about the app itself, not about QUICK-2.

## Glossary

- **Solver**: `solve(job)` in `app/src/solver/index.ts`, the function the oracle comparator
  calls through `app/src/oracle/entry.ts`.
- **Result**: what `solve()` returns: `outcome` (`result`, `rejected` or `error`), `printed`,
  `message`, `held`, `flags` and `raw` _(solver design: Data model)_.
- **Pair**: a mode and a shape as QUICK-2's menus offer them. The main menu offers Critical
  Depth, Channel Capacity, Normal Depth and Step-Backwater _(observed:
  oracle/goldens/captures/obs-menudrop-000001/screen-01.txt)_. The shape menu offers V - Ditch,
  Rectangular, Trapezoidal, Circular and Irregular Channel _(observed: cd-vdit-000001)_.
  Step-Backwater asks for no shape and goes to the ground-points editor _(solver 11.1)_.
- **Built pair**: a pair for which `solve()` does not answer outcome `error` with message
  `not built`.
- **Engineer's inputs**: what the user supplies: the section (a shape's dimensions, or the
  ground points), the bank stations, Manning's n, the discharge or depth, and the slope.
- **QUICK-2's method**: what comes from the program and not from the user: its constants
  (`app/src/solver/constants.ts`), its depth search and where the search stops, and its print
  formats.
- **QUICK-2's text**: a label, message or printed field as QUICK-2 shows it. **Quickened's
  text** is everything the app writes in its own words.
- **Flag sentence**: the `text` of a flag in a Result, as `app/src/solver/flags.ts` gives it.
- **Notice**: the text of criterion 2.3.
- **Plain decimal**: an optional `-`, then digits with at most one `.`, with at least one digit
  (`12`, `.035`, `-1`, `0.00`). It is the only kind of value any recorded case has typed
  _(solver design: Parsing and holds)_.
- **The worked examples** (Requirement 8): the **main example**, the inputs of the recorded case
  nd-irr-000006, the Grapevine section at the 1-percent flood estimate of 1,200 cfs; and the
  **cut-off example**, the inputs of nd-irr-000010, the same section at a test discharge of
  3,000 cfs. The two differ only in the discharge.
- **Exact by field line**: the fixed-form line `- **Exact by field (case-id):** field value;
  field value` (or `none`) that each haunting in `results/hauntings.md` has for each case it
  names.
- **Station error**: the ground-points editor's message for a station that does not increase,
  which QUICK-2 writes over its key line on row 24 _(solver 10.3, 10.4)_.

## Requirements

### Requirement 1: Enter a channel

**User Story:** As a permit reviewer, I want the same inputs I know, so that I can check an
answer quickly.

#### Acceptance Criteria

1. WHEN a user picks a built pair THE SYSTEM SHALL show one field for each prompt QUICK-2 asks, in QUICK-2's prompt order and with QUICK-2's label for it, as `regularPrompts(mode, shape)` and `ND_IRREGULAR_PROMPTS` in `app/src/solver/forms.ts` give the order. _(solver 3.3, 4.1 to 4.4)_
2. WHEN an input is one the original rejects THE SYSTEM SHALL reject it as `solve()` reports it, in the screen state Requirement 6 gives that outcome. WHEN the rejection is a held prompt THE SYSTEM SHALL mark that one field, keep every typed value, show no result, and say in Quickened's text that QUICK-2 keeps this prompt and shows no message. _(solver 1.1, 1.2, 8.5, 8.6; solver design: Property 2)_
3. WHEN the site has loaded once in a browser THE SYSTEM SHALL work offline: with the network cut, every page loads and every built pair computes, as the Playwright run shows with the browser context set offline after the first load.
4. WHEN the V - Ditch or the Rectangular form is shown THE SYSTEM SHALL show the fields QUICK-2 prints without asking for them, Bottom Width `0.0` on the V - Ditch and both side slopes `0.0` on the rectangle, as values the user cannot edit. _(solver 4.1, 4.2)_
5. WHEN a calculation is asked for THE SYSTEM SHALL pass each field's text to `solve()` exactly as typed, keyed by the oracle contract's input names, without trimming, rounding or reformatting it. _(solver design: The contract; solver 9.1)_
6. WHEN Normal Depth and Irregular Channel are picked THE SYSTEM SHALL take from 1 to 40 ground points as rows of a station and an elevation, then the LEFT and RIGHT bank stations, the LEFT, CHANNEL and RIGHT Manning's n, the Discharge and the Slope, in that order and with QUICK-2's labels. _(solver 3.1 to 3.3, 10.1; observed: nd-irr-000026, one ground point)_
7. WHEN a user pastes text into the ground points THE SYSTEM SHALL read each non-empty line as one row, a station and an elevation separated by one tab, accept LF or CRLF line ends, and replace the rows that were there with the pasted rows, in order. _(person, 2026-11-26)_
8. WHEN pasted text has more than 40 rows, or a line that is not two plain decimals separated by one tab, THE SYSTEM SHALL load nothing, keep the rows that were there, and say either the line number that failed or how many rows the paste had and that QUICK-2 takes at most 40. _(solver 3.2; this spec)_
9. WHEN a field is empty or holds text that is not a plain decimal THE SYSTEM SHALL not call `solve()`, mark the field, and say that what QUICK-2 does with such text has not been observed. _(ledger Q-004, Q-019)_
10. WHEN ground points have been entered THE SYSTEM SHALL show them as QUICK-2's editor takes them, each as typed, from `enter(sectionKeys(inputs))` in `app/src/solver/groundPoints.ts`, and WHERE a row was not taken as typed (an elevation of 0, a negative elevation) THE SYSTEM SHALL name the row and the rule. WHERE a station is not greater than the one before it THE SYSTEM SHALL show in that row's note QUICK-2's error text up to and including its "!", from the solver's `stationErrorText` and labelled as QUICK-2's message, and then say in Quickened's text that QUICK-2 does not take the row and goes on taking keys; the job is computed from the rows QUICK-2 took. _(solver 9.1, 10.3 to 10.7)_ Amended 2026-11-26 (person): QUICK-2 prints the station error and goes on taking keys, and no recorded case ends a job on it, so the station error is shown on its row, not as a refusal (criterion 6.10).
11. THE SYSTEM SHALL be usable with a keyboard alone, and the Playwright run's axe check SHALL report no WCAG 2.2 level A or AA violation on any page, at either width. _(this spec)_
12. THE SYSTEM SHALL make no request to any origin other than its own, so that a reviewer's inputs stay on the machine; the Playwright run fails on any such request. _(this spec)_

### Requirement 2: Read the answer

**User Story:** As a permit reviewer, I want the printed answer, so that it matches what I would
have got from QUICK-2.

#### Acceptance Criteria

1. WHEN `solve()` returns outcome `result` THE SYSTEM SHALL show each field of `printed` under QUICK-2's label for it, as the field's window text with leading and trailing spaces removed and nothing else changed (a leading `%` included), and SHALL show no output field's value from any other source. _(solver 8.1; solver design: Printing)_
2. WHEN a job's inputs are, key for key and text for text, the inputs of a case named in a haunting of `results/hauntings.md` THE SYSTEM SHALL put each value of that case's Exact by field line beside the printed field it names, as the line writes it and labelled as exact under the assumption the entry states; keep the printed value as the default and the first one read; and link the entry on the limits page. A case whose line reads `none` gets the link and no exact value. _(oracle law, rule 5; results/hauntings.md)_
3. THE SYSTEM SHALL show the notice "Quickened is an independent rebuild of QUICK-2 v1.0. It is not a FEMA product and is not accepted by FEMA: FEMA's list of accepted models names QUICK-2, not Quickened. Use it as a cross-check." on every results screen, whatever the outcome, and on the print view. _(product)_
4. WHEN a result is of a kind a haunting describes, by its flag or by its pair, and its inputs are not those of a case the haunting names THE SYSTEM SHALL link that haunting and show no exact value, since Quickened computes none. _(results/hauntings.md; this spec)_
5. THE SYSTEM SHALL label the engineer's inputs as the engineer's on the form, the results screen and the print view, and label every output field as computed by QUICK-2's method. _(person, 2026-11-26)_
6. WHEN a result is shown THE SYSTEM SHALL list the values that come from QUICK-2's method for that pair: the Manning constant, g, the exponent on the hydraulic radius, π on the circle, the search's first trial, step and stop, the Max Discharge depth on the circle, and the vertical end walls on the irregular section. Each value SHALL be read from its export in `constants.ts`, not typed again, and the list SHALL say that these are QUICK-2's choices, not the engineer's. _(solver design: Constants, The depth search, Normal Depth, irregular section)_
7. WHEN a result is shown THE SYSTEM SHALL draw the entered channel's cross section with the water surface. On the irregular section it draws the ground points as QUICK-2's editor took them, the two bank stations, and water across every wet span at the result's water-surface elevation. On a regular shape it draws the shape at its entered dimensions, with water at the depth at which the printed Area and Top Width are computed. The drawn water-surface width, printed in the Top Width field's format, SHALL equal the printed Top Width, and every value written on the drawing SHALL be a printed field's text, except the scale, which is labelled as Quickened's. _(person, 2026-11-26; solver 9.7; haunting H-004)_
8. WHEN a result carries the `extended_section` flag THE SYSTEM SHALL draw a vertical wall at each end of the section that the water surface is above, from the ground up to the water, labelled as QUICK-2's assumption. _(solver 3.12, 3.13; haunting H-002)_

### Requirement 3: Keep old jobs

**User Story:** As a permit reviewer, I want my old job files to open, so that years of work are
not stranded.

No recorded case has saved or opened an `.XSC` file yet, and the ledger has no question about
its format. These criteria hold once the Exhumer has recorded cases in which the original writes
and reads such files, with the files kept in the cases' captures. Their tasks come last.

#### Acceptance Criteria

1. WHEN a user opens an `.XSC` file that the original wrote in a recorded case THE SYSTEM SHALL load its cross section, and the loaded job SHALL give, through `solve()`, the printed fields of that case's golden.
2. WHEN a file cannot be read THE SYSTEM SHALL say which part failed (the line or byte offset and what was expected there) and load nothing.
3. WHEN a user saves THE SYSTEM SHALL write a file the original program can open, proved by a harness case that opens the saved file in the original and prints the same fields as the golden of the job that was saved.

### Requirement 4: Pass the job on

**User Story:** As a permit reviewer, I want the result in my file and in my next tool, so that
the work does not stop at this page.

#### Acceptance Criteria

1. WHEN a user prints THE SYSTEM SHALL produce a page with the engineer's inputs as QUICK-2 echoed them, the output fields, every flag sentence, the cross-section drawing, the date of printing as yyyy-mm-dd, Quickened's version and build commit, and the Requirement 2.3 notice.
2. WHEN a user exports THE SYSTEM SHALL write the HEC-2 file that the original writes to `HEC2.DAT`, with matching contents proved by the harness. No recorded case has written `HEC2.DAT` yet, so this criterion holds once the Exhumer has recorded one; its tasks come last.
3. THE SYSTEM SHALL offer Print only when the outcome is `result`, as QUICK-2 adds "Print <F5>" only after a result. _(solver 4.6)_
4. WHEN a print is made THE SYSTEM SHALL fit the job on one US Letter page in portrait, for a regular shape and for an irregular section of 40 ground points, with the ground points four station and elevation pairs to a row, as QUICK-2's editor shows them. The job is everything criterion 4.1 lists. A worked example's sources and their limits (criterion 4.5) may follow on a second page under their own head. _(solver 3.1; this spec)_ Amended 2026-11-26 (person): the main example's print ran to three pages; the job now fits one page, and only an example's sources may run onto a second.
5. WHEN the printed job is either worked example THE SYSTEM SHALL print its data sources (criterion 8.7) and its discharge sentence (8.8 or 8.9) with it, under their own head, on the page after the job when they do not fit on its page. Amended 2026-11-26 (person): the sources and their limits may run onto a second page, as criterion 4.4 says.
6. THE SYSTEM SHALL print no navigation, no buttons and no image other than the cross-section drawing and the water-surface mark (design: Visual design).

### Requirement 5: Show the proof

**User Story:** As a judge, or a reviewer deciding whether to trust Quickened, I want the
side-by-side view, so that I can see the original and the rebuild agree, and where they do not.

#### Acceptance Criteria

1. THE SYSTEM SHALL show a proof page with, for each case of a committed list, the recorded oracle screen (the capture of the last step of the golden's transcript, as text) beside the rebuild's answer, computed in the browser by `solve()` from the golden's inputs, with each printed field marked as the same or different. The list SHALL hold at least one result for each built pair and every case the solver design names as a known difference (cc-circ-000035, nd-circ-000020). _(solver design: Circle)_
2. THE SYSTEM SHALL state the case count and the date of the run, read from `results/headline.md`. WHEN that file does not exist THE SYSTEM SHALL say that no headline run has been recorded yet and show no count. _(exhume-loop task 5.1, not yet done)_
3. THE SYSTEM SHALL state limits inside the product, including behaviours not exercised, on a limits page built from `results/hauntings.md` and `results/ledger.json`: every haunting (H-NNN) with its title, cases, what QUICK-2 printed, the exact answer and the difference, as the file words them; every entry of the file's Limits section by its **Limits page:** paragraph, verbatim; every pair not built yet; and every open question of the ledger under a heading that says these behaviours have not been observed, each with its plain sentences from `results/limits-plain.md` first and the ledger's id and text, verbatim, under them.
4. WHEN `results/hauntings.md`, `results/limits-plain.md`, `results/ledger.json` or `results/headline.md` changes THE SYSTEM SHALL show the change at the next build with no edit to the app's source: the pages are fed from the files, not copied from them.
5. THE SYSTEM SHALL link the limits page and the proof page from every page.
6. WHEN a haunting has no Exact by field line for a case its Case or Cases line names, more than one for a case, a line for a case it does not name, or a line that is malformed (a field that is not in the case golden's `printed`, a value that is not a decimal number with an optional exponent such as `1.5575E+11`, or text that is neither field-value pairs nor `none`) THE SYSTEM's build SHALL fail, naming the haunting and the line.
7. WHEN an open question of `results/ledger.json` has no entry in `results/limits-plain.md`, or an entry names a question that is not open, THE SYSTEM's tests SHALL fail, naming the question.

### Requirement 6: Every outcome has a screen state

**User Story:** As a permit reviewer, I want to see plainly whether QUICK-2 gave an answer,
refused the input, or gave nothing, so that I never mistake a refusal for a result.

#### Acceptance Criteria

1. WHEN `solve()` returns outcome `result` THE SYSTEM SHALL show the results state of Requirement 2, with every flag sentence under the form.
2. WHEN `solve()` returns outcome `rejected` with a held prompt THE SYSTEM SHALL show the held state of criterion 1.2.
3. WHEN `solve()` returns outcome `rejected` with a message THE SYSTEM SHALL show the message as QUICK-2's text, with leading and trailing spaces removed and nothing else changed (a station error is shown as criterion 6.10 says), labelled as QUICK-2's own message, and show no result. _(solver 3.4, 3.5, 9.6, 10.3, 10.4; circle-short-chord 2.4)_
4. WHEN `solve()` returns outcome `error` with one or more flags THE SYSTEM SHALL show no result and show each flag sentence. _(solver 2.8 to 2.10; circle-short-chord 2.6 (c), 2.7)_
5. WHEN `solve()` returns outcome `error` with message `not built` THE SYSTEM SHALL show the not-built state of Requirement 7.
6. WHEN `solve()` returns outcome `error` with any other message and no flag THE SYSTEM SHALL show the message labelled as Quickened's, and say that there is no result.
7. WHEN a Result carries flags THE SYSTEM SHALL show each flag's sentence under the form, verbatim as the solver gives it and in the solver's order, and mark the fields the flag names. _(solver design: Odd behaviours and their flags)_
8. WHEN a result carries the `cut_off_area_counted` flag THE SYSTEM SHALL say beside Area, Top Wid and Wet Per that QUICK-2 counts the low ground cut off from the channel as flowing, and draw the cut-off water so that it can be told apart from the water connected to the channel. _(solver 9.7; haunting H-001)_
9. THE SYSTEM SHALL show exactly one of the states of criteria 1.2, 1.9 and 6.1 to 6.6 at a time, and the notice in each of them.
10. WHEN the message is a station error THE SYSTEM SHALL show as QUICK-2's message the error text up to and including its "!", and say in Quickened's text that QUICK-2 writes this message over its key line and leaves the rest of that line on the screen. The split SHALL come from a function the solver exports, not from a pattern written in the app, and the Result's `message` SHALL stay whole, as the comparator reads it. _(solver 10.3, 10.4; observed: oracle/goldens/captures/obs-irrelev-000001/screen-09.txt, row 24)_ Note 2026-11-26 (person): `solve()` returns no station error today. QUICK-2 prints it and goes on taking keys, and the solver models that, so this state cannot be reached from the form; the station error a user sees is the row note of criterion 1.10. The state stays built and tested, for a Result that carries the message.

### Requirement 7: Modes not built yet

**User Story:** As a permit reviewer, I want to see that Step-Backwater exists in QUICK-2 and is
not in Quickened yet, so that I do not think it was left out or hidden.

#### Acceptance Criteria

1. THE SYSTEM SHALL offer every pair QUICK-2's menus offer: the four modes, the five shapes for Critical Depth, Channel Capacity and Normal Depth, and Step-Backwater with no shape choice. _(observed: obs-menudrop-000001, cd-vdit-000001; solver 11.1)_
2. WHEN a pair is not built THE SYSTEM SHALL mark it as not built yet in the menu before it is picked, and SHALL NOT hide it or leave it out.
3. WHEN a user picks a pair that is not built THE SYSTEM SHALL say, inside the product, that Quickened does not compute it yet; say what QUICK-2 asks for in that mode where it has been observed (for Step-Backwater: a starting slope or elevation, the ground points, the bank stations, the three n values and the discharge, first cross section only); say that it has not been observed where it has not (Critical Depth and Channel Capacity on the irregular section); link the limits page; and show no form that could be calculated. _(solver 11.1, 11.2)_
4. THE SYSTEM SHALL decide which pairs are built from the solver, not from a list kept in the app, so that a pair the solver builds later shows as built with no change to the app.

### Requirement 8: The worked examples

**User Story:** As a visitor, I want to load a real case in one click, so that I can see what
Quickened does without typing 40 ground points; and as a reviewer, I want that case to be the
one I would really run.

#### Acceptance Criteria

1. THE SYSTEM SHALL offer, on the first screen, two controls, each loading one worked example into the Normal Depth, Irregular Channel form with one activation: first the main example, labelled as the Grapevine section at the 1-percent flood estimate of 1,200 cfs; and beside it the cut-off example, labelled as the same section at a test discharge of 3,000 cfs, there to show how QUICK-2 counts cut-off low ground. _(person, 2026-11-26)_
2. WHEN the main example is loaded THE SYSTEM SHALL fill the form with the inputs of the golden nd-irr-000006, key for key and text for text: the 40 ground points of the Grapevine section, bank stations 179.49 and 230.77, n .06, .04 and .06, discharge 1200 and slope .0035. _(observed: nd-irr-000006)_
3. WHEN the main example is calculated THE SYSTEM SHALL show the printed fields of nd-irr-000006, and no exact value, since no haunting names that case. _(solver 9.4)_
4. WHEN the cut-off example is loaded THE SYSTEM SHALL fill the form with the inputs of the golden nd-irr-000010, key for key and text for text, which are the main example's with discharge 3000. _(observed: nd-irr-000010)_
5. WHEN the cut-off example is calculated THE SYSTEM SHALL show the printed fields of nd-irr-000010, the cut-off statement of criterion 6.8, and the exact values of H-001's Exact by field line beside their fields by criterion 2.2. _(solver 9.7; haunting H-001)_
6. WHEN any input of a loaded example is edited THE SYSTEM SHALL say that the job is no longer the recorded case, and stop showing any exact value that criterion 2.2 gave it.
7. WHEN either example is loaded THE SYSTEM SHALL name its data sources on the page, read from `realdata/huntington-section-01.json` where the file holds them: Grapevine Branch, Cabell County, West Virginia, a Zone A stream on FIRM panel 54011C; NHD flowline 58000967; the ground points from the USGS 3DEP 1 m lidar DEM (project WV_FEMAR3_Southcentral_2018_D19) through the USGS Elevation Point Query Service; the bank stations as suggested from the lidar profile, not a field determination; the slope as an estimate from the 3DEP thalweg profile, not a survey; Manning's n from Chow (1959) as reproduced in the HEC-RAS Hydraulic Reference Manual, Table 3-1, normal column, an assumption made without seeing the site; and the file's caveats. _(solver 9, introduction)_
8. WHEN the main example is loaded THE SYSTEM SHALL say that its discharge, 1,200 cfs, is the USGS StreamStats 1-percent AEP flood estimate for the site (regression region GC2081, drainage area 2.70 mi², 90% prediction interval 624 to 2,310 cfs), a regional regression estimate, with the citation the file gives for it. _(solver 9, introduction; realdata/huntington-section-01.json)_
9. WHEN the cut-off example is loaded THE SYSTEM SHALL say that its discharge, 3,000 cfs, is a test value, chosen to fill the cut-off low ground; that it is not a flood estimate; and that it is above the 1-percent estimate's 90% prediction interval (624 to 2,310 cfs). _(ledger: Q-021, answered by nd-irr-000010; realdata/huntington-section-01.json)_ Amended 2026-11-26 (person): the criterion named a range, 595.75 to 596.42 ft, that neither the ledger nor the realdata file records; Q-021 names 595.75 to 597.93 as the range to test, and the file's caveat a bench near 595 to 596 ft. The range is dropped.

### Requirement 9: Identity and marks

**User Story:** As a permit reviewer, I want a tool that cannot be mistaken for FEMA's, so that a
printout in a permit file says only what is true.

#### Acceptance Criteria

1. THE SYSTEM SHALL use no FEMA logo, seal or mark, no other federal seal, no U.S. Web Design System code, class names or styles, and no "official website of the United States government" banner; a test over the built site fails on any of them. _(product)_
2. THE SYSTEM SHALL use the word FEMA only in the notice, in the names of data sources (Zone A, FIRM panel 54011C), and to say that FEMA published QUICK-2; a test lists every sentence of the built site that contains it and fails on one not on the allowed list. _(product)_
3. THE SYSTEM SHALL NOT show the mascot: no file from `art/`, no image with the same content as a file in `art/`, and not the name Kotsu, anywhere in the built site, its results screen or its print view. _(product; mascot steering)_
4. THE SYSTEM SHALL take every colour, type size and spacing value of its own pages from the tokens of the design's Visual design section; a test over the stylesheets fails on a literal colour or size outside the token file.
5. THE SYSTEM SHALL contain no FEMA binary and no Microsoft runtime; a test over the built site fails on any `.EXE`, `.COM` or `.DLL` file and on any file with the hash of a file in `oracle/vendor/`. _(product)_

## Open points

- `results/headline.md` does not exist yet (exhume-loop task 5.1). Its format is not fixed, so
  the proof page's reader for criterion 5.2 is written against the fields the design names, and
  changes if task 5.1 writes something else.
- The `.XSC` and `HEC2.DAT` formats are not observed, and the ledger has no question for them
  (Requirements 3 and 4.2).
- `results/limits-plain.md` has to follow the ledger: when the Exhumer answers or opens a
  question, criterion 5.7 fails until the file's entry is removed or written. Who writes new
  entries is not settled.
- Exact values for inputs other than a haunting's recorded cases (criterion 2.4) would need the
  solver to compute an exact answer, which no spec asks of it.
- Step-Backwater beyond the first section is not observed (solver Requirement 11), so
  Requirement 7 describes only the first section.
