"""Grade any rebuild that speaks the oracle contract against the stored goldens, with the
comparator's own rule (oracle.compare.compare_one). It reads the goldens, runs the rebuild's
command once with every request on standard input, and prints the matches by mode and shape.
It never writes the ledger. Step-Backwater goldens and behaviour cases are left out.

Run from the repository root:

  python scripts/grade_rebuild.py --cwd app --cmd node src/oracle/entry.ts
  python scripts/grade_rebuild.py --cwd ablation/run-2 --cmd node entry.mjs --seed 201 --out report.json

--seed N keeps only the goldens generated from that seed; --not-seed N keeps the others.
"""
import argparse
import collections
import glob
import json
import subprocess
import sys

sys.path.insert(0, ".")
from oracle.compare import compare_one  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cwd", required=True)
    ap.add_argument("--cmd", nargs="+", required=True)
    ap.add_argument("--seed", type=int, help="only goldens generated from this seed")
    ap.add_argument("--not-seed", type=int, help="only goldens not generated from this seed")
    ap.add_argument("--out")
    args = ap.parse_args()

    goldens = []
    for f in sorted(glob.glob("oracle/goldens/cases/*.json")):
        g = json.load(open(f, encoding="utf-8"))
        if g["id"].startswith("obs-") or g["mode"] == "step_backwater":
            continue
        if args.seed is not None and g.get("seed") != args.seed:
            continue
        if args.not_seed is not None and g.get("seed") == args.not_seed:
            continue
        goldens.append(g)

    requests = "".join(json.dumps({"id": g["id"], "mode": g["mode"], "shape": g["shape"], "inputs": g["inputs"]}) + "\n"
                       for g in goldens)
    proc = subprocess.run(args.cmd, cwd=args.cwd, input=requests, capture_output=True, text=True,
                          encoding="utf-8", timeout=600)
    responses = {}
    bad_lines = 0
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            responses[str(obj["id"])] = obj
        except (ValueError, KeyError, TypeError):
            bad_lines += 1

    per_pair = collections.OrderedDict()
    per_outcome = collections.OrderedDict()
    kinds = collections.Counter()
    fields = collections.Counter()
    misses = []
    matched = 0
    for g in goldens:
        r = responses.get(g["id"])
        if r is not None and not isinstance(r.get("printed"), dict):
            r = None
        try:
            mm = compare_one(g, r)
        except Exception as e:  # a response that breaks the contract counts as a miss
            mm = [{"case_id": g["id"], "kind": "rebuild_error", "field": None, "oracle": None, "rebuild": repr(e)[:120]}]
        ok = not mm
        matched += ok
        pair = "%s/%s" % (g["mode"], g["shape"])
        a = per_pair.setdefault(pair, [0, 0]); a[0] += ok; a[1] += 1
        b = per_outcome.setdefault(g["outcome"], [0, 0]); b[0] += ok; b[1] += 1
        if mm:
            kinds[mm[0]["kind"]] += 1
            for m in mm:
                fields[m["field"] or m["kind"]] += 1
            misses.append({"case_id": g["id"], "pair": pair, "oracle_outcome": g["outcome"],
                           "rebuild_outcome": (r or {}).get("outcome"),
                           "fields": [{"field": m["field"], "kind": m["kind"], "oracle": m["oracle"], "rebuild": m["rebuild"]} for m in mm]})

    report = {"command": args.cmd, "cwd": args.cwd, "seed": args.seed, "not_seed": args.not_seed,
              "cases": len(goldens), "matched": matched, "exit_code": proc.returncode, "bad_lines": bad_lines,
              "responses": len(responses), "by_pair": per_pair, "by_oracle_outcome": per_outcome,
              "first_mismatch_kind": dict(kinds), "mismatched_fields": dict(fields.most_common()), "misses": misses}
    print("%d of %d match (exit %s, %d responses, %d unreadable lines)" % (matched, len(goldens), proc.returncode, len(responses), bad_lines))
    for k, (m, n) in per_pair.items():
        print("  %-28s %d of %d" % (k, m, n))
    print("  by QUICK-2's outcome:", {k: "%d of %d" % tuple(v) for k, v in per_outcome.items()})
    print("  first mismatch kind:", dict(kinds))
    print("  fields:", dict(fields.most_common(12)))
    if proc.stderr.strip():
        print("  stderr:", proc.stderr.strip()[:300])
    if args.out:
        json.dump(report, open(args.out, "w", encoding="utf-8"), indent=1)
        print("wrote", args.out)


if __name__ == "__main__":
    main()
