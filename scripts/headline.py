"""Write results/headline.md and results/ablation-manual-only.md from the stored goldens, so
that no number in either file is typed.

It builds on scripts/grade_rebuild.py: the same goldens (Step-Backwater and behaviour cases
left out of the grading), each rebuild run once with every request on standard input, and the
comparator's own rule (oracle.compare.compare_one, with the fields the profile marks raw). It
grades three rebuilds on two sets, the goldens of seed 201 (the headline batch) and the earlier
goldens:

  rebuild  node src/oracle/entry.ts   in app
  run-2    node entry.mjs             in ablation/run-2   (the ablation's baseline)
  run-1    node entry.mjs             in ablation/run-1

It never writes the ledger, never starts the program, and reads the committed goldens even when
ORACLE_GOLDENS points elsewhere.

Run from anywhere:

  python scripts/headline.py           write both files
  python scripts/headline.py --check   exit 1 if either file differs from what would be written
"""
import argparse
import collections
import json
import math
import re
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from oracle import compare, paths  # noqa: E402
from oracle import profile as profile_mod  # noqa: E402
from oracle.recorder import Store  # noqa: E402

SEED = 201
BATCH = ROOT / "results" / "headline-batch-201.json"
PLAN = "results/headline-plan.md"
HEADLINE = ROOT / "results" / "headline.md"
ABLATION = ROOT / "results" / "ablation-manual-only.md"
README = ROOT / "ablation" / "README.md"
REBUILDS = collections.OrderedDict([
    ("rebuild", {"cwd": "app", "cmd": ["node", "src/oracle/entry.ts"], "name": "Quickened"}),
    ("run-2", {"cwd": "ablation/run-2", "cmd": ["node", "entry.mjs"], "name": "Run 2"}),
    ("run-1", {"cwd": "ablation/run-1", "cmd": ["node", "entry.mjs"], "name": "Run 1"}),
])
UNSTORED_PREFIX = "unstored-"


# ---- reading -----------------------------------------------------------------------------

def load_goldens():
    """Every stored golden that is not a behaviour case, sorted by id, from the committed store."""
    out = []
    for f in sorted((paths.REPO_GOLDENS / "cases").glob("*.json")):
        g = json.loads(f.read_text(encoding="utf-8"))
        if g["id"].startswith("obs-") or g["outcome"] == "observed":
            continue
        out.append(g)
    return out


def raw_by_case(goldens):
    prof = profile_mod.load()
    any_raw = any(f.get("compare") == "raw" for s in prof.get("screens", []) for f in s.get("fields", []))
    if not any_raw:
        return {}
    store = Store(paths.REPO_GOLDENS)
    return {g["id"]: compare.raw_fields(prof, store, g) for g in goldens}


def request(g):
    return {"id": g["id"], "mode": g["mode"], "shape": g["shape"], "inputs": g["inputs"]}


def run_rebuild(spec, requests):
    """Responses by id, as grade_rebuild.py reads them: lines that are not JSON are counted, not fatal."""
    proc = subprocess.run(spec["cmd"], cwd=str(ROOT / spec["cwd"]), capture_output=True, text=True,
                          encoding="utf-8", timeout=900,
                          input="".join(json.dumps(r) + "\n" for r in requests))
    responses, bad = {}, 0
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            responses[str(obj["id"])] = obj
        except (ValueError, KeyError, TypeError):
            bad += 1
    return {"responses": responses, "bad_lines": bad, "exit_code": proc.returncode}


def grade_one(g, r, raw=()):
    if r is not None and not isinstance(r.get("printed"), dict):
        r = None
    try:
        return compare.compare_one(g, r, raw)
    except Exception as e:  # a response that breaks the contract counts as a miss
        return [{"case_id": g["id"], "kind": "rebuild_error", "field": None, "oracle": None, "rebuild": repr(e)[:120]}]


def without_overflow(g, r):
    """The golden and the response with every field QUICK-2 printed in its overflow form removed."""
    drop = {k for k, v in g["printed"].items() if v.strip().startswith("%")}
    g2 = dict(g, printed={k: v for k, v in g["printed"].items() if k not in drop})
    if r is not None and isinstance(r.get("printed"), dict):
        r = dict(r, printed={k: v for k, v in r["printed"].items() if k not in drop})
    return g2, r


def pair(g):
    return "%s/%s" % (g["mode"], g["shape"])


