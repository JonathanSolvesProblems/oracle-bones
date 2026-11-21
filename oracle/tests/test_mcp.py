"""Task 9.3: tool names, schemas, no golden-writing tool, and the stdio protocol end to end."""

import io
import os
import json
import re
import subprocess
import sys

import pytest

from oracle import paths
from oracle.errors import CATEGORIES, OracleError
from oracle.jsonschema_lite import validate
from oracle.mcp_server import Server
from oracle.schemas import ERROR, TOOLS, output_schema

EXPECTED = ["boot_target", "read_screen", "send_keys", "run_case", "run_batch", "compare", "ledger_read",
            "ledger_write", "shutdown"]


def test_nine_tools_with_valid_names():
    assert sorted(TOOLS) == sorted(EXPECTED)
    for name in TOOLS:
        assert re.match(r"^[a-zA-Z][a-zA-Z0-9_]*$", name)
        assert TOOLS[name]["input"]["type"] == "object"


def test_no_tool_takes_golden_content_or_a_case_id_to_write():
    banned = re.compile(r"case_id|^id$|printed|golden|path|content|fields", re.I)
    for name in ("run_case", "run_batch"):
        props = TOOLS[name]["input"]["properties"]
        assert not [p for p in props if banned.search(p)], name
    for name, t in TOOLS.items():
        text = json.dumps(t["input"])
        assert "oracle/goldens" not in text and "goldens" not in text.lower(), name


def test_every_error_category_validates():
    for cat in CATEGORIES:
        e = OracleError(cat, "m").to_dict()
        assert validate(e, ERROR) == []
        assert e["error"]["retryable"] == (cat in ("session_limit", "timeout", "input_ignored", "emulator_failed"))


class FakeOracle:
    def call(self, name, args):
        if name == "ledger_read":
            return {"screens": {}}
        return OracleError("invalid_arguments", "fake").to_dict()

    def close(self):
        pass


def run_server(lines):
    out = io.StringIO()
    srv = Server(FakeOracle, out=out)
    srv.serve(io.StringIO("\n".join(json.dumps(m) for m in lines) + "\n"))
    return [json.loads(x) for x in out.getvalue().splitlines()]


def test_protocol_without_docker():
    replies = run_server([
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "ledger_read", "arguments": {}}},
        {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "compare", "arguments": {"set": "quick"}}},
        {"jsonrpc": "2.0", "id": 5, "method": "nope"},
    ])
    by_id = {r["id"]: r for r in replies}
    assert by_id[1]["result"]["protocolVersion"] == "2025-06-18"
    assert sorted(t["name"] for t in by_id[2]["result"]["tools"]) == sorted(EXPECTED)
    for t in by_id[2]["result"]["tools"]:
        assert t["inputSchema"]["type"] == "object" and t["outputSchema"]["type"] == "object"
    assert by_id[3]["result"]["isError"] is False
    assert by_id[4]["result"]["isError"] is True
    assert by_id[4]["result"]["structuredContent"]["error"]["category"] == "invalid_arguments"
    assert by_id[5]["error"]["code"] == -32601


def test_tools_end_to_end_over_stdio(live, tmp_path):
    """Start the server the way .kiro/settings/mcp.json does and drive it as a client would."""
    proc = subprocess.Popen([sys.executable, "-m", "oracle.mcp_server"], cwd=paths.ROOT, env=dict(os.environ, ORACLE_LEDGER=str(tmp_path / "ledger.json"),
                                                                      ORACLE_GOLDENS=str(tmp_path / "goldens")),
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
    n = [0]

    def rpc(method, params=None):
        n[0] += 1
        proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": n[0], "method": method, "params": params or {}}) + "\n")
        proc.stdin.flush()
        while True:
            msg = json.loads(proc.stdout.readline())
            if msg.get("id") == n[0]:
                return msg

    def tool(name, **args):
        r = rpc("tools/call", {"name": name, "arguments": args})["result"]
        out = r["structuredContent"]
        assert validate(out, output_schema(name)) == [], (name, out)
        assert json.loads(r["content"][0]["text"]) == out
        return out

    try:
        assert rpc("initialize", {"protocolVersion": "2025-11-25"})["result"]["serverInfo"]["name"] == "oracle"
        boot = tool("boot_target")
        sid = boot["session_id"]
        assert boot["screen"]["screen_id"] == "title"
        assert tool("send_keys", session_id=sid, keys="{Enter}", expect="main_menu")["screen"]["screen_id"] == "main_menu"
        assert tool("send_keys", session_id=sid, keys="3{Enter}", expect="shape_menu")["screen"]["screen_id"] == "shape_menu"
        bad = tool("send_keys", session_id=sid, keys="{F3}")
        assert bad["error"]["category"] == "unsupported_key"
        assert tool("read_screen", session_id=sid)["screen"]["screen_id"] == "shape_menu"
        assert tool("shutdown", session_id=sid) == {"closed": [sid]}
        assert tool("read_screen", session_id=sid)["error"]["category"] == "session_not_found"

        inputs = {"left_slope": "3", "right_slope": "2", "bottom_width": "10", "n": ".035",
                  "discharge": "300", "slope": ".005"}
        case = tool("run_case", mode="normal_depth", shape="trapezoid", inputs=inputs)
        assert case["outcome"] == "result" and case["printed"]["depth"].strip() == "3.27"
        assert case["recorded"] is False and case["case_id"] is None
        rec = tool("run_case", mode="normal_depth", shape="trapezoid", inputs=inputs, record=True)
        assert rec["recorded"] is True and rec["case_id"] == "nd-trap-000003", rec
        controls = sorted(p.stem for p in (tmp_path / "goldens" / "cases").glob("*.json"))
        listed = [c["id"] for c in json.loads(paths.DEFAULT_PROFILE.read_text(encoding="utf-8"))["controls"]]
        assert controls == sorted(listed + ["nd-trap-000003"])
        again = tool("run_case", mode="normal_depth", shape="trapezoid", inputs=inputs, record=True)
        assert again["case_id"] == "nd-trap-000004"  # a new id, never a replacement
        wrong = tool("run_case", mode="normal_depth", shape="trapezoid", inputs={"left_slope": "3"})
        assert wrong["error"]["category"] == "invalid_arguments"
        batch = tool("run_batch", seed=1, count=2)
        assert batch["cases_run"] == 2 and batch["recorded"] == 0 and batch["cases_per_minute"] > 0
        assert tool("compare", set="quick")["error"]["category"] == "invalid_arguments"
        cov = tool("ledger_read", section="coverage")
        assert "unexercised_fields" in cov
        note = tool("ledger_write", op="decide", saw="the trapezoid printed 3.27", chose="record_case",
                    why="cite it", evidence=[rec["case_id"], rec["run_id"]])
        assert note["entry"]["n"] == 1
        assert tool("ledger_write", op="ask", question="q", evidence=["nd-trap-000999"])["error"]["category"] == \
            "invalid_arguments"
        assert tool("ledger_read", section="decisions")["decisions"][0]["chose"] == "record_case"
        assert tool("shutdown") == {"closed": []}
    finally:
        proc.stdin.close()
        proc.wait(timeout=60)
