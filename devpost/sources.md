# Sources for the submission page and the gallery

Every number or claim on the page and in the gallery is one of two things: read from a file of
this repository when the gallery is built (`devpost/gallery/build.mjs` stops if it cannot find
one), or taken from a named outside source listed here. Nothing else is stated.

## Read from the repository when the gallery is built

| What a slide states | File it is read from |
|---|---|
| Cases matched and stored, the run date, cases drawn, the case not finished, the solver's commit | `results/headline.md` |
| The one-prompt rebuilds' matches, the median difference, the credits | `results/ablation-manual-only.md` |
| The classes of misses, their counts, one example of each | `results/known-misses.json`, `results/headline.md` |
| QUICK-2's screen for the main example, its recording date, WS ELEV | `oracle/goldens/captures/nd-irr-000006/`, `oracle/goldens/cases/nd-irr-000006.json` |
| The section's stations and elevation source, the discharge and its statistic | `realdata/huntington-section-01.json` |
| Specs, acceptance criteria, hooks, steering files, agents, MCP tools, recorded cases, commits | counted from `.kiro/`, `oracle/` and the git history |
| "All recorded cases match the recorder's manifest" | `scripts/check_goldens.py`, run by the build |
| Every picture of the app | the running site, photographed by the build |

The build also checks that the ablation file and the headline file agree on the batch, and that
the classes of misses add up to the headline's misses.

## Outside sources

1. **FEMA's list of accepted models names QUICK-2.** FEMA, "Hydraulic Numerical Models Meeting
   the Minimum Requirement of National Flood Insurance Program",
   https://www.fema.gov/flood-maps/products-tools/numerical-models/hydraulic, read 2026-11-26.
   Under "Current Nationally Accepted Hydraulic Models", "One-Dimensional Steady Flow Models":
   "QUICK-2 1.0 and up (Jan. 1995)", developed by FEMA. Its comments: "Intended for use in areas
   studied by approximate methods (Zone A) only." "May be used to develop water-surface
   elevations at one cross section or a series of cross sections." "May not be used to develop a
   floodway." The list names QUICK-2. It does not name Quickened, and the app says so.
2. **The practitioner's message.** Joe Trimboli, MSc GIS-SME, Huntington, West Virginia: a
   message to me of 2026-11-20, quoted whole with his permission given the same day. A second
   sentence he offered for publication on 2026-11-21: "a single property evaluation could be made
   more efficient and streamlined within a micro process." Nothing else he wrote is quoted.
3. **His two QUICK-2 guides.** "FEMA's Quick 2 version 1", June 2013,
   https://bzjoe.blogspot.com/2013/06/fema-quick-2-version-1.html, and "Quick2 FEMA Tutorials",
   June 23, 2023, https://femaquick2.blogspot.com/2023/06/quick2-tutorial.html.
4. **The elevations of the worked example.** USGS 3D Elevation Program, 1 m lidar DEM, through
   the USGS Elevation Point Query Service; the project and the acquisition date are in
   `realdata/huntington-section-01.json`, with the address of each of the 40 queries.
5. **The discharge of the worked example.** The USGS regional regression estimate of the
   1-percent annual exceedance probability flood at the site, with its 90 percent prediction
   interval and the report it comes from, as recorded in `realdata/huntington-section-01.json`
   and shown in the app beside the example.
6. **The Kiro capture on the refusal slide.** A capture of the Kiro window on 2026-11-26, in a new
   folder with only the power installed, cropped and not edited. The session is task 6.1 of the
   resurrection-power spec, and its record is in `docs/build-log.md`.

## Not claimed

- That Quickened is accepted by FEMA, or that an answer from it can be filed. It is a cross-check.
- That QUICK-2's answers are hydraulically right. The limits page lists where they are not.
- A cause for any of the classes of misses.
