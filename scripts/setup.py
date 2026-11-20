"""Download, verify and unpack the program named in a target profile.

Usage: python scripts/setup.py [path/to/profile.json]
Exit code 0 when verified and unpacked, 1 when setup stopped (no pinned hash, or a mismatch).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from oracle import fetch, profile  # noqa: E402
from oracle.errors import OracleError  # noqa: E402


def main(argv):
    try:
        prof = profile.load(argv[1] if len(argv) > 1 else None)
        return fetch.setup(prof)
    except OracleError as e:
        print("setup failed (%s): %s" % (e.category, e.message), file=sys.stderr)
        if e.detail:
            print(e.detail, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
