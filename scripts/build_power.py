"""Write the generated parts of the power package from this repository (resurrection-power
Requirement 5.1). Nothing under power/oracle/ or power/workspace/ is edited by hand.

Usage: python scripts/build_power.py [--check] [--power DIR]
--check compares without writing and prints each differing, missing or extra file; exit code 1
when there is any. DIR defaults to power/. Files are copied byte for byte.
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (glob relative to the repository, folder in the package that receives it). A match keeps its
# path relative to the repository: oracle/x.py goes to <package>/oracle/x.py, and a workspace
# template .kiro/agents/exhumer.md goes to <package>/workspace/.kiro/agents/exhumer.md.
INCLUDE = [
    ("oracle/*.py", ""),
    ("oracle/runner/*.py", ""),
    ("oracle/Dockerfile", ""),
    ("oracle/.dockerignore", ""),
    ("oracle/*.json", ""),
    ("oracle/targets/profile.schema.json", ""),
]
# The folders this script owns. Every file in them must come from INCLUDE.
GENERATED = ("oracle", "workspace")


def expected():
    """{path in the package: source path in the repository}."""
    out = {}
    for pattern, prefix in INCLUDE:
        matches = sorted(p for p in ROOT.glob(pattern) if p.is_file())
        if not matches:
            raise SystemExit("include pattern matched nothing: %s" % pattern)
        for src in matches:
            rel = src.relative_to(ROOT).as_posix()
            out[(prefix + "/" + rel) if prefix else rel] = src
    return out


def present(power):
    out = set()
    for top in GENERATED:
        for p in (power / top).rglob("*"):
            if p.is_file() and "__pycache__" not in p.parts:
                out.add(p.relative_to(power).as_posix())
    return out


def compare(power):
    want = expected()
    have = present(power)
    problems = []
    for rel, src in sorted(want.items()):
        dest = power / rel
        if rel not in have:
            problems.append("missing: " + rel)
        elif dest.read_bytes() != src.read_bytes():
            problems.append("differs: " + rel)
    problems += ["extra: " + rel for rel in sorted(have - set(want))]
    return problems


def build(power):
    want = expected()
    for rel in sorted(present(power) - set(want)):
        (power / rel).unlink()
    for rel, src in sorted(want.items()):
        dest = power / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = src.read_bytes()
        if not dest.exists() or dest.read_bytes() != data:
            dest.write_bytes(data)
    return len(want)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="compare only; write nothing")
    ap.add_argument("--power", default=str(ROOT / "power"), help="the package folder")
    args = ap.parse_args(argv)
    power = Path(args.power)
    if args.check:
        problems = compare(power)
        for p in problems:
            print(p)
        print("%d file(s) differ from what scripts/build_power.py would write" % len(problems)
              if problems else "the package matches scripts/build_power.py")
        return 1 if problems else 0
    print("wrote %d file(s) into %s" % (build(power), power))
    return 0


if __name__ == "__main__":
    sys.exit(main())
