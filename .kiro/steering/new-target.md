---
inclusion: manual
---

# Resurrecting a new dead program

Load this with `#new-target` in chat, or run it as `/new-target`, when pointing Oracle Bones
at a program other than QUICK-2.

1. Write `oracle/targets/<name>.json`: download URL, sha256, drive layout, the program to
   start, and the screen marker that means "ready for input". Never commit the binary.
2. Run `python scripts/setup.py <name>` and confirm the binary boots headless before anything
   else. If it does not boot, stop and record why in `results/ledger.json`.
3. Find one printed answer you can reproduce by hand (a manual's worked example, a saved
   output). Script it as the first checkpoint, the way QUICK-2's 3.27 ft example was.
4. Start the `resurrect` workflow with the target name. The Exhumer writes the requirements;
   do not write them yourself.
5. Keep this target's goldens in `oracle/goldens/<name>/`. The guard hook covers them too.

The oracle law still applies: the dead program is right until a skeptic run proves the
difference is a haunting.
