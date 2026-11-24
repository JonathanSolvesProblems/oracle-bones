"""A server whose oracle code on disk changed since it loaded refuses to start or drive the program."""
import pytest

from oracle import freshness
from oracle.errors import OracleError
from oracle.jsonschema_lite import validate
from oracle.schemas import ERROR
from oracle.tools import Oracle


def _tree(root):
    (root / "runner").mkdir(parents=True)
    (root / "tests").mkdir()
    (root / "out").mkdir()
    (root / "reread.py").write_text("OLD = 1\n")
    (root / "runner" / "agent.py").write_text("pass\n")
    (root / "tests" / "test_x.py").write_text("pass\n")
    (root / "out" / "probe.py").write_text("pass\n")


def test_unchanged_code_passes(tmp_path):
    _tree(tmp_path)
    loaded = freshness.code_hashes(tmp_path)
    assert sorted(loaded) == ["reread.py", "runner/agent.py"]
    freshness.check(loaded, tmp_path)


def test_tests_and_run_reports_do_not_count(tmp_path):
    _tree(tmp_path)
    loaded = freshness.code_hashes(tmp_path)
    (tmp_path / "tests" / "test_x.py").write_text("changed\n")
    (tmp_path / "out" / "new_probe.py").write_text("new\n")
    freshness.check(loaded, tmp_path)


@pytest.mark.parametrize("edit", ["change", "add", "remove"])
def test_changed_code_refuses_and_says_to_restart(tmp_path, edit):
    _tree(tmp_path)
    loaded = freshness.code_hashes(tmp_path)
    if edit == "change":
        (tmp_path / "reread.py").write_text("OLD = 2\n")
        want = ["reread.py"]
    elif edit == "add":
        (tmp_path / "new.py").write_text("pass\n")
        want = ["new.py"]
    else:
        (tmp_path / "runner" / "agent.py").unlink()
        want = ["runner/agent.py"]
    with pytest.raises(OracleError) as e:
        freshness.check(loaded, tmp_path, loaded_at="2026-11-22T10:17:00")
    assert e.value.category == "stale_server"
    assert not e.value.retryable
    assert "Restart the oracle MCP server" in e.value.message
    assert e.value.detail == {"changed": want, "loaded_at": "2026-11-22T10:17:00"}
    assert validate(e.value.to_dict(), ERROR) == []


def test_this_process_loaded_the_code_on_disk():
    freshness.check()


@pytest.mark.parametrize("tool,args", [
    ("boot_target", {}),
    ("send_keys", {"session_id": "s", "keys": "{Enter}"}),
    ("run_case", {"mode": "normal_depth", "shape": "trapezoid", "inputs": {}, "record": True}),
    ("run_batch", {"seed": 1, "count": 1, "record": True}),
])
def test_tools_that_drive_the_program_refuse_on_a_stale_server(monkeypatch, tool, args):
    stale = dict(freshness.LOADED)
    stale["reread.py"] = "0" * 64  # as if reread.py had been edited after this process loaded it
    monkeypatch.setattr(freshness, "LOADED", stale)
    oracle = object.__new__(Oracle)  # no session manager: the check must come before any work
    with pytest.raises(OracleError) as e:
        getattr(oracle, tool)(**args)
    assert e.value.category == "stale_server"
    assert e.value.detail["changed"] == ["reread.py"]
