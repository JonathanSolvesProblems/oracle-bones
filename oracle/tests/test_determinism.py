"""Task 7.4: the determinism sample (Requirement 8). Property 1 runs live on a sample."""

import pytest

from oracle import cases, generator, ledger, recorder
from oracle.tests.test_recorder import INPUTS, fake_got, prof, rec  # noqa: F401  (fixtures)


def test_sample_is_every_control_and_every_twentieth_case(prof):  # noqa: F811
    control = prof["controls"][0]
    assert recorder.sampled({"id": control["id"], "control": control})
    assert recorder.sampled({"id": "nd-trap-000020"}) and recorder.sampled({"id": "nd-trap-000040"})
    assert not recorder.sampled({"id": "nd-trap-000019"}) and not recorder.sampled({"id": "nd-trap-000021"})


def test_twentieth_case_runs_twice_others_once(rec, prof):  # noqa: F811
    rec.ensure_controls(prof)
    rec.calls.clear()
    jobs = [{"id": "nd-trap-%06d" % n, "mode": "normal_depth", "shape": "trapezoid",
             "inputs": dict(INPUTS, discharge=str(n)), "control": None} for n in (19, 20, 21)]
    rec.store.reserve([j["id"] for j in jobs])
    for j in jobs:
        rec.record_job(prof, j)
    assert [c["discharge"] for c in rec.calls] == ["19", "20", "20", "21"]


def test_a_differing_second_run_is_logged_and_the_first_is_stored(rec, prof, monkeypatch):  # noqa: F811
    rec.ensure_controls(prof)
    runs_seen = []

    def flaky(p, mode, shape, inputs, control=None, **kw):
        got = fake_got(mode, shape, inputs, control)
        runs_seen.append(1)
        if len(runs_seen) == 2:
            got["printed"]["depth"] = "  9.98"
            got["files"] = [{"path": "QUICK2/HEC2.DAT", "sha256": "0" * 64}]
        return got

    monkeypatch.setattr(cases, "run", flaky)
    job = {"id": "nd-trap-000020", "mode": "normal_depth", "shape": "trapezoid", "inputs": INPUTS, "control": None}
    rec.store.reserve([job["id"]])
    out = rec.record_job(prof, job)
    assert out["recorded"] and out["determinism"] == "differs"
    assert rec.store.load("nd-trap-000020")["printed"]["depth"] == "  9.99"
    entry = ledger.read()["nondeterminism"][-1]
    assert entry["case_id"] == "nd-trap-000020"
    assert entry["first"]["printed"]["depth"] == "  9.99" and entry["second"]["printed"]["depth"] == "  9.98"
    assert entry["first"]["files"] != entry["second"]["files"]


def test_a_second_run_that_times_out_is_nondeterminism(rec, prof, monkeypatch):  # noqa: F811
    rec.ensure_controls(prof)
    n = []

    def second_hangs(p, mode, shape, inputs, control=None, **kw):
        n.append(1)
        return fake_got(mode, shape, inputs, control, outcome="timeout" if len(n) == 2 else None)

    monkeypatch.setattr(cases, "run", second_hangs)
    job = {"id": "nd-trap-000040", "mode": "normal_depth", "shape": "trapezoid", "inputs": INPUTS, "control": None}
    rec.store.reserve([job["id"]])
    assert rec.record_job(prof, job)["determinism"] == "differs"
    assert ledger.read()["nondeterminism"][-1]["second"]["outcome"] == "timeout"


def test_property_1_determinism_live(live):
    """Property 1: two runs of a case give the same outcome, raw fields and file hashes."""
    sample = generator.generate(live, seed=20261120, count=3)
    sample.append({"mode": "normal_depth", "shape": "trapezoid", "inputs": dict(INPUTS, discharge="300")})
    for c in sample:
        a = cases.run(live, c["mode"], c["shape"], c["inputs"])
        b = cases.run(live, c["mode"], c["shape"], c["inputs"])
        assert recorder.fingerprint(a) == recorder.fingerprint(b), c["inputs"]
        assert a["transcript"] == b["transcript"] or a["outcome"] not in recorder.STORED