def git_last_commit(*paths_):
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%h %ad", "--date=format:%Y-%m-%d %H:%M", "--"] + list(paths_),
                             cwd=str(ROOT), capture_output=True, text=True, timeout=30)
        return out.stdout.strip() or None
    except OSError:
        return None


def readme_runs():
    """Each ablation run's times and credits, as ablation/README.md states them."""
    text = README.read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r"\*\*Run (\d)[^*]*\*\*\s+\((\d\d:\d\d) to (\d\d:\d\d) UTC,\s+([\d.]+) credits\)", text):
        out["run-" + m.group(1)] = {"start": m.group(2), "end": m.group(3), "credits": m.group(4)}
    dm = re.search(r"Both were made on (\d{4}-\d{2}-\d{2})", text)
    return out, (dm.group(1) if dm else None)


# ---- grading -----------------------------------------------------------------------------

def collect():
    goldens = load_goldens()
    batch_info = json.loads(BATCH.read_text(encoding="utf-8"))
    batch = [g for g in goldens if g.get("seed") == SEED]
    earlier = [g for g in goldens if g.get("seed") != SEED]
    graded = [g for g in goldens if g["mode"] != "step_backwater"]
    raw = raw_by_case(graded)
    unstored = [{"id": UNSTORED_PREFIX + c["generated_id"], "mode": c["mode"], "shape": c["shape"], "inputs": c["inputs"]}
                for c in batch_info.get("not_finished", [])]
    requests = [request(g) for g in graded]
    runs = collections.OrderedDict()
    for key, spec in REBUILDS.items():
        got = run_rebuild(spec, requests + (unstored if key == "rebuild" else []))
        res = {}
        for g in graded:
            r = got["responses"].get(g["id"])
            mm = grade_one(g, r, raw.get(g["id"], ()))
            g2, r2 = without_overflow(g, r)
            res[g["id"]] = {"response": r, "misses": mm, "misses_no_overflow": grade_one(g2, r2, raw.get(g["id"], ()))}
        runs[key] = {"results": res, "bad_lines": got["bad_lines"], "exit_code": got["exit_code"],
                     "responses": got["responses"]}
    return {"goldens": goldens, "batch": batch, "earlier": earlier, "batch_info": batch_info,
            "runs": runs, "unstored": unstored}


def counts_by_pair(cases, results):
    out = collections.OrderedDict()
    for g in sorted(cases, key=lambda g: (pair(g), g["id"])):
        a = out.setdefault(pair(g), [0, 0])
        a[0] += not results[g["id"]]["misses"]
        a[1] += 1
    return out


def matched(cases, results, key="misses"):
    return sum(1 for g in cases if not results[g["id"]][key])


# ---- writing helpers ---------------------------------------------------------------------

def code(v):
    if v is None:
        return "(none)"
    v = str(v).strip()
    return "`%s`" % v if v else "(blank)"


def miss_rows(g, mm, name):
    rows = []
    for m in mm:
        if m["kind"] == "outcome":
            rows.append("| %s | %s | outcome | %s | %s |" % (g["id"], pair(g), code(m["oracle"]), code(m["rebuild"])))
        elif m["kind"] == "rebuild_error":
            rows.append("| %s | %s | (no response) | %s | %s |" % (g["id"], pair(g), code(g["outcome"]), code(m["rebuild"])))
        else:
            rows.append("| %s | %s | %s | %s | %s |" % (g["id"], pair(g), m["field"], code(m["oracle"]), code(m["rebuild"])))
    return rows


def miss_table(cases, results, name):
    head = ["| Case | Mode and shape | Field | QUICK-2 printed | %s printed |" % name, "|---|---|---|---|---|"]
    rows = []
    for g in cases:
        mm = results[g["id"]]["misses"]
        if mm:
            rows.extend(miss_rows(g, mm, name))
    return head + rows if rows else ["None."]


def pct(a, b):
    return "%.1f%%" % (100.0 * a / b) if b else "n/a"


def outcome_table(cases):
    outs = sorted({g["outcome"] for g in cases})
    by = collections.OrderedDict()
    for g in sorted(cases, key=lambda g: (pair(g), g["id"])):
        by.setdefault(pair(g), collections.Counter())[g["outcome"]] += 1
    lines = ["| Mode and shape | " + " | ".join(outs) + " | Total |", "|---" * (len(outs) + 2) + "|"]
    for k, c in by.items():
        lines.append("| %s | %s | %d |" % (k, " | ".join(str(c[o]) for o in outs), sum(c.values())))
    tot = collections.Counter(g["outcome"] for g in cases)
    lines.append("| all | %s | %d |" % (" | ".join(str(tot[o]) for o in outs), len(cases)))
    return lines


