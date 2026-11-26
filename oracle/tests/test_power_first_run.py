"""resurrection-power task 9: what the clean install of 2026-11-26 found (Requirement 10).

Each test is one thing a new user met in a workspace made by the power: the grading hook with
no rebuild to grade, the guard's message naming a command that is not there, an init reply that
said nothing about disabled hooks or the workspace being forgotten, and a first recording that
walked the profile without saying so. Written from the command line, outside Kiro.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

from oracle import compare, paths, recorder, workspace
from oracle.schemas import POWER_TOOLS, TOOLS

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "powers" / "oracle-bones" / "skills" / "resurrect" / "SKILL.md"


def _env():
    return {k: v for k, v in os.environ.items() if not k.startswith(("ORACLE_", "PYTHON"))}


def _run(tmp_path, script, payload=""):
    return subprocess.run([sys.executable, script], cwd=str(tmp_path), input=payload, capture_output=True,
                          text=True, env=_env(), timeout=120)


def test_init_says_what_a_new_window_needs(tmp_path):
    reply = workspace.init(tmp_path)
    text = " ".join(reply["next"])
    assert "disabled" in text and "open the folder again" in text
    assert "set_workspace" in text and "window" in text
    assert "oracle/rebuild.json" in text
    assert all(isinstance(line, str) and line.endswith(".") for line in reply["next"])
    assert "next" in POWER_TOOLS["init_workspace"]["output"]["required"]


def test_the_grading_script_grades_nothing_and_says_so_without_a_rebuild(tmp_path):
    workspace.init(tmp_path)
    r = _run(tmp_path, "scripts/oracle_quick.py")
    assert r.returncode == 0, r.stderr
    assert "No rebuild is set for this workspace" in r.stdout
    assert "oracle/rebuild.json" in r.stdout
    assert "could not compare" not in r.stdout + r.stderr and "Traceback" not in r.stderr


def test_a_workspace_names_its_own_rebuild(tmp_path, monkeypatch):
    cfg = {"rebuild": {"command": ["node", "app/src/oracle/entry.ts"], "time_limit_s": 25}}
    monkeypatch.setattr(paths, "INSTALLED", True)
    monkeypatch.setattr(paths, "ORACLE", tmp_path / "oracle")
    assert compare.rebuild_command(cfg) == (None, 25)  # never this repository's app
    (tmp_path / "oracle").mkdir()
    (tmp_path / "oracle" / "rebuild.json").write_text(json.dumps({"command": ["python", "mine.py"], "time_limit_s": 9}),
                                                      encoding="utf-8")
    assert compare.rebuild_command(cfg) == (["python", "mine.py"], 9)
    monkeypatch.setattr(paths, "INSTALLED", False)
    assert compare.rebuild_command(cfg) == (["node", "app/src/oracle/entry.ts"], 25)


def test_the_guard_names_what_works_where_it_runs(tmp_path):
    workspace.init(tmp_path)
    target = tmp_path / "oracle" / "goldens" / "cases" / "nd-trap-000003.json"
    payload = json.dumps({"hook_event_name": "PreToolUse", "cwd": str(tmp_path), "tool_name": "str_replace",
                          "tool_input": {"path": str(target)}})
    r = _run(tmp_path, "scripts/guard_goldens.py", payload)
    assert r.returncode == 2
    assert "is under oracle/goldens/" in r.stderr and "never typed" in r.stderr
    assert "run_case" in r.stderr and "record" in r.stderr
    assert "python -m oracle.record" not in r.stderr  # the package is not in a new workspace
    here = json.dumps({"hook_event_name": "PreToolUse", "cwd": str(ROOT), "tool_name": "str_replace",
                       "tool_input": {"path": str(ROOT / "oracle" / "goldens" / "cases" / "nd-trap-000001.json")}})
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "guard_goldens.py")], cwd=str(ROOT), input=here,
                       capture_output=True, text=True, env=_env(), timeout=120)
    assert r.returncode == 2 and "python -m oracle.record --rerecord" in r.stderr


def test_a_first_recording_says_what_it_recorded_first():
    assert recorder.profile_cases_note([]) == {}
    note = recorder.profile_cases_note(["nd-trap-000001", "obs-zerohold-000001"])
    assert note["profile_cases"] == ["nd-trap-000001", "obs-zerohold-000001"]
    assert "2" in note["note"] and "oracle/goldens/" in note["note"] and "profile" in note["note"]
    props = TOOLS["run_case"]["output"]["properties"]
    assert props["profile_cases"] == {"type": "array", "items": {"type": "string"}}
    assert props["note"] == {"type": "string"}


def test_the_skill_says_each_of_them():
    text = SKILL.read_text(encoding="utf-8")
    for needle in ("each new window", "disabled", "open the folder again", "oracle/rebuild.json",
                   "first recording", "a few minutes"):
        assert needle in text, needle
