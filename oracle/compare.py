"""Grade the rebuild against stored goldens (Requirements 10.4, 11 and 12).

1. Run the golden check. If it fails, exit 4 and compare nothing.
2. Load the chosen goldens: every golden for `full`, the ids in oracle/quickset.json for
   `quick`. Goldens with outcome `observed` prove the harness, not the rebuild, and are dropped.
3. Start the rebuild command once, write every request, close stdin, read responses until EOF
   or the rebuild time limit.
4. For each golden: no response is `rebuild_error`; a different outcome is `outcome`; otherwise
   each field is compared trimmed, or untrimmed where the profile marks it raw, giving `value`,
   `missing_field` or `extra_field`. Field text is never parsed as a number.
5. Write oracle/out/mismatches.json (an empty list when there are none), update the ledger's
   `mismatches`, and return the exit code: 0 all match, 1 mismatches, 3 the rebuild crashed or
   broke its contract (outranks mismatches), 4 the harness could not compare.

When the harness cannot compare, a stale mismatches.json from an earlier run is removed, so it
is never read as this run's answer.
"""

import json
import os
import queue
import subprocess
import threading
import time
from pathlib import Path

from . import config as config_mod
from . import ledger, manifest, paths, reread, runs
from . import profile as profile_mod
from . import screen as screen_mod
from .errors import OracleError
from .recorder import Store

# Workspace paths. In an installed power the workspace may be set after this import, so each
# use falls back to the current workspace when these are None.
QUICKSET = paths.ORACLE / "quickset.json" if paths.ORACLE else None
MISMATCHES = paths.OUT / "mismatches.json" if paths.OUT else None
FULL_TARGET = 10_000
OUTCOMES = ("result", "rejected", "error")

LIMIT = ("Limit: this check sees edits made outside the recorder only if the manifest was not "
         "edited to match. Review changes under oracle/goldens/ in version control.")


def _rel(p):
    try:
        return runs.rel(p)
    except ValueError:
        return Path(p).as_posix()


def golden_check(root=None):
    """Problems with the stored goldens (Requirement 10.3); empty when the check passes."""
    return manifest.check(root or paths.GOLDENS)


# ---- which goldens ---------------------------------------------------------------------

def load_quickset(path=None):
    p = Path(path or QUICKSET or paths.ORACLE / "quickset.json")
    if not p.exists():
        raise OracleError("invalid_arguments", "no quick set yet: run python -m oracle.record --build-quickset")
    return json.loads(p.read_text(encoding="utf-8"))


def choose(which, store, case_ids=None, quickset_path=None):
    """(goldens to grade, uncovered pairs). Observed goldens are never graded."""
    if which == "quick":
        qs = load_quickset(quickset_path)
        ids, uncovered = qs["cases"], [u["pair"] for u in qs.get("uncovered", [])]
    elif which == "full":
        ids, uncovered = store.ids(), []
    else:
        raise OracleError("invalid_arguments", "set must be quick or full")
    if case_ids:
        unknown = sorted(set(case_ids) - set(ids))
        if unknown:
            raise OracleError("invalid_arguments", "case ids not in the %s set" % which, {"unknown": unknown})
        ids = [c for c in ids if c in set(case_ids)]
    missing = [c for c in ids if not store.exists(c)]
    if missing:
        raise OracleError("golden_check_failed", "the %s set names goldens that are not stored" % which,
                          {"missing": missing})
    goldens = [g for g in (store.load(c) for c in ids) if g["outcome"] != "observed"]
    return goldens, uncovered


QUICK_SIZE = 200


def all_pairs(profile):
    """Every mode and shape pair the profile lists codes for, mapped to a flow or not."""
    return ["%s/%s" % (m, sh) for m in sorted(profile["codes"]["modes"]) for sh in sorted(profile["codes"]["shapes"])]