# ---- results/headline.md -----------------------------------------------------------------

def headline(data):
    runs, batch, earlier, info = data["runs"], data["batch"], data["earlier"], data["batch_info"]
    res = runs["rebuild"]["results"]
    run_date = max(g["recorded_at"] for g in batch)[:10]
    m = matched(batch, res)
    L = []
    L.append("Cases: %d of %d" % (m, len(batch)))
    L.append("Run: %s" % run_date)
    L.append("")
    L.append("# The headline run: the result")
    L.append("")
    L.append("Written by `python scripts/headline.py` from the stored goldens and the rebuild's answers. "
             "No number in this file is typed; `oracle/tests/test_headline.py` fails when the file differs "
             "from what the script writes. The plan, committed before the batch was recorded, is "
             "[%s](headline-plan.md)." % PLAN)
    L.append("")
    L.append("The two lines above are the ones the app's proof page reads: the cases where Quickened prints "
             "what QUICK-2 printed, of the batch's stored cases, and the date the batch was recorded (the "
             "latest `recorded_at` of its goldens).")
    L.append("")
    L.append("A case matches when the rebuild gives the same outcome (a result or a rejection) and every "
             "printed field as the same text, by the comparator's rule (`oracle.compare.compare_one`). "
             "Messages are not compared.")
    L.append("")
    sc = git_last_commit("app/src/solver", "app/src/format")
    L.append("- Rebuild graded: `node src/oracle/entry.ts` in `app`, with `app/src/solver` and `app/src/format` "
             "at their last commit, %s." % (code(sc) if sc else "(git not available)"))
    L.append("- Batch: `%s`" % info["command"])
    L.append("")

    L.append("## Drawn, stored, not finished")
    L.append("")
    stored_ids = {g["id"] for g in batch}
    L.append("| | Cases |")
    L.append("|---|---|")
    L.append("| Drawn by the generator (seed %d, range set `%s`) | %d |" % (info["seed"], info["range_set"], info["count"]))
    for k, v in info["outcomes"].items():
        L.append("| The batch report's outcome `%s` | %d |" % (k, v))
    L.append("| Stored as goldens (the batch report's `recorded`) | %d |" % info["recorded"])
    L.append("| Goldens in `oracle/goldens/cases` with seed %d | %d |" % (SEED, len(stored_ids)))
    L.append("| Not finished within the runner's wait | %d |" % len(info.get("not_finished", [])))
    L.append("")
    for c in info.get("not_finished", []):
        L.append("### Not finished: %s" % c["generated_id"])
        L.append("")
        L.append("%s, %s, run `%s`. The runner stopped on screen `%s`: %s. No golden is stored for it, "
                 "so it is not in the count above." % (c["mode"], c["shape"], c["run_id"], c["screen_id"], c["reason"]))
        L.append("")
        L.append("Inputs as typed: " + ", ".join("%s %s" % (k, code(v)) for k, v in c["inputs"].items()) + ".")
        L.append("")
        L.append("QUICK-2's last screen:")
        L.append("")
        L.append("```text")
        L.extend(row.rstrip() for row in c["last_screen"])
        L.append("```")
        L.append("")
        r = runs["rebuild"]["responses"].get(UNSTORED_PREFIX + c["generated_id"])
        if r is None:
            L.append("Quickened gave no answer for these inputs.")
        else:
            pr = r.get("printed") or {}
            L.append("Quickened's answer for the same inputs: outcome %s%s" % (
                code(r.get("outcome")),
                (", message %s" % code(r["message"])) if r.get("message") else ""))
            L.append("")
            if pr:
                L.append("| Field | Quickened printed |")
                L.append("|---|---|")
                for k in sorted(pr):
                    L.append("| %s | %s |" % (k, code(pr[k])))
            L.append("")
            L.append("QUICK-2 printed nothing to compare this with, so it is neither a match nor a miss.")
        L.append("")

    L.append("## Matches by mode and shape")
    L.append("")
    L.append("| Mode and shape | Stored | Match | Miss |")
    L.append("|---|---|---|---|")
    for k, (a, n) in counts_by_pair(batch, res).items():
        L.append("| %s | %d | %d | %d |" % (k, n, a, n - a))
    L.append("| all | %d | %d | %d |" % (len(batch), m, len(batch) - m))
    L.append("")
    L.append("By QUICK-2's outcome:")
    L.append("")
    L.append("| QUICK-2's outcome | Stored | Match |")
    L.append("|---|---|---|")
    for o in sorted({g["outcome"] for g in batch}):
        cs = [g for g in batch if g["outcome"] == o]
        L.append("| %s | %d | %d |" % (o, len(cs), matched(cs, res)))
    L.append("")

    L.append("## Every miss")
    L.append("")
    L.append("Each field that differs, with the text QUICK-2 printed beside the text Quickened printed, both "
             "trimmed as the comparator compares them. A case with several differing fields has several rows. "
             "No miss is left out and none is explained here.")
    L.append("")
    nmiss = len(batch) - m
    nfield = sum(len(res[g["id"]]["misses"]) for g in batch)
    L.append("%d cases, %d fields." % (nmiss, nfield))
    L.append("")
    L.extend(miss_table(batch, res, "Quickened"))
    L.append("")

    L.append("## QUICK-2's outcomes")
    L.append("")
    L.append("What QUICK-2 did with the stored cases of the batch.")
    L.append("")
    L.extend(outcome_table(batch))
    L.append("")
    ov = [g for g in batch if any(v.strip().startswith("%") for v in g["printed"].values())]
    L.append("Of the stored cases, QUICK-2 printed at least one field in its overflow form (a leading `%%`) in %d." % len(ov))
    L.append("")

    L.append("## The earlier goldens")
    L.append("")
    L.append("The goldens stored before this batch. They are not a random sample, so they are reported "
             "separately and are not the headline.")
    L.append("")
    sb = [g for g in earlier if g["mode"] == "step_backwater"]
    eg = [g for g in earlier if g["mode"] != "step_backwater"]
    seeded = [g for g in earlier if g.get("seed") is not None]
    seeds = sorted({g["seed"] for g in seeded})
    L.append("| | Cases |")
    L.append("|---|---|")
    L.append("| Earlier goldens (behaviour cases left out) | %d |" % len(earlier))
    L.append("| Generated from a seed (%s) | %d |" % (", ".join(str(s) for s in seeds), len(seeded)))
    L.append("| Not generated: typed by hand or chosen by predictions | %d |" % (len(earlier) - len(seeded)))
    L.append("| Step-Backwater: not built, not graded | %d |" % len(sb))
    L.append("| Graded | %d |" % len(eg))
    L.append("| Match | %d |" % matched(eg, res))
    L.append("")
    L.append("Step-Backwater is not computed by Quickened, and the app says so. These goldens are not counted "
             "as matches or misses: " + ", ".join(g["id"] for g in sb) + ".")
    L.append("")
    L.append("| Mode and shape | Graded | Match | Miss |")
    L.append("|---|---|---|---|")
    for k, (a, n) in counts_by_pair(eg, res).items():
        L.append("| %s | %d | %d | %d |" % (k, n, a, n - a))
    L.append("")
    L.append("Misses among the earlier goldens:")
    L.append("")
    L.extend(miss_table(eg, res, "Quickened"))
    L.append("")

    L.append("## What this run cannot show")
    L.append("")
    L.append("It grades the rebuild against one program on one emulator, on inputs drawn by this generator "
             "from the practical ranges in `oracle/targets/quick2.json`. It says nothing about inputs outside "
             "those ranges, about Step-Backwater, or about whether QUICK-2's own answers are right. A match "
             "means the printed text is the same; it does not show that the hidden values behind the text "
             "are the same. The case QUICK-2 did not finish has no golden, so nothing is known about what it "
             "would have printed.")
    L.append("")
    return "\n".join(L)


