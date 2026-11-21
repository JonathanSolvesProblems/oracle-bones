"""Check that every acceptance criterion in a spec cites recorded evidence (exhume-loop Property 1).

Usage: python scripts/check_traceability.py [path/to/requirements.md]
Default: .kiro/specs/quick2-solver/requirements.md

Each numbered line under an "Acceptance Criteria" heading must end with one citation:
  _(observed: <case ids or capture paths, comma-separated>)_
  _(unobserved; help: <capture paths, comma-separated>)_
A case id must be a stored golden; a capture path must be listed in the goldens manifest.
Exploratory run ids, batch ids and paths under oracle/out/ are never citable.
Exit code 0 when every criterion passes, 1 otherwise.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from oracle import evidence, manifest, paths  # noqa: E402

DEFAULT = paths.ROOT / ".kiro" / "specs" / "quick2-solver" / "requirements.md"
HEADING = re.compile(r"^#+\s")
CRITERIA = re.compile(r"^#+\s+Acceptance Criteria\s*$", re.I)
NUMBERED = re.compile(r"^\s*\d+\.\s+\S")
CITATION = re.compile(r"_\((observed|unobserved; help):\s*([^)]*)\)_\s*$")


def criteria(lines):
    """(line number, text) of every numbered line under an Acceptance Criteria heading."""
    inside = False
    for n, line in enumerate(lines, 1):
        if HEADING.match(line):
            inside = bool(CRITERIA.match(line))
        elif inside and NUMBERED.match(line):
            yield n, line


def problems_in(text, goldens_root=None):
    """[(line number, problem)] for the spec text. Empty when every criterion cites evidence."""
    root = Path(goldens_root or paths.GOLDENS)
    listed = manifest.load(root)
    out = []
    count = 0
    for n, line in criteria(text.splitlines()):
        count += 1
        m = CITATION.search(line.rstrip())
        if not m:
            out.append((n, "no citation; end the criterion with _(observed: ...)_ or _(unobserved; help: ...)_"))
            continue
        kind, body = m.group(1), m.group(2)
        items = [i.strip() for i in body.split(",") if i.strip()]
        if not items:
            out.append((n, "the citation names nothing"))
        for item in items:
            k = evidence.kind(item)
            if item.startswith("oracle/out/") or k in ("run", "batch"):
                out.append((n, "%s is an exploratory run, which is never citable; record the case" % item))
            elif kind == "unobserved; help" and k != "capture":
                out.append((n, "%s: a help citation must be a capture path" % item))
            elif k not in ("case", "capture"):
                out.append((n, "%s is not a case id or a capture path" % item))
            else:
                p = evidence.problem(item, goldens_root=root, listed=listed)
                if p:
                    out.append((n, "%s: %s" % (item, p)))
    return out, count


def main(argv):
    spec = Path(argv[1]) if len(argv) > 1 else DEFAULT
    if not spec.exists():
        print("%s does not exist yet: 0 criteria, nothing to check" % spec)
        return 0
    found, count = problems_in(spec.read_text(encoding="utf-8"))
    for n, problem in found:
        print("%s:%d: %s" % (spec, n, problem))
    print("%d criteria checked, %d problem(s)" % (count, len(found)))
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