def build_quickset(profile, store, seed=1, size=QUICK_SIZE):
    """The quick set (Requirement 11.6): every control case that is not a behaviour case, then
    the rest split about half and half between goldens drawn from practical ranges and all
    other goldens (accepted ranges, typed cases). Within each half the spread is even and
    seeded over every mode and shape pair, taking one golden from each pair in turn. When one
    half runs out the other fills its place. No `observed` golden is listed. Pairs with no
    goldens are listed as uncovered, with whether the profile maps a flow for them."""
    import random
    goldens = [g for g in store.all() if g["outcome"] != "observed"]
    control_ids = {c["id"] for c in profile["controls"] if not c["id"].startswith("obs-")}
    chosen = sorted(g["id"] for g in goldens if g["id"] in control_ids)[:size]
    rnd = random.Random("quickset/%s" % seed)
    pools = {"practical": {}, "accepted": {}}
    for g in sorted(goldens, key=lambda g: g["id"]):
        if g["id"] not in control_ids:
            half = "practical" if g.get("range_set") == "practical" else "accepted"
            pools[half].setdefault("%s/%s" % (g["mode"], g["shape"]), []).append(g["id"])
    for half in ("practical", "accepted"):
        for k in sorted(pools[half]):
            rnd.shuffle(pools[half][k])

    def spread(half, limit):
        got, p = [], pools[half]
        order = sorted(p)
        while len(got) < limit and any(p[k] for k in order):
            for k in order:
                if p[k] and len(got) < limit:
                    got.append(p[k].pop())
        return got

    room = size - len(chosen)
    chosen += spread("practical", room // 2)
    chosen += spread("accepted", size - len(chosen))
    chosen += spread("practical", size - len(chosen))
    covered = {"%s/%s" % (g["mode"], g["shape"]) for g in goldens}
    by_pair, by_range_set = {}, {"control": 0, "practical": 0, "accepted": 0}
    for g in goldens:
        if g["id"] in chosen:
            k = "%s/%s" % (g["mode"], g["shape"])
            by_pair[k] = by_pair.get(k, 0) + 1
            half = ("control" if g["id"] in control_ids
                    else "practical" if g.get("range_set") == "practical" else "accepted")
            by_range_set[half] += 1
    uncovered = [{"pair": k, "flow_mapped": k in profile["flows"]} for k in all_pairs(profile) if k not in covered]
    return {"note": "Built by python -m oracle.record --build-quickset from stored goldens. Do not edit.",
            "seed": seed, "size": size, "count": len(chosen), "cases": sorted(chosen),
            "by_pair": dict(sorted(by_pair.items())), "by_range_set": by_range_set, "uncovered": uncovered}


def write_quickset(qs, path=None):
    p = Path(path or QUICKSET or paths.ORACLE / "quickset.json")
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(qs, indent=2) + "\n", encoding="utf-8", newline="\n")
    os.replace(tmp, p)
    return p


def raw_fields(profile, store, golden):
    """Names of the golden's fields the profile marks `compare: raw`, read from the screen its
    final capture shows."""
    rows = reread.final_rows(store, golden["id"])
    sid = screen_mod.identify(profile, rows)[0] if rows else None
    if sid is None:
        return set()
    sdef = profile_mod.screen_by_id(profile, sid)
    return {f["name"] for f in sdef.get("fields", []) if f.get("compare") == "raw"}


# ---- the rebuild contract (Requirement 12) ---------------------------------------------

def _valid_response(obj, wanted):
    return (isinstance(obj, dict) and obj.get("id") in wanted and obj.get("outcome") in OUTCOMES
            and isinstance(obj.get("printed"), dict)
            and all(isinstance(k, str) and isinstance(v, str) for k, v in obj["printed"].items())
            and (obj.get("message") is None or isinstance(obj.get("message"), str)))


