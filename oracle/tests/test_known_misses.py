"""results/known-misses.json is exactly the comparator's misses on the full set: a new miss fails
this test, and so does a listed miss that has gone away. Offline: it reads the committed goldens
and runs the configured node rebuild; it starts no container and never writes the ledger."""
import json

from oracle import compare, paths
from oracle.recorder import Store

KNOWN = paths.ROOT / "results" / "known-misses.json"


def known():
    return json.loads(KNOWN.read_text(encoding="utf-8"))["classes"]


def test_each_case_is_in_one_class_with_its_fields():
    seen = {}
    for c in known():
        assert c["id"] and c["what"].strip(), c
        assert c["cases"], c["id"]
        for case_id, fields in c["cases"].items():
            assert case_id not in seen, "%s is in %s and %s" % (case_id, seen.get(case_id), c["id"])
            seen[case_id] = c["id"]
            assert fields and fields == sorted(set(fields)), (case_id, fields)


def test_full_set_misses_are_exactly_the_known_list(tmp_path):
    report = tmp_path / "mismatches.json"
    out = compare.run("full", store=Store(paths.REPO_GOLDENS), mismatches_path=report, write_ledger=False)
    assert out["exit_code"] in (0, 1), out
    got = sorted({(m["case_id"], m["field"] or m["kind"]) for m in json.loads(report.read_text(encoding="utf-8"))})
    want = sorted((case_id, f) for c in known() for case_id, fields in c["cases"].items() for f in fields)
    new = [x for x in got if x not in want]
    gone = [x for x in want if x not in got]
    assert not new and not gone, {"new misses": new, "listed but gone": gone}


def test_each_difference_class_has_its_limits_entry():
    text = (paths.ROOT / "results" / "hauntings.md").read_text(encoding="utf-8")
    limits = text[text.index("\n# Limits\n"):]
    for c in known():
        if c["limits"] is not None:
            assert "\n### %s\n" % c["limits"] in limits, c["id"]
