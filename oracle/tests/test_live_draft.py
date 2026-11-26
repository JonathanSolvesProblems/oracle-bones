"""resurrection-power task 5.2: a live boot of MAINHLP.EXE from the QUICK-2 archive, which has no
profile, through a server started as power/mcp.json says from a fresh copy of the package. The
draft is compared with what that boot left: the server's reply and the run's capture
(Requirement 2.4). Whatever the program does is the result; a program that does not start is
a valid one, and then the draft must say so."""

import hashlib
import json

from oracle import fetch
from oracle.tests.test_power_server import installed_copy, start


def test_mainhlp_draft_matches_its_boot(live, tmp_path):
    archive = fetch.archive_path(live).resolve()
    ws = tmp_path / "ws"
    ws.mkdir()
    plugin = installed_copy(tmp_path)
    proc = start(plugin)
    n = [0]

    def rpc(method, params):
        n[0] += 1
        proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": n[0], "method": method, "params": params}) + "\n")
        proc.stdin.flush()
        while True:
            msg = json.loads(proc.stdout.readline())
            if msg.get("id") == n[0]:
                return msg

    try:
        rpc("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}})
        assert rpc("tools/call", {"name": "set_workspace", "arguments": {"path": str(ws)}})["result"]["isError"] is False
        reply = rpc("tools/call", {"name": "draft_target",
                                   "arguments": {"archive": str(archive), "exe": "MAINHLP.EXE"}})["result"]
    finally:
        proc.stdin.close()
        proc.wait(timeout=60)
    out = reply["structuredContent"]
    print(json.dumps(out, indent=2))
    assert reply["isError"] is False, out
    d = json.loads((ws / out["path"]).read_text(encoding="utf-8"))
    assert d == out["draft"] and d["status"] == "draft" and d["name"] == "mainhlp"
    assert d["archive"]["sha256"] == hashlib.sha256(archive.read_bytes()).hexdigest() == live["archive"]["sha256"]
    rows = d["first_screen"]
    if d["capture"]:
        assert (ws / d["capture"]).read_text(encoding="utf-8").splitlines() == rows
    text = bool(rows) and any(r.strip() for r in rows)
    if d["started"]:
        assert text and not [f for f in d["failures"] if f["category"] == "emulator_failed"]
    else:
        assert d["failures"], "a draft that did not start must say what failed"
