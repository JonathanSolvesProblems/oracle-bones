"""Property 4: every control case gives the outcome the profile expects. These gate every full run."""

import copy

import pytest

from oracle import cases, profile

IDS = [c["id"] for c in profile.load()["controls"]]


@pytest.mark.parametrize("cid", IDS)
def test_control_case(live, cid):
    c = cases.control_by_id(live, cid)
    got = cases.run(live, c["mode"], c["shape"], c["inputs"], control=c)
    assert cases.check_control(live, c, got) == [], got.get("reason")


def test_nodata_case_fails_when_data_exists(live):
    """A behaviour case must be able to fail: with QUICK2/DATA present there is no stray listing."""
    c = copy.deepcopy(cases.control_by_id(live, "obs-nodata-000001"))
    c.pop("setup")
    got = cases.run(live, c["mode"], c["shape"], c["inputs"], control=c)
    assert cases.check_control(live, c, got) != []
    assert any(f["path"].upper() == "QUICK2/DATA/TEST.XSC" for f in got["files"])
