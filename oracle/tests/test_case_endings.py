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


# ---- Q-015: a screen the program never leaves --------------------------------------------

def working_rows():
    """The two-point editor with row 24 as QUICK-2 shows it while it spins (session b018e73c)."""
    rows = list(captures("obs-irrtwopt-000001")[12])
    rows[24] = rows[24][:3] + "\u2551 W o r k i n g  .........." + " " * 49 + "\u2551   "
    return rows[:24] + [rows[24][:len(captures("obs-irrtwopt-000001")[12][24])]]


def two_point_inputs():
    return {"sta_01": "0", "elev_01": "10", "sta_02": "10", "elev_02": "2", "bank_left": "0", "bank_right": "10",
            "n_left": ".05", "n_channel": ".035", "n_right": ".05", "discharge": "100", "slope": ".005"}


def stuck_session(monkeypatch, still, after=None):
    """Every send changes the editor; Begin shows the working screen, which never settles."""
    shots = captures("obs-irrtwopt-000001")
    steps = cases.steps_for(PROFILE, "normal_depth", "irregular", inputs=two_point_inputs())
    begin = len([s for s in steps if "end" not in s]) - 1
    menus = iter(shots[1:4])

    def react(keys, rows, i):
        if i < 3:
            return next(menus)
        if i == begin:
            return working_rows()
        return rows[:-1] + [("point %d" % i).ljust(len(rows[-1]))]

    fake = use(monkeypatch, shots[0], react)
    from oracle.errors import OracleError

    def wait(self, screen_ids, settle_ms=None):
        self.waits.append(("wait", list(screen_ids)))
        desc = screen_mod.describe(self.profile, self.last)
        if desc["screen_id"] == "irr_working":
            raise OracleError("timeout", "waited 10.0s for %s" % screen_ids, {"screen": desc})
        return desc

    def still_on(self, sid, window_s):
        self.waits.append(("still_on", sid, window_s))
        if not still and after is not None:
            self.last = snap(after)
        return still

    fake.wait = wait
    fake.still_on = still_on
    return fake


def test_a_run_still_on_the_working_screen_ends_as_an_error_naming_it(monkeypatch):
    use_ = stuck_session(monkeypatch, still=True)
    got = cases.run(PROFILE, "normal_depth", "irregular", two_point_inputs())
    assert got["outcome"] == "error"
    assert got["stuck_screen"] == "irr_working" and got["screen_id"] == "irr_working"
    assert got["message"] is None and got["printed"] == {}
    golden = {"outcome": "error", "printed": {}, "message": None, "stuck_screen": "irr_working"}
    assert reread.read_as(PROFILE, golden, got["final"]) == {"outcome": "error", "printed": {}, "message": None}
    # A stored stuck golden whose final screen no longer reads as the working screen fails the re-read.
    assert reread.read_as(PROFILE, golden, captures("obs-irrtwopt-000001")[13])["outcome"] == "unknown_screen"


def test_a_slow_program_that_leaves_the_working_screen_goes_on(monkeypatch):
    stuck_session(monkeypatch, still=False, after=captures("obs-irrtwopt-000001")[13])
    got = cases.run(PROFILE, "normal_depth", "irregular", two_point_inputs())
    assert got["outcome"] == "result" and got.get("stuck_screen") is None


def test_no_time_left_to_confirm_stays_a_timeout(monkeypatch):
    stuck_session(monkeypatch, still=None)
    got = cases.run(PROFILE, "normal_depth", "irregular", two_point_inputs())
    assert got["outcome"] == "timeout"


# ---- Q-017: behaviour cases pass through the rejected screens they expect -----------------

def test_a_behaviour_case_continues_past_a_rejected_screen_it_expects(monkeypatch):
    station = captures("obs-irrstation-000001")
    twopt = captures("obs-irrtwopt-000001")
    order = iter(station[1:6] + [twopt[4]])
    control = {"id": "obs-test-000001", "mode": "normal_depth", "shape": "irregular", "inputs": {},
               "steps": [{"expect": "title", "keys": "{Enter}"},
                         {"expect": "main_menu", "keys": "3{Enter}"},
                         {"expect": "shape_menu", "keys": "I{Enter}"},
                         {"expect": "irr_editor", "keys": "-50{Enter}10{Enter}"},
                         {"expect": "irr_editor", "keys": "-60{Enter}"},
                         {"expect": "irr_station_rejected", "keys": "0{Enter}"},
                         {"end": ["irr_editor"]}],
               "expect": {"outcome": "observed", "screen_id": "irr_editor"}}
    use(monkeypatch, station[0], lambda keys, rows, i: next(order))
    got = cases.run(PROFILE, "normal_depth", "irregular", {}, control=control)
    assert got["outcome"] == "observed" and got["screen_id"] == "irr_editor"
    assert "irr_station_rejected" in got["visited"]
    assert [t["keys"] for t in got["transcript"]][-1] == "0{Enter}"


def test_a_generated_case_still_ends_on_a_rejected_screen(monkeypatch):
    station = captures("obs-irrstation-000001")
    order = iter(station[1:6])
    use(monkeypatch, station[0], lambda keys, rows, i: next(order))
    inputs = two_point_inputs()
    inputs.update(sta_01="-50", sta_02="-60")
    got = cases.run(PROFILE, "normal_depth", "irregular", inputs)
    assert got["outcome"] == "rejected" and got["screen_id"] == "irr_station_rejected"

