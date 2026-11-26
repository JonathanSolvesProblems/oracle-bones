"""resurrection-power task 1.2: the harness copy in power/ is generated, never edited by hand
(Requirements 5.1, 5.2), and keeps to the standard library (5.3)."""

import ast
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "build_power.py"
POWER = ROOT / "power"


def check(power):
    return subprocess.run([sys.executable, str(SCRIPT), "--check", "--power", str(power)],
                          capture_output=True, text=True, cwd=str(ROOT))


@pytest.fixture
def copy(tmp_path):
    dest = tmp_path / "power"
    shutil.copytree(POWER, dest, ignore=shutil.ignore_patterns("__pycache__"))
    return dest


def test_the_committed_package_matches_the_script():
    r = check(POWER)
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_changed_file_is_named(copy):
    p = copy / "oracle" / "paths.py"
    p.write_bytes(p.read_bytes() + b"# edited by hand\n")
    r = check(copy)
    assert r.returncode == 1 and "differs: oracle/paths.py" in r.stdout, r.stdout


def test_a_missing_file_is_named(copy):
    (copy / "oracle" / "Dockerfile").unlink()
    r = check(copy)
    assert r.returncode == 1 and "missing: oracle/Dockerfile" in r.stdout, r.stdout


def test_an_extra_file_is_named(copy):
    (copy / "oracle" / "extra.py").write_text("x = 1\n", encoding="utf-8")
    r = check(copy)
    assert r.returncode == 1 and "extra: oracle/extra.py" in r.stdout, r.stdout


def test_the_check_writes_nothing(copy):
    (copy / "oracle" / "Dockerfile").unlink()
    check(copy)
    assert not (copy / "oracle" / "Dockerfile").exists()


def _imports(path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                yield a.name.split(".")[0]
        elif isinstance(node, ast.ImportFrom) and node.level == 0:
            yield node.module.split(".")[0]


# runner/agent.py runs only inside the container, where the Dockerfile installs python3-pyte,
# and it imports settle.py as a sibling there. No host module imports it.
CONTAINER_ONLY = {"runner/agent.py": {"pyte", "settle"}}


def test_the_copy_imports_only_the_standard_library():
    allowed = set(sys.stdlib_module_names) | {"oracle"}
    bad = []
    root = POWER / "oracle"
    for p in sorted(root.rglob("*.py")):
        rel = p.relative_to(root).as_posix()
        extra = CONTAINER_ONLY.get(rel, set())
        bad += ["%s imports %s" % (rel, m) for m in _imports(p) if m not in allowed | extra]
        if rel not in CONTAINER_ONLY:
            assert "runner.agent" not in p.read_text(encoding="utf-8"), rel
    assert bad == []
