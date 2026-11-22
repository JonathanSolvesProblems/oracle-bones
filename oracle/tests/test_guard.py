"""scripts/guard_goldens.py (task 10.1), tested with piped JSON in the shape the hook sends."""
import json
import os
import subprocess
import sys

import pytest

from oracle import paths

GUARD = paths.ROOT / "scripts" / "guard_goldens.py"
ROOT = str(paths.ROOT)


def pipe(payload, raw=None):
    data = raw if raw is not None else json.dumps(payload)
    r = subprocess.run([sys.executable, str(GUARD)], input=data, capture_output=True, text=True, cwd=ROOT)
    return r.returncode, r.stderr


def payload(tool, **tool_input):
    return {"session_id": "s", "hook_event_name": "PreToolUse", "cwd": ROOT, "tool_name": tool,
            "tool_input": tool_input}


GOLDEN = os.path.join(ROOT, "oracle", "goldens", "cases", "nd-trap-000001.json")


@pytest.mark.parametrize("p", [
    payload("str_replace", path=GOLDEN, oldStr="3.27", newStr="3.28", replace_all=False),
    payload("fs_write", path="oracle/goldens/cases/nd-trap-999999.json", text="{}"),
    payload("fs_write", path="oracle\\goldens\\MANIFEST.json", text="{}"),
    payload("fs_write", path="app/../oracle/goldens/captures/x/screen-00.txt", text=""),
    payload("smart_relocate", sourcePath="docs/build-log.md", destinationPath="oracle/goldens/build-log.md"),
    payload("fs_write", paths=["docs/a.md", "oracle/goldens/b.json"]),
    payload("fs_write", path=os.path.join(ROOT, "oracle", "goldens")),
] + ([payload("fs_write", path=GOLDEN.upper())] if os.name == "nt" else []))
def test_writes_under_goldens_are_refused_with_exit_code_2(p):
    code, err = pipe(p)
    assert code == 2
    assert "Refused" in err and "oracle/goldens/" in err


@pytest.mark.parametrize("p", [
    payload("str_replace", path=os.path.join(ROOT, "docs", "build-log.md"), oldStr="a",
            newStr="see oracle/goldens/cases/nd-trap-000001.json", replace_all=False),
    payload("fs_write", path="oracle/goldens-notes.md", text="x"),
    payload("fs_write", path="oracle/out/mismatches.json", text="[]"),
    payload("execute_pwsh", command="Get-Content oracle/goldens/MANIFEST.json"),
])
def test_other_writes_are_allowed(p):
    assert pipe(p) == (0, "")


def test_the_hook_matches_the_file_write_tools_only():
    import re
    hook = json.loads((paths.ROOT / ".kiro" / "hooks" / "guard-goldens.json").read_text(encoding="utf-8"))
    matcher = re.compile(hook["hooks"][0]["matcher"])
    for tool in ("fs_write", "fs_append", "str_replace", "smart_relocate", "semantic_rename", "delete_file"):
        assert matcher.search(tool), tool
    for tool in ("execute_pwsh", "execute_bash", "read_file", "mcp_oracle_ledger_write", "mcp_oracle_run_case",
                 "web_fetch", "fs_write_extra"):
        assert not matcher.search(tool), tool


def test_a_payload_that_is_not_json_is_refused():
    code, err = pipe(None, raw="not json")
    assert code == 2 and "cannot check" in err


def test_the_hook_command_passes_exit_code_2_through_powershell():
    """The hook runs `python scripts/guard_goldens.py` from the repository root. Pipe the
    payload through PowerShell the same way and check the exit code survives."""
    if os.name != "nt":
        pytest.skip("Windows only")
    data = json.dumps(payload("str_replace", path=GOLDEN, oldStr="a", newStr="b")).replace("'", "''")
    cmd = "'%s' | python scripts/guard_goldens.py; exit $LASTEXITCODE" % data
    r = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, cwd=ROOT)
    assert r.returncode == 2, (r.stdout, r.stderr)
