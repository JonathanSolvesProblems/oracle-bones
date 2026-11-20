"""Task 7.7, Property 2: a replay of a stored golden gives the stored outcome, raw fields and
file hashes, and writes nothing under oracle/goldens/."""

import hashlib
import random

from oracle import cases, manifest, paths, recorder
from oracle.tests.test_recorder import INPUTS, fake_got, prof, rec  # noqa: F401  (fixtures)

SAMPLE = 5


def tree(root):
    """Every path under root with its sha256 and modification time."""
    return {p.relative_to(root).as_posix(): (hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns)
            if p.is_file() else None for p in root.rglob("*")} if root.exists() else {}


def test_replay_matches_and_writes_nothing(rec, prof):  # noqa: F811
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)
    before = tree(rec.store.root)
    for cid in rec.store.ids():
        r = rec.replay(prof, cid)
        assert r["match"], r
    assert tree(rec.store.root) == before


def test_replay_reports_a_changed_answer(rec, prof, monkeypatch):  # noqa: F811
    rec.create(prof, "normal_depth", "trapezoid", INPUTS)

    def drifted(p, mode, shape, inputs, control=None, **kw):
        got = fake_got(mode, shape, inputs, control)
        if got["outcome"] == "result":
            got["printed"]["area"] = " 59.4"
        return got

    monkeypatch.setattr(cases, "run", drifted)
    r = rec.replay(prof, "nd-trap-000003")
    assert not r["match"]
    assert r["differences"][0]["what"] == "printed"
    assert r["differences"][0]["golden"]["area"] == " 59.6" and r["differences"][0]["replay"]["area"] == " 59.4"


def test_property_2_replay_live(live):
    """Replays a seeded sample of the committed goldens against the real program."""
    store = recorder.Store(paths.REPO_GOLDENS)
    ids = store.ids()
    assert ids, "no goldens recorded yet"
    sample = sorted(random.Random(20261120).sample(ids, min(SAMPLE, len(ids))))
    before = tree(store.root)
    rec = recorder.Recorder(store)
    results = [rec.replay(live, cid) for cid in sample]
    assert [r for r in results if not r["match"]] == []
    assert tree(store.root) == before
    assert manifest.check(store.root) == []