def run_rebuild(command, requests, time_limit_s, cwd=None):
    """Start the rebuild once, write every request, read responses.
    Returns {"responses": {id: response}, "broken": reason or None, "stderr": text}."""
    wanted = {r["id"] for r in requests}
    try:
        proc = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                cwd=str(cwd or paths.ROOT), text=True, encoding="utf-8")
    except OSError as e:
        return {"responses": {}, "broken": "could not start the rebuild: %s" % e, "stderr": ""}
    lines, errs = queue.Queue(), []

    def read_out():
        for line in proc.stdout:
            lines.put(line)
        lines.put(None)

    def read_err():
        errs.append(proc.stderr.read())

    def write_in():
        try:
            for r in requests:
                proc.stdin.write(json.dumps(r) + "\n")
            proc.stdin.close()
        except (BrokenPipeError, OSError, ValueError):
            pass

    threads = [threading.Thread(target=fn, daemon=True) for fn in (read_out, read_err, write_in)]
    for t in threads:
        t.start()
    deadline = time.monotonic() + time_limit_s
    responses, broken = {}, None
    while True:
        left = deadline - time.monotonic()
        if left <= 0:
            broken = "the rebuild exceeded its time limit of %ss" % time_limit_s
            break
        try:
            line = lines.get(timeout=left)
        except queue.Empty:
            continue
        if line is None:
            break
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except ValueError:
            broken = "the rebuild wrote a line that is not JSON: %r" % line[:200]
            break
        if not _valid_response(obj, wanted) or obj["id"] in responses:
            broken = "the rebuild wrote a response that breaks the contract: %r" % line[:200]
            break
        responses[obj["id"]] = obj
    if proc.poll() is None:
        try:
            proc.wait(timeout=0 if broken else max(deadline - time.monotonic(), 0.1))
        except subprocess.TimeoutExpired:
            broken = broken or "the rebuild did not exit within its time limit"
    if proc.poll() is None:
        proc.kill()
        proc.wait(timeout=10)
    if broken is None and proc.returncode != 0:
        broken = "the rebuild exited with code %s" % proc.returncode
    if broken is None and len(responses) < len(wanted):
        broken = "the rebuild left %d request(s) without a response" % (len(wanted) - len(responses))
    threads[1].join(timeout=5)
    return {"responses": responses, "broken": broken, "stderr": "".join(errs)}


# ---- comparison (Requirement 11) -------------------------------------------------------

def compare_one(golden, response, raw=()):
    """Mismatches between one golden and the rebuild's response to it."""
    cid = golden["id"]
    if response is None:
        return [{"case_id": cid, "kind": "rebuild_error", "field": None, "oracle": None, "rebuild": None}]
    if response["outcome"] != golden["outcome"]:
        return [{"case_id": cid, "kind": "outcome", "field": None,
                 "oracle": golden["outcome"], "rebuild": response["outcome"]}]
    out = []
    want, have = golden["printed"], response["printed"]
    for name in sorted(want):
        if name not in have:
            out.append({"case_id": cid, "kind": "missing_field", "field": name, "oracle": want[name], "rebuild": None})
            continue
        a, b = (want[name], have[name]) if name in raw else (want[name].strip(), have[name].strip())
        if a != b:
            out.append({"case_id": cid, "kind": "value", "field": name, "oracle": want[name], "rebuild": have[name]})
    for name in sorted(set(have) - set(want)):
        out.append({"case_id": cid, "kind": "extra_field", "field": name, "oracle": None, "rebuild": have[name]})
    return out


def by_field(mismatches):
    """Counts grouped by field; outcome and rebuild errors are grouped under their kind."""
    out = {}
    for m in mismatches:
        key = m["field"] or m["kind"]
        out[key] = out.get(key, 0) + 1
    return dict(sorted(out.items()))


def _write_mismatches(items, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(items, indent=2) + "\n", encoding="utf-8", newline="\n")
    os.replace(tmp, path)


NO_REBUILD = ("No rebuild is set for this workspace, so nothing was graded. When you have one, name its command "
              "in oracle/rebuild.json, for example {\"command\": [\"node\", \"my-rebuild.js\"]}.")


def rebuild_command(cfg):
    """(command, time limit in seconds) of the rebuild to grade.

    In this repository it is oracle/harness.json's. In a workspace made by the power it is the
    workspace's own oracle/rebuild.json, or (None, limit) while the user has no rebuild: the
    package's harness.json names this repository's app, which is not theirs to be graded on
    (resurrection-power Requirement 10.2).
    """
    limit = cfg["rebuild"]["time_limit_s"]
    if not paths.INSTALLED:
        return cfg["rebuild"]["command"], limit
    own = paths.ORACLE / "rebuild.json"
    if not own.is_file():
        return None, limit
    try:
        named = json.loads(own.read_text(encoding="utf-8"))
    except ValueError:
        raise OracleError("invalid_arguments", "oracle/rebuild.json is not JSON")
    command = named.get("command") if isinstance(named, dict) else None
    if not (isinstance(command, list) and command and all(isinstance(c, str) for c in command)):
        raise OracleError("invalid_arguments", "oracle/rebuild.json needs a command, a list of strings")
    return command, named.get("time_limit_s", limit)


