"""Task 7.2: the recorder, without Docker. cases.run is replaced by a fake program."""

import hashlib
import json
from pathlib import Path

import pytest

from oracle import cases, ledger, paths, profile, recorder
from oracle.errors import OracleError

REQUIRED = ["id", "mode", "shape", "inputs", "outcome", "printed", "message", "seed", "generator_version",
            "emu2_commit", "profile_version", "profile_sha256", "archive_sha256", "transcript", "capture_path",
            "files", "recorded_at"]


def fake_got(mode, shape, inputs, control=None, outcome=None):
    """What cases.run returns, for a program that prints depth = discharge / 100."""
    if control and control["expect"]["outcome"] == "observed":
        outcome, printed, sid = "observed", {}, control["expect"]["screen_id"]
    else:
        q = inputs.get("discharge", "0")
        outcome = outcome or ("timeout" if q == "hang" else "unknown_screen" if q == "odd" else "result")
        depth = {"300": "3.27", "500": "4.22"}.get(q, "9.99")
        printed, sid = ({"depth": "  %s" % depth, "area": " 59.6"}, "nd_trap_result") if outcome == "result" else ({}, None)
    rows = ["screen for %s" % json.dumps(inputs)] + [""] * 24
    files = [{"path": "QUICK2/HEC2.DAT", "sha256": hashlib.sha256(b"dat").hexdigest()}] if outcome == "result" else []
    return {"mode": mode, "shape": shape, "inputs": dict(inputs), "outcome": outcome, "printed": printed,
            "message": None, "screen_id": sid, "final": rows, "reason": None if outcome in recorder.STORED else "x",
            "transcript": [{"step": 1, "expect": "title", "keys": "{Enter}", "screen_hash_before": "a",
                            "screen_hash_after": "b", "resend": False}],
            "resends": 0, "files": files, "drive_files": {f["path"]: b"dat" for f in files},
            "screens": [{"hash": "h1", "rows": ["title"] + [""] * 24}, {"hash": "h2", "rows": rows}],
            "visited": ["title", sid] if sid else ["title"], "keys_by_screen": {"title": ["{Enter}"]}}


@pytest.fixture
def rec(tmp_path, monkeypatch):
    monkeypatch.setattr(paths, "LEDGER", tmp_path / "ledger.json")
    monkeypatch.setattr(paths, "RUNS", tmp_path / "runs")
    monkeypatch.setattr(paths, "ROOT", tmp_path)
    calls = []

    def run(prof, mode, shape, inputs, control=None, cfg=None, server_id=None, capture_all=False):
        calls.append(control["id"] if control else dict(inputs))
        return fake_got(mode, shape, inputs, control)

    monkeypatch.setattr(cases, "run", run)
    r = recorder.Recorder(recorder.Store(tmp_path / "goldens"))
    r.calls = calls
    return r


@pytest.fixture
def prof():
    return profile.load()


INPUTS = {"left_slope": "3", "right_slope": "2", "bottom_width": "10", "n": ".035", "discharge": "700",
          "slope": ".005"}


def test_controls_first_then_a_new_id(rec, prof):
    out = rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    ids = [c["id"] for c in prof["controls"]]
    assert rec.calls[:len(ids)] == ids
    assert rec.store.ids() == sorted(ids + ["nd-trap-000003"])
    assert out["case_id"] == "nd-trap-000003" and out["recorded"] is True
    again = rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    assert again["case_id"] == "nd-trap-000004"
    assert len(rec.calls) == len(ids) + 2  # controls are recorded once


def test_golden_holds_everything_requirement_7_4_lists(rec, prof):
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    g = rec.store.load("nd-trap-000003")
    assert [k for k in REQUIRED if k not in g] == []
    assert g["inputs"] == INPUTS and g["printed"]["depth"] == "  9.99"  # raw, padding kept
    assert g["profile_sha256"] == prof["_sha256"] and g["archive_sha256"] == prof["archive"]["sha256"]
    assert g["control"] is False and g["expected_screen"] is None
    obs = rec.store.load("obs-nodata-000001")
    assert obs["outcome"] == "observed" and obs["expected_screen"] == "stray_listing" and obs["printed"] == {}


