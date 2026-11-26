"""The coverage ledger, results/ledger.json.

The harness writes its own sections through update(), which takes a file lock, reads the
current file, applies a change, and replaces the file atomically. It never changes the
Exhumer's sections: open_questions, decisions, stopped, each field's `understood`, each
screen's `keys_untried`, and each mismatch's triage (`status`, `classification`, `why`,
`evidence`).

The Exhumer writes those sections through update_exhumer(), under the same lock, and it never
changes a harness section. The ledger_write MCP tool is its only caller.
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


# Keys the Exhumer owns inside harness sections.
EXHUMER_KEYS = {
    "fields": ("understood", "understood_evidence"),
    "screens": ("keys_untried",),
    "mismatches": ("status", "classification", "why", "evidence"),
}


def _exhumer_view(led):
    """Everything in the ledger the harness must not change."""
    view = {"sections": {k: led.get(k) for k in EXHUMER_SECTIONS}}
    for section, keys in EXHUMER_KEYS.items():
        view[section] = {}
        for name, entry in led.get(section, {}).items():
            mine = {k: entry[k] for k in keys if k in entry}
            if section == "mismatches" and mine.get("status") == "untriaged":
                del mine["status"]  # the harness sets the starting status
            if mine:
                view[section][name] = mine
    return view


def _harness_view(led):
    """Everything in the ledger the Exhumer must not change."""
    view = {}
    for k in HARNESS_SECTIONS:
        value = copy.deepcopy(led.get(k))
        if k in EXHUMER_KEYS:
            stripped = {}
            for name, entry in (value or {}).items():
                rest = {f: v for f, v in entry.items() if f not in EXHUMER_KEYS[k]}
                if rest:
                    stripped[name] = rest
            value = stripped
        view[k] = value
    return view


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
        return _write(led)


def update_exhumer(change):
    """Apply change(ledger) to the Exhumer's sections, atomically. The only way ledger_write
    writes, so the ledger keeps one writer module and one lock."""
    with _lock():
        led = read()
        before = _harness_view(led)
        result = change(led)
        if _harness_view(led) != before:
            raise OracleError("internal", "an Exhumer ledger update tried to change a harness section")
        _write(led)
        return result


def _write(led):
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
            entry = led["screens"].setdefault(sid, {})
            entry["visits"] = entry.get("visits", 0) + 1
            entry.setdefault("keys_tried", [])
        for sid, ks in keys_by_screen.items():
            entry = led["screens"].setdefault(sid, {})
            entry.setdefault("visits", 0)
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


# ---- Exhumer writers (exhume-loop Requirement 2), called only by the ledger_write tool -----

def _append_decision(led, saw, chose, why, evidence):
    n = max([d.get("n", 0) for d in led["decisions"]] + [0]) + 1
    entry = {"n": n, "saw": saw, "chose": chose, "why": why, "evidence": list(evidence), "at": _now()}
    led["decisions"].append(entry)
    return entry


def decide(saw, chose, why, evidence):
    def change(led):
        led["stopped"] = None  # a decision after a stop means a new run has begun
        return _append_decision(led, saw, chose, why, evidence)
    return update_exhumer(change)


def ask(question, evidence):
    def change(led):
        n = max([int(q["id"][2:]) for q in led["open_questions"]] + [0]) + 1
        entry = {"id": "Q-%03d" % n, "question": question, "evidence": list(evidence), "status": "open",
                 "asked_at": _now(), "answer": None, "answer_evidence": [], "answered_at": None}
        led["open_questions"].append(entry)
        return entry
    return update_exhumer(change)


def answer(question_id, text, evidence):
    def change(led):
        q = next((q for q in led["open_questions"] if q["id"] == question_id), None)
        if q is None:
            raise OracleError("invalid_arguments", "no open question %s" % question_id,
                              {"open": [x["id"] for x in led["open_questions"] if x["status"] == "open"]})
        if q["status"] != "open":
            raise OracleError("invalid_arguments", "question %s is already answered" % question_id)
        q.update({"status": "answered", "answer": text, "answer_evidence": list(evidence),
                  "answered_at": _now()})
        return q
    return update_exhumer(change)


def stop(why, profile=None):
    """Record a stop with the coverage report computed now, from the ledger alone."""
    def change(led):
        d = _append_decision(led, why, "stop", why, [])
        led["stopped"] = {"why": why, "decision": d["n"], "at": d["at"], "coverage": coverage(led, profile)}
        return led["stopped"]
    return update_exhumer(change)


def set_understood(field, value, evidence):
    def change(led):
        entry = led["fields"].setdefault(field, {})
        entry["understood"] = bool(value)
        entry["understood_evidence"] = list(evidence)
        return {"field": field, "understood": entry["understood"], "evidence": entry["understood_evidence"]}
    return update_exhumer(change)


def set_keys_untried(screen, keys):
    def change(led):
        entry = led["screens"].setdefault(screen, {})
        entry["keys_untried"] = list(keys)
        return {"screen": screen, "keys_untried": entry["keys_untried"]}
    return update_exhumer(change)


def triage(field, classification, status, why, evidence):
    def change(led):
        entry = led["mismatches"].get(field)
        if entry is None:
            raise OracleError("invalid_arguments", "no mismatch entry for field %s" % field,
                              {"fields": sorted(led["mismatches"])})
        entry.update({"status": status, "classification": classification, "why": why,
                      "evidence": list(evidence)})
        return dict(entry, field=field)
    return update_exhumer(change)


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