# ---- Q-015: a screen the program never leaves ---------------------------------------------

def working_rows():
    """The two-point editor before Begin with row 24 as QUICK-2 shows it while it spins
    (sessions b018e73c and d2c32fcf)."""
    rows = list(captures("obs-irrtwopt-000001")[12])
    width = len(rows[24])
    text = rows[24][:3] + "\u2551 W o r k i n g  .........."
    rows[24] = (text + " " * width)[:width - 4] + "\u2551   "
    return rows


def two_point_inputs():
    return {"sta_01": "0", "elev_01": "10", "sta_02": "10", "elev_02": "2", "bank_left": "0", "bank_right": "10",
            "n_left": ".05", "n_channel": ".035", "n_right": ".05", "discharge": "100", "slope": ".005"}


def stuck_session(monkeypatch, still, after=None):
    """Every send changes the editor; Begin shows the working screen, which never settles."""
    shots = captures("obs-irrtwopt-000001")
    steps = cases.steps_for(PROFILE, "normal_depth", "irregular", inputs=two_point_inputs())
    begin = len([s for s in steps if "end" not in s]) - 1
    menus = iter(shots[1:4])

    def react(keys, rows, i):
        if i < 3:
            return next(menus)
        if i == begin:
            return working_rows()
        return rows[:-1] + [("point %d" % i).ljust(len(rows[-1]))]

    fake = use(monkeypatch, shots[0], react)
    from oracle.errors import OracleError

    def wait(self, screen_ids, settle_ms=None):
        self.waits.append(("wait", list(screen_ids)))
        desc = screen_mod.describe(self.profile, self.last)
        if desc["screen_id"] == "irr_working":
            raise OracleError("timeout", "waited 10.0s for %s" % screen_ids, {"screen": desc})
        return desc

    def still_on(self, sid, window_s):
        self.waits.append(("still_on", sid, window_s))
        if not still and after is not None:
            self.last = snap(after)
        return still

    fake.wait = wait
    fake.still_on = still_on
    return fake


def test_the_working_screen_reads_as_irr_working():
    assert screen_mod.identify(PROFILE, working_rows())[0] == "irr_working"


def test_a_run_still_on_the_working_screen_ends_as_an_error_naming_it(monkeypatch):
    stuck_session(monkeypatch, still=True)
    got = cases.run(PROFILE, "normal_depth", "irregular", two_point_inputs())
    assert got["outcome"] == "error"
    assert got["stuck_screen"] == "irr_working" and got["screen_id"] == "irr_working"
    assert got["message"] is None and got["printed"] == {}
    golden = {"outcome": "error", "printed": {}, "message": None, "stuck_screen": "irr_working"}
    assert reread.read_as(PROFILE, golden, got["final"]) == {"outcome": "error", "printed": {}, "message": None}
    # A stuck golden whose final screen no longer reads as the working screen fails the re-read.
    assert reread.read_as(PROFILE, golden, captures("obs-irrtwopt-000001")[13])["outcome"] == "unknown_screen"


def test_a_slow_program_that_leaves_the_working_screen_goes_on(monkeypatch):
    stuck_session(monkeypatch, still=False, after=captures("obs-irrtwopt-000001")[13])
    got = cases.run(PROFILE, "normal_depth", "irregular", two_point_inputs())
    assert got["outcome"] == "result" and got.get("stuck_screen") is None


def test_no_time_left_to_confirm_stays_a_timeout(monkeypatch):
    stuck_session(monkeypatch, still=None)
    got = cases.run(PROFILE, "normal_depth", "irregular", two_point_inputs())
    assert got["outcome"] == "timeout"


# ---- Q-017: behaviour cases pass through the rejected screens they expect ------------------

def test_a_behaviour_case_continues_past_a_rejected_screen_it_expects(monkeypatch):
    station = captures("obs-irrstation-000001")
    twopt = captures("obs-irrtwopt-000001")
    order = iter(station[1:6] + [twopt[4]])
    control = {"id": "obs-test-000001", "mode": "normal_depth", "shape": "irregular", "inputs": {},
               "steps": [{"expect": "title", "keys": "{Enter}"},
                         {"expect": "main_menu", "keys": "3{Enter}"},
                         {"expect": "shape_menu", "keys": "I{Enter}"},
                         {"expect": "irr_editor", "keys": "-50{Enter}10{Enter}"},
                         {"expect": "irr_editor", "keys": "-60{Enter}"},
                         {"expect": "irr_station_rejected", "keys": "0{Enter}"},
                         {"end": ["irr_editor"]}],
               "expect": {"outcome": "observed", "screen_id": "irr_editor"}}
    use(monkeypatch, station[0], lambda keys, rows, i: next(order))
    got = cases.run(PROFILE, "normal_depth", "irregular", {}, control=control)
    assert got["outcome"] == "observed" and got["screen_id"] == "irr_editor"
    assert "irr_station_rejected" in got["visited"]
    assert got["transcript"][-1]["keys"] == "0{Enter}"


def test_a_generated_case_still_ends_on_a_rejected_screen(monkeypatch):
    station = captures("obs-irrstation-000001")
    order = iter(station[1:6])
    use(monkeypatch, station[0], lambda keys, rows, i: next(order))
    inputs = two_point_inputs()
    inputs.update(sta_01="-50", sta_02="-60")
    got = cases.run(PROFILE, "normal_depth", "irregular", inputs)
    assert got["outcome"] == "rejected" and got["screen_id"] == "irr_station_rejected"
