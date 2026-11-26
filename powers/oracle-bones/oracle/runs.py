"""Exploratory runs: run a case, log everything under oracle/out/runs/<run-id>/, update the ledger.

Nothing here writes under oracle/goldens/. Recording is the recorder's job.
"""

import hashlib
import json
import time
import uuid
from pathlib import Path

from . import cases, ledger, paths
from . import profile as profile_mod

SCREEN_FILE = "screen-%02d.txt"


def new_run_id():
    return time.strftime("%Y%m%d-%H%M%S", time.gmtime()) + "-" + uuid.uuid4().hex[:6]


def write_run_log(run_id, got, extra=None):
    d = paths.RUNS / run_id
    (d / "files").mkdir(parents=True, exist_ok=True)
    (d / "final.txt").write_text("\n".join(got.get("final", [])) + "\n", encoding="utf-8", newline="\n")
    for i, scr in enumerate(got.get("screens", [])):
        (d / (SCREEN_FILE % i)).write_text("\n".join(scr["rows"]) + "\n", encoding="utf-8", newline="\n")
    for rel, data in got.get("drive_files", {}).items():
        target = d / "files" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    record = {k: v for k, v in got.items() if k not in ("drive_files", "screens", "final")}
    record.update(extra or {})
    (d / "run.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8", newline="\n")
    return d


def rel(p):
    return Path(p).resolve().relative_to(paths.ROOT.resolve()).as_posix()


def summary(run_id, got, capture_dir):
    return {
        "run_id": run_id,
        "outcome": got["outcome"],
        "screen_id": got.get("screen_id"),
        "printed": got.get("printed", {}),
        "message": got.get("message"),
        "files": got.get("files", []),
        "capture_path": rel(capture_dir),
        "resends": got.get("resends", 0),
        "reason": got.get("reason"),
    }


def note_in_ledger(run_id, got, capture_dir):
    ledger.record_run(got.get("visited", []), got.get("keys_by_screen", {}))
    cap = rel(capture_dir)
    if got["outcome"] == "unknown_screen":
        h = hashlib.sha256("\n".join(got.get("final", [])).encode("utf-8")).hexdigest()
        ledger.log_unknown_screen(run_id, h, cap + "/final.txt")
    if got["outcome"] in ("timeout", "unknown_screen"):
        ledger.log_unanswered(run_id, {"mode": got["mode"], "shape": got["shape"], "inputs": got["inputs"]},
                              got.get("reason"), got.get("screen_id"), cap + "/final.txt")


def explore(profile, mode, shape, inputs, control=None, manager=None, block=False, capture_all=False, cfg=None):
    """Run one case without storing it. Returns the tool-facing summary."""
    if manager is not None:
        manager.acquire(block=block)
    try:
        got = cases.run(profile, mode, shape, inputs, control=control,
                        cfg=cfg or (manager.cfg if manager else None),
                        server_id=manager.server_id if manager else None, capture_all=capture_all)
    finally:
        if manager is not None:
            manager.release()
    run_id = new_run_id()
    ledger.set_unobserved(profile_mod.unobserved(profile))
    d = write_run_log(run_id, got, {"kind": "exploratory", "control": control["id"] if control else None})
    note_in_ledger(run_id, got, d)
    out = summary(run_id, got, d)
    out["_got"] = got
    return out
