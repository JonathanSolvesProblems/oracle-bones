"""resurrection-power task 2.2: the workspace comes from MCP roots or set_workspace, every tool
refuses with one message until it is known, and every user path hangs from it (6.3 to 6.5)."""

import io
import json
import time
from pathlib import Path

import pytest

from oracle import paths
from oracle.mcp_server import Server

USER_PATHS = ("ROOT", "ORACLE", "VENDOR", "OUT", "REPO_GOLDENS", "GOLDENS", "TARGETS", "LEDGER", "RUNS",
              "DEFAULT_PROFILE")


@pytest.fixture
def no_workspace(monkeypatch):
    """paths as an installed power starts: no workspace. Every user path is restored afterwards."""
    for name in USER_PATHS:
        monkeypatch.setattr(paths, name, None)
    monkeypatch.delenv("ORACLE_LEDGER", raising=False)
    monkeypatch.delenv("ORACLE_GOLDENS", raising=False)


class Client:
    """A fake MCP client driving an installed-mode server in this process."""

    def __init__(self, roots=None):
        self.made = []
        self.out = io.StringIO()
        self.roots = roots
        self.srv = Server(self._factory, out=self.out, installed=True)
        self.seen = 0
        caps = {"roots": {"listChanged": True}} if roots is not None else {}
        self.request("initialize", {"protocolVersion": "2025-06-18", "capabilities": caps})
        self.srv.handle({"jsonrpc": "2.0", "method": "notifications/initialized"})
        if roots is not None:
            ask = self.next_message()
            assert ask["method"] == "roots/list"
            self.srv.handle({"jsonrpc": "2.0", "id": ask["id"], "result": {"roots": roots}})

    def _factory(self):
        self.made.append(paths.ROOT)
        return FakeOracle()

    def next_message(self, timeout=10):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            lines = self.out.getvalue().splitlines()
            if len(lines) > self.seen:
                self.seen += 1
                return json.loads(lines[self.seen - 1])
            time.sleep(0.01)
        raise AssertionError("no message from the server")

    def request(self, method, params=None):
        mid = "c%d" % self.seen
        self.srv.handle({"jsonrpc": "2.0", "id": mid, "method": method, "params": params or {}})
        while True:
            msg = self.next_message()
            if msg.get("id") == mid:
                return msg

    def tool(self, name, **args):
        return self.request("tools/call", {"name": name, "arguments": args})["result"]["structuredContent"]


class FakeOracle:
    def call(self, name, args):
        return {"screens": {}} if name == "ledger_read" else {"closed": []}

    def close(self):
        pass


def file_uri(p):
    return Path(p).resolve().as_uri()


def test_one_file_root_is_the_workspace(no_workspace, tmp_path):
    c = Client(roots=[{"uri": file_uri(tmp_path), "name": "project"}])
    assert paths.ROOT == tmp_path.resolve()
    assert c.tool("ledger_read") == {"screens": {}}
    assert c.made == [tmp_path.resolve()]


@pytest.mark.parametrize("roots", [None, [], "two", "not-file"])
def test_without_one_file_root_every_tool_asks_for_set_workspace(no_workspace, tmp_path, roots):
    if roots == "two":
        roots = [{"uri": file_uri(tmp_path / "a")}, {"uri": file_uri(tmp_path / "b")}]
    elif roots == "not-file":
        roots = [{"uri": "https://example.org/project"}]
    c = Client(roots=roots)
    assert paths.ROOT is None
    listed = {t["name"] for t in c.request("tools/list")["result"]["tools"]}
    assert "set_workspace" in listed
    for name in sorted(listed - {"set_workspace"}):
        out = c.tool(name)
        assert set(out) == {"error"} and "set_workspace" in out["error"]["message"], name
    assert c.made == [] and list(tmp_path.iterdir()) == []


def test_set_workspace_needs_an_existing_absolute_folder(no_workspace, tmp_path):
    c = Client()
    for bad in ("relative/folder", str(tmp_path / "missing"), str(paths.CODE)):
        out = c.tool("set_workspace", path=bad)
        assert "error" in out and paths.ROOT is None, bad
    out = c.tool("set_workspace", path=str(tmp_path))
    assert out == {"workspace": str(tmp_path.resolve()), "from": "set_workspace"}
    assert c.tool("ledger_read") == {"screens": {}}
    other = tmp_path / "other"
    other.mkdir()
    assert "error" in c.tool("set_workspace", path=str(other))
    assert paths.ROOT == tmp_path.resolve()


def test_every_user_path_falls_under_the_workspace(no_workspace, tmp_path):
    paths.use_workspace(tmp_path)
    for name in USER_PATHS:
        p = Path(getattr(paths, name))
        assert p == tmp_path or tmp_path in p.parents, name
        # The same place relative to the workspace as relative to this repository.
        assert p.relative_to(tmp_path) == Path({"ROOT": ".", "LEDGER": "results/ledger.json"}.get(
            name, {"ORACLE": "oracle", "VENDOR": "oracle/vendor", "OUT": "oracle/out",
                   "REPO_GOLDENS": "oracle/goldens", "GOLDENS": "oracle/goldens", "TARGETS": "oracle/targets",
                   "RUNS": "oracle/out/runs", "DEFAULT_PROFILE": "oracle/targets/quick2.json"}.get(name))), name


def test_this_repository_is_its_own_workspace():
    assert not paths.INSTALLED and paths.CODE == Path(__file__).resolve().parents[2]
    assert paths.TARGETS == paths.CODE / "oracle" / "targets"
