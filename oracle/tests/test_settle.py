"""When a screen counts as settled (Q-030), and the screen after Enter on the circle rejection
(Q-032 b). No Docker: the runner's decision lives in oracle/runner/settle.py, which these tests
drive with a simulated clock and output stream.

The stream copies what was measured on QUICK-2 with S2's inputs (12 in, .013, 4 cfs, .005):
over 4 s on the rejection screen, 73 output chunks arrived, the longest gap between them was
98 ms, and the screen text and cursor never changed.
"""
import copy
import json
import re
from pathlib import Path

from oracle import cases, paths, profile, reread
from oracle.recorder import Store
from oracle import screen as screen_mod
from oracle import session as session_mod
from oracle.profile import screen_by_id
from oracle.runner import settle

from .test_case_endings import captures, use

CAPS = Path(__file__).parent / "captures" / "quick2"
PROFILE = profile.load()
SETTLE_MS = PROFILE["limits"]["settle_ms"]
POLL_S = 0.02  # the runner's poll interval


def rows(name):
    return (CAPS / name).read_text(encoding="utf-8").rstrip("\n").split("\n")


REJECTED = rows("cd_circ_rejected-s2.txt")  # run 20261125-141415-e06fc2, final screen
AFTER_ENTER = rows("cd_circ_rejected-s2-enter.txt")  # run 20261125-142211-6307dd, exploratory
FORM = captures("cd-circ-000037")[-2]  # the form before Begin Calculations, from the S1 golden


def s2_chunk_times(start=0.012, count=73):
    """Output chunk times like the S2 measurement: gaps of 98 ms and 12 ms in turn, so 73
    chunks span about 4 s and no gap reaches settle_ms."""
    out, t = [], start
    for i in range(count):
        out.append(t)
        t += 0.098 if i % 2 else 0.012
    return out


def simulate(texts_at, order, regexes=None, changed_from=None, sent_at=0.0, until=4.0, first=None):
    """Run the runner's wait loop on a simulated clock. texts_at: [(time, rows)], one output
    chunk each, the rows the screen shows after it. Returns the time the wait matched, or None
    if it had not by `until`."""
    first = first if first is not None else texts_at[0][1]
    q = settle.Quiet(0.0, screen_mod.hash_rows(first))
    q.sent(sent_at)
    shown = first
    events = sorted(texts_at, key=lambda e: e[0])
    regexes = [re.compile(p, re.M) for p in (regexes or [])]
    compiled = settle.compile_order(order)
    t, i = sent_at, 0
    while t <= until:
        while i < len(events) and events[i][0] <= t:
            shown = events[i][1]
            q.output(events[i][0], screen_mod.hash_rows(shown))
            i += 1
        snap = {"rows": shown, "hash": screen_mod.hash_rows(shown), "exited": None,
                "quiet_ms": q.quiet_ms(t), "text_quiet_ms": q.text_quiet_ms(t)}
        if settle.decide(snap, regexes, changed_from, SETTLE_MS, compiled) == "matched":
            return t
        t = round(t + POLL_S, 6)
    return None


def unmarked(prof):
    p = copy.deepcopy(prof)
    for s in p["screens"]:
        s.pop("keeps_output", None)
    return p


def test_the_simulated_stream_is_the_measured_one():
    times = s2_chunk_times()
    gaps = [b - a for a, b in zip(times, times[1:])]
    assert len(times) == 73
    assert 3.9 <= times[-1] - times[0] <= 4.1
    assert max(gaps) * 1000 < SETTLE_MS and round(max(gaps) * 1000) == 98


def test_the_profile_marks_only_the_circle_rejection():
    assert [s["id"] for s in PROFILE["screens"] if s.get("keeps_output")] == ["cd_circ_rejected"]


def test_under_the_output_rule_the_rejection_never_settles():
    """Today's rule, and the rule for every unmarked screen: S2's stream never goes settle_ms
    without output, so the wait for the rejection runs out (Q-030)."""
    stream = [(t, REJECTED) for t in s2_chunk_times()]
    marker = screen_by_id(PROFILE, "cd_circ_rejected")["marker"]
    assert simulate(stream, None, regexes=[marker], first=FORM) is None
    assert simulate(stream, session_mod.text_settle(unmarked(PROFILE)), regexes=[marker], first=FORM) is None


