"""The comparator (task 8): Properties 8, 9 and 10, exit codes, and the quick set.
Runs on the committed goldens and a stub rebuild, without Docker.
"""
import copy
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from hypothesis import HealthCheck, given, settings, strategies as st

from oracle import compare, config, manifest, paths, profile
from oracle.recorder import Store

STORE = Store(paths.REPO_GOLDENS)
PROFILE = profile.load()
STUB = Path(__file__).parent / "stub_rebuild.py"
GRADED = [g for g in STORE.all() if g["outcome"] != "observed"]  # the full set, in request order


def answers(tmp_path, change=None):
    data = {g["id"]: {"outcome": g["outcome"], "printed": dict(g["printed"]), "message": g["message"]}
            for g in GRADED}
    if change:
        change(data)
    p = tmp_path / "answers.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def cfg(limit=25):
    c = copy.deepcopy(config.load())
    c["rebuild"]["time_limit_s"] = limit
    return c


def run(tmp_path, *stub_args, which="full", limit=25, change=None, store=STORE, quickset=None):
    cmd = [sys.executable, str(STUB), str(answers(tmp_path, change))] + [str(a) for a in stub_args]
    return compare.run(which, cfg=cfg(limit), profile=PROFILE, store=store, command=cmd,
                       quickset_path=quickset, mismatches_path=tmp_path / "mismatches.json", write_ledger=False)


def mismatches(tmp_path):
    return json.loads((tmp_path / "mismatches.json").read_text(encoding="utf-8"))


# ---- exit codes -----------------------------------------------------------------------

def test_a_rebuild_that_prints_what_the_oracle_printed_matches(tmp_path):
    out = run(tmp_path, "answer")
    assert out["exit_code"] == 0 and out["total"] == len(GRADED) == out["matched"]
    assert mismatches(tmp_path) == []  # rewritten as an empty list
    assert all(g["outcome"] != "observed" for g in GRADED) and len(GRADED) < len(STORE.ids())


def test_value_missing_extra_and_outcome_mismatches(tmp_path):
    a, b, c, d = [g["id"] for g in GRADED[:4]]

    def change(data):
        field = sorted(data[a]["printed"])[0]
        data[a]["printed"][field] = "x" + data[a]["printed"][field]
        data[b]["printed"].pop(sorted(data[b]["printed"])[0])
        data[c]["printed"]["made_up"] = "1"
        data[d]["outcome"] = "error"
    out = run(tmp_path, "answer", change=change)
    assert out["exit_code"] == 1
    kinds = {(m["case_id"], m["kind"]) for m in mismatches(tmp_path)}
    assert kinds == {(a, "value"), (b, "missing_field"), (c, "extra_field"), (d, "outcome")}
    assert out["by_kind"] == {"value": 1, "missing_field": 1, "extra_field": 1, "outcome": 1}
    assert out["by_field"]["made_up"] == 1 and out["by_field"]["outcome"] == 1
    assert out["matched"] == len(GRADED) - 4


def test_no_rebuild_command_no_quickset_and_a_failed_golden_check_exit_4(tmp_path):
    (tmp_path / "mismatches.json").write_text("[\"stale\"]")
    c = cfg()
    c["rebuild"]["command"] = None
    out = compare.run("full", cfg=c, profile=PROFILE, store=STORE, mismatches_path=tmp_path / "mismatches.json",
                      write_ledger=False)
    assert out["exit_code"] == 4 and "rebuild command" in out["note"]
    assert not (tmp_path / "mismatches.json").exists()  # a stale report is never read as this run's
    out = run(tmp_path, "answer", which="quick", quickset=tmp_path / "none.json")
    assert out["exit_code"] == 4 and out["category"] == "invalid_arguments"
    copy_root = tmp_path / "goldens"
    shutil.copytree(STORE.root, copy_root)
    g = copy_root / "cases" / "nd-trap-000001.json"
    g.write_text(g.read_text(encoding="utf-8").replace("3.27", "3.28"), encoding="utf-8")
    out = run(tmp_path, "answer", store=Store(copy_root))
    assert out["exit_code"] == 4 and out["category"] == "golden_check_failed"
    assert any("cases/nd-trap-000001.json" in p for p in out["problems"])


# ---- Property 9: trimmed comparison ---------------------------------------------------

SPACES = st.text(alphabet=" ", max_size=3)
TEXT = st.text(alphabet="0123456789.-* ", min_size=1, max_size=8).map(str.strip).filter(bool)


