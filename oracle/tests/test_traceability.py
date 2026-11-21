"""Property 1 (exhume-loop): every criterion cites a stored case or a listed capture."""

import importlib.util
import os
import subprocess
import sys

from oracle import paths

SCRIPT = paths.ROOT / "scripts" / "check_traceability.py"
spec = importlib.util.spec_from_file_location("check_traceability", SCRIPT)
ct = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ct)

GOOD_CAPTURE = "oracle/goldens/captures/nd-trap-000001/screen-10.txt"
ENV = dict(os.environ, ORACLE_GOLDENS=str(paths.REPO_GOLDENS))  # check against the committed goldens

SPEC = """# Requirements Document

## Introduction

1. A numbered line outside the criteria is not checked.

### Requirement 1: Rejected input

#### Acceptance Criteria

1. WHEN the depth prints THE SYSTEM SHALL print it. _(observed: nd-trap-000001, nd-trap-000002)_
2. WHEN help says so THE SYSTEM SHALL do it. _(unobserved; help: {good})_
3. WHEN there is no citation THE SYSTEM SHALL fail.
4. WHEN the case is missing THE SYSTEM SHALL fail. _(observed: nd-trap-000999)_
5. WHEN the capture is unlisted THE SYSTEM SHALL fail. _(observed: oracle/goldens/captures/nd-trap-000001/screen-99.txt)_
6. WHEN a run id is cited THE SYSTEM SHALL fail. _(observed: 20261121-115234-d34a50)_
7. WHEN a run log is cited THE SYSTEM SHALL fail. _(observed: oracle/out/runs/20261121-115234-d34a50/final.txt)_
8. WHEN help cites a case THE SYSTEM SHALL fail. _(unobserved; help: nd-trap-000001)_

## Out of scope

1. Not checked either.
""".format(good=GOOD_CAPTURE)


def test_each_kind_of_citation():
    found, count = ct.problems_in(SPEC, paths.REPO_GOLDENS)
    assert count == 8
    lines = SPEC.splitlines()
    bad = sorted({lines[n - 1].split(".")[0].strip() for n, _ in found})
    assert bad == ["3", "4", "5", "6", "7", "8"]


def test_a_clean_spec_passes_and_a_missing_one_says_so(tmp_path):
    good = tmp_path / "requirements.md"
    good.write_text("#### Acceptance Criteria\n\n1. X. _(observed: obs-nodata-000001, %s)_\n" % GOOD_CAPTURE,
                    encoding="utf-8")
    run = subprocess.run([sys.executable, str(SCRIPT), str(good)], capture_output=True, text=True, env=ENV)
    assert run.returncode == 0, run.stdout
    assert "1 criteria checked, 0 problem(s)" in run.stdout
    missing = subprocess.run([sys.executable, str(SCRIPT), str(tmp_path / "none.md")], capture_output=True, text=True, env=ENV)
    assert missing.returncode == 0 and "0 criteria" in missing.stdout
    bad = tmp_path / "bad.md"
    bad.write_text("#### Acceptance Criteria\n\n1. X.\n", encoding="utf-8")
    run = subprocess.run([sys.executable, str(SCRIPT), str(bad)], capture_output=True, text=True, env=ENV)
    assert run.returncode == 1 and "bad.md:3:" in run.stdout
