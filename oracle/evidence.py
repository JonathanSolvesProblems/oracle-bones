"""What the Exhumer may point at, and whether it exists.

Citable: a stored golden's case id, or a capture path the manifest lists. Also accepted as
evidence for a decision or an open question, but never as a citation: an exploratory run id
or batch id with a log under oracle/out/runs/.
"""

import re
from pathlib import Path

from . import manifest, paths

CASE_ID = re.compile(r"^([a-z]{2,4}-[a-z]{2,5}|obs-[a-z]+)-\d{6}$")
RUN_ID = re.compile(r"^\d{8}-\d{6}-[0-9a-f]{6}$")
BATCH_ID = re.compile(r"^batch-\d{8}-\d{6}-[0-9a-f]{6}$")
CAPTURE_PREFIX = "oracle/goldens/"
CAPTURE = re.compile(r"^oracle/goldens/captures/[^/]+/.+")


def kind(item):
    """case, capture, run, batch, or None for anything else."""
    if CASE_ID.match(item):
        return "case"
    if CAPTURE.match(item):
        return "capture"
    if RUN_ID.match(item):
        return "run"
    if BATCH_ID.match(item):
        return "batch"
    return None


def problem(item, goldens_root=None, runs_root=None, listed=None):
    """Why an evidence item does not count, or None when it exists."""
    goldens_root = Path(goldens_root or paths.GOLDENS)
    runs_root = Path(runs_root or paths.RUNS)
    k = kind(item)
    if k is None:
        return "not a case id, capture path, run id or batch id"
    if k == "case":
        return None if (goldens_root / "cases" / ("%s.json" % item)).is_file() else "no stored golden"
    if k == "capture":
        rel = item[len(CAPTURE_PREFIX):]
        listed = manifest.load(goldens_root) if listed is None else listed
        if rel not in listed:
            return "not listed in the goldens manifest"
        return None if (goldens_root / rel).is_file() else "listed in the manifest but missing"
    if k == "run":
        return None if (runs_root / item).is_dir() else "no run log under oracle/out/runs/"
    return None if (runs_root / ("%s.json" % item)).is_file() else "no batch report under oracle/out/runs/"


def problems(items, goldens_root=None, runs_root=None):
    """[{evidence, problem}] for every item that does not exist. Empty when all do."""
    listed = manifest.load(Path(goldens_root or paths.GOLDENS))
    out = []
    for item in items:
        p = problem(item, goldens_root, runs_root, listed)
        if p:
            out.append({"evidence": item, "problem": p})
    return out