@given(text=TEXT, a=SPACES, b=SPACES, c=SPACES, d=SPACES)
def test_property_9_padding_never_matters_for_trimmed_fields_and_always_for_raw(text, a, b, c, d):
    golden = {"id": "x", "outcome": "result", "printed": {"f": a + text + b}}
    reply = {"outcome": "result", "printed": {"f": c + text + d}}
    assert compare.compare_one(golden, reply) == []
    raw = compare.compare_one(golden, reply, raw={"f"})
    assert (raw == []) == (a + text + b == c + text + d)


@pytest.mark.parametrize("oracle,rebuild", [("3.27", "3.270"), ("3.27", "03.27"), ("****", "1000.0"),
                                            ("1E+03", "1000")])
def test_no_text_is_parsed_as_a_number(oracle, rebuild):
    golden = {"id": "x", "outcome": "result", "printed": {"f": oracle}}
    assert [m["kind"] for m in compare.compare_one(golden, {"outcome": "result", "printed": {"f": rebuild}})] == ["value"]


# ---- Property 10: rebuild failure -----------------------------------------------------

@settings(max_examples=12, deadline=None, suppress_health_check=list(HealthCheck))
@given(mode=st.sampled_from(["crash", "badjson", "unknown", "hang"]), k=st.integers(0, len(GRADED) - 1))
def test_property_10_every_case_after_the_kth_is_a_rebuild_error(tmp_path_factory, mode, k):
    tmp_path = tmp_path_factory.mktemp("p10")
    out = run(tmp_path, mode, k, limit=3)
    assert out["exit_code"] == 3, out
    errors = {m["case_id"] for m in mismatches(tmp_path) if m["kind"] == "rebuild_error"}
    assert errors == {g["id"] for g in GRADED[k:]}
    assert out["matched"] == k


def test_a_crash_outranks_plain_mismatches(tmp_path):
    def change(data):
        data[GRADED[0]["id"]]["outcome"] = "error"
    out = run(tmp_path, "crash", len(GRADED) - 1, change=change)
    assert out["exit_code"] == 3
    assert {m["kind"] for m in mismatches(tmp_path)} == {"outcome", "rebuild_error"}


# ---- Property 8: manifest integrity ---------------------------------------------------

@settings(max_examples=15, deadline=None, suppress_health_check=list(HealthCheck))
@given(what=st.sampled_from(["change", "add", "delete"]), pick=st.integers(0, 10_000))
def test_property_8_any_one_edit_outside_the_runner_fails_the_check(tmp_path_factory, what, pick):
    root = tmp_path_factory.mktemp("p8") / "goldens"
    shutil.copytree(STORE.root, root)
    assert manifest.check(root) == []
    files = sorted(p for p in root.rglob("*") if p.is_file() and p.name != manifest.NAME)
    target = files[pick % len(files)]
    if what == "change":
        target.write_bytes(target.read_bytes() + b" ")
    elif what == "add":
        (target.parent / "typed-by-hand.txt").write_text("1")
    else:
        target.unlink()
    assert manifest.check(root) != []


def test_check_goldens_script_prints_the_limit_on_a_pass():
    r = subprocess.run([sys.executable, str(paths.ROOT / "scripts" / "check_goldens.py")],
                       capture_output=True, text=True, env=dict(__import__("os").environ, ORACLE_GOLDENS=str(STORE.root)))
    assert r.returncode == 0, r.stderr
    assert compare.LIMIT in r.stdout


# ---- the quick set (task 8.4) ---------------------------------------------------------

def test_quickset_holds_controls_and_a_spread_and_never_an_observed_golden():
    qs = compare.build_quickset(PROFILE, STORE)
    ids = set(qs["cases"])
    stored = {g["id"]: g for g in STORE.all()}
    assert {"nd-trap-000001", "nd-trap-000002"} <= ids
    assert not any(stored[c]["outcome"] == "observed" for c in ids)
    assert not any(c.startswith("obs-") for c in ids)
    assert qs["count"] == len(ids) == min(compare.QUICK_SIZE, len(GRADED))
    covered = {"%s/%s" % (g["mode"], g["shape"]) for g in GRADED}
    assert {u["pair"] for u in qs["uncovered"]} == set(compare.all_pairs(PROFILE)) - covered
    assert compare.build_quickset(PROFILE, STORE) == qs  # seeded


def test_the_spread_is_even_when_goldens_exceed_the_size():
    qs = compare.build_quickset(PROFILE, STORE, size=4)
    assert qs["cases"][:2] == ["nd-trap-000001", "nd-trap-000002"] or \
        {"nd-trap-000001", "nd-trap-000002"} <= set(qs["cases"])
    assert qs["by_pair"] == {"normal_depth/irregular": 1, "normal_depth/trapezoid": 3}


def test_committed_quickset_is_current():
    committed = json.loads(compare.QUICKSET.read_text(encoding="utf-8"))
    assert committed == compare.build_quickset(PROFILE, STORE, seed=committed["seed"])
