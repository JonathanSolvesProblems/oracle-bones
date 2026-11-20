"""Screen identification, raw fields and prompts, on saved captures. No Docker needed."""

from pathlib import Path

from oracle import profile, screen
from oracle.profile import screen_by_id

CAPS = Path(__file__).parent / "captures" / "quick2"


def rows(name):
    return (CAPS / name).read_text(encoding="utf-8").rstrip("\n").split("\n")


def test_result_screen_identified_before_form():
    prof = profile.load()
    sid, matches = screen.identify(prof, rows("trap_result_300.txt"))
    assert sid == "nd_trap_result"
    assert "nd_trap_form" in matches


def test_fields_are_raw_strings():
    prof = profile.load()
    f = screen.fields(screen_by_id(prof, "nd_trap_result"), rows("trap_result_300.txt"))
    assert f["depth"].strip() == "3.27" and f["depth"] != "3.27"
    assert f["area"].strip() == "59.6"
    assert f["wet_perimeter"].strip() == "27.7"
    assert f["velocity"].strip() == "5.0"
    assert f["hyd_radius"].strip() == "2.2"
    assert f["top_width"].strip() == "26.4"
    assert f["froude"].strip() == "0.6"
    assert f["flow_type"].strip() == "SUBCRITICAL"
    assert f["in_n"].strip() == "0.0350"
    assert all(isinstance(v, str) for v in f.values())


def test_screens_of_a_run_are_known():
    """Captures taken right after a send can be mid-repaint; the screens waited on are known."""
    prof = profile.load()
    ids = {screen.identify(prof, rows(c.name))[0] for c in sorted(CAPS.glob("run300-*.txt"))}
    assert {"title", "main_menu", "shape_menu", "nd_trap_form", "nd_trap_result"} <= ids


def test_prompt_needs_settled_screen():
    prof = profile.load()
    form = screen_by_id(prof, "nd_trap_form")
    caps = [rows(c.name) for c in sorted(CAPS.glob("run300-*.txt"))]
    first = next(r for r in caps if "Enter Left Side Slope" in "\n".join(r))
    assert screen.prompt(form, first, quiet_ms=500, settle_ms=150)["id"] == "left_slope"
    assert screen.prompt(form, first, quiet_ms=10, settle_ms=150) is None


def test_unknown_screen():
    prof = profile.load()
    desc = screen.describe(prof, {"rows": ["nothing here"] * 25, "hash": "x", "cursor": {"row": 0, "col": 0}})
    assert desc["unknown"] and desc["screen_id"] is None and desc["fields"] == {}


def test_hash_is_of_rows_joined():
    r = rows("trap_result_300.txt")
    assert screen.hash_rows(r) == screen.hash_rows(list(r))
    assert screen.hash_rows(r) != screen.hash_rows(r[:-1] + [r[-1] + "x"])
