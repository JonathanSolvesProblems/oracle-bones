"""resurrection-power task 3.1: init_workspace copies the templates without overwriting (7.1,
7.2), the templates are this repository's files (7.3), and each hook command runs in a new
workspace without an import error (7.4)."""

import json
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from oracle import workspace

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "build_power.py"
WANTED = [".kiro/agents/exhumer.md", ".kiro/agents/skeptic.md", ".kiro/hooks/guard-goldens.json",
          ".kiro/hooks/ledger-status-on-stop.json", ".kiro/hooks/oracle-after-task.json",
          ".kiro/hooks/oracle-verify-on-save.json", ".kiro/steering/oracle-law.md",
          ".kiro/workflows/resurrect.workflow.json", "oracle/targets/quick2.json", "scripts/guard_goldens.py",
          "scripts/ledger_status.py", "scripts/oracle_quick.py"]


def test_the_templates_are_the_listed_files():
    got = sorted(p.relative_to(workspace.TEMPLATES).as_posix() for p in workspace.TEMPLATES.rglob("*") if p.is_file())
    assert got == sorted(WANTED)


def test_init_an_empty_folder(tmp_path):
    out = workspace.init(tmp_path)
    assert sorted(out["copied"]) == sorted(WANTED) and out["kept"] == [] and out["unchanged"] == []
    for rel in WANTED:
        assert (tmp_path / rel).read_bytes() == (ROOT / rel).read_bytes(), rel
    assert "oracle/vendor/" in (tmp_path / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert out["gitignore"] == "added"
    power = json.loads((tmp_path / "oracle" / "power.json").read_text(encoding="utf-8"))
    assert Path(power["plugin_root"]) == workspace.TEMPLATES.parent


def test_init_leaves_a_different_file_alone_and_lists_it(tmp_path):
    law = tmp_path / ".kiro" / "steering" / "oracle-law.md"
    law.parent.mkdir(parents=True)
    law.write_text("my own law\n", encoding="utf-8")
    (tmp_path / ".gitignore").write_text("node_modules/\n", encoding="utf-8")
    out = workspace.init(tmp_path)
    assert out["kept"] == [".kiro/steering/oracle-law.md"]
    assert law.read_text(encoding="utf-8") == "my own law\n"
    assert (tmp_path / ".gitignore").read_text(encoding="utf-8") == "node_modules/\noracle/vendor/\n"
    again = workspace.init(tmp_path)
    assert again["copied"] == [] and again["kept"] == [".kiro/steering/oracle-law.md"]
    assert again["gitignore"] == "present"
    assert (tmp_path / ".gitignore").read_text(encoding="utf-8") == "node_modules/\noracle/vendor/\n"


def test_a_template_that_differs_from_this_repository_fails_the_drift_check(tmp_path):
    power = tmp_path / "power"
    shutil.copytree(ROOT / "powers" / "oracle-bones", power, ignore=shutil.ignore_patterns("__pycache__"))
    p = power / "workspace" / ".kiro" / "agents" / "skeptic.md"
    p.write_bytes(p.read_bytes() + b"\nedited\n")
    r = subprocess.run([sys.executable, str(SCRIPT), "--check", "--power", str(power)],
                       capture_output=True, text=True)
    assert r.returncode == 1 and "differs: workspace/.kiro/agents/skeptic.md" in r.stdout, r.stdout


@pytest.mark.parametrize("hook", sorted(h for h in WANTED if h.startswith(".kiro/hooks/")))
def test_each_hook_command_runs_in_a_new_workspace(tmp_path, hook):
    workspace.init(tmp_path)
    (spec,) = json.loads((tmp_path / hook).read_text(encoding="utf-8"))["hooks"]
    argv = shlex.split(spec["action"]["command"])
    assert argv[0] == "python"
    env = {k: v for k, v in os.environ.items() if not k.startswith(("ORACLE_", "PYTHON"))}
    payload = json.dumps({"hook_event_name": spec["trigger"], "cwd": str(tmp_path), "tool_name": "fs_write",
                          "tool_input": {"path": str(tmp_path / "notes.txt")}})
    r = subprocess.run([sys.executable, *argv[1:]], cwd=str(tmp_path), input=payload, capture_output=True,
                       text=True, env=env, timeout=120)
    assert "ImportError" not in r.stderr and "ModuleNotFoundError" not in r.stderr, r.stderr
    assert "Traceback" not in r.stderr, r.stderr
