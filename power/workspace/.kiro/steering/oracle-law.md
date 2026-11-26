---
inclusion: always
---

# The oracle law

These rules outrank your own reasoning about what the right answer should be.

1. **The dead program is always right about what it does.** If the rebuild and the original
   disagree, the rebuild is wrong, even when the original looks wrong.
2. **Never edit a golden file.** Goldens are recorded from the binary. If you think one is
   wrong, re-record it from the binary. You may not type a value into one.
3. **Never invent a requirement.** Every requirement about program behaviour cites an
   observation: the case id or screen capture that produced it. Manual citations are
   allowed for intent, but an observation beats the manual.
4. **Do not guess from the textbook.** Equations from the manual are a starting hypothesis.
   The original may round, truncate, or stop iterating early. Find out which.
5. **When the original disagrees with physics, keep the behaviour and record a haunting.**
   A haunting is an entry in `results/hauntings.md` with the case, what the program printed,
   what the exact answer is, and how big the difference is. Quickened reproduces the printed
   value by default and may show the exact value beside it, labelled.
6. **A mismatch is one of three things.** Decide which from evidence, and say why:
   - the spec is wrong: open a bugfix spec
   - it is a display rule (rounding, truncation, field width): record the format rule
   - it is a haunting: rule 5
7. **Say what you do not know.** If a behaviour was not exercised, the coverage ledger says
   so. Do not report coverage you did not observe.
