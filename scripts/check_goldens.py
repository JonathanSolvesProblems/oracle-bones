"""Check every file under oracle/goldens/ against the manifest (oracle-harness Requirement 10.3).

Usage: python scripts/check_goldens.py
Fails on a file missing from the manifest, a manifest entry with no file, or a hash that differs.
On a pass it prints the limit of the check, so a pass is not mistaken for proof.
Exit code 0 when the check passes, 1 when it fails.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from oracle import compare, paths  # noqa: E402


def main():
    problems = compare.golden_check(paths.GOLDENS)
    if problems:
        print("golden check failed: %d problem(s)" % len(problems), file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        return 1
    print("golden check passed: every file under oracle/goldens/ matches the manifest.")
    print(compare.LIMIT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
