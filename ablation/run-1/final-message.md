I wrote the program as `entry.mjs` and it runs. For the contract's own example (trapezoid, slopes 3 and 2, width 10, n .035, 300 cfs, slope .005) it prints a depth of **3.27**, the same as CONTRACT.md. The exact normal depth for those inputs is 3.29. My tests covered every shape and mode, one irregular section, and rejected inputs. I had no QUICK-2 output to compare against beyond that one number.

I found one public source, FEMA's [Quick-2 tutorial](https://www.fema.gov/sites/default/files/2020-07/quick-2-tutorial.txt). It is written for version 2.0, and it gave me four facts:
- Manning's equation uses the constant 1.486.
- Gravity is 32.2 ft/s².
- The iteration stops once the computed discharge is within 1% of the given discharge.
- Flow is supercritical when the velocity head is at least half the hydraulic depth.

I assumed version 1.0 does the same.

Halving the interval from 0 to 100 ft and stopping at the first trial depth within 1% gives 3.27. Starting from 0 to 25 or 0 to 50 ft also gives 3.27, so that one number doesn't pin down the starting interval.

**What I had to guess:**

1. **How the iteration works.** I used interval halving with a ≤1% test. Open channels start between 0 and 100 ft, pipes between 0 and the diameter, and the irregular section between its lowest and highest ground points. I used the same method for critical depth, iterating on A·√(gA/T) until it is within 1% of Q. QUICK-2 may use a different method or different starting bounds.
2. **Velocity.** For normal depth and capacity, I used the Manning velocity at the solved depth rather than the typed Q divided by area. They differ by up to 1%. For critical depth I used Q/A.
3. **Critical depth mode.**
   - The flow type always prints CRITICAL. The input slope isn't used for anything.
   - Critical slope comes from Manning's equation at the critical depth.
   - Froude is computed from the results and prints as 1.0.
4. **Froude and flow type.** Froude is V/√(g·A/T). Supercritical means V²/2g ≥ (A/T)/2, so a Froude number of exactly 1 counts as supercritical. On the irregular section I used the whole section's velocity and hydraulic depth, not the channel's.
5. **Pipes.**
   - `max_discharge` is the true maximum, near 0.938 of the diameter, rather than the full-pipe flow.
   - A normal-depth discharge above that maximum is rejected.
   - A capacity depth greater than the diameter is rejected.
   - A depth equal to the diameter computes full flow, with top width 0, Froude 0.0 and SUBCRITICAL.
6. **Irregular section.**
   - The overbanks get one Manning calculation per segment between ground points, as HEC-2 does. The channel is one unit.
   - Bank stations that don't fall on a ground point are interpolated.
   - If the water rises above an end point, I extend that end with a vertical wall, which adds to the wetted perimeter.
   - Depth is the water-surface elevation minus the lowest ground point.
7. **What gets rejected.** Text that isn't a number is rejected. A blank or missing field counts as 0, then the range checks apply:
   - n, slope, discharge, depth and diameter must be greater than 0.
   - A rectangle needs a width greater than 0.
   - Side slopes and a trapezoid's width can't be negative, and a V-ditch's two side slopes can't both be 0.
   - An irregular section needs at least 2 points, stations that never decrease, and banks inside the section with left less than right.

   The program's real message texts are unknown, so mine are invented.
8. **Printing.**
   - Numbers below 1 get a leading zero (`0.0350` rather than `.0350`).
   - Rounding is standard round-half-up on double-precision values. If QUICK-2 used single precision, a few values that fall right on a rounding boundary will differ.
   - Large numbers print without thousands separators.
   - `error` is used only for malformed requests and solver failures.
