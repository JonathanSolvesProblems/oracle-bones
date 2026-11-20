import copy
import json

import pytest

from oracle import config, paths, profile
from oracle.errors import OracleError


def raw_profile():
    return json.loads(paths.DEFAULT_PROFILE.read_text(encoding="utf-8"))


def write(tmp_path, data):
    p = tmp_path / "p.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def test_quick2_profile_loads():
    prof = profile.load()
    assert prof["name"] == "quick2"
    assert len(prof["_sha256"]) == 64


def test_harness_config_loads():
    cfg = config.load()
    assert len(cfg["emu2"]["commit"]) == 40
    assert config.image_tag(cfg).startswith(cfg["image"] + ":")


def test_unknown_key_rejected(tmp_path):
    data = raw_profile()
    data["surprise"] = 1
    with pytest.raises(OracleError) as e:
        profile.load(write(tmp_path, data))
    assert e.value.category == "profile_invalid"


@pytest.mark.parametrize("where", ["drive", "entry", "screen", "keys"])
def test_fact_without_provenance_rejected(tmp_path, where):
    data = raw_profile()
    data[where].pop("unobserved", None)
    data[where].pop("cite", None)
    with pytest.raises(OracleError) as e:
        profile.load(write(tmp_path, data))
    assert any(where in err for err in e.value.detail["errors"])


def test_fact_with_both_cite_and_unobserved_rejected(tmp_path):
    data = raw_profile()
    data["screens"][0]["cite"] = ["obs-menudrop-000001"]
    with pytest.raises(OracleError):
        profile.load(write(tmp_path, data))


def test_screen_fact_without_provenance_rejected(tmp_path):
    data = raw_profile()
    data["screens"][0].pop("unobserved")
    with pytest.raises(OracleError):
        profile.load(write(tmp_path, data))


def test_unknown_screen_in_flow_rejected(tmp_path):
    data = raw_profile()
    data["flows"]["normal_depth/trapezoid"]["steps"][0]["expect"] = "nowhere"
    with pytest.raises(OracleError):
        profile.load(write(tmp_path, data))


def test_behaviour_case_must_be_observed(tmp_path):
    data = raw_profile()
    for c in data["controls"]:
        if c["id"].startswith("obs-"):
            c["expect"]["outcome"] = "result"
    with pytest.raises(OracleError):
        profile.load(write(tmp_path, data))


def test_spike_facts_cite_the_recorded_control_cases():
    """Task 7.6: drive layout, screen size and menu resend cite control cases, not the spike."""
    prof = profile.load()
    where = {i["profile_path"] for i in profile.unobserved(prof)}
    assert not {"drive", "screen", "screens[main_menu]"} & where
    assert "obs-nodata-000001" in prof["drive"]["cite"]
    assert "nd-trap-000001" in prof["screen"]["cite"]
    assert "obs-menudrop-000001" in profile.screen_by_id(prof, "main_menu")["cite"]


def test_every_cite_names_a_stored_golden_or_capture():
    """Requirement 6.4: a citation points at something the recorder stored."""
    cases_dir = paths.REPO_GOLDENS / "cases"
    missing = []
    for where, obj in profile.fact_paths(profile.load()):
        for c in obj.get("cite", []):
            if "/" in c:
                ok = c.startswith("oracle/goldens/captures/") and (paths.ROOT / c).is_file()
            else:
                ok = (cases_dir / ("%s.json" % c)).is_file()
            if not ok:
                missing.append((where, c))
    assert missing == []