def test_a_marked_screen_settles_once_its_text_is_unchanged():
    """The first chunk draws the rejection; the text then stays the same while output goes on.
    The wait matches settle_ms after that first chunk, within one poll."""
    times = s2_chunk_times()
    stream = [(t, REJECTED) for t in times]
    marker = screen_by_id(PROFILE, "cd_circ_rejected")["marker"]
    got = simulate(stream, session_mod.text_settle(PROFILE), regexes=[marker], first=FORM)
    assert got is not None
    assert SETTLE_MS / 1000 <= got - times[0] <= SETTLE_MS / 1000 + POLL_S + 1e-9


def test_a_marked_screen_whose_text_keeps_changing_does_not_settle():
    """Same chunk times, but every chunk changes the text (here the blank row under the message
    counts up), as a screen still being drawn would. The marker matches throughout and the wait
    runs out."""
    stream = []
    for k, t in enumerate(s2_chunk_times()):
        r = list(REJECTED)
        r[21] = r[21][:13] + ("drawing %d" % k).ljust(51) + r[21][64:]
        stream.append((t, r))
    marker = screen_by_id(PROFILE, "cd_circ_rejected")["marker"]
    assert all(re.search(marker, "\n".join(r), re.M) for _, r in stream)
    assert simulate(stream, session_mod.text_settle(PROFILE), regexes=[marker], first=FORM) is None


def test_text_that_stops_changing_settles_after_its_last_change():
    times = s2_chunk_times()
    last_change = times[20]
    stream = []
    for k, t in enumerate(times):
        r = list(REJECTED)
        if k <= 20:
            r[21] = r[21][:13] + ("drawing %d" % k).ljust(51) + r[21][64:]
        stream.append((t, r))
    got = simulate(stream, session_mod.text_settle(PROFILE), regexes=["DEPTH is Greater"], first=FORM)
    assert got is not None
    assert SETTLE_MS / 1000 <= got - last_change <= SETTLE_MS / 1000 + POLL_S + 1e-9


def test_an_unmarked_screen_keeps_the_output_rule_in_a_marked_profile():
    """The circle form is not marked: with the same stream and unchanged text it does not
    settle, and with no output after it is drawn it settles settle_ms after the last chunk."""
    order = session_mod.text_settle(PROFILE)
    marker = screen_by_id(PROFILE, "cd_form")["marker"]
    assert screen_mod.identify(PROFILE, FORM)[0] == "cd_form"
    busy = [(t, FORM) for t in s2_chunk_times()]
    assert simulate(busy, order, regexes=[marker]) is None
    got = simulate([(0.05, FORM)], order, regexes=[marker])
    assert got is not None and SETTLE_MS / 1000 <= got - 0.05 <= SETTLE_MS / 1000 + POLL_S + 1e-9


def test_a_key_sent_restarts_the_text_quiet_time():
    # times in 1/8 s, exact in binary, so the millisecond counts are exact
    q = settle.Quiet(0.0, "a")
    q.output(0.125, "b")
    assert q.text_quiet_ms(1.0) == 875
    q.sent(0.75)
    assert q.text_quiet_ms(1.0) == 250
    q.output(0.875, "b")  # output with the same text does not restart it
    assert q.text_quiet_ms(1.0) == 250 and q.quiet_ms(1.0) == 125


def test_the_first_marker_in_profile_order_decides_the_rule():
    """As the host identifies screens: an earlier unmarked screen that claims the text keeps
    the output rule even when a later marked marker also matches."""
    order = settle.compile_order([["SHARED", False], ["SHARED|OTHER", True]])
    assert settle.keeps_output(order, "SHARED") is False
    assert settle.keeps_output(order, "OTHER") is True
    assert settle.keeps_output(order, "NEITHER") is False
    assert settle.keeps_output(None, "OTHER") is False


def test_every_session_wait_carries_the_profile_order():
    """Each of the session's runner waits sends text_settle: every screen with a marker, in
    profile order, with its mark. A profile with no marked screen sends none, so its waits are
    the requests they were before."""
    from .test_session_after import FakeRunner, _session

    want = [[s["marker"], bool(s.get("keeps_output"))] for s in PROFILE["screens"] if s["marker"]]
    assert session_mod.text_settle(PROFILE) == want
    assert [m for m, k in want if k] == [screen_by_id(PROFILE, "cd_circ_rejected")["marker"]]
    assert session_mod.text_settle(unmarked(PROFILE)) is None

    runner = FakeRunner("TITLE", then="MAIN MENU")
    s = _session(runner)
    s.send("{Enter}", expect="title")
    s.wait(None)
    s.confirm_unchanged(s.last["hash"])
    waits = [r for r in runner.ops if r["op"] == "wait"]
    assert len(waits) >= 3 and all(r["text_settle"] == want for r in waits)

    runner = FakeRunner("TITLE", then="MAIN MENU")
    s = _session(runner)
    s.profile = unmarked(PROFILE)
    s.send("{Enter}", expect="title")
    assert all("text_settle" not in r for r in runner.ops if r["op"] == "wait")


