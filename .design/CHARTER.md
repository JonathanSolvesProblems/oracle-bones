# Quickened: the charter

Laws every screen obeys. Each has its reason. Written outside Kiro, 2026-11-26; the direction is in
`.design/DIRECTION.md`, the target picture in `.design/mock/reach-block-light.png`.

## Colour

| Token | Light | Dark | Found in |
|---|---|---|---|
| canvas | `#E7E8E3` | `#171916` | whitewashed plaster under a high-water mark |
| ink | `#1A1C19` | `#E6E8E3` | the gauge plate's black graduations |
| ink-muted | `#565A53` | `#9DA197` | |
| rule | `#C5C8BF` | `#33362F` | |
| water | `#8C7737` | `#A88C45` | floodwater in every photograph: turbid silt, not blue |
| water-top | `#A8924F` | `#C2A65E` | the lit surface of the same water |
| water-line | `#4E3F14` | `#E3C977` | the water's edge; also links |
| ground-lit / ground-shade | `#E0DED4` / `#BDB8A8` | `#63615A` / `#34332D` | a lidar hillshade's greys, light as paper (design round 2) |
| cut-face / hatch | `#D3CFC1` / `#6B6656` | `#22231F` / `#5A564B` | a cut bank drawn in ink on paper, so the water is the only fill (design round 2) |
| gauge | `#F4F4F0` | `#E6E8E3` | the gauge's white enamel |
| flag | `#A3241C` | `#E5735F` | warnings only |

1. **The water is the only colour.** Everything else is ink, plaster and ground greys. A second
   hue appears only as `flag`, and only on a warning. Because the product's one answer is where
   the water stands.
2. **No map blue anywhere,** water or link. Floodwater is silt-coloured; blue is the category
   convention.
3. **Links are `water-line` and underlined,** never blue, never colour alone.

## Type

4. IBM Plex Sans for reading, IBM Plex Sans Condensed for labels and every figure, with tabular
   figures (`font-variant-numeric: tabular-nums`). IBM Plex Mono only inside QUICK-2's recorded
   screens, which are evidence, never for Quickened's own figures.
5. One scale, ratio 1.333 from 16 px: 12, 16, 21, 28, 37, 50, 66. The result's figure is the only
   thing at 50 or 66.
6. Labels in QUICK-2's own capitals stay as QUICK-2 wrote them. Quickened's own headings are
   sentence case, with no full stop.

## The drawing

7. **Every result is a reach block:** the section the user typed is the front face, extruded a
   short way upstream in an oblique projection; the top surface shaded by slope (lit where it
   faces up and left); the cut face hatched; the water a level plane between its two edges and a
   body in front. Never a flat line plot on screen. The print view keeps the 2D front face.
8. **The elevation is a high-water mark:** a line with a tick at each end at the water's level,
   painted on the block's end wall and skewed to lie on it, the figure lettered above it. Never a
   badge, a pill or a card.
9. **The vertical axis is a staff gauge:** a white plate, black E-marks a unit apart, a figure
   every fifth unit; the water's line crosses it.
10. Nothing on the drawing is decorative: every line is the section, the water, a printed value,
    or the scale. The block's depth is drawn, not computed, and the caption says so.

## Composition

11. **One strong object per view.** The first screen shows the main example's reach block, drawn
    live, before anyone types; the calculator follows. A result puts its block first.
12. No cards, no shadows on panels, no rounded boxes beyond the 2 px input radius. Panels are
    divided by rules, as the gauge plate is divided by graduations.

## Voice

13. Plain words for a permit reviewer. On public pages, never: golden, run id, ledger, A-0xx,
    "the person", stack names. They live in the repository, linked, not on the page.
14. "Haunting" is defined where it first appears, or replaced by "where QUICK-2 differs from the
    exact answer".
15. Nothing implies QUICK-2 ran the user's inputs: "Your inputs, as Quickened read them",
    "Computed by Quickened with QUICK-2's method".
