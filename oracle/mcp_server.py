"""MCP server over stdio: JSON-RPC 2.0, one message per line.

Run with:  python -m oracle.mcp_server
Tool calls run on worker threads so a long batch does not block other requests. Nothing but
protocol messages is written to stdout.
"""

import json
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

from .schemas import TOOLS, output_schema

PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]
SERVER_INFO = {"name": "oracle", "title": "Oracle Bones harness", "version": "0.1.0"}


class Server:
    def __init__(self, oracle_factory, out=None):
        self.out = out or sys.stdout
        self.write_lock = threading.Lock()
        self.pool = ThreadPoolExecutor(16)
        self._factory = oracle_factory
        self._oracle = None
        self._oracle_lock = threading.Lock()

    @property
    def oracle(self):
        with self._oracle_lock:
            if self._oracle is None:
                self._oracle = self._factory()
            return self._oracle

    def send(self, msg):
        line = json.dumps(msg, separators=(",", ":"))
        with self.write_lock:
            self.out.write(line + "\n")
            self.out.flush()

    def reply(self, mid, result=None, error=None):
        msg = {"jsonrpc": "2.0", "id": mid}
        if error is not None:
            msg["error"] = error
        else:
            msg["result"] = result
        self.send(msg)

    @staticmethod
    def tool_list():
        tools = []
        for name, t in TOOLS.items():
            tools.append({"name": name, "description": t["description"], "inputSchema": dict(t["input"], type="object"),
                          "outputSchema": dict(output_schema(name), type="object")})
        return tools

    def _call(self, mid, params):
        name = params.get("name")
        result = self.oracle.call(name, params.get("arguments") or {})
        is_error = isinstance(result, dict) and set(result) == {"error"}
        self.reply(mid, {"content": [{"type": "text", "text": json.dumps(result)}],
                         "structuredContent": result, "isError": is_error})

    def handle(self, msg):
        method = msg.get("method")
        mid = msg.get("id")
        if method is None:
            return  # a response to something we never send; ignore
        if method == "initialize":
            asked = (msg.get("params") or {}).get("protocolVersion")
            version = asked if asked in PROTOCOL_VERSIONS else PROTOCOL_VERSIONS[0]
            self.pool.submit(lambda: self.oracle)  # start the session manager: removes orphaned containers
            self.reply(mid, {"protocolVersion": version, "capabilities": {"tools": {"listChanged": False}},
                             "serverInfo": SERVER_INFO,
                             "instructions": "Questions a dead DOS program in a sandbox. Start with ledger_read, "
                                             "then boot_target or run_case. The program is always right."})
        elif method in ("notifications/initialized", "notifications/cancelled"):
            return
        elif method == "ping":
            self.reply(mid, {})
        elif method == "tools/list":
            self.reply(mid, {"tools": self.tool_list()})
        elif method == "tools/call":
            self.pool.submit(self._safe_call, mid, msg.get("params") or {})
        elif mid is not None:
            self.reply(mid, error={"code": -32601, "message": "method not found: %s" % method})

    def _safe_call(self, mid, params):
        try:
            self._call(mid, params)
        except Exception as e:  # never leave a request unanswered
            self.reply(mid, error={"code": -32603, "message": "internal error: %s" % e})

    def serve(self, inp=None):
        inp = inp or sys.stdin
        for line in inp:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except ValueError:
                self.send({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "parse error"}})
                continue
            if isinstance(msg, list):
                for m in msg:
                    self.handle(m)
            else:
                self.handle(msg)
        self.pool.shutdown(wait=True)
        if self._oracle is not None:
            self._oracle.close()


def main():
    from .tools import Oracle
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdin.reconfigure(encoding="utf-8")
    Server(Oracle).serve()


if __name__ == "__main__":
    main()
