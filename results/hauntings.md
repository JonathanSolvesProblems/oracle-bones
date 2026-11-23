# Hauntings

Places where QUICK-2's printed answer disagrees with exact hydraulics (oracle law, rule 5). Quickened
reproduces the printed value by default and may show the exact value beside it, labelled. Each
entry gives the case, what the program printed, the exact answer, and the size of the difference.
"Exact" here means the answer under the stated physical assumption, computed by the rebuild with
QUICK-2's own search and constants; it is not an observation.

## H-001: low ground cut off from the channel is counted as flowing

- **Case:** nd-irr-000010. The Grapevine section, n .06 / .04 / .06, discharge 3000 cfs, slope .0035.
- **QUICK-2 printed:** WS ELEV `596.37`, Area `623`, Top Wid `219`, Wet Per `220`.
- **What happens:** at 596.37 the water stands in two places: around the channel (155.76 to
  307.14 ft, 151.4 ft wide) and over low ground on the right overbank (347.07 to 414.81 ft,
  67.7 ft wide), which the 597.93 ft point at station 333.33 cuts off from the channel. QUICK-2
  counts the pocket in Area, Top Wid and Wet Per and lets it carry flow (criterion 9.7). The
  rebuild does the same and matches all nine fields.
- **Exact answer, with the pocket treated as ineffective (wet but carrying no flow, and left
  out of the section):** WS ELEV 596.42, Area 586, Top Wid 152, Wet Per 153.
- **Difference:** WS ELEV 0.05 ft lower in QUICK-2. Top Wid 67 ft wider (44%), Area 37 sq ft larger
  (6%), Wet Per 67 ft longer.
- **Flag:** `cut_off_area_counted`. The rebuild also raises it for nd-irr-000014 (a second pool
  inside the channel banks) and sb-irr-000003.

## H-002: the ends of the section act as frictionless vertical walls

- **Case:** nd-irr-000005. The 40-point section, n .06 / .035 / .08, discharge 30000 cfs, slope
  .002.
- **QUICK-2 printed:** WS ELEV `19.10`, Top Wid `390`, Wet Per `391`, Hyd R `10.8`, Area `4226`.
- **What happens:** the water surface is 7.1 ft above the left end (elevation 12) and 6.6 ft
  above the right end (12.5). QUICK-2 holds the water between the first and last stations as if
  each end rose as a vertical wall, and the walls add nothing to the wetted perimeter
  (criterion 3.12). It prints EXTENDED CROSS SECTION on row 24 and nothing else. The rebuild does
  the same and matches every field.
- **Exact answer, with the walls counted as wetted boundary:** Wet Per 404.9 ft and Hyd R 10.4 ft,
  at the same Area 4226. A real channel this full spills past the ends; the true answer needs a
  wider section, which QUICK-2 does not ask for.
- **Difference:** Wet Per 13.7 ft shorter in QUICK-2 (3.4%), Hyd R 0.36 ft larger (10.80 against 10.44,
  3.5%).
- **Flag:** `extended_section`.