def run(which="quick", case_ids=None, cfg=None, profile=None, store=None, command=None,
        quickset_path=None, mismatches_path=None, write_ledger=True):
    """Compare and return the `compare` tool's output plus `problems`, `note` and `count`."""
    mpath = Path(mismatches_path or MISMATCHES or paths.OUT / "mismatches.json")
    store = store or Store()

    def cannot(note, problems=(), category="invalid_arguments"):
        if mpath.exists():
            mpath.unlink()
        return {"total": 0, "matched": 0, "by_kind": {}, "by_field": {}, "uncovered": [],
                "report_path": _rel(mpath), "exit_code": 4, "note": note, "problems": list(problems),
                "category": category}

    try:
        cfg = cfg or config_mod.load()
    except OracleError as e:
        return cannot(e.message, [json.dumps(e.detail)] if e.detail else [], e.category)
    limit = cfg["rebuild"]["time_limit_s"]
    if not command:
        command, limit = rebuild_command(cfg)
    if not command and paths.INSTALLED:
        # A workspace made by the power with no rebuild yet: nothing to grade, and not a failure.
        return {"total": 0, "matched": 0, "by_kind": {}, "by_field": {}, "uncovered": [],
                "report_path": _rel(mpath), "exit_code": 0, "note": NO_REBUILD, "problems": [],
                "not_graded": True}
    problems = golden_check(store.root)
    if problems:
        return cannot("the golden check failed; nothing was compared", problems, "golden_check_failed")
    try:
        profile = profile or profile_mod.load()
        goldens, uncovered = choose(which, store, case_ids, quickset_path)
    except OracleError as e:
        return cannot(e.message, [json.dumps(e.detail)] if e.detail else [], e.category)
    if not goldens:
        return cannot("no goldens to compare in the %s set" % which)
    if not command:
        return cannot("no rebuild command in oracle/harness.json (rebuild.command is null)")

    requests = [{"id": g["id"], "mode": g["mode"], "shape": g["shape"], "inputs": g["inputs"]} for g in goldens]
    got = run_rebuild(command, requests, limit, cwd=str(paths.ROOT) if paths.INSTALLED else None)
    run_id = runs.new_run_id()
    log = paths.RUNS / ("compare-" + run_id)
    log.mkdir(parents=True, exist_ok=True)
    (log / "stderr.txt").write_text(got["stderr"], encoding="utf-8", newline="\n")
    mismatches = []
    for g in goldens:
        mismatches.extend(compare_one(g, got["responses"].get(g["id"]), raw_fields(profile, store, g)))
    _write_mismatches(mismatches, mpath)
    kinds = {}
    for m in mismatches:
        kinds[m["kind"]] = kinds.get(m["kind"], 0) + 1
    fields = by_field(mismatches)
    if write_ledger:
        ledger.set_mismatches(fields, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    exit_code = 3 if got["broken"] else (1 if mismatches else 0)
    bad_cases = {m["case_id"] for m in mismatches}
    out = {"total": len(goldens), "matched": len(goldens) - len(bad_cases), "by_kind": kinds,
           "by_field": fields, "uncovered": uncovered, "report_path": _rel(mpath), "exit_code": exit_code,
           "note": got["broken"], "problems": [], "count": len(goldens)}
    if which == "full":
        out["target"] = FULL_TARGET
    return out


def summary(out, which):
    """The printed summary: counts grouped by field (Requirement 11.4)."""
    lines = []
    if out.get("not_graded"):
        return out["note"]
    if out["exit_code"] == 4:
        lines.append("could not compare: %s" % out["note"])
        lines.extend("  " + p for p in out["problems"])
        return "\n".join(lines)
    lines.append("%s set: %d of %d case(s) match" % (which, out["matched"], out["total"]))
    if which == "full":
        lines.append("full set: %d case(s) of a %d target" % (out["total"], FULL_TARGET))
    if out["note"]:
        lines.append("rebuild broke the contract: %s" % out["note"])
    for name, n in out["by_field"].items():
        lines.append("  %-20s %d" % (name, n))
    if out["uncovered"]:
        lines.append("uncovered (no goldens yet): %s" % ", ".join(out["uncovered"]))
    lines.append("details: %s" % out["report_path"])
    return "\n".join(lines)


def tool_output(out):
    """Only the fields the compare tool declares."""
    keys = ("total", "matched", "by_kind", "by_field", "uncovered", "report_path", "exit_code")
    return {k: out[k] for k in keys}
