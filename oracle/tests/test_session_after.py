"""The after hash of a transcript step is the screen once it has settled after the keys.

The runner's "send" reply is a snapshot taken right after the keys are written, before the
program redraws. These tests drive Session against a fake runner that behaves that way.
"""

import hashlib
import json

from oracle import paths
from oracle import profile as profile_mod
from oracle.session import Session


def _snap(text, exited=None):
    rows = [text.ljust(80)] + [" " * 80] * 24
    return {"rows": rows, "hash": hashlib.sha256("\n".join(rows).encode()).hexdigest(),
            "cursor": {"row": 0, "col": 0}, "quiet_ms": 0, "version": 0,
            "overflow_rows_used": False, "exited": exited}


class FakeRunner:
    """Shows `first` until keys arrive; then shows `then` if the program reacts, `first` if not.
    Like the real runner, the reply to "send" is the screen before any redraw."""

    def __init__(self, first, then=None):
        self.screen = _snap(first)
        self.then = _snap(then) if then is not None else None
        self.ops = []

    def __call__(self, req, answer_within):
        self.ops.append(req)
        op = req["op"]
        if op == "send":
            reply = dict(self.screen)
            if self.then is not None:
                self.screen = self.then  # drawn after the reply went out
            return reply
        if op == "wait":
            snap = dict(self.screen)
            changed = req.get("changed_from")
            snap["matched"] = changed is None or snap["hash"] != changed
            if not snap["matched"]:
                snap["reason"] = "timeout"
            return snap
        return dict(self.screen)


def _session(runner):
    s = Session.__new__(Session)
    s.profile = profile_mod.load()
    s.limits = s.profile["limits"]
    s.setup = {}
    s.transcript = []
    s.resends = 0
    s.case_limit = False
    s.proc = None
    s.drive = None
    s._call = runner
    s.last = runner.screen
    return s


def test_after_hash_is_the_redrawn_screen():
    runner = FakeRunner("TITLE", then="MAIN MENU")
    s = _session(runner)
    before = s.last["hash"]
    s.send("{Enter}", expect="title")
    step = s.transcript[-1]
    assert step["screen_hash_before"] == before
    assert step["screen_hash_after"] == _snap("MAIN MENU")["hash"]
    assert step["screen_hash_after"] != step["screen_hash_before"]
    assert s.last["hash"] == step["screen_hash_after"]


def test_after_hash_waits_for_change_then_settle():
    runner = FakeRunner("TITLE", then="MAIN MENU")
    s = _session(runner)
    before = s.last["hash"]
    s.send("{Enter}", expect="title")
    waits = [r for r in runner.ops if r["op"] == "wait"]
    assert waits and waits[0]["changed_from"] == before
    assert waits[0]["settle_ms"] == s.limits["settle_ms"]
    assert waits[0]["timeout_s"] <= s.limits["settle_ms"] / 1000 * 4


def test_ignored_keys_record_an_unchanged_settled_screen():
    runner = FakeRunner("TITLE")
    s = _session(runner)
    s.send("3", expect="title")
    step = s.transcript[-1]
    assert step["screen_hash_after"] == step["screen_hash_before"]
    waits = [r for r in runner.ops if r["op"] == "wait"]
    assert len(waits) == 2 and waits[1]["changed_from"] is None
    assert waits[1]["settle_ms"] == s.limits["settle_ms"]


def test_stored_transcripts_chain():
    """In the committed goldens, the screen a step leaves is the screen the next step starts
    from. Goldens recorded with the snapshot from "send" fail this: every after equals its
    own before."""
    files = sorted((paths.REPO_GOLDENS / "cases").glob("*.json"))
    assert files
    for f in files:
        t = json.loads(f.read_text(encoding="utf-8"))["transcript"]
        for a, b in zip(t, t[1:]):
            assert a["screen_hash_after"] == b["screen_hash_before"], (f.name, a["step"])


def test_a_stop_screen_ends_a_prompt_wait():
    """A screen of kind rejected that appears while a prompt is awaited is returned at once,
    and the wait asks the runner for its marker as well as the prompt's screen."""
    from oracle.recorder import Store
    rows = (Store(paths.REPO_GOLDENS).captures_dir / "obs-bankreject-000002" / "screen-15.txt") \
        .read_text(encoding="utf-8")[:-1].split("\n")
    runner = FakeRunner("x")
    runner.screen = dict(runner.screen, rows=rows,
                         hash=hashlib.sha256("\n".join(rows).encode()).hexdigest(), quiet_ms=1000)
    s = _session(runner)
    desc = s.wait_prompt("irr_editor", "n_left", timeout_s=1, stops=["irr_bank_rejected"])
    assert desc["screen_id"] == "irr_bank_rejected"
    marker = next(x["marker"] for x in s.profile["screens"] if x["id"] == "irr_bank_rejected")
    assert marker in runner.ops[0]["any"]
