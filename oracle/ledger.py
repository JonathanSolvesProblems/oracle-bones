"""The coverage ledger, results/ledger.json.

The harness writes its own sections through update(), which takes a file lock, reads the
current file, applies a change, and replaces the file atomically. It never changes the
Exhumer's sections: open_questions, decisions, stopped, each field's `understood`, each
screen's `keys_untried`, and each mismatch's `status`.
"""

import copy
import json
import os
import time
from contextlib import contextmanager

from . import paths
from .errors import OracleError

HARNESS_SECTIONS = ("screens", "fields", "cases", "unanswered", "unknown_screens", "nondeterminism",
                    "rerecords", "mismatches", "unobserved", "harness_findings")
EXHUMER_SECTIONS = ("open_questions", "decisions", "stopped")
LIST_CAP = 500  # keep the newest entries of long lists, so the file stays readable


def empty():
    return {
        "screens": {}, "fields": {}, "cases": {}, "unanswered": [], "unknown_screens": [],
        "nondeterminism": [], "rerecords": [], "mismatches": {}, "unobserved": [],
        "harness_findings": {"lpt1_to_file": None, "menu_drop_cause": None, "frozen_time": None},
        "open_questions": [], "decisions": [], "stopped": None,
    }


def path():
    return paths.LEDGER


def read():
    p = path()
    if not p.exists():
        return empty()
    data = json.loads(p.read_text(encoding="utf-8"))
    base = empty()
    base.update(data)
    return base


def _exhumer_view(led):
    """Everything in the ledger the harness must not change."""
    return {
        "sections": {k: led.get(k) for k in EXHUMER_SECTIONS},
        "understood": {k: v.get("understood") for k, v in led.get("fields", {}).items() if "understood" in v},
        "keys_untried": {k: v.get("keys_untried") for k, v in led.get("screens", {}).items() if "keys_untried" in v},
        "status": {k: v.get("status") for k, v in led.get("mismatches", {}).items()
                   if v.get("status") not in (None, "untriaged")},
    }


@contextmanager
def _lock(timeout_s=30):
    lock = path().with_suffix(".lock")
    lock.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + timeout_s
    while True:
        try:
            fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except (FileExistsError, PermissionError):
            # On Windows a lock file that another writer is deleting raises PermissionError.
            try:
                if time.time() - lock.stat().st_mtime > 120:  # left by a crashed writer
                    lock.unlink()
                    continue
            except (FileNotFoundError, PermissionError):
                pass
            if time.monotonic() > deadline:
                raise OracleError("internal", "the ledger is locked: %s" % lock)
            time.sleep(0.05)
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        _retry(lock.unlink, FileNotFoundError)


def _retry(fn, ignore=(), tries=100):
    """Windows refuses to delete or replace a file another thread has open for a moment."""
    for i in range(tries):
        try:
            return fn()
        except ignore:
            return None
        except PermissionError:
            if i == tries - 1:
                raise
            time.sleep(0.02)


def update(change):
    """Apply change(ledger) to the harness's sections, atomically."""
    with _lock():
        led = read()
        before = copy.deepcopy(_exhumer_view(led))
        change(led)
        if _exhumer_view(led) != before:
            raise OracleError("internal", "a harness ledger update tried to change the Exhumer's sections")
        for key in ("unanswered", "unknown_screens", "nondeterminism", "rerecords"):
            led[key] = led[key][-LIST_CAP:]
        p = path()
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(led, indent=2, sort_keys=False) + "\n", encoding="utf-8", newline="\n")
        _retry(lambda: os.replace(tmp, p))
        return led


# ---- harness writers ---------------------------------------------------------------------

def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def record_run(screens_seen, keys_by_screen):
    """Screens the harness observed in one run, and the keys it sent on each."""
    def change(led):
        for sid in screens_seen:
            led["screens"].setdefault(sid, {"visits": 0, "keys_tried": []})["visits"] += 1
        for sid, ks in keys_by_screen.items():
            entry = led["screens"].setdefault(sid, {"visits": 0, "keys_tried": []})
            entry.setdefault("keys_tried", [])
            for k in ks:
                if k not in entry["keys_tried"]:
                    entry["keys_tried"].append(k)
    return update(change)


def log_unanswered(run_id, case, reason, waited_for, capture):
    return update(lambda led: led["unanswered"].append(
        {"run_id": run_id, "case": case, "reason": reason, "waited_for": waited_for, "capture": capture,
         "at": _now()}))


def log_unknown_screen(run_id, screen_hash, capture):
    return update(lambda led: led["unknown_screens"].append(
        {"run_id": run_id, "hash": screen_hash, "capture": capture, "at": _now()}))


def log_nondeterminism(case_id, first, second):
    return update(lambda led: led["nondeterminism"].append(
        {"case_id": case_id, "first": first, "second": second, "at": _now()}))


def log_rerecord(case_id, old, new):
    return update(lambda led: led["rerecords"].append({"case_id": case_id, "old": old, "new": new, "at": _now()}))


def set_unobserved(items):
    def change(led):
        led["unobserved"] = items
    return update(change)


def set_finding(key, value):
    def change(led):
        led["harness_findings"][key] = value
    return update(change)


def set_coverage(fields_counts, case_counts):
    """Coverage from stored goldens only: fields seen in `result` goldens, cases by outcome."""
    def change(led):
        for name, n in fields_counts.items():
            led["fields"].setdefault(name, {})["cases"] = n
        for name, entry in led["fields"].items():
            if name not in fields_counts:
                entry["cases"] = 0
        led["cases"] = case_counts
    return update(change)


def set_mismatches(by_field, run_at):
    def change(led):
        for name, entry in led["mismatches"].items():
            if name not in by_field:
                entry["count"] = 0
        for name, n in by_field.items():
            entry = led["mismatches"].setdefault(name, {"status": "untriaged"})
            entry["count"] = n
            entry["last_run"] = run_at
            entry.setdefault("status", "untriaged")
    return update(change)


# ---- coverage report (Requirement 13.5) --------------------------------------------------

def coverage(led=None, profile=None):
    led = led or read()
    fields_known = set()
    if profile:
        for s in profile["screens"]:
            fields_known |= {f["name"] for f in s.get("fields", [])}
    fields_known |= set(led["fields"])
    return {
        "unexercised_fields": sorted(n for n in fields_known if led["fields"].get(n, {}).get("cases", 0) == 0),
        "untried_keys": {sid: s["keys_untried"] for sid, s in led["screens"].items() if s.get("keys_untried")},
        "unobserved_profile_facts": led["unobserved"],
        "untriaged_mismatches": sorted(n for n, m in led["mismatches"].items()
                                       if m.get("count", 0) and m.get("status", "untriaged") == "untriaged"),
        "unanswered_runs": len(led["unanswered"]),
        "unknown_screens": len(led["unknown_screens"]),
        "nondeterministic_cases": len(led["nondeterminism"]),
    }
