"""Property 4 (exhume-loop): a profile change must read every stored golden as stored.

Runs on the committed goldens, without Docker.
"""

import copy
import json
import types

import pytest

from oracle import paths, profile, reread
from oracle.errors import OracleError
from oracle.recorder import Store
from oracle.tools import Oracle

STORE = Store(paths.REPO_GOLDENS)


def base():
    return json.loads(paths.DEFAULT_PROFILE.read_text(encoding="utf-8"))


def load(tmp_path, data, name="p.json"):
    p = tmp_path / name
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return profile.load(p)


def screen(data, sid):
    return next(s for s in data["screens"] if s["id"] == sid)


def printing(field, shape="trapezoid"):
    """Stored goldens of this shape that are not behaviour cases and printed this field."""
    return {g["id"] for g in STORE.all()
            if g["outcome"] != "observed" and g["shape"] == shape and field in g["printed"]}


def final_shows(text):
    return {g["id"] for g in STORE.all() if text in "\n".join(reread.final_rows(STORE, g["id"]))}


def test_current_profile_reads_every_golden_as_stored():
    assert STORE.ids()
    assert reread.differences(profile.load(), STORE) == []


def test_screens_added_after_the_others_pass(tmp_path):
    data = base()
    data["screens"].append({"id": "new_screen", "kind": "other", "marker": "NORMAL\\s+DEPTH",
                            "unobserved": "test"})
    assert reread.differences(load(tmp_path, data), STORE) == []


def test_help_screen_ahead_of_the_main_menu_passes(tmp_path):
    data = base()
    i = data["screens"].index(screen(data, "main_menu"))
    data["screens"].insert(i, {"id": "main_help", "kind": "other", "marker": "MAIN MENU HELP SCREEN",
                               "unobserved": "test"})
    assert reread.differences(load(tmp_path, data), STORE) == []


def test_a_shifted_field_region_fails_on_the_goldens_that_printed_it(tmp_path):
    data = base()
    depth = next(f for f in screen(data, "nd_trap_result")["fields"] if f["name"] == "depth")
    depth["col"] += 1
    diffs = reread.differences(load(tmp_path, data), STORE)
    assert {d["case_id"] for d in diffs} == printing("depth") >= {"nd-trap-000001", "nd-trap-000002"}
    assert {d["what"] for d in diffs} == {"printed"}


def test_a_screen_moved_ahead_of_a_goldens_screen_fails(tmp_path):
    data = base()
    data["screens"].insert(0, {"id": "thief", "kind": "other", "marker": "TRAPEZOIDAL CHANNEL",
                               "unobserved": "test"})
    diffs = reread.differences(load(tmp_path, data), STORE)
    assert {d["case_id"] for d in diffs} == final_shows("TRAPEZOIDAL CHANNEL") >= {"nd-trap-000001", "nd-trap-000002"}
    assert any(d["what"] == "outcome" and d["reread"] == "unknown_screen" for d in diffs)
    data = base()
    data["screens"].insert(0, {"id": "thief", "kind": "other", "marker": "MAIN\\s+MENU", "unobserved": "test"})
    diffs = reread.differences(load(tmp_path, data, "q.json"), STORE)
    assert {(d["case_id"], d["what"]) for d in diffs} == {("obs-menudrop-000001", "screen_id")}


def test_a_removed_screen_fails(tmp_path):
    data = base()
    data["screens"] = [s for s in data["screens"] if s["id"] != "stray_listing"]
    data["controls"] = [c for c in data["controls"] if c["id"] != "obs-nodata-000001"]
    diffs = reread.differences(load(tmp_path, data), STORE)
    assert {(d["case_id"], d["what"]) for d in diffs} == {("obs-nodata-000001", "screen_id")}


def test_tools_refuse_to_run_until_the_profile_reads_the_goldens(tmp_path):
    good = load(tmp_path, base(), "good.json")
    bad_data = base()
    next(f for f in screen(bad_data, "nd_trap_result")["fields"] if f["name"] == "area")["width"] += 2
    bad = load(tmp_path, bad_data, "bad.json")
    o = Oracle.__new__(Oracle)
    o.recorder = types.SimpleNamespace(store=STORE)
    o.default_profile = bad["_path"]
    with pytest.raises(OracleError) as e:
        o._running_profile()
    assert e.value.category == "profile_invalid"
    assert {d["case_id"] for d in e.value.detail["differences"]} == printing("area")
    out = o.call("run_case", {"mode": "normal_depth", "shape": "trapezoid", "inputs": {}})
    assert out["error"]["category"] == "profile_invalid"
    o.default_profile = good["_path"]
    assert o._running_profile()["_sha256"] == good["_sha256"]
    assert o._reread_sha == good["_sha256"]
