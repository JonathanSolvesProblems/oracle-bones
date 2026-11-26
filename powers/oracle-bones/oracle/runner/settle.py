"""When the runner counts a screen as settled. Standard library only: it runs in the image
beside agent.py, and the host's offline tests import it without pyte or a pty.

A screen settles once it has been quiet for the wait's settle_ms. Quiet normally means no
output has arrived from the program (and no key has been sent) for that long.

Some screens keep sending output while their text stays the same. QUICK-2's circle Critical
Depth rejection screen received 73 output chunks in 4 s with the longest gap 98 ms, and its
text and cursor never changed (Q-030), so it never went 150 ms without output. The profile
marks such a screen with "keeps_output": true. On a marked screen, quiet means the screen
text (the rows the runner returns) has not changed, and no key has been sent, for settle_ms.
Every other screen keeps the output rule.
"""

import re


class Quiet:
    """The times quiet is measured from. Fed by the reader thread (each output chunk, with the
    hash of the screen text after it) and by send. Times are time.monotonic() seconds."""

    def __init__(self, now, text_hash=None):
        self.output_at = now  # last output chunk
        self.text_at = now  # last change of the screen text
        self.sent_at = 0.0  # last key sent
        self.text_hash = text_hash

    def output(self, now, text_hash):
        self.output_at = now
        if text_hash != self.text_hash:
            self.text_hash = text_hash
            self.text_at = now

    def sent(self, now):
        self.sent_at = now

    def quiet_ms(self, now):
        """Since the last output or key: the rule for every screen not marked keeps_output."""
        return int((now - max(self.output_at, self.sent_at)) * 1000)

    def text_quiet_ms(self, now):
        """Since the screen text last changed or a key was sent: the rule for marked screens."""
        return int((now - max(self.text_at, self.sent_at)) * 1000)


def compile_order(text_settle):
    """The wait's text_settle list, [[marker, keeps_output], ...] for every screen with a
    marker in profile order, compiled once per wait. None when the wait has none."""
    if not text_settle:
        return None
    return [(re.compile(p, re.M), bool(keep)) for p, keep in text_settle]


def keeps_output(order, text):
    """True when the screen the text reads as (the first marker that matches, in profile
    order, as the host identifies screens) is marked keeps_output."""
    if not order:
        return False
    for rx, keep in order:
        if rx.search(text):
            return keep
    return False


def settle_quiet_ms(snap, order, text):
    """The quiet time a wait compares with settle_ms for this snapshot."""
    if keeps_output(order, text):
        return snap["text_quiet_ms"]
    return snap["quiet_ms"]


def decide(snap, regexes, changed_from, settle_ms, order):
    """One look of a wait: "matched", "exited", or None to look again. `regexes` are the
    compiled screens waited for (any one will do; none means any screen), `changed_from` a hash
    the screen must differ from, `order` from compile_order."""
    text = "\n".join(snap["rows"])
    quiet = settle_quiet_ms(snap, order, text)
    ok = quiet >= settle_ms
    if regexes and not any(r.search(text) for r in regexes):
        ok = False
    if changed_from is not None and snap["hash"] == changed_from:
        ok = False
    if ok:
        return "matched"
    if snap["exited"] is not None and quiet >= settle_ms:
        return "exited"
    return None
