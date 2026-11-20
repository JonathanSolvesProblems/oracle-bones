"""Properties 5 (pacing) and 6 (resend bounds), against the stub target in a live container."""

import copy
from pathlib import Path

import pytest
from hypothesis import given, settings, HealthCheck, strategies as st

from oracle.errors import OracleError
from oracle.session import Session

STUB = (Path(__file__).parent / "stub_target.py").read_bytes()


def stub_profile(prof, retry_limit=3):
    p = copy.deepcopy(prof)
    p["screens"] = [
        {"id": "done", "kind": "other", "marker": "DONE", "unobserved": "stub"},
        {"id": "menu", "kind": "menu", "marker": "MENU", "resend": True, "unobserved": "stub"},
        {"id": "other", "kind": "menu", "marker": "OTHER", "unobserved": "stub"},
        {"id": "form", "kind": "form", "marker": "FORM",
         "prompts": [{"id": "p%d" % i, "pattern": "PROMPT %d" % i} for i in range(1, 6)],
         "unobserved": "stub"},
    ]
    p["limits"] = dict(p["limits"], retry_limit=retry_limit, wait_timeout_s=5)
    return p


def log_of(s):
    return (Path(s.drive) / "stub.log").read_text().splitlines()


@settings(max_examples=4, deadline=None, suppress_health_check=list(HealthCheck))
@given(seed=st.integers(0, 10_000), n=st.integers(2, 5))
def test_property5_inputs_wait_for_their_prompt(live, seed, n):
    prof = stub_profile(live)
    values = ["v%d" % i for i in range(1, n + 1)]
    with Session(prof, argv=["python3", "/drive/stub.py", "form", str(seed), str(n)],
                 extra_files={"stub.py": STUB}) as s:
        for i, v in enumerate(values, 1):
            s.wait_prompt("form", "p%d" % i)
            s.send(v + "{Enter}")
        final = s.wait(None, settle_ms=300, timeout_s=5)
        log = log_of(s)
    assert not [line for line in log if line.startswith("early")], log
    assert [line.split()[2] for line in log if line.startswith("got")] == values
    assert "GOT " + ",".join(values) in "\n".join(final["rows"])


@settings(max_examples=5, deadline=None, suppress_health_check=list(HealthCheck))
@given(k=st.integers(0, 5))
def test_property6_resend_bounds_on_resend_screen(live, k):
    limit = 3
    prof = stub_profile(live, retry_limit=limit)
    with Session(prof, argv=["python3", "/drive/stub.py", "menu", str(k), "yes"],
                 extra_files={"stub.py": STUB}) as s:
        s.wait(["menu"])
        if k <= limit:
            s.send("1", expect="menu")
            s.wait(["done"])
        else:
            with pytest.raises(OracleError) as e:
                s.send("1", expect="menu")
            assert e.value.category == "input_ignored" and e.value.retryable
        sent = [line for line in log_of(s) if line.startswith("key")]
        resends = [t for t in s.transcript if t["resend"]]
    assert len(sent) == min(k, limit) + 1
    assert len(resends) == min(k, limit)


def test_property6_no_resend_on_other_screens(live):
    prof = stub_profile(live)
    with Session(prof, argv=["python3", "/drive/stub.py", "menu", "2", "no"],
                 extra_files={"stub.py": STUB}) as s:
        s.wait(["other"])
        s.send("1", expect="other")
        with pytest.raises(OracleError) as e:
            s.wait(["done"], timeout_s=1.5)
        assert e.value.category == "timeout"
        sent = [line for line in log_of(s) if line.startswith("key")]
    assert len(sent) == 1
    assert not [t for t in s.transcript if t["resend"]]