# ---- results/ablation-manual-only.md -----------------------------------------------------

def numeric_diffs(cases, results):
    rel, zero, text = [], 0, 0
    for g in cases:
        for mm in results[g["id"]]["misses"]:
            if mm["kind"] != "value":
                continue
            try:
                o, r = float(mm["oracle"].strip()), float(mm["rebuild"].strip())
            except (ValueError, AttributeError):
                text += 1
                continue
            if not (math.isfinite(o) and math.isfinite(r)):
                text += 1
            elif o == 0:
                zero += 1
            else:
                rel.append(abs(r - o) / abs(o))
    return rel, zero, text


def ablation(data):
    runs, batch, earlier = data["runs"], data["batch"], data["earlier"]
    eg = [g for g in earlier if g["mode"] != "step_backwater"]
    sets = [("batch", "The headline batch (seed %d)" % SEED, batch), ("earlier", "The earlier goldens", eg)]
    order = ["run-2", "run-1", "rebuild"]
    times, made_on = readme_runs()
    L = []
    L.append("# The ablation: a rebuild from the manual only")
    L.append("")
    L.append("Written by `python scripts/headline.py`. No number in this file is typed; "
             "`oracle/tests/test_headline.py` fails when the file differs from what the script writes.")
    L.append("")
    L.append("Two rebuilds made from one prompt, with no oracle, no recorded answers and no spec, graded on the "
             "same goldens as Quickened by the same rule. How they were made is in "
             "[ablation/README.md](../ablation/README.md). **Run 2 is the baseline.** Run 1 is shown beside "
             "it: its `CONTRACT.md` carried one real answer of the program by mistake, and it searched the web "
             "where run 2 did not. Quickened's column is the real rebuild on the same cases. Step-Backwater "
             "goldens are left out.")
    L.append("")

    L.append("## What each run cost")
    L.append("")
    L.append("As `ablation/README.md` states them%s." % (" (made on %s)" % made_on if made_on else ""))
    L.append("")
    L.append("| Run | Credits | Time (UTC) |")
    L.append("|---|---|---|")
    for k in ("run-2", "run-1"):
        t = times.get(k)
        L.append("| %s | %s | %s |" % (REBUILDS[k]["name"], t["credits"] if t else "(not stated)",
                                       "%s to %s" % (t["start"], t["end"]) if t else "(not stated)"))
    L.append("")

    L.append("## Matches")
    L.append("")
    L.append("| Set | Cases | " + " | ".join(REBUILDS[k]["name"] for k in order) + " |")
    L.append("|---|---|" + "---|" * len(order))
    for _, title, cs in sets:
        L.append("| %s | %d | %s |" % (title, len(cs), " | ".join(
            "%d (%s)" % (matched(cs, runs[k]["results"]), pct(matched(cs, runs[k]["results"]), len(cs))) for k in order)))
    L.append("")
    for _, title, cs in sets:
        L.append("### %s, by mode and shape" % title)
        L.append("")
        L.append("| Mode and shape | Cases | " + " | ".join(REBUILDS[k]["name"] for k in order) + " |")
        L.append("|---|---|" + "---|" * len(order))
        per = {k: counts_by_pair(cs, runs[k]["results"]) for k in order}
        for p in per["rebuild"]:
            L.append("| %s | %d | %s |" % (p, per["rebuild"][p][1], " | ".join(str(per[k][p][0]) for k in order)))
        L.append("")

    L.append("## Outcomes that differ")
    L.append("")
    L.append("Cases where the run gave another outcome than QUICK-2 (a result where QUICK-2 rejected, or the "
             "reverse), or gave no readable answer.")
    L.append("")
    for k in order:
        res = runs[k]["results"]
        L.append("### %s" % REBUILDS[k]["name"])
        L.append("")
        rows = collections.Counter()
        for si, (_, title, cs) in enumerate(sets):
            for g in cs:
                mm = res[g["id"]]["misses"]
                if mm and mm[0]["kind"] in ("outcome", "rebuild_error"):
                    got = mm[0]["rebuild"] if mm[0]["kind"] == "outcome" else "no answer"
                    rows[(si, title, pair(g), g["outcome"], got)] += 1
        if not rows:
            L.append("None.")
        else:
            L.append("| Set | Mode and shape | QUICK-2 | %s | Cases |" % REBUILDS[k]["name"])
            L.append("|---|---|---|---|---|")
            for (_, t, p, o, r), n in sorted(rows.items()):
                L.append("| %s | %s | %s | %s | %d |" % (t, p, o, r, n))
        if runs[k]["bad_lines"]:
            L.append("")
            L.append("Lines of its output that were not JSON: %d." % runs[k]["bad_lines"])
        L.append("")

    L.append("## Where a run matches and Quickened does not")
    L.append("")
    reb = runs["rebuild"]["results"]
    for k in ("run-2", "run-1"):
        res = runs[k]["results"]
        L.append("### %s" % REBUILDS[k]["name"])
        L.append("")
        hits = [g for _, _, cs in sets for g in cs if not res[g["id"]]["misses"] and reb[g["id"]]["misses"]]
        if not hits:
            L.append("None.")
        else:
            L.append("%d %s. Quickened's differing fields, beside QUICK-2's text (which the run printed):"
                     % (len(hits), "case" if len(hits) == 1 else "cases"))
            L.append("")
            L.append("| Case | Mode and shape | Field | QUICK-2 printed | Quickened printed |")
            L.append("|---|---|---|---|---|")
            for g in hits:
                L.extend(miss_rows(g, reb[g["id"]]["misses"], "Quickened"))
        L.append("")

    L.append("## Overflow fields")
    L.append("")
    ov = [g for g in batch if any(v.strip().startswith("%") for v in g["printed"].values())]
    L.append("Of the %d stored cases of the batch, QUICK-2 printed at least one field in its overflow form "
             "(a leading `%%`, as QUICK-2 prints a number too wide for its field) in %d. Below, the matches "
             "with every such field left out of the comparison, in the golden and in the answer alike; the "
             "outcome and every other field must still be the same." % (len(batch), len(ov)))
    L.append("")
    L.append("| Rule | " + " | ".join(REBUILDS[k]["name"] for k in order) + " |")
    L.append("|---|" + "---|" * len(order))
    L.append("| Every field | %s |" % " | ".join(str(matched(batch, runs[k]["results"])) for k in order))
    L.append("| Overflow fields left out | %s |" % " | ".join(
        str(matched(batch, runs[k]["results"], "misses_no_overflow")) for k in order))
    L.append("")

    L.append("## How large the numeric differences are")
    L.append("")
    L.append("Over the batch's fields that differ where both texts read as numbers, the relative difference "
             "|answer - QUICK-2| / |QUICK-2|. Fields where QUICK-2 printed zero are counted apart, and so are "
             "fields where either text is not a number (overflow forms, flow types). The 90th percentile is "
             "the nearest rank.")
    L.append("")
    L.append("| | " + " | ".join(REBUILDS[k]["name"] for k in order) + " |")
    L.append("|---|" + "---|" * len(order))
    stats = {}
    for k in order:
        rel, zero, text = numeric_diffs(batch, runs[k]["results"])
        rel.sort()
        stats[k] = {
            "n": len(rel), "zero": zero, "text": text,
            "median": statistics.median(rel) if rel else None,
            "p90": rel[max(0, math.ceil(0.9 * len(rel)) - 1)] if rel else None,
            "under": sum(1 for x in rel if x < 0.01),
        }

    def pc(x):
        return "n/a" if x is None else "%.2f%%" % (100 * x)
    L.append("| Numeric fields that differ | %s |" % " | ".join(str(stats[k]["n"]) for k in order))
    L.append("| Median | %s |" % " | ".join(pc(stats[k]["median"]) for k in order))
    L.append("| 90th percentile | %s |" % " | ".join(pc(stats[k]["p90"]) for k in order))
    L.append("| Under 1%% | %s |" % " | ".join(
        "%d (%s)" % (stats[k]["under"], "%.0f%%" % (100.0 * stats[k]["under"] / stats[k]["n"]) if stats[k]["n"] else "n/a")
        for k in order))
    L.append("| Fields where QUICK-2 printed zero | %s |" % " | ".join(str(stats[k]["zero"]) for k in order))
    L.append("| Fields that differ and are not both numbers | %s |" % " | ".join(str(stats[k]["text"]) for k in order))
    L.append("")
    L.append("## What this cannot show")
    L.append("")
    L.append("Each run is one sample of one model from one prompt; another run from the same prompt could "
             "score otherwise, as the two runs here do. The grade says how often a rebuild without the oracle "
             "prints QUICK-2's text, not how close its engineering is.")
    L.append("")
    return "\n".join(L)


def build():
    data = collect()
    return headline(data).rstrip("\n") + "\n", ablation(data).rstrip("\n") + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="exit 1 if either file differs from what would be written")
    args = ap.parse_args(argv)
    texts = build()
    bad = []
    for path, text in zip((HEADLINE, ABLATION), texts):
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                bad.append(path.relative_to(ROOT).as_posix())
        else:
            path.write_text(text, encoding="utf-8", newline="\n")
            print("wrote", path.relative_to(ROOT).as_posix())
    if bad:
        print("differs from what scripts/headline.py writes:", ", ".join(bad))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
