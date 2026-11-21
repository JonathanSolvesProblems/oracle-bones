"""How a case ends on a rejected screen or a held prompt, without Docker.

A fake session plays back screens captured from the binary in the committed goldens.
"""
import json

import pytest

from oracle import cases, paths, profile, reread
from oracle import screen as screen_mod
from oracle.recorder import Store

STORE = Store(paths.REPO_GOLDENS)
PROFILE = profile.load()


def captures(cid):
    out = []
    for p in sorted((STORE.captures_dir / cid).glob("screen-*.txt")):
        text = p.read_text(encoding="utf-8")
        out.append(text[:-1].split("\n"))
    return out


def snap(rows):
    return {"rows": rows, "hash": screen_mod.hash_rows(rows), "cursor": [0, 0], "quiet_ms": 10_000,
            "matched": True}


class FakeSession:
    """react(keys, rows, sends) returns the rows shown after keys are sent."""
    react = None
    first = None
    late = None  # late(rows) -> rows shown once the hold window has passed, or None

    def __init__(self, prof, cfg=None, server_id=None, setup=None):
        self.profile = prof
        self.last = snap(self.first)
        self.transcript = []
        self.resends = 0
        self.drive = None
        self.waits = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def wait(self, screen_ids, settle_ms=None):
        self.waits.append(("wait", list(screen_ids)))
        return screen_mod.describe(self.profile, self.last)

    def wait_prompt(self, screen_id, prompt_id, stops=()):
        self.waits.append(("prompt", prompt_id, list(stops)))
        return screen_mod.describe(self.profile, self.last)

    def send(self, keys, expect=None):
        before = self.last["hash"]
        self.last = snap(type(self).react(keys, self.last["rows"], len(self.transcript)))
        self.transcript.append({"step": len(self.transcript) + 1, "expect": expect, "keys": keys,
                                "screen_hash_before": before, "resend": False,
                                "screen_hash_after": self.last["hash"]})
        return screen_mod.describe(self.profile, self.last)

    def confirm_unchanged(self, unchanged_hash):
        self.waits.append(("confirm", unchanged_hash))
        later = type(self).late(self.last["rows"]) if type(self).late else None
        if later is not None:
            self.last = snap(later)
        self.transcript[-1]["screen_hash_after"] = self.last["hash"]
        return screen_mod.describe(self.profile, self.last)

    def changed_files(self):
        return []


def use(monkeypatch, first, react, late=None):
    fake = type("Fake", (FakeSession,), {"first": first, "react": staticmethod(react),
                                         "late": staticmethod(late) if late else None})
    monkeypatch.setattr(cases, "Session", fake)
    return fake


def trap_inputs(**over):
    base = {"left_slope": "3", "right_slope": "2", "bottom_width": "10", "n": ".035",
            "discharge": "300", "slope": ".005"}
    base.update(over)
    return base


def test_a_held_prompt_ends_the_case_as_rejected_with_no_message(monkeypatch):
    # obs-zerohold-000001: screens 00 title, 01 main menu, 02 shape menu, 03 the form at left
    # slope; 0 and Enter there leave screen 03 byte-identical.
    shots = captures("obs-zerohold-000001")
    order = iter(shots[1:4])

    def react(keys, rows, i):
        return rows if keys.startswith("0") else next(order)

    use(monkeypatch, shots[0], react)
    got = cases.run(PROFILE, "normal_depth", "trapezoid", trap_inputs(left_slope="0"))
    assert got["outcome"] == "rejected"
    assert got["message"] is None
    assert got["held_prompt"] == "left_slope"
    assert got["screen_id"] == "nd_trap_form"
    assert len(got["transcript"]) == 4
    assert got["transcript"][-1]["screen_hash_before"] == got["transcript"][-1]["screen_hash_after"]
    # The re-read accepts what the recorder would store for it.
    golden = {"outcome": got["outcome"], "printed": got["printed"], "message": None,
              "held_prompt": got["held_prompt"]}
    assert reread.read_as(PROFILE, golden, got["final"]) == \
        {"outcome": "rejected", "printed": got["printed"], "message": None}


def test_a_held_golden_whose_prompt_no_longer_shows_reads_as_unknown():
    shots = captures("obs-zerohold-000001")
    golden = {"outcome": "rejected", "printed": {}, "message": None, "held_prompt": "left_slope"}
    # screen 04 is the form at right slope
    assert reread.read_as(PROFILE, golden, shots[4])["outcome"] == "unknown_screen"


def test_a_changing_screen_is_never_held(monkeypatch):
    # nd-trap-000001 captured every screen of the full flow; each send moves to the next one.
    shots = captures("nd-trap-000001")
    g = STORE.load("nd-trap-000001")
    by_hash = {screen_mod.hash_rows(r): r for r in shots}

    def react(keys, rows, i):
        return by_hash[g["transcript"][i]["screen_hash_after"]]

    use(monkeypatch, shots[0], react)
    got = cases.run(PROFILE, "normal_depth", "trapezoid", dict(g["inputs"]))
    assert got["outcome"] == "result"
    assert got.get("held_prompt") is None
    assert got["printed"] == g["printed"]


def test_a_rejected_screen_ends_a_prompt_wait_with_its_message(monkeypatch):
    # obs-bankreject-000002: screen 03 is the empty editor, 14 the editor after the left bank,
    # 15 the bank-station error after the right bank.
    shots = captures("obs-bankreject-000002")
    flow = cases.flow_inputs(PROFILE, "normal_depth", "irregular")
    inputs = {name: "1" for name in flow}
    inputs.update(bank_left="150", bank_right="255")
    menus = iter(shots[1:4])

    def react(keys, rows, i):
        if i < 3:
            return next(menus)
        if keys.startswith("255"):
            return shots[15]
        if keys.startswith("150"):
            return shots[14]
        # each ground point changes the screen, as the program's echo does
        return rows[:-1] + [("point %d" % i).ljust(len(rows[-1]))]

    use(monkeypatch, shots[0], react)
    got = cases.run(PROFILE, "normal_depth", "irregular", inputs)
    assert got["outcome"] == "rejected"
    assert got["screen_id"] == "irr_bank_rejected"
    assert got["message"] and "Bank Station" in got["message"]
    assert got.get("held_prompt") is None
    assert got["transcript"][-1]["keys"].startswith("255")


def test_a_slow_program_is_not_held(monkeypatch):
    # The value is accepted, but the screen changes only after the change window: the hold
    # confirmation sees the change and the case goes on to its result.
    shots = captures("nd-trap-000001")
    g = STORE.load("nd-trap-000001")
    by_hash = {screen_mod.hash_rows(r): r for r in shots}
    pending = {}

    def react(keys, rows, i):
        nxt = by_hash[g["transcript"][i]["screen_hash_after"]]
        if i == 3:  # left slope: nothing visible within the change window
            pending["rows"] = nxt
            return rows
        return nxt

    def late(rows):
        return pending.pop("rows", None)

    use(monkeypatch, shots[0], react, late)
    got = cases.run(PROFILE, "normal_depth", "trapezoid", dict(g["inputs"]))
    assert got["outcome"] == "result" and got.get("held_prompt") is None
    assert got["printed"] == g["printed"]
    t = got["transcript"]
    assert all(a["screen_hash_after"] == b["screen_hash_before"] for a, b in zip(t, t[1:]))
