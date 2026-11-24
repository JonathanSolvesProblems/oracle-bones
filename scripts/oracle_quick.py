"""Grade the rebuild against the quick set (or, with --full, every golden): the golden check,
then the comparison.

Usage: python scripts/oracle_quick.py [--full]

Runs against stored goldens only and starts no container. Exit codes (oracle-harness 11.5):
0 every case matches, 1 mismatches, 3 the rebuild crashed or broke its contract, 4 the harness
could not compare (golden check failed, no goldens, no quick set, no rebuild command). Code 2 is
never used, because Kiro hooks treat 2 as a block.
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from oracle import compare  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description="Grade the rebuild against the stored goldens.")
    parser.add_argument("--full", action="store_true", help="grade every golden, not just the quick set")
    args = parser.parse_args(argv)
    which = "full" if args.full else "quick"
    started = time.monotonic()
    out = compare.run(which)
    text = compare.summary(out, which)
    print(text, file=sys.stderr if out["exit_code"] else sys.stdout)
    print("took %.1f s" % (time.monotonic() - started))
    return out["exit_code"]


if __name__ == "__main__":
    sys.exit(main())
