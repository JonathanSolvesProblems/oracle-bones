"""Ledger: harness sections, atomic updates, and the Exhumer's sections left alone."""

import json
import threading

import pytest

from oracle import ledger, paths, profile
from oracle.errors import OracleError


@pytest.fixture(autouse=True)
def tmp_ledger(tmp_path, monkeypatch):
    monkeypatch.setattr(paths, "LEDGER", tmp_path / "results" / "ledger.json")
    return paths.LEDGER


def test_empty_ledger_has_every_section():
    led = ledger.read()
    for k in ledger.HARNESS_SECTIONS + ledger.EXHUMER_SECTIONS:
        assert k in led


def test_harness_cannot_touch_exhumer_sections(tmp_ledger):
    def exhumer_writes(led):
        led["decisions"].append({"t": 1, "chose": "run_case"})
        led["fields"]["depth"] = {"understood": True}
        led["screens"]["main_menu"] = {"visits": 0, "keys_untried": ["F1"]}
    tmp_ledger.parent.mkdir(parents=True, exist_ok=True)
    led = ledger.empty()
    exhumer_writes(led)
    tmp_ledger.write_text(json.dumps(led))
    ledger.record_run(["main_menu"], {"main_menu": ["literal"]})
    ledger.set_coverage({"depth": 3}, {"nd-trap": {"result": 3}})
    after = ledger.read()
    assert after["decisions"] == [{"t": 1, "chose": "run_case"}]
    assert after["fields"]["depth"] == {"understood": True, "cases": 3}
    assert after["screens"]["main_menu"]["keys_untried"] == ["F1"]
    assert after["screens"]["main_menu"]["visits"] == 1
    with pytest.raises(OracleError):
        ledger.update(lambda led: led["open_questions"].append("not mine"))


def test_concurrent_updates_are_not_lost():
    def bump():
        for _ in range(10):
            ledger.record_run(["title"], {})
    threads = [threading.Thread(target=bump) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert ledger.read()["screens"]["title"]["visits"] == 40


def test_coverage_counts_only_what_was_stored():
    prof = profile.load()
    ledger.set_coverage({"depth": 2, "area": 2}, {})
    ledger.set_unobserved(profile.unobserved(prof))
    cov = ledger.coverage(profile=prof)
    assert "depth" not in cov["unexercised_fields"]
    assert "froude" in cov["unexercised_fields"]
    assert cov["unobserved_profile_facts"]


def test_mismatch_status_kept():
    ledger.set_mismatches({"depth": 4}, "run1")
    ledger.set_mismatches({"area": 1}, "run2")
    led = ledger.read()
    assert led["mismatches"]["depth"]["count"] == 0
    assert led["mismatches"]["area"] == {"status": "untriaged", "count": 1, "last_run": "run2"}
    assert ledger.coverage()["untriaged_mismatches"] == ["area"]