def test_captures_final_screen_for_cases_and_every_screen_for_controls(rec, prof):
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    cap = rec.store.captures_dir
    assert sorted(p.name for p in (cap / "nd-trap-000003").glob("screen-*.txt")) == ["screen-00.txt"]
    assert sorted(p.name for p in (cap / "nd-trap-000001").glob("screen-*.txt")) == ["screen-00.txt", "screen-01.txt"]
    assert (cap / "nd-trap-000003" / "files" / "QUICK2" / "HEC2.DAT").read_bytes() == b"dat"
    left = [p for p in rec.store.root.rglob("*") if ".tmp" in p.name or ".old-" in p.name]
    assert left == []


@pytest.mark.parametrize("q,outcome", [("hang", "timeout"), ("odd", "unknown_screen")])
def test_timeouts_and_unknown_screens_are_never_stored(rec, prof, q, outcome):
    out = rec.create(prof, "normal_depth", "trapezoid", dict(INPUTS, discharge=q))
    assert out["outcome"] == outcome and out["recorded"] is False and out["case_id"] is None
    assert not rec.store.exists("nd-trap-000003")
    led = ledger.read()
    assert led["unanswered"] and led["unanswered"][-1]["case"]["inputs"]["discharge"] == q
    assert (len(led["unknown_screens"]) == 1) == (outcome == "unknown_screen")


def test_a_control_that_differs_stores_nothing_and_stops(rec, prof, monkeypatch):
    real = cases.run

    def wrong(p, mode, shape, inputs, control=None, **kw):
        got = real(p, mode, shape, inputs, control=control, **kw)
        if control and control["id"] == "nd-trap-000002":
            got["printed"]["depth"] = "  4.23"
        return got

    monkeypatch.setattr(cases, "run", wrong)
    with pytest.raises(OracleError) as e:
        rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    assert "harness failure" in e.value.message
    assert e.value.detail["failed"][0]["case_id"] == "nd-trap-000002"
    assert rec.store.ids() == []


def test_create_only_path_refuses_existing_ids(rec, prof):
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    with pytest.raises(OracleError) as e:
        rec.store.reserve(["nd-trap-000003"])
    assert e.value.category == "invalid_arguments"
    g = rec.store.load("nd-trap-000003")
    with pytest.raises(OracleError):
        rec.store.write(g, [["x"]], {})
    assert rec.store.load("nd-trap-000003") == g


def test_rerecord_replaces_and_logs_both_hashes(rec, prof):
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    old = rec.store.golden_sha256("nd-trap-000003")
    (rec.store.captures_dir / "nd-trap-000003" / "stale.txt").write_text("old")
    out = rec.rerecord(prof, "nd-trap-000003")
    assert out["old"] == old and out["new"] == rec.store.golden_sha256("nd-trap-000003")
    assert not (rec.store.captures_dir / "nd-trap-000003" / "stale.txt").exists()
    entry = ledger.read()["rerecords"][-1]
    assert entry["case_id"] == "nd-trap-000003" and entry["old"] == old and entry["new"] == out["new"]


def test_coverage_counts_only_result_goldens(rec, prof):
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    led = ledger.read()
    assert led["fields"]["depth"]["cases"] == 3  # two controls and one new case
    assert led["cases"]["nd-trap"]["result"] == 3 and led["cases"]["obs-nodata"]["observed"] == 1


def test_no_mcp_tool_reaches_the_replace_path():
    src = (Path(paths.ORACLE) / "tools.py").read_text(encoding="utf-8")
    src += (Path(paths.ORACLE) / "mcp_server.py").read_text(encoding="utf-8")
    assert "rerecord" not in src and "replace=True" not in src
