"""Task 7.5: parallel recording batches with one writer thread, and cases per minute."""

import threading
import time

from oracle import cases, generator, manifest, recorder
from oracle.tests.test_recorder import fake_got, prof, rec  # noqa: F401  (fixtures)


def test_batch_runs_in_parallel_and_one_thread_writes(rec, prof, monkeypatch):  # noqa: F811
    rec.ensure_controls(prof)
    running, peak, lock = [0], [0], threading.Lock()

    def slow(p, mode, shape, inputs, control=None, **kw):
        with lock:
            running[0] += 1
            peak[0] = max(peak[0], running[0])
        time.sleep(0.05)
        with lock:
            running[0] -= 1
        return fake_got(mode, shape, inputs, control)

    writers = set()
    real_write = recorder.Store.write

    def write(self, *a, **kw):
        writers.add(threading.current_thread().name)
        return real_write(self, *a, **kw)

    monkeypatch.setattr(cases, "run", slow)
    monkeypatch.setattr(recorder.Store, "write", write)
    out = rec.create_batch(prof, seed=5, count=24)
    assert out["cases_run"] == 24 and out["cases_per_minute"] > 0
    assert 1 < peak[0] <= rec.cfg["max_sessions"]
    assert writers == {"golden-writer"}
    assert manifest.check(rec.store.root) == []


def test_ids_are_fixed_before_dispatch(rec, prof):  # noqa: F811
    """Requirement 7.9: whatever order the workers finish in, each id gets the generator's inputs."""
    rec.ensure_controls(prof)
    expect = generator.generate(prof, 9, 12, existing_ids=rec.store.ids())
    out = rec.create_batch(prof, seed=9, count=12)
    assert out["recorded"] + out["timeouts"] + out["unknown_screens"] == 12
    for c in expect:
        if rec.store.exists(c["id"]):
            g = rec.store.load(c["id"])
            assert g["inputs"] == c["inputs"] and g["seed"] == 9
            assert g["generator_version"] == generator.GENERATOR_VERSION


def test_a_case_the_harness_cannot_run_is_reported_and_its_id_released(rec, prof, monkeypatch):  # noqa: F811
    rec.ensure_controls(prof)
    from oracle.errors import OracleError

    def broken(p, mode, shape, inputs, control=None, **kw):
        raise OracleError("emulator_failed", "the container ended")

    monkeypatch.setattr(cases, "run", broken)
    out = rec.create_batch(prof, seed=3, count=2)
    assert out["by_outcome"] == {"harness_error": 2} and out["recorded"] == 0
    assert rec.store.taken_ids() == rec.store.ids()


def test_recorded_batch_live(live, tmp_path):
    """A small recorded batch against the real program, into a scratch goldens directory."""
    r = recorder.Recorder(recorder.Store(tmp_path / "goldens"))
    out = r.create_batch(live, seed=20261120, count=8)
    assert out["cases_run"] == 8
    assert out["recorded"] + out["timeouts"] + out["unknown_screens"] == 8
    assert out["nondeterministic"] == 0
    assert manifest.check(r.store.root) == []
    assert out["cases_per_minute"] > 0
    print("cases per minute: %s, by outcome: %s" % (out["cases_per_minute"], out["by_outcome"]))