def test_a_marked_screen_reads_its_prompt_by_text_quiet():
    sdef = screen_by_id(PROFILE, "cd_circ_rejected")
    snap = {"quiet_ms": 0, "text_quiet_ms": 400}
    assert screen_mod.quiet_for(sdef, snap) == 400
    assert screen_mod.quiet_for(screen_by_id(PROFILE, "cd_form"), snap) == 0
    assert screen_mod.quiet_for(sdef, {"quiet_ms": 7}) == 7  # a runner without text_quiet_ms


# ---- Q-032 (b): the screen after Enter on the rejection ----------------------------------

def test_the_rejection_reads_as_rejected_with_its_message():
    sid, matches = screen_mod.identify(PROFILE, REJECTED)
    assert sid == "cd_circ_rejected" and "cd_circ_result" not in matches
    out = cases._ending(PROFILE, screen_mod.describe(PROFILE, {"rows": REJECTED, "hash": "x",
                                                               "cursor": {"row": 0, "col": 0}}), False)
    assert out["outcome"] == "rejected"
    assert out["message"].strip() == "DEPTH is Greater than the DIAMETER"


def test_the_screen_after_enter_is_not_a_result():
    """Enter on the rejection keeps the message, shows Depth 1.00 with blank outputs and adds
    'Print <F5>' (run 20261125-142211-6307dd). cd_circ_result's marker needed only 'Print <F5>',
    so this screen was read as a result with blank fields. It now reads as the rejection."""
    text = "\n".join(AFTER_ENTER)
    assert "DEPTH is Greater than the DIAMETER" in text and re.search(r"Print\s+<F5>", text)
    sid, matches = screen_mod.identify(PROFILE, AFTER_ENTER)
    assert sid == "cd_circ_rejected"
    assert "cd_circ_result" not in matches and "cd_result" not in matches
    desc = screen_mod.describe(PROFILE, {"rows": AFTER_ENTER, "hash": "x", "cursor": {"row": 0, "col": 0}})
    out = cases._ending(PROFILE, desc, False)
    assert out["outcome"] == "rejected" and out["printed"] == {}
    assert out["message"].strip() == "DEPTH is Greater than the DIAMETER"


def test_every_stored_circle_critical_depth_result_still_reads_as_a_result():
    store = Store(paths.REPO_GOLDENS)
    ids = sorted(p.stem for p in (paths.REPO_GOLDENS / "cases").glob("cd-circ-*.json"))
    results = [cid for cid in ids
               if json.loads((paths.REPO_GOLDENS / "cases" / (cid + ".json")).read_text(encoding="utf-8"))
               ["outcome"] == "result"]
    assert len(results) >= 29
    for cid in results:
        assert screen_mod.identify(PROFILE, reread.final_rows(store, cid))[0] == "cd_circ_result", cid


def test_a_case_that_reaches_the_rejection_ends_rejected(monkeypatch):
    """The S1 golden's screens up to Begin Calculations, then the S2 rejection screen: the
    case ends as rejected with the message, and the re-read accepts what would be stored."""
    shots = captures("cd-circ-000037")
    g = Store(paths.REPO_GOLDENS).load("cd-circ-000037")
    by_hash = {screen_mod.hash_rows(r): r for r in shots}
    last = len(g["transcript"]) - 1

    def react(keys, rows, i):
        if i == last:
            return REJECTED
        return by_hash[g["transcript"][i]["screen_hash_after"]]

    use(monkeypatch, shots[0], react)
    got = cases.run(PROFILE, "critical_depth", "circle", dict(g["inputs"]))
    assert got["outcome"] == "rejected"
    assert got["screen_id"] == "cd_circ_rejected"
    assert got["message"].strip() == "DEPTH is Greater than the DIAMETER"
    golden = {"outcome": "rejected", "printed": got["printed"], "message": got["message"]}
    assert reread.read_as(PROFILE, golden, got["final"])["outcome"] == "rejected"
