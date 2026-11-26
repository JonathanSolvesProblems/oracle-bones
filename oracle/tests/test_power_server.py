"""resurrection-power task 2.1: the server started as power/mcp.json says, from a copy of the
package outside this repository, answers initialize, lists its tools and writes nothing in
the copy (Requirements 6.1, 6.2)."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NINE = {"boot_target", "read_screen", "send_keys", "run_case", "run_batch", "compare", "ledger_read",
        "ledger_write", "shutdown"}


def installed_copy(tmp_path):
    plugin = tmp_path / "plugin"
    shutil.copytree(ROOT / "powers" / "oracle-bones", plugin, ignore=shutil.ignore_patterns("__pycache__"))
    return plugin


def start(plugin, extra_env=None):
    """Start the server the way power/mcp.json says: its command, args and env, in the plugin root."""
    (server,) = json.loads((plugin / "mcp.json").read_text(encoding="utf-8"))["mcpServers"].values()
    env = {k: v for k, v in os.environ.items() if not k.startswith(("ORACLE_", "PYTHON"))}
    env.update(server.get("env", {}))
    env.update(extra_env or {})
    exe = sys.executable if server["command"] == "python" else shutil.which(server["command"])
    return subprocess.Popen([exe, *server["args"]], cwd=str(plugin), env=env, stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")


def files(folder):
    return sorted(p.relative_to(folder).as_posix() for p in folder.rglob("*"))


def talk(proc, messages):
    """Send each message, collect every reply with an id, then end the session."""
    out, err = proc.communicate("".join(json.dumps(m) + "\n" for m in messages), timeout=60)
    proc.err = err
    return {m["id"]: m for m in map(json.loads, out.splitlines()) if "id" in m}


def test_the_installed_server_answers_and_writes_nothing(tmp_path):
    plugin = installed_copy(tmp_path)
    before = files(plugin)
    proc = start(plugin)
    replies = talk(proc, [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize",
         "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test"}}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
    ])
    assert proc.returncode == 0, proc.err
    assert replies[1]["result"]["serverInfo"]["name"] == "oracle"
    names = {t["name"] for t in replies[2]["result"]["tools"]}
    assert NINE <= names
    assert files(plugin) == before
