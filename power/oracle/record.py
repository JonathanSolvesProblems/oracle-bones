"""Record goldens from the command line.

  python -m oracle.record --controls                 record the control cases not yet stored
  python -m oracle.record --seed 1 --count 100       record a generated batch (controls first)
      [--ranges practical]                           draw from the practical ranges instead
  python -m oracle.record --rerecord nd-trap-000001  replace one golden, logged in `rerecords`
  python -m oracle.record --replay [CASE_ID ...]     rerun goldens (all when none named) and compare;
                                                     stores nothing
  python -m oracle.record --build-quickset           write oracle/quickset.json from stored goldens

Replacing a golden is possible only here. The MCP tools reach the create-only path.
Exit codes: 0 done, 1 a harness failure, a case that could not be recorded, or a replay that differs.
"""

import argparse
import json
import sys

from . import profile as profile_mod
from . import reread, sandbox
from .errors import OracleError
from .recorder import Recorder


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m oracle.record", description=__doc__.split("\n")[0])
    ap.add_argument("--profile", help="path to a target profile (default: oracle/targets/quick2.json)")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--controls", action="store_true", help="record the control cases not yet stored")
    g.add_argument("--rerecord", metavar="CASE_ID", help="replace one golden by rerunning its inputs")
    g.add_argument("--seed", type=int, help="record a generated batch from this seed")
    g.add_argument("--replay", nargs="*", metavar="CASE_ID", help="rerun goldens and compare (all when none named)")
    g.add_argument("--build-quickset", action="store_true", help="write oracle/quickset.json from stored goldens")
    ap.add_argument("--quickset-seed", type=int, default=1, help="seed for the quick set's spread")
    ap.add_argument("--count", type=int, default=0, help="cases in the batch (with --seed)")
    ap.add_argument("--modes", nargs="*", help="limit the batch to these modes")
    ap.add_argument("--shapes", nargs="*", help="limit the batch to these shapes")
    ap.add_argument("--ranges", choices=("accepted", "practical"), default="accepted",
                    help="range set the batch draws from (default: accepted)")
    args = ap.parse_args(argv)

    if args.build_quickset:  # reads stored goldens only; needs no container
        from . import compare
        try:
            prof = profile_mod.load(args.profile)
        except OracleError as e:
            print("%s: %s" % (e.category, e.message), file=sys.stderr)
            return 1
        qs = compare.build_quickset(prof, Recorder().store, seed=args.quickset_seed)
        path = compare.write_quickset(qs)
        print("wrote %s: %d case(s) of %d" % (path.name, qs["count"], qs["size"]))
        print("  controls %(control)d, practical ranges %(practical)d, accepted ranges %(accepted)d"
              % qs["by_range_set"])
        for k, n in qs["by_pair"].items():
            print("  %-32s %d" % (k, n))
        for u in qs["uncovered"]:
            print("  uncovered: %s%s" % (u["pair"], "" if u["flow_mapped"] else " (no flow mapped yet)"))
        return 0
    if not sandbox.docker_available():
        print("Docker is not running. Start Docker Desktop and try again.", file=sys.stderr)
        return 1
    try:
        prof = profile_mod.load(args.profile)
        rec = Recorder()
        if args.controls or args.seed is not None:
            reread.check(prof, rec.store)  # a person repairs goldens with --rerecord, so it skips this
        if args.controls:
            out = rec.ensure_controls(prof)
            rec.update_coverage()
            if not out:
                print("every control case is already stored")
            for r in out:
                print("%s  %s  %s" % (r["case_id"], r["outcome"], r["capture_path"]))
        elif args.replay is not None:
            ids = args.replay or rec.store.ids()
            bad = 0
            for cid in ids:
                r = rec.replay(prof, cid)
                bad += not r["match"]
                print("%s  %s  %s" % (cid, "same" if r["match"] else "DIFFERS", r["run_id"]))
                for d in r["differences"]:
                    print("    %s: golden %r, replay %r" % (d["what"], d["golden"], d["replay"]))
            return 1 if bad else 0
        elif args.rerecord:
            out = rec.rerecord(prof, args.rerecord)
            print("replaced %s: %s -> %s" % (out["case_id"], out["old"], out["new"]))
        else:
            if args.count < 1:
                ap.error("--seed needs --count of 1 or more")
            out = rec.create_batch(prof, args.seed, args.count, args.modes, args.shapes, range_set=args.ranges)
            print(json.dumps(out, indent=2))
            print("%s cases per minute" % out["cases_per_minute"])
            if out["by_outcome"].get("harness_error"):
                return 1
    except OracleError as e:
        print("%s: %s" % (e.category, e.message), file=sys.stderr)
        if e.detail:
            print(json.dumps(e.detail, indent=2), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
