"""Grade the rebuild against the quick set: the golden check, then the quick comparison.

Usage: python scripts/oracle_quick.py
Runs against stored goldens only and starts no container. Exit codes (oracle-harness 11.5):
0 every case matches, 1 mismatches, 3 the rebuild crashed or broke its contract, 4 the harness
could not compare (golden check failed, no goldens, no quick set, no rebuild command). Code 2 is
never used, because Kiro hooks treat 2 as a block.
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from oracle import compare  # noqa: E402


def main():
    started = time.monotonic()
    out = compare.run("quick")
    text = compare.summary(out, "quick")
    print(text, file=sys.stderr if out["exit_code"] else sys.stdout)
    print("took %.1f s" % (time.monotonic() - started))
    return out["exit_code"]


if __name__ == "__main__":
    sys.exit(main())
