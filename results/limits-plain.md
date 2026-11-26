# Open questions in plain words

One entry for each open question in `results/ledger.json`, under its id. Each entry says, in one
or two plain sentences, what is not known about QUICK-2 and what that means for someone using
Quickened. The entries are written from the ledger's text and say nothing it does not. Where
QUICK-2's behaviour is not known, Quickened's answer there has not been checked against QUICK-2;
that is all "for you" means below.

Quickened's limits page shows each entry first and the ledger's own wording under it. A test
fails when an open question has no entry here, or an entry names a question that is not open.
When the Exhumer answers a question or opens one, this file changes with it.

## Q-002

With a Manning's n of -1, QUICK-2 shows no answer and leaves its screen unchanged for at least
10 seconds; whether it is still calculating or waiting for a key, and what its keys do from
there, is not known. For you: a negative n gets no answer from QUICK-2, and what follows has not
been checked.

## Q-003

With a discharge or a slope of -1, QUICK-2 goes back to its shape menu without a message, and why
it does, or whether it keeps the inputs when the shape is chosen again, is not known. For you:
these inputs get no answer from QUICK-2, and the reason has not been found.

## Q-004

QUICK-2 holds a prompt when 0 is typed, but whether it holds anything else was not known when
the question was asked: an empty Enter, text that is not a number, very small values such as
.0001 or -.5, and n or slope values too large for their field had not been tried. For you: only
0, .000 and -1 had been checked when this question was asked.

## Q-010

Two very large generated pipes (diameters 2209.7 and 8377 in) gave no answer within 10 seconds,
and whether QUICK-2 was stuck, slow or waiting for a key, and from what pipe size this starts,
is not known. For you: the Diameter prompt takes up to 9999.9 in, but whether QUICK-2 computes
pipes that large in time has not been checked.

## Q-016

Once, a test run of Step-Backwater started on a blank screen and never showed QUICK-2's title,
while the same inputs then ran normally; the cause is not known. For you: this concerns the test
setup, not a calculation, and no answer was recorded from that run.

## Q-018

A Step-Backwater starting value of 1 did not give a recorded answer: QUICK-2 showed "CRITICAL
DEPTH Assumed" with its result fields filled, but the screen did not settle. How QUICK-2 decides
whether a starting value is a slope or an elevation is not known beyond .002 and .0035 acting as
slopes and 5 and 596 as elevations. For you: a starting value of 1 has not been checked.

## Q-019

Some entries have not been tried in cases made for them: 0 and -1 at the Depth prompt, -1 at
Diameter, 0 and -1 at the V - Ditch and rectangle prompts, a circle depth equal to the diameter,
an empty Enter, and text that is not a number. For you: what QUICK-2 does with these entries has
not been checked by cases made for them; generated batches may cover some of the 0 and -1 parts.

## Q-026

For Normal Depth in a circular pipe, when no trial depth in 0.1 ft steps comes within 0.5% of
the discharge, how QUICK-2's search goes on is not known; four recorded cases reach this point.
For you: Normal Depth answers in a circular pipe that reach this point rest on a rule that has
not been settled.

## Q-028

One recorded pipe (147.3 in) prints a Max Discharge one unit below what the rebuild's rule gives,
while two similar pipes match; in all three the value sits about one part in a million from a
rounding boundary, and the cause is not known. For you: a Max Discharge that close to a rounding
boundary can differ from QUICK-2's by one in its last digit.

## Q-032

After QUICK-2 refuses a circle Critical Depth input with "DEPTH is Greater than the DIAMETER",
three keys were tried by hand and not recorded; each led to a different screen, and why the Depth
shown then changes is not known. For you: the refusal is checked, and what QUICK-2 shows after a
key is pressed on it is not.

## Q-035

When a circle Critical Depth discharge is typed with three or four decimals (.395, .405, .0023),
QUICK-2's Discharge field shows 0, because the field has no decimals, so whether QUICK-2 kept
every digit is not known. For you: whether QUICK-2 used such a discharge exactly as typed has not
been checked.

## Q-036

No recorded case presses a key on QUICK-2's "DEPTH is Greater than the DIAMETER" screen, so which
key leaves it is not known. For you: the refusal is checked, and what comes after it is not.

## Q-037

For Critical Depth in a circular pipe whose search reaches a depth equal to the diameter, QUICK-2
went back to its shape menu with no message and no answer when the discharge was more than 0.5%
below what the full pipe carries at critical flow, ten times in pipes of 4.8, 9.6 and 12 in. Why
is not known, and several attempts have not found a mechanism. For you: QUICK-2 gives no answer
in those cases, and the reason has not been found.
