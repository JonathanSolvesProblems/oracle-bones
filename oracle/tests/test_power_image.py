"""resurrection-power task 4.2: the runner image is built on the user's machine from the package's
Dockerfile, which fetches emu2 at the pinned commit, and emu2 runs as its own process
(Requirements 8.2, 8.3)."""

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROBE = """
import json, sys
from oracle import sandbox
seen = []
def docker(*args, **kw):
    seen.append(list(args))
    class R: returncode = 1
    return R()
sandbox.docker = docker
sandbox.ensure_image(log=lambda *a: None)
print(json.dumps(seen))
"""


def test_the_dockerfile_fetches_emu2_at_the_pinned_commit():
    text = (ROOT / "powers" / "oracle-bones" / "oracle" / "Dockerfile").read_text(encoding="utf-8")
    assert 'test -n "$EMU2_COMMIT"' in text  # no commit, no image
    assert 'git checkout --detach "$EMU2_COMMIT"' in text
    assert 'test "$(git rev-parse HEAD)" = "$EMU2_COMMIT"' in text
    assert "install -m 0755 emu2 /usr/local/bin/emu2" in text
    cfg = json.loads((ROOT / "powers" / "oracle-bones" / "oracle" / "harness.json").read_text(encoding="utf-8"))
    assert re.match(r"^[0-9a-f]{40}$", cfg["emu2"]["commit"])


def test_emu2_runs_as_its_own_process():
    agent = (ROOT / "powers" / "oracle-bones" / "oracle" / "runner" / "agent.py").read_text(encoding="utf-8")
    assert 'argv = req.get("argv") or ["emu2", req["program"]]' in agent
    assert "pty.fork()" in agent and "os.execvpe(argv[0], argv, env)" in agent


def test_the_image_is_built_from_the_installed_package(tmp_path):
    plugin = tmp_path / "plugin"
    shutil.copytree(ROOT / "powers" / "oracle-bones", plugin, ignore=shutil.ignore_patterns("__pycache__"))
    r = subprocess.run([sys.executable, "-B", "-c", PROBE], cwd=str(plugin), capture_output=True, text=True,
                       timeout=60)
    assert r.returncode == 0, r.stderr
    calls = json.loads(r.stdout.splitlines()[-1])
    build = next(c for c in calls if c[0] == "build")
    oracle = str((plugin / "oracle").resolve())
    assert build[build.index("-f") + 1] == str(Path(oracle) / "Dockerfile")
    assert build[-1] == oracle
    commit = json.loads((plugin / "oracle" / "harness.json").read_text(encoding="utf-8"))["emu2"]["commit"]
    assert "EMU2_COMMIT=" + commit in build
