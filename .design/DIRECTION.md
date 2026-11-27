# Quickened: the design direction (redesign mode)

Written outside Kiro, 2026-11-26, as the brief for the quickened-app design pass that Kiro builds.
Method: the original-ui skill. Mode: **redesign** (an interface exists; its owner calls it weak).

## Phase 0: the project

- **Platform.** A web app: a calculator with a results screen and two reading pages (limits,
  proof). Static, offline, no server. Not a landing page.
- **Domain.** A floodplain permit reviewer (Joe Trimboli in West Virginia is the real one) checks
  the flood elevation at one cross section of a stream, the way FEMA's QUICK-2 (1995, DOS) does.
  The answer goes into a permit file on paper.
- **The one screen that matters.** The result: the section drawn with the 1-percent flood standing
  in it at 594.37, and the proof that QUICK-2 printed the same.
- **Constraints.** Vite + TypeScript, no framework, tokens in `app/src/ui/styles/tokens.css`, 2,608
  Vitest and 43 Playwright tests (axe included), a print view on US Letter, offline service worker.
  Kiro builds it through the quickened-app spec; this file is the direction only.
- **Locked inputs.** QUICK-2's own field labels and order (criterion 2.1); the notice text; no FEMA
  marks; the mascot never in the app; the drawing is computed from the same numbers the result
  prints.
- **Audience temperature.** Two readers. Judges, who reward a product that looks finished and
  specific. A permit reviewer, who must trust it with a legal record: calm, exact, never playful.
- **Tools.** Local ComfyUI (FLUX.2 klein) works. Not needed: the material here is the data.

## Preservation inventory

Keeping: the information architecture (calculate, limits, proof); QUICK-2's labels; the drawing
computed from the result; the print view's one page; the notice on every result; the opening
paragraph and the headline read from `results/headline.md`; the self-hosted fonts' licensing;
every test that checks behaviour.

Fixing (from screenshots and an independent cold read of the live site):

1. No strong object. The first screen is a column of text and two boxes beside an empty ruled
   notepad; nothing on it is the product's answer.
2. The drawing, the product's trick, is small, flat and thin-lined; its labels sit on lines and are
   7 px on a phone.
3. Weak hierarchy: everything is 14 to 16 px grey text; the result's figure is the only large thing.
4. The first screen never says what QUICK-2 is or why it needs rebuilding.
5. Developer language on public pages: goldens, run ids, ledger wording, "A-016 graded",
   "haunting" never defined, a raw markdown table (H-009), a dangling "as recorded:".
6. Phone: the result lands 5,900 px below the tap; proof tables wrap one word to a line; the
   recorded screens are cut off; the ground-point table is four screens tall before any result.
7. Two headings can read as if QUICK-2 itself ran the user's inputs ("as QUICK-2 read them",
   "Computed by QUICK-2's method").
8. No link to the source, the FEMA list or the author anywhere.

## Phase 1: direction

**Family.** The last three logged projects used organic-soft, dimensional-tactile and
mechanical-industrial (plus modern-saas), so those are banned. The current design is
print-editorial, a survey sheet, which is the attractor this skill names. Chosen:
**spatial-3d**, used neither recently nor by the category.

**Category convention.** Hydraulics calculators (HEC-RAS's dialogs, online Manning calculators,
FEMA's own tools) are grey Windows forms with a flat 2D section plot in primary blue, or a cream
"engineering paper" page. The Kiroween resurrection lane converges on retro terminals and CRT
green. Both are what to avoid.

**Material metaphor: the reach block.** In floodplain guidance a valley is drawn as a block
diagram: a slab of ground cut at the cross section, the channel running into the page, the flood
standing in it as a level plane with the base flood elevation marked on it. Every reviewer has seen
that drawing. Quickened draws every answer that way: the section the user typed is the block's
front face, extruded a short way upstream, and the water stands in it at the computed elevation.

**Found details** (photographs in `.design/refs/`):

- High-water marks on walls and bridge piers: a short painted line with a tick at each end, and
  the level or the date lettered just above it, in dark paint on whitewash or stone.
- River staff gauges: a white plate with black E-shaped tenth marks, a numeral at each foot,
  screwed to a timber post standing in the water.
- Floodwater is not blue. In every photograph it is a turbid olive-brown, the colour of the silt it
  carries.
- A flood post (St George, Queensland): one upright with each year's flood tagged at its height.

**The design code.**

1. The water is the only colour on the page, and it is the colour floodwater is (turbid silt), not
   map blue, because the product's one answer is where that water stands.
2. Every result is drawn as a block of the reach, not a flat line plot, because the reviewer's own
   guidance draws a floodplain that way and the third dimension shows the flood as a body of water.
3. The elevation is marked as a high-water mark is (a ticked line with the figure lettered above
   it), never as a badge or a card, because that is how a flood level is recorded in the world.
4. The vertical scale is a staff gauge (E-marks, a figure at each foot), because a level is read
   off a gauge, and it replaces the generic axis.

**Anti-brief.** Map blue water and blue links-as-identity. A dashboard of cards. A retro terminal
look for the app itself (the 1995 screen appears only as evidence, on the proof page). Anything
cute; this goes in a legal record.

**Expressive axis: structure and imagery.** The block diagram is the loud thing. Type and palette
stay quiet around it.

## Phase 2: three directions, one kept

- **A. The reach block** (spatial-3d). Above. Works for every input, since any section can be
  extruded; prints as its front face. Costs a new drawing module.
- **B. The valley in relief** (cinematic-atmospheric). The first view on the real 3DEP lidar
  hillshade of Grapevine Branch, the section line across it. Striking for the example, but it says
  nothing for a section the user types, and a map with water on it reads as a flood map, which
  QUICK-2 does not make. Not kept.
- **C. QUICK-2 reborn** (retro-computational). Box-drawing chrome and the VGA palette. Killed by
  the category convention: the resurrection lane is full of it, and it undersells a tool for today.

Kept: **A**. Ledger: spatial-3d was last used by eyes-up (cool blue-grey canvas, orange accent,
B612) and n2-door (near-black, green); this one differs in canvas, accent hue, type and metaphor.
