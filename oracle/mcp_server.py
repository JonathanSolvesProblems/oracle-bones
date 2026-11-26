"""MCP server over stdio: JSON-RPC 2.0, one message per line.

Run with:  python -m oracle.mcp_server
Tool calls run on worker threads so a long batch does not block other requests. Nothing but
protocol messages is written to stdout.
"""

import json
import os
import sys
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from . import paths
from .schemas import POWER_TOOLS, TOOLS, output_schema

PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]
SERVER_INFO = {"name": "oracle", "title": "Oracle Bones harness", "version": "0.1.0"}


NO_WORKSPACE = ("No workspace is set. Call set_workspace with the absolute path of your project folder, "
                "then try again.")


def root_path(uri):
    """The folder a file: root URI names, or None."""
    from urllib.parse import urlparse
    from urllib.request import url2pathname
    u = urlparse(uri)
    if u.scheme != "file":
        return None
    p = url2pathname(u.path)
    if u.netloc and u.netloc != "localhost":
        p = "\\\\" + u.netloc + p if os.name == "nt" else "//" + u.netloc + p
    return p


class Server:
    def __init__(self, oracle_factory, out=None, installed=None):
        self.out = out or sys.stdout
        self.write_lock = threading.Lock()
        self.pool = ThreadPoolExecutor(16)
        self._factory = oracle_factory
        self._oracle = None
        self._oracle_lock = threading.Lock()
        # An installed power learns its workspace from the client (resurrection-power 6.3, 6.4).
        self.installed = paths.INSTALLED if installed is None else installed
        self.client_roots = False
        self._pending = {}  # id of a request we sent -> what to do with the answer
        self._sent = 0
        self.workspace_from = None

    # ---- the workspace (installed power only) ------------------------------------------

    def set_workspace(self, path, source):
        """Use path as the workspace. Returns the tool's reply."""
        from .errors import OracleError
        p = Path(path)
        if not p.is_absolute() or not p.is_dir():
            return OracleError("invalid_arguments", "set_workspace needs an existing folder as an absolute path: %s"
                               % path).to_dict()
        p = p.resolve()
        code = paths.CODE.resolve()
        if p == code or code in p.parents:
            return OracleError("invalid_arguments", "the workspace cannot be inside the power's own folder %s"
                               % code).to_dict()
        with self._oracle_lock:
            if paths.ROOT is not None and Path(paths.ROOT).resolve() != p:
                return OracleError("invalid_arguments", "the workspace is already %s; restart the oracle server to "
                                   "use another folder" % paths.ROOT).to_dict()
            if paths.ROOT is None:
                paths.use_workspace(p)
                self.workspace_from = source
        return {"workspace": str(p), "from": self.workspace_from}

    def ask_roots(self):
        self._sent += 1
        mid = "oracle-roots-%d" % self._sent
        self._pending[mid] = self._got_roots
        self.send({"jsonrpc": "2.0", "id": mid, "method": "roots/list"})

    def _got_roots(self, msg):
        roots = (msg.get("result") or {}).get("roots") or []
        if len(roots) == 1 and paths.ROOT is None:
            p = root_path(roots[0].get("uri", ""))
            if p:
                self.set_workspace(p, "roots")  # an unusable root leaves set_workspace to the user

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
    def tool_list(installed=False):
        tools = []
        listed = dict(TOOLS, **POWER_TOOLS) if installed else TOOLS
        for name, t in listed.items():
            tools.append({"name": name, "description": t["description"], "inputSchema": dict(t["input"], type="object"),
                          "outputSchema": dict(output_schema(name), type="object")})
        return tools

    def _call(self, mid, params):
        name = params.get("name")
        args = params.get("arguments") or {}
        if not self.installed:
            result = self.oracle.call(name, args)
        elif name == "set_workspace":
            from .jsonschema_lite import validate
            from .errors import OracleError
            bad = validate(args, POWER_TOOLS[name]["input"])
            result = (OracleError("invalid_arguments", "invalid arguments", {"errors": bad}).to_dict() if bad
                      else self.set_workspace(args["path"], "set_workspace"))
        elif paths.ROOT is None:
            from .errors import OracleError
            result = OracleError("setup_required", NO_WORKSPACE).to_dict()
        else:
            result = self.oracle.call(name, args)
        is_error = isinstance(result, dict) and set(result) == {"error"}
        self.reply(mid, {"content": [{"type": "text", "text": json.dumps(result)}],
                         "structuredContent": result, "isError": is_error})

    def handle(self, msg):
        method = msg.get("method")
        mid = msg.get("id")
        if method is None:
            answer = self._pending.pop(mid, None)  # an answer to a request we sent, or ignored
            if answer:
                answer(msg)
            return
        if method == "initialize":
            caps = (msg.get("params") or {}).get("capabilities") or {}
            self.client_roots = caps.get("roots") is not None
            asked = (msg.get("params") or {}).get("protocolVersion")
            version = asked if asked in PROTOCOL_VERSIONS else PROTOCOL_VERSIONS[0]
            if paths.ROOT is not None:
                self.pool.submit(lambda: self.oracle)  # start the session manager: removes orphaned containers
            self.reply(mid, {"protocolVersion": version, "capabilities": {"tools": {"listChanged": False}},
                             "serverInfo": SERVER_INFO,
                             "instructions": "Questions a dead DOS program in a sandbox. Start with ledger_read, "
                                             "then boot_target or run_case. The program is always right."})
        elif method in ("notifications/initialized", "notifications/roots/list_changed"):
            if self.installed and self.client_roots and paths.ROOT is None:
                self.ask_roots()
        elif method == "notifications/cancelled":
            return
        elif method == "ping":
            self.reply(mid, {})
        elif method == "tools/list":
            self.reply(mid, {"tools": self.tool_list(self.installed)})
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
