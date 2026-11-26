The program is `entry.mjs` in `quick2-baseline-2` (the run's own empty folder; the path is shortened here). It runs under Node with no dependencies, reads one JSON line and writes one JSON line per request, and follows CONTRACT.md for every mode, shape and printed field.

I ran 14 hand-made cases, saved in `test\cases.jsonl` plus a few edge cases typed inline. On the ones I worked out by hand the results agree: trapezoid normal depth 3.04 ft, V-ditch critical depth 1.15 ft, rectangle critical depth 1.46 ft, and the 24-inch pipe's capacity at 1.5 ft depth. Rejections and malformed requests also come back in the right form. I had nothing from the real program to compare against, so every guess below is untested against QUICK-2.

**Constants and methods**
- The Manning constant is 1.486 and g is 32.2 ft/s².
- Depths are solved to full precision. QUICK-2 probably stops iterating at a looser tolerance, which could move results that sit near a rounding boundary.
- Froude number is V / √(g·A/T).
- Critical slope is (nQ / (1.486·A·R^(2/3)))², taken at critical depth.

**Flow type**
- In channel capacity and normal depth, it comes from the unrounded Froude number: below 1 is SUBCRITICAL, above 1 is SUPERCRITICAL, and exactly 1 is CRITICAL. A Froude of 0.97 prints as "1.0" but reads SUBCRITICAL.
- In critical depth, I compare the input slope with the critical slope. This is the only use I could find for the slope input in that mode. QUICK-2 might print CRITICAL every time instead.

**Circular pipe**
- `max_discharge` is the true maximum Manning flow, at about 0.94 of the diameter, not the full-pipe flow.
- Normal depth takes the lower depth when two depths give the same flow. A discharge above the maximum is rejected.
- In channel capacity, a depth equal to or greater than the diameter is rejected.

**Irregular section**
- The three subsections use the conveyance method HEC-2 and HEC-RAS use. Wetted perimeter counts only the ground line, not the boundaries between subsections.
- Bank stations that are not ground points are accepted, and their elevation is interpolated. QUICK-2 may require them to be existing stations.
- If the water rises above either end of the section, I extend a vertical wall there and count it in the wetted perimeter. The result carries a message; QUICK-2 might reject these cases instead.
- Depth is measured from the lowest ground point.
- Froude uses the whole section (Q/A and A/T), not the channel alone.
- Hydraulic radius is total area over total wetted perimeter.
- Channel velocity is the channel's share of the flow, split by conveyance, divided by the channel area.
- Stations must not decrease from one point to the next, and at least 2 ground points are needed.

**What gets rejected**
- Text that is not a plain number. This includes blank fields, "abc" and "1,000"; E or D exponents are accepted.
- Manning's n, discharge, slope, depth or diameter of zero or less.
- Negative side slopes or bottom width, a rectangle width of 0, and a V-ditch with both side slopes at 0.
- Left bank station greater than the right bank, or banks outside the section.
- QUICK-2 may have upper limits I don't know about, or it may read bad text as 0 the way BASIC's `VAL` does.

**Printed text**
- Numbers keep a leading zero ("0.0300", not ".0300").
- Rounding goes half away from zero on the decimal value. Typed inputs are rounded from the string as entered, so ties round up.
- I did not emulate the single-precision arithmetic a QuickBASIC program likely uses.

**Messages**
- The rejection and warning texts are my own wording. Results otherwise have a `null` message.
